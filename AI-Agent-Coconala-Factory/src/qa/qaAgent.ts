import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { WorkflowPlan } from "../agents/workflowPlanner";
import { DELIVERY_DOCS } from "../generators/delivery";
import { ENTRYPOINTS, GENERATED_GAS_FILES, selectedModules } from "../generators/gasProject";
import type { ArtifactMeta } from "../generators/meta";
import type { LineRichMenuConfig } from "../generators/richMenuConfig";
import type { ProjectSchema } from "../generators/spreadsheetSchema";
import { contrastRatio, WCAG_AA_NORMAL } from "../lib/contrast";
import { FACTORY_ROOT, listFiles, readJson } from "../lib/fsx";
import { error, Issue, warning } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import type { ColorTokens } from "../schemas/assets";
import { LINE_RICH_MENU_LIMITS, validateContrast, validateLayoutGeometry, validateSheets, validateWorkflow } from "../validation/rules";

/**
 * QA Agent: validates a generated client project on disk against the Core
 * Asset registry and writes qa/qa-report.json + qa/QA_REPORT.md. It reads
 * the artifacts, not the generator's memory, so it also catches hand edits
 * and partial copies.
 */

export interface QaCheck {
  rule: string;
  area: string;
  status: "pass" | "fail" | "warn" | "skipped";
  details: string[];
}

export interface QaReport {
  project: string;
  result: "PASS" | "FAIL";
  summary: { pass: number; fail: number; warn: number; skipped: number };
  checks: QaCheck[];
  issues: Issue[];
}

export interface QaOptions {
  /** Run tsc / vitest / esbuild inside gas/. Slower. Off in the factory's own unit tests. */
  runGasChecks: boolean;
}

function readArtifact<T>(dir: string, rel: string, issues: Issue[]): T | null {
  const file = path.join(dir, rel);
  if (!fs.existsSync(file)) {
    issues.push(error("DEL_ARTIFACTS", `missing artifact ${rel}`, rel));
    return null;
  }
  try {
    return readJson<T>(file);
  } catch {
    issues.push(error("DEL_ARTIFACTS", `artifact ${rel} is not valid JSON`, rel));
    return null;
  }
}

// ------------------------------------------------------------------ checks

function checkWorkflows(plan: WorkflowPlan, registry: CoreAssetRegistry, schema: ProjectSchema | null): Issue[] {
  const issues: Issue[] = [];
  const projectSheets = new Set(schema?.sheets.map((s) => s.name) ?? []);
  for (const selected of plan.selected) {
    const workflow = registry.workflows.get(selected.id)?.asset;
    if (!workflow) {
      issues.push(error("WF_EXISTS", `selected workflow ${selected.id} does not exist in the registry`, "workflow/selected-workflows.json"));
      continue;
    }
    if (workflow.version !== selected.version) issues.push(warning("WF_EXISTS", `project uses ${selected.id}@${selected.version}, registry now has ${workflow.version}`, "workflow/selected-workflows.json"));
    if (workflow.status !== "stable") issues.push(error("WF_EXISTS", `selected workflow ${selected.id} is ${workflow.status}`, "workflow/selected-workflows.json"));
    issues.push(...validateWorkflow(workflow, registry, `workflow ${selected.id}`));
    for (const sheet of workflow.spreadsheet.requiredSheets) {
      if (schema && !projectSheets.has(sheet)) issues.push(error("SS_REQUIRED_SHEETS", `workflow ${selected.id} needs sheet ${sheet}, missing from spreadsheet/schema.json`, "spreadsheet/schema.json"));
    }
    for (const ref of workflow.actions) {
      for (const sheet of registry.resolveAction(ref)?.dependencies.sheets ?? []) {
        if (schema && !projectSheets.has(sheet)) issues.push(error("WF_DEPENDENCIES", `action ${ref} needs sheet ${sheet}, missing from spreadsheet/schema.json`, "spreadsheet/schema.json"));
      }
    }
  }
  return issues;
}

function checkSpreadsheet(schema: ProjectSchema, seed: Record<string, string>): Issue[] {
  const issues = validateSheets(schema.sheets, schema.sheets, "spreadsheet/schema.json");
  const keys = schema.configKeys.map((k) => k.key);
  for (const key of new Set(keys.filter((k, i) => keys.indexOf(k) !== i))) issues.push(error("SS_DUPLICATE_COLUMNS", `CONFIG key ${key} is declared twice`, "spreadsheet/schema.json"));
  for (const key of schema.configKeys) {
    if (key.required && key.default === undefined && !(key.key in seed)) {
      issues.push(warning("SS_REQUIRED_CONFIG", `required CONFIG key ${key.key} has no value yet. The owner must fill it in (see SETUP.md)`, "spreadsheet/config-seed.json"));
    }
  }
  return issues;
}

function parseData(data: string): Record<string, string> {
  return Object.fromEntries(data.split("&").filter(Boolean).map((pair) => pair.split("=").map(decodeURIComponent) as [string, string]));
}

function checkRichMenu(menu: LineRichMenuConfig, plan: WorkflowPlan, registry: CoreAssetRegistry): Issue[] {
  const where = "rich-menu/menu-config.json";
  const issues = validateLayoutGeometry(menu.size, menu.areas.map((a, i) => ({ id: `area${i + 1}`, bounds: a.bounds })), where);
  if (!menu.chatBarText || menu.chatBarText.length > LINE_RICH_MENU_LIMITS.maxChatBarText) issues.push(error("RM_LABELS", "chatBarText must be 1-14 characters", where));
  const reached = new Set<string>();
  menu.areas.forEach((area, index) => {
    const label = area.action.label;
    const at = `${where} area ${index + 1}`;
    if (!label || !label.trim()) issues.push(error("RM_LABELS", "button has no label", at));
    const type = area.action.type;
    if (type === "uri") {
      if (!/^https:\/\//.test(area.action.uri ?? "")) issues.push(error("RM_ACTIONS_VALID", `"${label}" URI must start with https://`, at));
      if (/example\.com\/TODO/.test(area.action.uri ?? "")) issues.push(error("RM_ACTIONS_VALID", `"${label}" still has a placeholder URL`, at));
      return;
    }
    if (type !== "postback" && type !== "datetimepicker") {
      issues.push(error("RM_ACTIONS_VALID", `"${label}" has unsupported action type ${type}`, at));
      return;
    }
    const data = area.action.data ?? "";
    if (data.length > LINE_RICH_MENU_LIMITS.maxPostbackData) issues.push(error("RM_POSTBACK_LENGTH", `"${label}" postback data is ${data.length} chars (max 300)`, at));
    const { wf, e = "default" } = parseData(data);
    const selected = plan.selected.find((w) => w.id === wf);
    const workflow = registry.workflows.get(wf ?? "")?.asset;
    if (!selected || !workflow) {
      issues.push(error("RM_ACTIONS_VALID", `"${label}" references workflow "${wf}", which is not a selected workflow`, at));
      return;
    }
    const entry = workflow.entries[e];
    if (!entry) issues.push(error("RM_ACTIONS_VALID", `"${label}" references entry "${e}", which ${wf} does not have`, at));
    else if (entry.type !== type) issues.push(error("RM_ACTIONS_VALID", `"${label}" is a ${type} button but ${wf}#${e} expects ${entry.type}`, at));
    reached.add(wf);
  });
  for (const w of plan.selected) if (!reached.has(w.id)) issues.push(error("RM_REQUIRED_BUTTONS", `no button opens selected workflow ${w.id}`, where));
  return issues;
}

function checkDesign(spec: { colorTokens: ColorTokens; cells: { label: string; fill: string; labelColor: string }[] }): Issue[] {
  const issues = validateContrast(spec.colorTokens, "rich-menu/design-spec.json");
  for (const cell of spec.cells) {
    const ratio = contrastRatio(cell.labelColor, cell.fill);
    if (ratio < WCAG_AA_NORMAL) issues.push(error("DS_CONTRAST", `"${cell.label}" label contrast ${ratio}:1 is below ${WCAG_AA_NORMAL}:1`, "rich-menu/design-spec.json"));
  }
  return issues;
}

export const FACTORY_QA_RULES = "qa-rules-v1";

const IMPORT_PATTERN = /(?:from|import)\s+["'](\.{1,2}\/[^"']+)["']/g;

function checkGasFiles(dir: string, plan: WorkflowPlan, registry: CoreAssetRegistry): Issue[] {
  const issues: Issue[] = [];
  const gasDir = path.join(dir, "gas");
  const modules = selectedModules(plan, registry);
  const expected = [...GENERATED_GAS_FILES, ...modules.flatMap((m) => [...m.files, ...m.tests])];
  for (const rel of expected) if (!fs.existsSync(path.join(gasDir, rel))) issues.push(error("GAS_FILES", `missing gas/${rel}`, "gas/"));

  for (const rel of listFiles(gasDir).filter((f) => f.endsWith(".ts") && !f.startsWith("build/"))) {
    const text = fs.readFileSync(path.join(gasDir, rel), "utf8");
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const target = path.resolve(path.dirname(path.join(gasDir, rel)), match[1]);
      if (![".ts", "/index.ts", ""].some((ext) => fs.existsSync(target + ext) && fs.statSync(target + ext).isFile())) {
        issues.push(error("GAS_IMPORTS", `gas/${rel} imports ${match[1]}, which does not exist`, `gas/${rel}`));
      }
    }
  }

  const registryFile = path.join(gasDir, "src/generated/registry.ts");
  if (fs.existsSync(registryFile)) {
    const text = fs.readFileSync(registryFile, "utf8");
    const registered = /REGISTRY: ActionRegistry = \{([^}]*)\}/.exec(text)?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    const wanted = [...new Set(plan.selected.flatMap((w) => w.actions.map((ref) => ref.split("@")[0])))];
    for (const id of wanted) if (!registered.includes(id)) issues.push(error("GAS_REGISTRY", `action ${id} is not in the generated registry`, "gas/src/generated/registry.ts"));
    for (const id of registered) if (!wanted.includes(id)) issues.push(error("GAS_REGISTRY", `registry has ${id}, which no selected workflow uses`, "gas/src/generated/registry.ts"));
  }

  const tests = listFiles(path.join(gasDir, "tests")).filter((f) => f.endsWith(".test.ts"));
  if (!tests.includes("generated.test.ts")) issues.push(error("GAS_TESTS_EXIST", "gas/tests/generated.test.ts is missing", "gas/tests"));
  for (const module of modules) {
    if (module.tests.filter((t) => t.endsWith(".test.ts")).length === 0) issues.push(warning("GAS_TESTS_EXIST", `module ${module.id} ships no tests`, "gas/tests"));
  }
  return issues;
}

function run(command: string[], cwd: string): { ok: boolean; output: string } {
  const result = spawnSync(process.execPath, command, { cwd, encoding: "utf8", timeout: 180_000 });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
}

function runGasChecks(dir: string): { issues: Issue[]; logs: Record<string, string> } {
  const gasDir = path.join(dir, "gas");
  const issues: Issue[] = [];
  const logs: Record<string, string> = {};
  const insideFactory = path.resolve(dir).startsWith(FACTORY_ROOT + path.sep);
  if (!insideFactory && !fs.existsSync(path.join(gasDir, "node_modules"))) {
    const message = "cannot resolve the GAS toolchain: this project is outside the factory, so run `npm install` in gas/ first";
    return { issues: ["GAS_TYPECHECK", "GAS_TESTS_PASS", "GAS_BUILD"].map((rule) => error(rule, message, "gas/")), logs: {} };
  }
  const nm = path.join(FACTORY_ROOT, "node_modules");
  const tsc = run([path.join(nm, "typescript/bin/tsc"), "--noEmit", "-p", "tsconfig.json"], gasDir);
  logs.typecheck = tsc.output;
  if (!tsc.ok) issues.push(error("GAS_TYPECHECK", `tsc failed:\n${tsc.output.split("\n").slice(0, 20).join("\n")}`, "gas/"));
  const test = run([path.join(nm, "vitest/vitest.mjs"), "run", "--root", "."], gasDir);
  logs.test = test.output;
  if (!test.ok) issues.push(error("GAS_TESTS_PASS", `vitest failed:\n${test.output.split("\n").slice(-25).join("\n")}`, "gas/"));
  const build = run(["esbuild.config.mjs"], gasDir);
  logs.build = build.output;
  const bundle = path.join(gasDir, "build/Code.js");
  if (!build.ok || !fs.existsSync(bundle)) {
    issues.push(error("GAS_BUILD", `esbuild failed:\n${build.output}`, "gas/"));
  } else {
    const code = fs.readFileSync(bundle, "utf8");
    for (const name of ENTRYPOINTS) {
      if (!new RegExp(`^function ${name}\\(`, "m").test(code)) issues.push(error("GAS_BUILD", `build/Code.js has no top-level function ${name}()`, "gas/build/Code.js"));
    }
  }
  return { issues, logs };
}

const SECRET_PATTERNS: [string, RegExp][] = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
  ["Slack token", /xox[baprs]-[0-9A-Za-z-]{10,}/],
  ["long bearer token", /Bearer\s+[A-Za-z0-9+/=_-]{40,}/],
  ["LINE channel access token", /["'][A-Za-z0-9+/]{150,}={0,2}["']/],
];
/** `secretName: "value"` where the value is not just an UPPER_SNAKE constant name (e.g. a Script Property key). */
const SECRET_ASSIGNMENT = /(channelSecret|channel_secret|accessToken|access_token|apiKey|api_key|webhook_key|clientSecret)["']?\s*[:=]\s*["']([A-Za-z0-9+/=_-]{16,})["']/gi;
const ALLOWED_EMAIL_DOMAINS = /@(example\.(com|jp|org|net)|.*\.example)$/i;

export function scanForSecrets(dir: string): Issue[] {
  const issues: Issue[] = [];
  for (const rel of listFiles(dir, ["node_modules", "build", ".git"])) {
    const base = path.basename(rel);
    if (base === ".clasp.json" || base === ".clasprc.json" || base === ".env" || /^\.env\./.test(base)) {
      issues.push(error("SEC_NO_SECRETS", `${rel} must not be in the project (per-environment secret file)`, rel));
      continue;
    }
    if (!/\.(ts|js|mjs|json|md|txt|gs|html)$/.test(base)) continue;
    const text = fs.readFileSync(path.join(dir, rel), "utf8");
    for (const [label, pattern] of SECRET_PATTERNS) if (pattern.test(text)) issues.push(error("SEC_NO_SECRETS", `possible ${label} found`, rel));
    for (const match of text.matchAll(SECRET_ASSIGNMENT)) {
      if (!/^[A-Z0-9_]+$/.test(match[2])) issues.push(error("SEC_NO_SECRETS", `possible hard-coded secret in "${match[1]}"`, rel));
    }
    if (rel.startsWith("gas/")) {
      for (const email of text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) {
        if (!ALLOWED_EMAIL_DOMAINS.test(email)) issues.push(warning("SEC_NO_REAL_PII", `email address ${email} in generated code/tests. Use example.com addresses only`, rel));
      }
    }
  }
  return issues;
}

function checkDelivery(dir: string, artifacts: string[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of DELIVERY_DOCS) {
    const file = path.join(dir, doc);
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").trim().length < 200) issues.push(error("DEL_DOCS", `${doc} is missing or empty`, doc));
  }
  for (const rel of artifacts.filter((a) => !a.startsWith("qa/"))) {
    if (!fs.existsSync(path.join(dir, rel))) issues.push(error("DEL_ARTIFACTS", `artifact ${rel} listed in project.json is missing`, rel));
  }
  const required: (keyof ArtifactMeta)[] = ["project", "industry", "workflows", "assets", "factoryVersion"];
  for (const rel of artifacts.filter((a) => a.endsWith(".json") && !a.startsWith("qa/") && a !== "brief/brief.json")) {
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) continue;
    const metaBlock = (readJson<{ _meta?: Partial<ArtifactMeta> }>(file) ?? {})._meta;
    const missing = required.filter((k) => !metaBlock || metaBlock[k] === undefined);
    if (missing.length > 0) issues.push(error("DEL_TRACEABILITY", `${rel} _meta is missing ${missing.join(", ")}`, rel));
  }
  return issues;
}

// ------------------------------------------------------------------ report

export function runQa(dir: string, registry: CoreAssetRegistry, options: QaOptions): QaReport & { logs: Record<string, string> } {
  const issues: Issue[] = [];
  const project = readArtifact<{ _meta: ArtifactMeta; artifacts: string[] }>(dir, "project.json", issues);
  const plan = readArtifact<WorkflowPlan>(dir, "workflow/selected-workflows.json", issues);
  const schema = readArtifact<ProjectSchema>(dir, "spreadsheet/schema.json", issues);
  const seed = readArtifact<{ values: Record<string, string> }>(dir, "spreadsheet/config-seed.json", issues);
  const menu = readArtifact<LineRichMenuConfig>(dir, "rich-menu/menu-config.json", issues);
  const design = readArtifact<{ colorTokens: ColorTokens; cells: { label: string; fill: string; labelColor: string }[] }>(dir, "rich-menu/design-spec.json", issues);

  if (plan) issues.push(...checkWorkflows(plan, registry, schema));
  if (schema) issues.push(...checkSpreadsheet(schema, seed?.values ?? {}));
  if (menu && plan) issues.push(...checkRichMenu(menu, plan, registry));
  if (design) issues.push(...checkDesign(design));
  if (plan) issues.push(...checkGasFiles(dir, plan, registry));
  issues.push(...scanForSecrets(dir));
  if (project) issues.push(...checkDelivery(dir, project.artifacts ?? []));

  let logs: Record<string, string> = {};
  const gasRuleIds = ["GAS_TYPECHECK", "GAS_TESTS_PASS", "GAS_BUILD"];
  const gasFilesOk = !issues.some((i) => i.severity === "error" && (i.rule === "GAS_FILES" || i.rule === "GAS_IMPORTS"));
  let gasChecksRan = false;
  if (options.runGasChecks && gasFilesOk) {
    const result = runGasChecks(dir);
    issues.push(...result.issues);
    logs = result.logs;
    gasChecksRan = true;
  }

  // The Phase 1 factory QA catalog. LINE integration QA has its own catalog (src/qa/lineQa.ts).
  const rules = registry.qaRules.get(FACTORY_QA_RULES)?.asset.rules ?? [];
  const checks: QaCheck[] = rules.map((rule) => {
    const found = issues.filter((i) => i.rule === rule.id);
    const skipped = gasRuleIds.includes(rule.id) && !gasChecksRan;
    const status: QaCheck["status"] = found.some((i) => i.severity === "error") ? "fail" : found.length > 0 ? "warn" : skipped ? "skipped" : "pass";
    return { rule: rule.id, area: rule.area, status, details: skipped && found.length === 0 ? ["not run (use --run-gas-checks)"] : found.map((i) => `${i.message}${i.where ? ` (${i.where})` : ""}`) };
  });
  // Issues whose rule is not in the catalog still count.
  const unknown = issues.filter((i) => !rules.some((r) => r.id === i.rule));
  for (const issue of unknown) checks.push({ rule: issue.rule, area: "other", status: issue.severity === "error" ? "fail" : "warn", details: [issue.message] });

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
    skipped: checks.filter((c) => c.status === "skipped").length,
  };
  return { project: project?._meta.project ?? path.basename(dir), result: summary.fail > 0 ? "FAIL" : "PASS", summary, checks, issues, logs };
}

export function qaReportMarkdown(report: QaReport): string {
  const icon = { pass: "✅", fail: "❌", warn: "⚠️", skipped: "⏭️" } as const;
  const rows = report.checks.map((c) => `| ${icon[c.status]} ${c.status} | \`${c.rule}\` | ${c.area} | ${c.details.join("<br>").replace(/\|/g, "\\|") || "—"} |`);
  return `# QA Report — ${report.project}

**Result: ${report.result}** · pass ${report.summary.pass} · fail ${report.summary.fail} · warn ${report.summary.warn} · skipped ${report.summary.skipped}

Generated by the QA Agent from the artifacts on disk (rules: core-assets/qa-rules/qa-rules-v1.json).

| Status | Rule | Area | Details |
|---|---|---|---|
${rows.join("\n")}
`;
}
