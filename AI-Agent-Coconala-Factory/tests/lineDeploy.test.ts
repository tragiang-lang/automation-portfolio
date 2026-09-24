import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { executeDelete, executeDeploy, executeRollback, formatPlan, planDeploy, planRollback, readHistory, runSmokeTest } from "../src/line/deploy";
import { createLineApi, LineApi, LineApiError, RichMenuObject } from "../src/line/lineApi";
import { FACTORY_ROOT, hashBytes } from "../src/lib/fsx";
import { createProject } from "../src/project";
import { runLineQa } from "../src/qa/lineQa";
import { editJson, hairSalonBrief, realRegistry, tempDir } from "./helpers";

const registry = realRegistry();
const TOKEN = "synthetic-test-token-not-real";
const now = () => new Date("2026-09-23T12:00:00.000Z");
let dir: string;

beforeEach(() => {
  dir = createProject(hairSalonBrief(), registry, { force: false, runGasChecks: false, projectsDir: tempDir("line-deploy"), today: "2026-09-23" }).projectDir!;
});

/** In-memory LINE account. Records every call so tests can assert order and that nothing is deleted. */
function fakeLine(options: { defaultId?: string | null; failOn?: string; webhook?: string } = {}) {
  const calls: string[] = [];
  const menus = new Map<string, RichMenuObject & { richMenuId: string; image?: Uint8Array }>();
  let current: string | null = options.defaultId ?? null;
  if (current) menus.set(current, { richMenuId: current, size: { width: 2500, height: 1686 }, selected: true, name: "old", chatBarText: "old", areas: [] });
  let seq = 0;
  const step = (name: string) => {
    calls.push(name);
    if (options.failOn === name) throw new LineApiError(name, 400, "synthetic failure");
  };
  const api: LineApi = {
    async validateRichMenu() {
      step("validate");
    },
    async createRichMenu(menu) {
      step("create");
      const id = `richmenu-${String(++seq).padStart(32, "0")}`;
      menus.set(id, { ...menu, richMenuId: id });
      return id;
    },
    async uploadRichMenuImage(id, image) {
      step("upload");
      menus.get(id)!.image = image;
    },
    async downloadRichMenuImage(id) {
      step("download");
      return menus.get(id)!.image!;
    },
    async getRichMenu(id) {
      step("get");
      const menu = menus.get(id);
      if (!menu) throw new LineApiError("getRichMenu", 404, "Not found");
      return menu;
    },
    async deleteRichMenu(id) {
      step("delete");
      menus.delete(id);
    },
    async setDefaultRichMenu(id) {
      step("setDefault");
      current = id;
    },
    async getDefaultRichMenuId() {
      step("getDefault");
      return current;
    },
    async getWebhookEndpoint() {
      step("webhookEndpoint");
      return { endpoint: options.webhook ?? "https://demo-hair-salon-line-webhook.example.workers.dev/", active: true };
    },
    async testWebhookEndpoint() {
      step("webhookTest");
      return { success: true, statusCode: 200, reason: "OK", detail: "200" };
    },
  };
  return { api, calls, menus, current: () => current };
}

describe("line-deploy (dry run)", () => {
  it("shows project, rich menu, image, actions, environment and intended operations without any API", () => {
    const plan = planDeploy(dir, registry, "test");
    expect(plan.blocked).toEqual([]);
    const text = formatPlan(plan);
    expect(text).toMatch(/project: +2026\/demo-hair-salon/);
    expect(text).toMatch(/environment: +test/);
    expect(text).toMatch(/rich menu: +demo-hair-salon-salon-basic-v1 \(salon-basic-v1@1\.0\.0, 2500x1686/);
    expect(text).toMatch(/image: +rich-menu\/rich-menu\.png \d+ bytes sha256/);
    expect(text).toMatch(/ご予約 → datetimepicker wf=reservation-basic-v1&e=default/);
    expect(plan.operations.at(-1)).toBe("no rich menu is deleted");
    expect(plan.payload).not.toHaveProperty("_meta");
    expect(plan.image.sha256).toBe(hashBytes(plan.png));
  });

  it("is blocked by LINE QA errors", () => {
    editJson(dir, "rich-menu/menu-config.json", (menu) => (menu.areas[0].bounds.width = 2000));
    const plan = planDeploy(dir, registry, "production");
    expect(plan.blocked.map((i) => i.rule)).toContain("LINE_IMAGE_MATCHES_CONFIG");
    return expect(executeDeploy(plan, fakeLine().api, now)).rejects.toThrow(/blocked/);
  });

  it("the CLI makes no API call without --live, even with no token set", () => {
    const env = { ...process.env };
    delete env.LINE_CHANNEL_ACCESS_TOKEN;
    const result = spawnSync(process.execPath, [path.join(FACTORY_ROOT, "node_modules/tsx/dist/cli.mjs"), "src/cli.ts", "line-deploy", "--project", dir, "--env", "production"], {
      cwd: FACTORY_ROOT,
      env,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(result.stdout).toMatch(/DRY RUN\. No API call was made/);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(dir, "line/deployment-history.json"))).toBe(false);
  }, 120_000);
});

describe("line-deploy (live, fake LINE)", () => {
  it("creates, uploads, verifies, then sets default; remembers the previous default; deletes nothing", async () => {
    const line = fakeLine({ defaultId: "richmenu-old" });
    const entry = await executeDeploy(planDeploy(dir, registry, "production"), line.api, now);
    expect(line.calls).toEqual(["validate", "create", "upload", "get", "getDefault", "setDefault"]);
    expect(entry).toMatchObject({ status: "succeeded", environment: "production", previousDefaultRichMenuId: "richmenu-old", richMenuAsset: "salon-basic-v1@1.0.0" });
    expect(line.current()).toBe(entry.richMenuId);
    expect(line.menus.has("richmenu-old")).toBe(true);
    const history = fs.readFileSync(path.join(dir, "line/deployment-history.json"), "utf8");
    expect(history).toContain(entry.richMenuId!);
    expect(history).not.toContain(TOKEN);
  });

  it("records a failed step and never switches the default when the upload fails", async () => {
    const line = fakeLine({ defaultId: "richmenu-old", failOn: "upload" });
    const entry = await executeDeploy(planDeploy(dir, registry, "production"), line.api, now);
    expect(entry).toMatchObject({ status: "failed", failedStep: "upload image" });
    expect(line.calls).not.toContain("setDefault");
    expect(line.current()).toBe("richmenu-old");
    expect(readHistory(dir).entries).toHaveLength(1);
  });

  it("keeps deployment ids out of generated artifacts, so regeneration stays deterministic", async () => {
    const before = fs.readFileSync(path.join(dir, "line/deployment.json"), "utf8");
    await executeDeploy(planDeploy(dir, registry, "test"), fakeLine().api, now);
    expect(fs.readFileSync(path.join(dir, "line/deployment.json"), "utf8")).toBe(before);
    const again = createProject(hairSalonBrief(), registry, { force: true, runGasChecks: false, projectsDir: path.dirname(path.dirname(dir)), today: "2026-09-23" });
    expect(again.removed).toEqual([]);
    expect(readHistory(dir).entries).toHaveLength(1);
  });
});

describe("line-rollback and line-delete", () => {
  it("rolls back to the previous default without deleting anything", async () => {
    const line = fakeLine({ defaultId: "richmenu-old" });
    const deployed = await executeDeploy(planDeploy(dir, registry, "production"), line.api, now);
    const plan = planRollback(dir, "production");
    expect(plan).toMatchObject({ from: deployed.richMenuId, to: "richmenu-old" });
    const entry = await executeRollback(dir, plan, line.api, now);
    expect(entry).toMatchObject({ status: "succeeded", operation: "rollback", richMenuId: "richmenu-old" });
    expect(line.current()).toBe("richmenu-old");
    expect(line.calls).not.toContain("delete");
  });

  it("refuses a rollback when there was no previous default, or nothing was deployed", async () => {
    expect(planRollback(dir, "test").reason).toMatch(/no successful test deployment/);
    await executeDeploy(planDeploy(dir, registry, "test"), fakeLine().api, now);
    const plan = planRollback(dir, "test");
    expect(plan.to).toBeNull();
    await expect(executeRollback(dir, plan, fakeLine().api, now)).rejects.toThrow(/no default rich menu before/);
  });

  it("never deletes the current default rich menu", async () => {
    const line = fakeLine({ defaultId: "richmenu-old" });
    await expect(executeDelete(dir, "production", "richmenu-old", line.api, now)).rejects.toThrow(/current default/);
    expect(line.menus.has("richmenu-old")).toBe(true);
    const deployed = await executeDeploy(planDeploy(dir, registry, "production"), line.api, now);
    await executeDelete(dir, "production", "richmenu-old", line.api, now);
    expect(line.menus.has("richmenu-old")).toBe(false);
    expect(line.current()).toBe(deployed.richMenuId);
  });
});

describe("line-smoke-test (live checks, fake LINE)", () => {
  it("refuses production", async () => {
    await expect(runSmokeTest(dir, "production", fakeLine().api, now)).rejects.toThrow(/never runs against production/);
  });

  it("checks default menu, areas, image hash and webhook, lists manual checks, and feeds Level 4", async () => {
    const line = fakeLine();
    await executeDeploy(planDeploy(dir, registry, "test"), line.api, now);
    const report = await runSmokeTest(dir, "test", line.api, now);
    expect(report.result).toBe("PASS");
    expect(report.automated.filter((c) => c.status === "pass")).toHaveLength(5);
    expect(report.automated.filter((c) => c.status === "manual").length).toBeGreaterThan(0);
    const qa = runLineQa(dir, registry, { runChecks: false });
    expect(qa.levels[3]).toMatchObject({ status: "PASS", note: expect.stringMatching(/^test 2026-09-23/) });
  });

  it("fails when the webhook points straight at GAS instead of the proxy", async () => {
    const line = fakeLine({ webhook: "https://script.google.com/macros/s/TEST/exec?key=x" });
    await executeDeploy(planDeploy(dir, registry, "test"), line.api, now);
    const report = await runSmokeTest(dir, "test", line.api, now);
    expect(report.result).toBe("FAIL");
  });
});

describe("LINE Messaging API adapter", () => {
  function recordingFetch(responses: Record<string, Response>) {
    const requests: { url: string; method: string; headers: Record<string, string> }[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      requests.push({ url, method: init.method ?? "GET", headers: init.headers as Record<string, string> });
      return responses[`${init.method} ${url}`] ?? new Response("{}", { status: 200 });
    };
    return { requests, fetchImpl };
  }

  it("uses the documented hosts, paths and bearer auth", async () => {
    const { requests, fetchImpl } = recordingFetch({
      "POST https://api.line.me/v2/bot/richmenu": new Response(JSON.stringify({ richMenuId: "richmenu-x" }), { status: 200 }),
    });
    const api = createLineApi(TOKEN, fetchImpl);
    const menu = { size: { width: 2500, height: 843 }, selected: true, name: "n", chatBarText: "c", areas: [] };
    await api.validateRichMenu(menu);
    expect(await api.createRichMenu(menu)).toBe("richmenu-x");
    await api.uploadRichMenuImage("richmenu-x", new Uint8Array([1]), "image/png");
    await api.setDefaultRichMenu("richmenu-x");
    await api.deleteRichMenu("richmenu-y");
    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST https://api.line.me/v2/bot/richmenu/validate",
      "POST https://api.line.me/v2/bot/richmenu",
      "POST https://api-data.line.me/v2/bot/richmenu/richmenu-x/content",
      "POST https://api.line.me/v2/bot/user/all/richmenu/richmenu-x",
      "DELETE https://api.line.me/v2/bot/richmenu/richmenu-y",
    ]);
    expect(requests.every((r) => r.headers.Authorization === `Bearer ${TOKEN}`)).toBe(true);
    expect(requests[2].headers["Content-Type"]).toBe("image/png");
  });

  it("treats 404 as 'no default rich menu' and never puts the token in errors", async () => {
    const { fetchImpl } = recordingFetch({
      "GET https://api.line.me/v2/bot/user/all/richmenu": new Response(JSON.stringify({ message: "no default richmenu" }), { status: 404 }),
      "POST https://api.line.me/v2/bot/richmenu": new Response(JSON.stringify({ message: "The request body has 1 error(s)" }), { status: 400 }),
    });
    const api = createLineApi(TOKEN, fetchImpl);
    expect(await api.getDefaultRichMenuId()).toBeNull();
    const failure = await api.createRichMenu({ size: { width: 1, height: 1 }, selected: true, name: "n", chatBarText: "c", areas: [] }).catch((e: Error) => e);
    expect(failure).toBeInstanceOf(LineApiError);
    expect((failure as Error).message).toBe("LINE API createRichMenu failed: HTTP 400 (The request body has 1 error(s))");
    expect((failure as Error).message).not.toContain(TOKEN);
    expect(() => createLineApi("", fetchImpl)).toThrow(/LINE_CHANNEL_ACCESS_TOKEN/);
  });
});
