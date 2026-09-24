import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DesignSpec } from "../agents/designAgent";
import type { WorkflowPlan } from "../agents/workflowPlanner";
import type { LineRichMenuConfig } from "../generators/richMenuConfig";
import { contrastRatio, WCAG_AA_NORMAL } from "../lib/contrast";
import { FACTORY_ROOT, hashBytes, listFiles, readJson } from "../lib/fsx";
import { error, Issue, warning } from "../lib/issues";
import { DEPLOYMENT_FILE, HISTORY_FILE, payloadSha256, SMOKE_RESULT_FILE, traceButtons, WEBHOOK_DIR } from "../line/definition";
import { inspectImage } from "../richMenu/png";
import { ImageRecord, localRenderer } from "../richMenu/renderer";
import { CoreAssetRegistry, LINE_PROXY_DIR } from "../registry/registry";
import type { QaCheck } from "./qaAgent";

/**
 * LINE integration QA, kept apart from the Phase 1 factory QA
 * (qa/QA_REPORT.md). Rules: core-assets/qa-rules/line-qa-rules-v1.json.
 *
 *   Level 1  static: image, config, actions, traceability, deployment
 *            definition, secrets, webhook/proxy configuration
 *   Level 2  generated GAS LINE runtime tests (gas/tests/lineRuntime.test.ts)
 *   Level 3  webhook proxy tests (line/webhook/tests)
 *   Level 4  live smoke test on a real test account (line-smoke-test); never automatic
 *
 * Every check reads the project from disk, so hand edits are caught too.
 */

export const LINE_QA_RULES = "line-qa-rules-v1";

/** LINE Messaging API reference, "Requirements for rich menu image" and "Rich menu object". */
export const LINE_IMAGE_LIMITS = { minWidth: 800, maxWidth: 2500, minHeight: 250, minAspect: 1.45, maxBytes: 1024 * 1024, maxAreas: 20, maxLabel: 20, maxData: 300 };
/** WCAG 2.x non-text contrast for icons. */
const ICON_CONTRAST = 3;

export interface LineQaReport {
  project: string;
  result: "PASS" | "FAIL";
  summary: { pass: number; fail: number; warn: number; skipped: number };
  levels: { level: number; name: string; status: "PASS" | "FAIL" | "NOT RUN"; note: string }[];
  checks: QaCheck[];
  issues: Issue[];
}

export interface LineQaOptions {
  /** Run the proxy tests (Level 3). */
  runChecks: boolean;
  /** Outcome of the GAS vitest run done by the factory QA (Level 2), if it ran. */
  gasTests?: { ran: boolean; passed: boolean };
}

function readJsonSafe<T>(dir: string, rel: string, issues: Issue[], rule: string): T | null {
  const file = path.join(dir, rel);
  if (!fs.existsSync(file)) {
    issues.push(error(rule, `missing ${rel}`, rel));
    return null;
  }
  try {
    return readJson<T>(file);
  } catch {
    issues.push(error(rule, `${rel} is not valid JSON`, rel));
    return null;
  }
}

// ------------------------------------------------------------------ image

function checkImage(dir: string, record: ImageRecord | null, menu: LineRichMenuConfig | null, spec: DesignSpec | null): Issue[] {
  const issues: Issue[] = [];
  const pngFile = path.join(dir, "rich-menu/rich-menu.png");
  if (!fs.existsSync(pngFile)) return [error("LINE_IMAGE_EXISTS", "rich-menu/rich-menu.png is missing", "rich-menu/")];
  if (!fs.existsSync(path.join(dir, "rich-menu/preview.svg"))) issues.push(error("LINE_IMAGE_EXISTS", "rich-menu/preview.svg is missing", "rich-menu/"));
  const bytes = new Uint8Array(fs.readFileSync(pngFile));
  const sha = hashBytes(bytes);
  if (record) {
    if (record.sha256 !== sha || record.bytes !== bytes.length) issues.push(error("LINE_IMAGE_EXISTS", "rich-menu.png does not match image.json (edited or replaced by hand?)", "rich-menu/image.json"));
  }

  const info = inspectImage(bytes);
  const L = LINE_IMAGE_LIMITS;
  const at = "rich-menu/rich-menu.png";
  if (info.format === "unknown") issues.push(error("LINE_IMAGE_FORMAT", "not a PNG or JPEG file", at));
  if (info.format === "png") {
    const { width = 0, height = 0 } = info;
    if (width < L.minWidth || width > L.maxWidth) issues.push(error("LINE_IMAGE_FORMAT", `width ${width}px must be ${L.minWidth}-${L.maxWidth}px`, at));
    if (height < L.minHeight) issues.push(error("LINE_IMAGE_FORMAT", `height ${height}px must be at least ${L.minHeight}px`, at));
    if (height > 0 && width / height < L.minAspect) issues.push(error("LINE_IMAGE_FORMAT", `aspect ratio ${(width / height).toFixed(2)} must be at least ${L.minAspect}`, at));
    if (info.opaque === false) issues.push(error("LINE_IMAGE_FORMAT", "image has transparent pixels; LINE would show the chat background through them", at));
    if (info.opaque === null) issues.push(error("LINE_IMAGE_FORMAT", "could not decode the PNG to check transparency", at));
    if (menu && (menu.size.width !== width || menu.size.height !== height)) {
      issues.push(error("LINE_IMAGE_MATCHES_CONFIG", `image is ${width}x${height} but menu-config size is ${menu.size.width}x${menu.size.height}`, at));
    }
    if (spec && (spec.canvas.width !== width || spec.canvas.height !== height)) {
      issues.push(error("LINE_IMAGE_MATCHES_CONFIG", `image is ${width}x${height} but the design canvas is ${spec.canvas.width}x${spec.canvas.height}`, at));
    }
  }
  if (bytes.length > L.maxBytes) issues.push(error("LINE_IMAGE_FORMAT", `${bytes.length} bytes exceeds the 1 MB limit`, at));

  if (spec) {
    // Determinism and "the PNG is what the design spec says": re-render and compare bytes.
    try {
      const again = localRenderer.render(spec);
      if (hashBytes(again.png) !== sha) issues.push(error("LINE_DETERMINISTIC_IMAGE", "re-rendering design-spec.json gives a different PNG (spec, image or renderer changed; regenerate the project)", at));
      issues.push(...again.issues);
    } catch (cause) {
      issues.push(error("LINE_DETERMINISTIC_IMAGE", `image generation failed: ${(cause as Error).message}`, at));
    }
  }
  return issues;
}

function checkTiles(menu: LineRichMenuConfig, spec: DesignSpec, registry: CoreAssetRegistry): Issue[] {
  const issues: Issue[] = [];
  const where = "rich-menu/design-spec.json";
  if (!registry.presets.has(spec.preset)) issues.push(error("LINE_IMAGE_READABLE", `design preset ${spec.preset} does not exist`, where));
  if (spec.cells.length !== menu.areas.length) {
    issues.push(error("LINE_IMAGE_MATCHES_CONFIG", `${spec.cells.length} drawn tiles but ${menu.areas.length} tappable areas`, where));
  }
  spec.cells.forEach((cell, index) => {
    const area = menu.areas[index];
    const b = area?.bounds;
    if (!b || b.x !== cell.bounds.x || b.y !== cell.bounds.y || b.width !== cell.bounds.width || b.height !== cell.bounds.height) {
      issues.push(error("LINE_IMAGE_MATCHES_CONFIG", `tile "${cell.label}" is drawn at ${JSON.stringify(cell.bounds)} but its tappable area is ${JSON.stringify(b ?? null)}`, where));
    } else if (area.action.label !== cell.label.slice(0, 20)) {
      issues.push(error("LINE_IMAGE_MATCHES_CONFIG", `tile "${cell.label}" and tappable area "${area.action.label}" are different buttons`, where));
    }
    if (!cell.label.trim()) issues.push(error("LINE_IMAGE_READABLE", `slot ${cell.slot} has no label`, where));
    const pairs: [string, string, number][] = [
      ["label", cell.labelColor, WCAG_AA_NORMAL],
      ["sub-label", cell.subLabelColor, WCAG_AA_NORMAL],
      ["icon", cell.iconColor, ICON_CONTRAST],
    ];
    for (const [part, color, min] of pairs) {
      if (!color) {
        issues.push(error("LINE_IMAGE_READABLE", `"${cell.label}" has no ${part} color`, where));
        continue;
      }
      if (part === "sub-label" && !cell.subLabel) continue;
      const ratio = contrastRatio(color, cell.fill);
      if (ratio < min) issues.push(error("LINE_IMAGE_READABLE", `"${cell.label}" ${part} contrast ${ratio}:1 is below ${min}:1`, where));
    }
  });
  const { width, height } = menu.size;
  menu.areas.forEach((area, index) => {
    const b = area.bounds;
    if (b.x < 0 || b.y < 0 || b.x + b.width > width || b.y + b.height > height) {
      issues.push(error("LINE_IMAGE_MATCHES_CONFIG", `area ${index + 1} "${area.action.label}" lies outside the ${width}x${height} image`, "rich-menu/menu-config.json"));
    }
  });
  return issues;
}

// ---------------------------------------------------------------- actions

function checkActions(menu: LineRichMenuConfig): Issue[] {
  const issues: Issue[] = [];
  const L = LINE_IMAGE_LIMITS;
  const where = "rich-menu/menu-config.json";
  if (menu.areas.length > L.maxAreas) issues.push(error("LINE_ACTIONS_VALID", `${menu.areas.length} areas exceed LINE's maximum of ${L.maxAreas}`, where));
  menu.areas.forEach((area, index) => {
    const a = area.action;
    const at = `${where} area ${index + 1}`;
    if (!["postback", "datetimepicker", "uri"].includes(a.type)) issues.push(error("LINE_ACTIONS_VALID", `action type "${a.type}" is not supported by the factory runtime`, at));
    if (a.label && [...a.label].length > L.maxLabel) issues.push(error("LINE_ACTIONS_VALID", `label "${a.label}" is longer than ${L.maxLabel} characters`, at));
    if ((a.type === "postback" || a.type === "datetimepicker") && (!a.data || a.data.length > L.maxData)) issues.push(error("LINE_ACTIONS_VALID", `postback data must be 1-${L.maxData} characters`, at));
    if (a.type === "datetimepicker" && !["date", "time", "datetime"].includes(a.mode ?? "")) issues.push(error("LINE_ACTIONS_VALID", `datetimepicker mode "${a.mode}" is invalid`, at));
    if (a.type === "uri" && !/^https:\/\//.test(a.uri ?? "")) issues.push(error("LINE_ACTIONS_VALID", `URI "${a.uri}" must be https`, at));
  });
  return issues;
}

function checkTraceability(dir: string, menu: LineRichMenuConfig, plan: WorkflowPlan, registry: CoreAssetRegistry): Issue[] {
  const { rows, issues } = traceButtons(plan, registry);
  const routesFile = path.join(dir, "gas/src/generated/routes.ts");
  const registryFile = path.join(dir, "gas/src/generated/registry.ts");
  const routes = fs.existsSync(routesFile) ? fs.readFileSync(routesFile, "utf8").replace(/\r\n/g, "\n") : "";
  const handlers = fs.existsSync(registryFile) ? fs.readFileSync(registryFile, "utf8") : "";
  rows.forEach((row, index) => {
    const area = menu.areas[index];
    const at = `button "${row.button}"`;
    if (!area || area.action.type !== row.lineAction) {
      issues.push(error("LINE_WORKFLOW_REFERENCES", `${at}: menu-config has ${area?.action.type ?? "no area"}, the menu asset says ${row.lineAction}`, "rich-menu/menu-config.json"));
      return;
    }
    if (row.lineAction === "uri") return;
    if (area.action.data !== row.target) issues.push(error("LINE_WORKFLOW_REFERENCES", `${at}: sends "${area.action.data}" but the workflow entry is "${row.target}"`, "rich-menu/menu-config.json"));
    if (!plan.selected.some((w) => row.workflow === `${w.id}@${w.version}`)) issues.push(error("LINE_WORKFLOW_REFERENCES", `${at}: ${row.workflow} is not a selected workflow version`, "workflow/selected-workflows.json"));
    const [wf, entry] = [row.workflow!.split("@")[0], row.entry!];
    const routeText = `"workflowId": "${wf}",\n    "entry": "${entry}"`;
    if (!routes.includes(routeText)) issues.push(error("LINE_WORKFLOW_REFERENCES", `${at}: no webhook route for ${wf}#${entry} in gas/src/generated/routes.ts`, "gas/src/generated/routes.ts"));
    const handler = row.gasHandler!;
    const id = path.basename(handler, ".ts");
    if (!fs.existsSync(path.join(dir, handler))) issues.push(error("LINE_WORKFLOW_REFERENCES", `${at}: GAS handler ${handler} is missing`, handler));
    if (!new RegExp(`\\{[^}]*\\b${id}\\b[^}]*\\}`).test(/REGISTRY: ActionRegistry = (\{[^}]*\})/.exec(handlers)?.[1] ?? "")) {
      issues.push(error("LINE_WORKFLOW_REFERENCES", `${at}: action ${id} is not in the generated GAS registry`, "gas/src/generated/registry.ts"));
    }
  });
  return issues;
}

// ------------------------------------------------------------- deployment

interface DeploymentJson {
  _meta?: { assets?: Record<string, string> };
  richMenu?: { name?: string; asset?: string; configSha256?: string; image?: { sha256?: string; bytes?: number } };
  webhook?: { topology?: string[]; proxy?: string };
  secrets?: { name: string }[];
}

const SERVER_ID = /richmenu-[0-9a-f]{32}/;

function checkDeployment(dir: string, deployment: DeploymentJson, menu: LineRichMenuConfig | null, record: ImageRecord | null, registry: CoreAssetRegistry): Issue[] {
  const issues: Issue[] = [];
  const at = DEPLOYMENT_FILE;
  const text = fs.readFileSync(path.join(dir, at), "utf8");
  if (menu) {
    if (deployment.richMenu?.name !== menu.name) issues.push(error("LINE_DEPLOYMENT_CONFIG", `rich menu name ${deployment.richMenu?.name} does not match menu-config (${menu.name})`, at));
    if (deployment.richMenu?.configSha256 !== payloadSha256(menu)) issues.push(error("LINE_DEPLOYMENT_CONFIG", "menu-config.json changed after deployment.json was generated; regenerate", at));
  }
  if (record && deployment.richMenu?.image?.sha256 !== record.sha256) issues.push(error("LINE_DEPLOYMENT_CONFIG", "image hash differs from rich-menu/image.json; regenerate", at));
  const asset = deployment.richMenu?.asset ?? "";
  const [menuId, menuVersion] = asset.split("@");
  if (!menuId || deployment._meta?.assets?.[menuId] !== menuVersion) issues.push(error("LINE_DEPLOYMENT_CONFIG", `rich menu ${asset} is not the version recorded in _meta.assets`, at));
  if (SERVER_ID.test(text)) issues.push(error("LINE_DEPLOYMENT_CONFIG", "contains a server-issued rich menu id; those belong in line/deployment-history.json only", at));
  const proxy = registry.lineProxy;
  if (!proxy || deployment.webhook?.proxy !== `${proxy.id}@${proxy.version}`) issues.push(error("LINE_WEBHOOK_CONFIG", `webhook proxy ${deployment.webhook?.proxy} is not the released ${proxy?.id}@${proxy?.version}`, at));
  const topology = (deployment.webhook?.topology ?? []).join(" -> ");
  if (!/LINE Platform -> .*x-line-signature.* -> GAS/.test(topology)) issues.push(error("LINE_WEBHOOK_CONFIG", "webhook topology must be LINE Platform -> verification proxy -> GAS", at));
  for (const name of ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN", "WEBHOOK_KEY", "GAS_WEBHOOK_KEY"]) {
    if (!(deployment.secrets ?? []).some((s) => s.name === name)) issues.push(error("LINE_DEPLOYMENT_CONFIG", `secret ${name} is not documented (name and location)`, at));
  }
  return issues;
}

function checkWebhook(dir: string, registry: CoreAssetRegistry): Issue[] {
  const issues: Issue[] = [];
  const dispatch = path.join(dir, "gas/src/router/dispatch.ts");
  if (!fs.existsSync(dispatch) || !/isAuthorizedWebhook\(queryKey, deps\.webhookKey\)/.test(fs.readFileSync(dispatch, "utf8"))) {
    issues.push(error("LINE_WEBHOOK_CONFIG", "GAS doPost does not require WEBHOOK_KEY for LINE deliveries", "gas/src/router/dispatch.ts"));
  }
  const proxy = registry.lineProxy;
  if (!proxy) return [...issues, error("LINE_PROXY_CONFIG", "core-assets/line-webhook-proxy is missing")];
  for (const rel of [...proxy.files, ...proxy.tests, "tsconfig.json"]) {
    const target = path.join(dir, WEBHOOK_DIR, rel);
    const source = path.join(registry.dir, LINE_PROXY_DIR, rel);
    if (!fs.existsSync(target)) issues.push(error("LINE_PROXY_CONFIG", `missing ${WEBHOOK_DIR}/${rel}`, WEBHOOK_DIR));
    else if (fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n")) {
      issues.push(error("LINE_PROXY_CONFIG", `${WEBHOOK_DIR}/${rel} differs from the released proxy ${proxy.id}@${proxy.version}`, `${WEBHOOK_DIR}/${rel}`));
    }
  }
  const example = path.join(dir, WEBHOOK_DIR, "wrangler.toml.example");
  if (!fs.existsSync(example)) issues.push(error("LINE_PROXY_CONFIG", `missing ${WEBHOOK_DIR}/wrangler.toml.example`, WEBHOOK_DIR));
  else {
    const toml = fs.readFileSync(example, "utf8");
    if (/^\s*\[vars\]/m.test(toml) || proxy.secrets.some((name) => new RegExp(`^\\s*${name}\\s*=`, "m").test(toml))) {
      issues.push(error("LINE_PROXY_CONFIG", "wrangler.toml.example sets a secret as a plain variable; use `wrangler secret put`", `${WEBHOOK_DIR}/wrangler.toml.example`));
    }
  }
  const ignore = path.join(dir, WEBHOOK_DIR, ".gitignore");
  if (!fs.existsSync(ignore) || !/^\.dev\.vars$/m.test(fs.readFileSync(ignore, "utf8"))) issues.push(error("LINE_PROXY_CONFIG", ".gitignore must exclude .dev.vars (local Worker secrets)", `${WEBHOOK_DIR}/.gitignore`));
  return issues;
}

// ---------------------------------------------------------------- secrets

const LINE_SECRET_PATTERNS: [string, RegExp][] = [
  ["LINE channel secret value", /(LINE_CHANNEL_SECRET|channel[_ ]?secret)["'\s]*[:=]\s*["']?[0-9a-f]{32}\b/i],
  ["LINE channel access token value", /LINE_CHANNEL_ACCESS_TOKEN["'\s]*[:=]\s*["']?[A-Za-z0-9+/=]{40,}/],
  ["webhook key value", /(GAS_)?WEBHOOK_KEY["'\s]*[:=]\s*["']?[A-Za-z0-9_-]{16,}/],
  ["GAS web app URL with its key", /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec\?key=/],
  ["Authorization header with a token", /Authorization["'\s:]+Bearer\s+[A-Za-z0-9+/=]{40,}/],
];

export function scanLineSecrets(dir: string): Issue[] {
  const issues: Issue[] = [];
  for (const rel of listFiles(dir, ["node_modules", "build", ".git", ".wrangler"])) {
    const base = path.basename(rel);
    if (base === ".dev.vars" || (base === "wrangler.toml" && rel.startsWith(`${WEBHOOK_DIR}/`) && /secret/i.test(fs.readFileSync(path.join(dir, rel), "utf8")))) {
      issues.push(error("LINE_SECRET_SCAN", `${rel} holds Worker secrets and must not be in the project`, rel));
      continue;
    }
    if (!/\.(ts|js|mjs|json|md|txt|toml|svg|example)$/.test(base)) continue;
    const text = fs.readFileSync(path.join(dir, rel), "utf8");
    for (const [label, pattern] of LINE_SECRET_PATTERNS) if (pattern.test(text)) issues.push(error("LINE_SECRET_SCAN", `possible ${label}`, rel));
  }
  return issues;
}

// ------------------------------------------------------------ levels 2-4

function runProxyTests(dir: string): { ok: boolean; output: string } {
  const webhookDir = path.join(dir, WEBHOOK_DIR);
  const insideFactory = path.resolve(dir).startsWith(FACTORY_ROOT + path.sep);
  if (!insideFactory && !fs.existsSync(path.join(webhookDir, "node_modules"))) {
    return { ok: false, output: "cannot resolve vitest: this project is outside the factory, so run `npm install` in line/webhook/ first" };
  }
  const vitest = path.join(FACTORY_ROOT, "node_modules/vitest/vitest.mjs");
  const result = spawnSync(process.execPath, [vitest, "run", "--root", "."], { cwd: webhookDir, encoding: "utf8", timeout: 120_000 });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
}

interface SmokeResult {
  ranAt?: string;
  environment?: string;
  result?: "PASS" | "FAIL";
  automated?: { check: string; status: string }[];
}

// ------------------------------------------------------------------ report

export function runLineQa(dir: string, registry: CoreAssetRegistry, options: LineQaOptions): LineQaReport & { logs: Record<string, string> } {
  const issues: Issue[] = [];
  const logs: Record<string, string> = {};
  const project = readJsonSafe<{ _meta?: { project?: string } }>(dir, "project.json", issues, "LINE_DEPLOYMENT_CONFIG");
  const plan = readJsonSafe<WorkflowPlan>(dir, "workflow/selected-workflows.json", issues, "LINE_WORKFLOW_REFERENCES");
  const menu = readJsonSafe<LineRichMenuConfig>(dir, "rich-menu/menu-config.json", issues, "LINE_ACTIONS_VALID");
  const spec = readJsonSafe<DesignSpec>(dir, "rich-menu/design-spec.json", issues, "LINE_IMAGE_READABLE");
  const record = readJsonSafe<ImageRecord>(dir, "rich-menu/image.json", issues, "LINE_IMAGE_EXISTS");
  const deployment = readJsonSafe<DeploymentJson>(dir, DEPLOYMENT_FILE, issues, "LINE_DEPLOYMENT_CONFIG");

  issues.push(...checkImage(dir, record, menu, spec));
  if (menu && spec) issues.push(...checkTiles(menu, spec, registry));
  if (menu) issues.push(...checkActions(menu));
  if (menu && plan) issues.push(...checkTraceability(dir, menu, plan, registry));
  if (deployment) issues.push(...checkDeployment(dir, deployment, menu, record, registry));
  issues.push(...checkWebhook(dir, registry));
  issues.push(...scanLineSecrets(dir));

  // Level 2: the GAS vitest run (factory QA) includes gas/tests/lineRuntime.test.ts.
  const runtimeTest = fs.existsSync(path.join(dir, "gas/tests/lineRuntime.test.ts"));
  if (!runtimeTest) issues.push(error("LINE_RUNTIME_TESTS", "gas/tests/lineRuntime.test.ts is missing", "gas/tests"));
  else if (options.gasTests?.ran && !options.gasTests.passed) issues.push(error("LINE_RUNTIME_TESTS", "the GAS test run failed (see qa/gas-checks.log)", "gas/"));

  // Level 3: proxy tests.
  let proxyRan = false;
  if (options.runChecks && fs.existsSync(path.join(dir, WEBHOOK_DIR))) {
    const result = runProxyTests(dir);
    logs["proxy-test"] = result.output;
    proxyRan = true;
    if (!result.ok) issues.push(error("LINE_PROXY_TESTS", `proxy tests failed:\n${result.output.split("\n").slice(-20).join("\n")}`, WEBHOOK_DIR));
  }

  // Level 4: only reported, never run here.
  const smokeFile = path.join(dir, SMOKE_RESULT_FILE);
  const smoke = fs.existsSync(smokeFile) ? readJson<SmokeResult>(smokeFile) : null;
  if (smoke?.result === "FAIL") issues.push(warning("LINE_LIVE_SMOKE", `the last live smoke test (${smoke.environment}, ${smoke.ranAt}) failed`, SMOKE_RESULT_FILE));

  const rules = registry.qaRules.get(LINE_QA_RULES)?.asset.rules ?? [];
  const notRun: Record<string, string | undefined> = {
    LINE_RUNTIME_TESTS: options.gasTests?.ran ? undefined : "not run (use --run-gas-checks)",
    LINE_PROXY_TESTS: proxyRan ? undefined : "not run (use --run-gas-checks)",
    LINE_LIVE_SMOKE: smoke ? undefined : "NOT RUN (needs a real test LINE Official Account: line-smoke-test --live)",
  };
  const checks: QaCheck[] = rules.map((rule) => {
    const found = issues.filter((i) => i.rule === rule.id);
    const skipped = notRun[rule.id];
    const status: QaCheck["status"] = found.some((i) => i.severity === "error") ? "fail" : found.length > 0 ? "warn" : skipped ? "skipped" : "pass";
    const details = found.length > 0 ? found.map((i) => `${i.message}${i.where ? ` (${i.where})` : ""}`) : skipped ? [skipped] : rule.id === "LINE_LIVE_SMOKE" && smoke ? [`RUN ${smoke.ranAt} on ${smoke.environment}: ${smoke.result}`] : [];
    return { rule: rule.id, area: rule.area, status, details };
  });
  for (const issue of issues.filter((i) => !rules.some((r) => r.id === i.rule))) {
    checks.push({ rule: issue.rule, area: "other", status: issue.severity === "error" ? "fail" : "warn", details: [issue.message] });
  }
  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
    skipped: checks.filter((c) => c.status === "skipped").length,
  };
  const levelOf = (ids: string[]) => {
    const selected = checks.filter((c) => ids.includes(c.rule));
    if (selected.some((c) => c.status === "fail")) return "FAIL" as const;
    return selected.every((c) => c.status === "skipped") ? ("NOT RUN" as const) : ("PASS" as const);
  };
  const level1 = rules.map((r) => r.id).filter((id) => !(id in notRun));
  const levels = [
    { level: 1, name: "Static LINE validation", status: levelOf(level1), note: "image, config, actions, traceability, deployment definition, secrets, webhook/proxy" },
    { level: 2, name: "Generated GAS LINE runtime tests", status: levelOf(["LINE_RUNTIME_TESTS"]), note: "gas/tests/lineRuntime.test.ts, in-memory Google services" },
    { level: 3, name: "Webhook proxy tests", status: levelOf(["LINE_PROXY_TESTS"]), note: "line/webhook/tests: signature and forwarding; the factory suite adds end-to-end proxy → GAS tests" },
    { level: 4, name: "Live LINE smoke test", status: smoke?.result ?? ("NOT RUN" as const), note: smoke ? `${smoke.environment} ${smoke.ranAt}` : "requires a real test account; never automatic" },
  ];
  return {
    project: project?._meta?.project ?? path.basename(dir),
    result: summary.fail > 0 ? "FAIL" : "PASS",
    summary,
    levels,
    checks,
    issues,
    logs,
  };
}

export function lineQaMarkdown(report: LineQaReport): string {
  const icon = { pass: "✅", fail: "❌", warn: "⚠️", skipped: "⏭️" } as const;
  const rows = report.checks.map((c) => `| ${icon[c.status]} ${c.status} | \`${c.rule}\` | ${c.details.join("<br>").replace(/\|/g, "\\|") || "—"} |`);
  return `# LINE Integration QA — ${report.project}

**Result: ${report.result}** · pass ${report.summary.pass} · fail ${report.summary.fail} · warn ${report.summary.warn} · skipped ${report.summary.skipped}

Separate from the factory QA (\`QA_REPORT.md\`). Rules: core-assets/qa-rules/${LINE_QA_RULES}.json.

| Level | Scope | Status | Note |
|---|---|---|---|
${report.levels.map((l) => `| ${l.level} | ${l.name} | **${l.status}** | ${l.note} |`).join("\n")}

| Status | Rule | Details |
|---|---|---|
${rows.join("\n")}

Live verification is reported only when \`line-smoke-test --live\` actually ran against a test
account (\`${SMOKE_RESULT_FILE}\`). Manual mobile checks: \`delivery/E2E_TEST.md\`. Server-issued ids: \`${HISTORY_FILE}\`.
`;
}
