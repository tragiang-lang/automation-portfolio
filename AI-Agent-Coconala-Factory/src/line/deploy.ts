import fs from "node:fs";
import path from "node:path";
import type { LineRichMenuConfig } from "../generators/richMenuConfig";
import { hashBytes, readJson, toStableJson, writeFile } from "../lib/fsx";
import { error, Issue } from "../lib/issues";
import { runLineQa } from "../qa/lineQa";
import type { ImageRecord } from "../richMenu/renderer";
import type { CoreAssetRegistry } from "../registry/registry";
import { DEPLOYMENT_FILE, HISTORY_FILE, lineRichMenuPayload, payloadSha256, SMOKE_RESULT_FILE } from "./definition";
import type { LineApi, RichMenuObject } from "./lineApi";

/**
 * LINE deployment operations for one client project. Default is always a
 * dry run: the CLI only calls these `execute*` functions with `--live`.
 *
 * Safe order (never deletes; the previous default stays until the new one
 * is attached, and is recorded for rollback):
 *   static LINE QA → validate object (API) → create → upload image
 *   → verify → set default → record in line/deployment-history.json
 */

export const ENVIRONMENTS = ["test", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export interface HistoryEntry {
  environment: Environment;
  operation: "deploy" | "rollback" | "delete";
  status: "succeeded" | "failed";
  at: string;
  richMenuId?: string;
  richMenuName?: string;
  richMenuAsset?: string;
  imageSha256?: string;
  configSha256?: string;
  previousDefaultRichMenuId?: string | null;
  failedStep?: string;
  error?: string;
}

export interface History {
  kind: "line-deployment-history";
  note: string;
  entries: HistoryEntry[];
}

export function readHistory(dir: string): History {
  const file = path.join(dir, HISTORY_FILE);
  return fs.existsSync(file)
    ? readJson<History>(file)
    : { kind: "line-deployment-history", note: "Server-issued ids written by line-deploy/line-rollback --live. Not generated; never contains tokens.", entries: [] };
}

export function appendHistory(dir: string, entry: HistoryEntry): void {
  const history = readHistory(dir);
  history.entries.push(entry);
  writeFile(path.join(dir, HISTORY_FILE), toStableJson(history));
}

export function lastDeploy(history: History, environment: Environment): HistoryEntry | undefined {
  return [...history.entries].reverse().find((e) => e.environment === environment && e.status === "succeeded" && (e.operation === "deploy" || e.operation === "rollback"));
}

export function parseEnvironment(value: string | undefined): Environment | null {
  return ENVIRONMENTS.includes(value as Environment) ? (value as Environment) : null;
}

// ------------------------------------------------------------------ plan

export interface DeployPlan {
  project: string;
  projectDir: string;
  environment: Environment;
  richMenu: { name: string; asset: string; chatBarText: string; size: string; configSha256: string };
  image: { file: string; bytes: number; sha256: string; contentType: "image/png" };
  buttons: string[];
  operations: string[];
  payload: RichMenuObject;
  png: Uint8Array;
  blocked: Issue[];
}

interface DeploymentJson {
  _meta: { project: string };
  richMenu: { name: string; asset: string; configSha256: string };
}

/** Everything a deploy would do, without any network call. `blocked` lists what stops a live deploy. */
export function planDeploy(dir: string, registry: CoreAssetRegistry, environment: Environment): DeployPlan {
  const blocked: Issue[] = [];
  const qa = runLineQa(dir, registry, { runChecks: false });
  const level1 = qa.checks.filter((c) => c.status === "fail");
  for (const check of level1) blocked.push(error(check.rule, check.details.join("; ")));

  const menu = readJson<LineRichMenuConfig>(path.join(dir, "rich-menu/menu-config.json"));
  const record = readJson<ImageRecord>(path.join(dir, "rich-menu/image.json"));
  const deployment = readJson<DeploymentJson>(path.join(dir, DEPLOYMENT_FILE));
  const png = new Uint8Array(fs.readFileSync(path.join(dir, record.file)));
  const history = readHistory(dir);
  const previous = lastDeploy(history, environment);

  return {
    project: deployment._meta.project,
    projectDir: dir,
    environment,
    richMenu: { name: menu.name, asset: deployment.richMenu.asset, chatBarText: menu.chatBarText, size: `${menu.size.width}x${menu.size.height}`, configSha256: payloadSha256(menu) },
    image: { file: record.file, bytes: png.length, sha256: hashBytes(png), contentType: "image/png" },
    buttons: menu.areas.map((a) => `${a.action.label} → ${a.action.type}${a.action.data ? ` ${a.action.data}` : ""}${a.action.uri ? ` ${a.action.uri}` : ""}`),
    operations: [
      "POST /v2/bot/richmenu/validate (check the rich menu object)",
      "POST /v2/bot/richmenu (create; LINE issues a new richMenuId)",
      `POST api-data /v2/bot/richmenu/{id}/content (upload ${record.file}, ${png.length} bytes)`,
      "GET  /v2/bot/richmenu/{id} (verify areas and size)",
      "GET  /v2/bot/user/all/richmenu (remember the current default for rollback)",
      "POST /v2/bot/user/all/richmenu/{id} (set as default for all users)",
      `record the result in ${HISTORY_FILE}${previous ? ` (previous ${environment} deploy: ${previous.richMenuId})` : ""}`,
      "no rich menu is deleted",
    ],
    payload: lineRichMenuPayload(menu),
    png,
    blocked,
  };
}

export function formatPlan(plan: DeployPlan): string {
  return [
    `project:      ${plan.project}`,
    `environment:  ${plan.environment}`,
    `rich menu:    ${plan.richMenu.name} (${plan.richMenu.asset}, ${plan.richMenu.size}, chat bar "${plan.richMenu.chatBarText}")`,
    `image:        ${plan.image.file} ${plan.image.bytes} bytes sha256 ${plan.image.sha256.slice(0, 16)}…`,
    "buttons:",
    ...plan.buttons.map((b) => `  - ${b}`),
    "intended operations:",
    ...plan.operations.map((o, i) => `  ${i + 1}. ${o}`),
  ].join("\n");
}

// --------------------------------------------------------------- execute

function sameAreas(created: RichMenuObject, expected: RichMenuObject): boolean {
  const key = (m: RichMenuObject) =>
    JSON.stringify({ size: m.size, areas: m.areas.map((a) => ({ bounds: a.bounds, type: a.action.type, data: a.action.data ?? null, uri: a.action.uri ?? null, mode: a.action.mode ?? null })) });
  return key(created) === key(expected);
}

export async function executeDeploy(plan: DeployPlan, api: LineApi, now: () => Date = () => new Date()): Promise<HistoryEntry> {
  if (plan.blocked.length > 0) throw new Error("deployment is blocked by LINE QA errors; fix them first");
  const base = { environment: plan.environment, operation: "deploy" as const, richMenuName: plan.richMenu.name, richMenuAsset: plan.richMenu.asset, imageSha256: plan.image.sha256, configSha256: plan.richMenu.configSha256 };
  let step = "validate";
  let richMenuId: string | undefined;
  try {
    await api.validateRichMenu(plan.payload);
    step = "create";
    richMenuId = await api.createRichMenu(plan.payload);
    step = "upload image";
    await api.uploadRichMenuImage(richMenuId, plan.png, plan.image.contentType);
    step = "verify";
    const created = await api.getRichMenu(richMenuId);
    if (!sameAreas(created, plan.payload)) throw new Error("the created rich menu does not match menu-config.json");
    step = "read current default";
    const previousDefaultRichMenuId = await api.getDefaultRichMenuId();
    step = "set default";
    await api.setDefaultRichMenu(richMenuId);
    const entry: HistoryEntry = { ...base, status: "succeeded", at: now().toISOString(), richMenuId, previousDefaultRichMenuId };
    appendHistory(plan.projectDir, entry);
    return entry;
  } catch (cause) {
    const entry: HistoryEntry = { ...base, status: "failed", at: now().toISOString(), richMenuId, failedStep: step, error: (cause as Error).message };
    appendHistory(plan.projectDir, entry);
    return entry;
  }
}

// -------------------------------------------------------------- rollback

export interface RollbackPlan {
  environment: Environment;
  from?: string;
  to?: string | null;
  reason?: string;
}

export function planRollback(dir: string, environment: Environment): RollbackPlan {
  const last = lastDeploy(readHistory(dir), environment);
  if (!last) return { environment, reason: `no successful ${environment} deployment is recorded in ${HISTORY_FILE}` };
  if (!last.previousDefaultRichMenuId) {
    return { environment, from: last.richMenuId, to: null, reason: "there was no default rich menu before this deployment; rollback would leave the account without a menu, so do it by hand if intended (see ROLLBACK.md)" };
  }
  return { environment, from: last.richMenuId, to: last.previousDefaultRichMenuId };
}

export async function executeRollback(dir: string, plan: RollbackPlan, api: LineApi, now: () => Date = () => new Date()): Promise<HistoryEntry> {
  if (!plan.to) throw new Error(plan.reason ?? "nothing to roll back to");
  let step = "verify target";
  try {
    const target = await api.getRichMenu(plan.to);
    step = "set default";
    await api.setDefaultRichMenu(plan.to);
    const entry: HistoryEntry = { environment: plan.environment, operation: "rollback", status: "succeeded", at: now().toISOString(), richMenuId: plan.to, richMenuName: target.name, previousDefaultRichMenuId: plan.from };
    appendHistory(dir, entry);
    return entry;
  } catch (cause) {
    const entry: HistoryEntry = { environment: plan.environment, operation: "rollback", status: "failed", at: now().toISOString(), richMenuId: plan.to, failedStep: step, error: (cause as Error).message };
    appendHistory(dir, entry);
    return entry;
  }
}

/** Deletes one rich menu, never the current default. */
export async function executeDelete(dir: string, environment: Environment, richMenuId: string, api: LineApi, now: () => Date = () => new Date()): Promise<HistoryEntry> {
  const current = await api.getDefaultRichMenuId();
  if (current === richMenuId) throw new Error(`${richMenuId} is the current default rich menu; roll back or deploy another menu first`);
  await api.deleteRichMenu(richMenuId);
  const entry: HistoryEntry = { environment, operation: "delete", status: "succeeded", at: now().toISOString(), richMenuId };
  appendHistory(dir, entry);
  return entry;
}

// ----------------------------------------------------------------- status

export async function remoteStatus(dir: string, environment: Environment, api: LineApi): Promise<string[]> {
  const last = lastDeploy(readHistory(dir), environment);
  const current = await api.getDefaultRichMenuId();
  const lines = [`default rich menu on LINE: ${current ?? "(none set with the Messaging API)"}`];
  if (current) lines.push(`  name: ${(await api.getRichMenu(current)).name}`);
  lines.push(`last recorded ${environment} deployment: ${last?.richMenuId ?? "(none)"}`);
  lines.push(current && last?.richMenuId === current ? "status: IN SYNC" : "status: DIFFERENT (someone changed the menu outside the factory, or this is another account)");
  return lines;
}

// ------------------------------------------------------------- smoke test

export interface SmokeCheck {
  check: string;
  status: "pass" | "fail" | "manual";
  detail: string;
}

export const MANUAL_SMOKE_CHECKS = [
  "Rich Menu is visible on a smartphone (iOS/Android LINE app; LINE for PC does not show rich menus)",
  "each button gives the expected reply",
  "the workflow event reaches GAS (Apps Script executions log)",
  "the spreadsheet row appears for inquiry / reservation buttons",
  "sending the same event twice (LINE redelivery) creates no duplicate row",
  "invalid input (e.g. a closed day) gets the safe Japanese message",
];

/** Automated part of the live smoke test. Refuses production. The caller writes the result file. */
export async function runSmokeTest(dir: string, environment: Environment, api: LineApi, now: () => Date = () => new Date()) {
  if (environment === "production") throw new Error("line-smoke-test never runs against production; use a test LINE Official Account (--env test)");
  const plan = readJson<LineRichMenuConfig>(path.join(dir, "rich-menu/menu-config.json"));
  const record = readJson<ImageRecord>(path.join(dir, "rich-menu/image.json"));
  const last = lastDeploy(readHistory(dir), environment);
  const checks: SmokeCheck[] = [];
  const add = (check: string, ok: boolean, detail: string) => checks.push({ check, status: ok ? "pass" : "fail", detail });

  const current = await api.getDefaultRichMenuId();
  add("default rich menu is the one the factory deployed", Boolean(last?.richMenuId) && current === last?.richMenuId, `LINE default ${current ?? "none"}, recorded ${last?.richMenuId ?? "none"}`);
  if (current) {
    const remote = await api.getRichMenu(current);
    add("rich menu areas match menu-config.json", sameAreas(remote, lineRichMenuPayload(plan)), `${remote.areas.length} areas`);
    const image = await api.downloadRichMenuImage(current);
    add("rich menu image matches rich-menu.png", hashBytes(image) === record.sha256, `${image.length} bytes`);
  }
  const endpoint = await api.getWebhookEndpoint();
  let host = "";
  try {
    host = new URL(endpoint.endpoint).hostname;
  } catch {
    host = "";
  }
  add("webhook URL points at the verification proxy, not directly at GAS", endpoint.active && host !== "" && host !== "script.google.com", `active=${endpoint.active} host=${host || "(invalid)"}`);
  const test = await api.testWebhookEndpoint();
  add("LINE test webhook reaches the proxy and gets 200", test.success && test.statusCode === 200, `${test.reason} ${test.statusCode}`);
  for (const manual of MANUAL_SMOKE_CHECKS) checks.push({ check: manual, status: "manual", detail: "see delivery/E2E_TEST.md" });
  const result = checks.some((c) => c.status === "fail") ? ("FAIL" as const) : ("PASS" as const);
  const report = { ranAt: now().toISOString(), environment, result, scope: "automated checks only; manual checks are listed, not claimed", automated: checks };
  writeFile(path.join(dir, SMOKE_RESULT_FILE), toStableJson(report));
  return report;
}
