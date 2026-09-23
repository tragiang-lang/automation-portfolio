import { describe, expect, it } from "vitest";
import { ActionHandler, ActionRegistry, textMessage } from "../../src/actions/types";
import { handleLineWebhook, LineRoute, parsePostbackData } from "../../src/line/webhook";
import { ActionError } from "../../src/lib/result";
import { handleApiRequest } from "../../src/router/apiRouter";
import { dispatchPost, isAuthorizedWebhook } from "../../src/router/dispatch";
import { toLineRichMenuPayload } from "../../src/setup/richMenuSetup";
import { planSpreadsheetSetup } from "../../src/setup/spreadsheetSetup";
import { makeContext, TEST_SCHEMA } from "../support/fakes";

// Stub actions keep the runtime tests independent of any optional module.
const echo: ActionHandler<{ view: string }, { view: string; name: string }> = {
  id: "echo",
  parse: (payload) => ({ view: String((payload as { view?: string } | undefined)?.view ?? "all") }),
  run: (input, ctx) => ({ view: input.view, name: ctx.config().requiredString("business.name") }),
  fromLine: (invocation) => ({ view: invocation.params.view }),
  toLineMessages: (output) => [textMessage(`${output.name}:${output.view}`)],
};
const record: ActionHandler<{ text: string }, { saved: string }> = {
  id: "record",
  parse: (payload) => ({ text: String((payload as { text?: string }).text ?? "") }),
  run: (input, ctx) => {
    ctx.tables.append("INQUIRIES", { inquiryId: "INQ-1", submissionId: "s", createdAt: "t", message: input.text, status: "NEW" });
    return { saved: input.text };
  },
  fromLine: (invocation) => ({ text: invocation.text }),
  toLineMessages: () => [textMessage("受け付けました")],
};
const failing: ActionHandler<unknown, unknown> = {
  id: "failing",
  parse: () => ({}),
  run: () => {
    throw new ActionError("SLOT_UNAVAILABLE", "internal detail CLOSED");
  },
  fromLine: () => ({}),
};

const registry: ActionRegistry = { echo, record, failing };
const routes: LineRoute[] = [
  { workflowId: "info-v1", entry: "access", action: "echo", mode: "direct", params: { view: "access" } },
  { workflowId: "ask-v1", entry: "default", action: "record", mode: "awaitText", prompt: "内容を送ってください" },
  { workflowId: "fail-v1", entry: "default", action: "failing", mode: "direct" },
];
const KEY = "k".repeat(32);

function postback(data: string) {
  return { type: "postback", webhookEventId: `evt-${data}`, replyToken: "rt", source: { userId: "U0000test" }, postback: { data } };
}

describe("parsePostbackData", () => {
  it("decodes pairs without URLSearchParams", () => {
    expect(parsePostbackData("wf=a-v1&e=default&x=%E4%BA%88+%E7%B4%84")).toEqual({ wf: "a-v1", e: "default", x: "予 約" });
  });
});

describe("handleLineWebhook", () => {
  it("runs a direct route with its static params and replies", () => {
    const ctx = makeContext();
    const sent = handleLineWebhook({ events: [postback("wf=info-v1&e=access")] }, { routes, registry, ctx });
    expect(sent[0].messages[0].text).toBe("テストサロン:access");
  });

  it("awaits text, then runs the pending action on the next message only", () => {
    const ctx = makeContext();
    handleLineWebhook({ events: [postback("wf=ask-v1&e=default")] }, { routes, registry, ctx });
    expect(ctx.replies[0].messages[0].text).toBe("内容を送ってください");
    const text = { type: "message", webhookEventId: "evt-text", replyToken: "rt2", source: { userId: "U0000test" }, message: { type: "text", text: "質問です" } };
    handleLineWebhook({ events: [text] }, { routes, registry, ctx });
    handleLineWebhook({ events: [{ ...text, webhookEventId: "evt-text-2" }] }, { routes, registry, ctx });
    expect(ctx.tables.readAll("INQUIRIES").map((r) => r.message)).toEqual(["質問です"]);
  });

  it("ignores free text with nothing pending and unknown postbacks", () => {
    const ctx = makeContext();
    const sent = handleLineWebhook(
      { events: [{ type: "message", source: { userId: "U0000x" }, replyToken: "r", message: { type: "text", text: "hello" } }, postback("wf=unknown-v1")] },
      { routes, registry, ctx },
    );
    expect(sent).toEqual([]);
  });

  it("replies with the safe message for the error code, never the internal detail", () => {
    const ctx = makeContext();
    const sent = handleLineWebhook({ events: [postback("wf=fail-v1")] }, { routes, registry, ctx });
    expect(sent[0].messages[0].text).toContain("ご予約いただけません");
    expect(sent[0].messages[0].text).not.toContain("CLOSED");
    expect(ctx.errors.map((e) => e.event)).toContain("line.action_failed");
  });
});

describe("dispatchPost", () => {
  const deps = (overrides: Partial<Parameters<typeof dispatchPost>[2]> = {}) => ({
    registry,
    apiActions: ["echo"],
    routes,
    webhookKey: KEY,
    apiEnabled: false,
    ctx: () => makeContext(),
    ...overrides,
  });

  it("rejects LINE deliveries without the webhook key and fails closed when no key is configured", () => {
    const body = JSON.stringify({ events: [] });
    expect(dispatchPost(body, "wrong", deps())).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(dispatchPost(body, KEY, deps())).toEqual({ ok: true, data: { handled: 0 } });
    expect(dispatchPost(body, KEY, deps({ webhookKey: null }))).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(isAuthorizedWebhook("short", "short")).toBe(false);
  });

  it("keeps the JSON API closed unless API_ENABLED", () => {
    const body = JSON.stringify({ action: "echo" });
    expect(dispatchPost(body, undefined, deps())).toMatchObject({ ok: false, error: { code: "FEATURE_DISABLED" } });
    expect(dispatchPost(body, undefined, deps({ apiEnabled: true }))).toMatchObject({ ok: true, data: { name: "テストサロン" } });
  });

  it("only exposes actions listed as API actions and rejects malformed bodies", () => {
    const options = { apiEnabled: true, registry, apiActions: ["echo"], ctx: () => makeContext() };
    expect(handleApiRequest(JSON.stringify({ action: "record" }), options)).toMatchObject({ ok: false, error: { code: "UNKNOWN_ACTION" } });
    expect(handleApiRequest("not json", options)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });
});

describe("setup planning", () => {
  it("creates missing sheets, appends missing headers, seeds only missing config keys", () => {
    const steps = planSpreadsheetSetup(
      TEST_SCHEMA,
      { headers: { CONFIG: ["key", "value", "description"], CUSTOMERS: ["customerId"] }, configKeys: ["business.name"] },
      { "reservation.slotMinutes": "60" },
    );
    expect(steps).toContainEqual(expect.objectContaining({ kind: "createSheet", sheet: "INQUIRIES" }));
    expect(steps).toContainEqual(expect.objectContaining({ kind: "appendHeaders", sheet: "CUSTOMERS" }));
    expect(steps.filter((s) => s.kind === "seedConfig")).toEqual([
      { kind: "seedConfig", key: "reservation.slotMinutes", value: "60", description: "枠の間隔(分)" },
    ]);
    expect(steps.some((s) => s.kind === "createSheet" && s.sheet === "CONFIG")).toBe(false);
  });

  it("strips traceability metadata before sending a rich menu to LINE", () => {
    const payload = toLineRichMenuPayload({
      _meta: { project: "x" },
      size: { width: 2500, height: 843 },
      selected: true,
      name: "n",
      chatBarText: "メニュー",
      areas: [{ bounds: { x: 0, y: 0, width: 2500, height: 843 }, action: { type: "postback", data: "wf=a" }, label: "x" } as never],
    });
    expect(payload).not.toHaveProperty("_meta");
    expect(payload.areas[0]).not.toHaveProperty("label");
  });
});
