import { describe, expect, it } from "vitest";
import { createInquiry } from "../core-assets/gas-modules/src/actions/createInquiry";
import { createReservation } from "../core-assets/gas-modules/src/actions/createReservation";
import { getAvailability } from "../core-assets/gas-modules/src/actions/getAvailability";
import { getBusinessInfo } from "../core-assets/gas-modules/src/actions/getBusinessInfo";
import { getServiceList } from "../core-assets/gas-modules/src/actions/getServiceList";
import type { ActionRegistry } from "../core-assets/gas-modules/src/actions/types";
import { ERROR_MESSAGES_JA } from "../core-assets/gas-modules/src/lib/result";
import { dispatchPost } from "../core-assets/gas-modules/src/router/dispatch";
import type { RuntimeSchema } from "../core-assets/gas-modules/src/services/context";
import { makeContext, TestContext } from "../core-assets/gas-modules/tests/support/fakes";
import { signLineBody } from "../core-assets/line-webhook-proxy/src/signature";
import { Env, handleRequest } from "../core-assets/line-webhook-proxy/src/worker";
import { runPipeline } from "../src/agents/orchestrator";
import { buildLineRoutes, LineRichMenuConfig } from "../src/generators/richMenuConfig";
import type { ProjectSchema } from "../src/generators/spreadsheetSchema";
import { hairSalonBrief, realEstateBrief, realRegistry, restaurantBrief } from "./helpers";

/**
 * Level 3 of LINE QA, end to end for every industry:
 *
 *   signed LINE webhook payload → proxy (signature check) → GAS doPost dispatch
 *   (WEBHOOK_KEY) → generated routes → real actions → in-memory spreadsheet → reply
 *
 * Synthetic secrets and user ids only; no network, no LINE account.
 */

const registry = realRegistry();
const SECRET = "synthetic-channel-secret-for-tests";
const WEBHOOK_KEY = "w".repeat(32);
const ENV: Env = { LINE_CHANNEL_SECRET: SECRET, GAS_WEBAPP_URL: "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec", GAS_WEBHOOK_KEY: WEBHOOK_KEY };
const ACTIONS: ActionRegistry = { createInquiry, createReservation, getAvailability, getBusinessInfo, getServiceList };

function buildProject(brief: ReturnType<typeof hairSalonBrief>) {
  const result = runPipeline(brief, registry, { createdOn: "2026-09-23" });
  const schema = JSON.parse(result.files["spreadsheet/schema.json"]) as ProjectSchema;
  const runtime: RuntimeSchema = {
    sheets: schema.sheets.map((s) => ({ name: s.name, columns: s.columns.map((c) => c.name), required: s.columns.filter((c) => c.required).map((c) => c.name), primaryKey: s.primaryKey })),
    configKeys: schema.configKeys.map((k) => ({ key: k.key, required: k.required, default: k.default, description: k.description })),
  };
  const config: Record<string, string> = {};
  for (const key of schema.configKeys) if (key.default !== undefined) config[key.key] = key.default;
  Object.assign(config, JSON.parse(result.files["spreadsheet/config-seed.json"]).values);
  const menu = JSON.parse(result.files["rich-menu/menu-config.json"]) as LineRichMenuConfig;
  const routes = buildLineRoutes(result.plan!, registry);
  const registryFor = Object.fromEntries(Object.entries(ACTIONS).filter(([id]) => routes.some((r) => r.action === id)));
  return { menu, routes, runtime, config, registry: registryFor, businessName: config["business.name"] };
}

/** LINE → proxy → GAS, wired together in memory. */
function system(project: ReturnType<typeof buildProject>, options: { gasKey?: string } = {}) {
  const ctx: TestContext = makeContext({ schema: project.runtime, config: project.config });
  const gasResponses: unknown[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    const key = new URL(url).searchParams.get("key") ?? undefined;
    const body = new TextDecoder().decode(init.body as Uint8Array);
    const response = dispatchPost(body, key, { registry: project.registry, apiActions: [], routes: project.routes, webhookKey: options.gasKey ?? WEBHOOK_KEY, apiEnabled: false, ctx: () => ctx });
    gasResponses.push(response);
    return new Response(JSON.stringify(response), { status: 200 });
  };
  let seq = 0;
  async function deliver(event: Record<string, unknown>, sign: (body: string) => Promise<string | null> = (body) => signLineBody(SECRET, body)) {
    const body = JSON.stringify({ destination: "U00000000000000000000000000000000", events: [event] });
    const signature = await sign(body);
    const pending: Promise<unknown>[] = [];
    const headers: Record<string, string> = { "content-type": "application/json; charset=utf-8" };
    if (signature) headers["x-line-signature"] = signature;
    const response = await handleRequest(new Request("https://proxy.example.com/", { method: "POST", headers, body }), ENV, { waitUntil: (p) => void pending.push(p) }, fetchImpl);
    await Promise.all(pending);
    return response.status;
  }
  const event = (type: string, extra: Record<string, unknown>, id = `01SYNTHETIC${String(++seq).padStart(15, "0")}`) => ({
    type,
    mode: "active",
    timestamp: 1790000000000 + seq,
    webhookEventId: id,
    deliveryContext: { isRedelivery: false },
    replyToken: `reply-${id}`,
    source: { type: "user", userId: "U0000integration" },
    ...extra,
  });
  const rows = () => Object.fromEntries(project.runtime.sheets.map((s) => [s.name, ctx.tables.readAll(s.name).length]));
  const lastReply = () => ctx.replies.at(-1)?.messages[0]?.text ?? "";
  return { ctx, gasResponses, deliver, event, rows, lastReply };
}

async function openSlot(project: ReturnType<typeof buildProject>, data: string): Promise<string> {
  for (let day = 2; day <= 28; day++) {
    for (let hour = 6; hour <= 22; hour++) {
      const datetime = `${new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
      const s = system(project);
      await s.deliver(s.event("postback", { postback: { data, params: { datetime } } }));
      if (s.rows().RESERVATIONS === 1) return datetime;
    }
  }
  throw new Error("no open slot found");
}

const industries = { hair_salon: hairSalonBrief(), restaurant: restaurantBrief(), real_estate: realEstateBrief() };

describe.each(Object.entries(industries))("LINE → proxy → GAS end to end: %s", (_industry, brief) => {
  const project = buildProject(brief);
  const buttons = project.menu.areas.filter((a) => a.action.type !== "uri");
  const byWorkflow = (prefix: string) => buttons.find((a) => a.action.data?.startsWith(`wf=${prefix}`));

  it("every Rich Menu button reaches its workflow and gets a reply", async () => {
    for (const area of buttons) {
      const s = system(project);
      const status = await s.deliver(s.event("postback", { postback: { data: area.action.data, params: { datetime: "2026-10-20T19:00" } } }));
      expect(status, area.action.label).toBe(200);
      expect(s.ctx.replies.length, area.action.label).toBe(1);
      expect(s.ctx.errors.filter((e) => e.event === "line.unroutable")).toEqual([]);
    }
  });

  it("inquiry: prompt, then the message is saved once, the owner is notified, and a receipt is replied", async () => {
    const area = byWorkflow("inquiry-basic-v1")!;
    const s = system(project);
    await s.deliver(s.event("postback", { postback: { data: area.action.data } }));
    expect(s.lastReply()).toMatch(/お問い合わせ内容/);
    const message = s.event("message", { message: { type: "text", id: "1", text: "駐車場はありますか？" } });
    await s.deliver(message);
    expect(s.rows().INQUIRIES).toBe(1);
    expect(s.lastReply()).toMatch(/受付番号: INQ-/);
    expect(s.ctx.mails).toHaveLength(1);
    // LINE redelivers the same event: no second record, no second reply
    await s.deliver({ ...message, deliveryContext: { isRedelivery: true } });
    expect(s.rows().INQUIRIES).toBe(1);
    expect(s.ctx.replies).toHaveLength(2);
    expect(s.ctx.mails).toHaveLength(1);
  });

  it("reservation: a request (not a confirmed booking) is saved once; a closed slot gets the safe message", async () => {
    const area = byWorkflow("reservation-basic-v1")!;
    expect(area.action.type).toBe("datetimepicker");
    const datetime = await openSlot(project, area.action.data!);
    const s = system(project);
    const pick = s.event("postback", { postback: { data: area.action.data, params: { datetime } } });
    await s.deliver(pick);
    const row = s.ctx.tables.readAll("RESERVATIONS")[0];
    expect(row).toMatchObject({ status: "REQUESTED", source: "line", lineUserId: "U0000integration" });
    expect(s.lastReply()).toMatch(/リクエストを受け付けました/);
    expect(s.lastReply()).toMatch(/確定しましたら改めてご連絡/);
    await s.deliver(pick);
    expect(s.rows().RESERVATIONS).toBe(1);

    await s.deliver(s.event("postback", { postback: { data: area.action.data, params: { datetime: "2026-10-02T03:00" } } }));
    expect(s.rows().RESERVATIONS).toBe(1);
    expect(s.lastReply()).toBe(ERROR_MESSAGES_JA.SLOT_UNAVAILABLE);
  });

  it("business info and service menu reply from CONFIG / sheet data without writing anything", async () => {
    for (const prefix of ["business-info-v1", "service-menu-v1"]) {
      const area = byWorkflow(prefix);
      if (!area) continue;
      const s = system(project);
      const before = s.rows();
      await s.deliver(s.event("postback", { postback: { data: area.action.data } }));
      expect(s.rows()).toEqual(before);
      if (prefix === "business-info-v1") expect(s.lastReply()).toContain(project.businessName);
      else expect(s.lastReply()).toMatch(/現在ご案内できるメニューはありません/);
    }
  });

  it("invalid, missing or modified signatures never reach GAS", async () => {
    const area = buttons[0];
    const s = system(project);
    const event = s.event("postback", { postback: { data: area.action.data } });
    expect(await s.deliver(event, async () => null)).toBe(401);
    expect(await s.deliver(event, (body) => signLineBody("another-synthetic-secret", body))).toBe(401);
    expect(await s.deliver(event, (body) => signLineBody(SECRET, body.replace("U0000integration", "U0000attacker")))).toBe(401);
    expect(s.gasResponses).toEqual([]);
    expect(s.ctx.replies).toEqual([]);
  });

  it("GAS rejects a forward whose internal key does not match WEBHOOK_KEY", async () => {
    const s = system(project, { gasKey: "x".repeat(32) });
    await s.deliver(s.event("postback", { postback: { data: buttons[0].action.data } }));
    expect(s.gasResponses).toEqual([{ ok: false, error: { code: "UNAUTHORIZED", message: ERROR_MESSAGES_JA.UNAUTHORIZED } }]);
    expect(s.ctx.replies).toEqual([]);
  });

  it("unknown workflows are ignored and unknown actions get only the safe message", async () => {
    const s = system(project);
    await s.deliver(s.event("postback", { postback: { data: "wf=coupon-v1&e=default" } }));
    expect(s.ctx.replies).toEqual([]);
    const ghost = system({ ...project, routes: [...project.routes, { workflowId: "ghost-v1", entry: "default", action: "noSuchAction", mode: "direct" }] });
    await ghost.deliver(ghost.event("postback", { postback: { data: "wf=ghost-v1&e=default" } }));
    expect(ghost.lastReply()).toBe(ERROR_MESSAGES_JA.UNKNOWN_ACTION);
  });
});
