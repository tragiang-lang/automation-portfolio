import fs from "node:fs";
import path from "node:path";
import type { DesignSpec } from "./agents/designAgent";
import { parseBrief, runPipeline } from "./agents/orchestrator";
import { existingCreatedOn, writeProject } from "./generators/projectWriter";
import { FACTORY_ROOT, hashBytes, readJson, writeFile } from "./lib/fsx";
import { formatIssues, hasErrors, Issue } from "./lib/issues";
import { HISTORY_FILE, SMOKE_RESULT_FILE } from "./line/definition";
import {
  ENVIRONMENTS,
  Environment,
  executeDelete,
  executeDeploy,
  executeRollback,
  formatPlan,
  lastDeploy,
  parseEnvironment,
  planDeploy,
  planRollback,
  readHistory,
  remoteStatus,
  runSmokeTest,
} from "./line/deploy";
import { createLineApi, LineApi } from "./line/lineApi";
import { createProject, projectDirFor, writeQa } from "./project";
import { runLineQa } from "./qa/lineQa";
import type { QaCheck } from "./qa/qaAgent";
import { updateLock } from "./registry/assetLock";
import { CoreAssetRegistry } from "./registry/registry";
import { ImageRecord, localRenderer } from "./richMenu/renderer";
import { validateAssets } from "./validation/validateAssets";

/**
 * Minimal, deterministic factory CLI. `npm run factory -- <command> [options]`.
 * No prompts. Network only in the line-* commands, and only with an explicit
 * --live (or --remote for read-only status). Every command's exit code says
 * whether it succeeded.
 */

const HELP = `AI-Agent-Coconala-Factory (Phase 1 + LINE Automation v1)

Usage: npm run factory -- <command> [options]

  audit                      Summarize the Core Asset library (counts, versions, lock status)
  list-industries            List industry profiles
  list-workflows             List workflows with their actions and status
  list-actions               List the Action Registry
  validate                   Validate every Core Asset (schemas, references, contrast, lock)
  lock-assets                Release new or version-bumped assets into core-assets/asset-lock.json
  create-project --brief <file> [--force] [--skip-gas-checks]
                             Run the full pipeline into projects/<year>/<slug>/ and QA it
  generate-gas --brief <file> [--force]
                             Regenerate an existing project's artifacts (incl. gas/) from its brief
  generate-rich-menu-spec --brief <file> [--out <dir>]
                             Write design-spec.json + menu-config.json only (default: output/<slug>/)
  qa --project <dir> [--run-gas-checks]
                             Re-run the factory QA and the LINE QA on a project directory
  render-rich-menu --project <dir> [--out <dir>]
                             Re-render rich-menu.png from design-spec.json into output/ and
                             compare it byte for byte with the project's image (determinism)

LINE deployment (dry run unless --live; token from the LINE_CHANNEL_ACCESS_TOKEN env var):
  line-validate --project <dir> [--run-tests]
                             Run the LINE QA without writing reports
  line-deploy --project <dir> --env <test|production> [--live]
                             Create + upload + set default rich menu; never deletes
  line-status --project <dir> [--remote --env <env>]
                             Recorded deployments; --remote compares with LINE (read-only)
  line-rollback --project <dir> --env <env> [--live]
                             Set the previous default rich menu back
  line-delete --project <dir> --env <env> --rich-menu-id <id> [--live]
                             Delete one rich menu (refuses the current default)
  line-smoke-test --project <dir> --env test --live
                             Automated live checks on a TEST account (never production)
`;

function projectArg(args: string[]): string {
  const dir = arg(args, "project");
  if (!dir) throw new Error("--project <dir> is required");
  const resolved = path.resolve(dir);
  if (!fs.existsSync(path.join(resolved, "project.json"))) throw new Error(`${dir} is not a factory project (no project.json)`);
  return resolved;
}

function envArg(args: string[]): Environment {
  const environment = parseEnvironment(arg(args, "env"));
  if (!environment) throw new Error(`--env <${ENVIRONMENTS.join("|")}> is required`);
  return environment;
}

/** The only place the CLI reads the channel access token. It is never printed or written. */
function lineApiFromEnv(): LineApi {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("set LINE_CHANNEL_ACCESS_TOKEN in the environment (never in a file) to use --live/--remote");
  return createLineApi(token);
}

function printReport(label: string, report: { result: string; summary: { pass: number; fail: number; warn: number; skipped: number }; checks: QaCheck[] }): void {
  console.log(`${label}: ${report.result} (pass ${report.summary.pass}, fail ${report.summary.fail}, warn ${report.summary.warn}, skipped ${report.summary.skipped})`);
  for (const check of report.checks.filter((c) => c.status === "fail" || c.status === "warn")) console.log(`  ${check.status} ${check.rule}: ${check.details.join("; ")}`);
}

function arg(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}

function flag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

function print(issues: Issue[]): void {
  if (issues.length > 0) console.log(formatIssues(issues));
}

function loadBrief(args: string[]): unknown {
  const file = arg(args, "brief");
  if (!file) throw new Error("--brief <file> is required");
  return readJson(path.resolve(file));
}

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  const registry = CoreAssetRegistry.load();

  switch (command) {
    case "audit": {
      const issues = validateAssets(registry);
      const rows: [string, number][] = [
        ["industries", registry.industries.size],
        ["workflows", registry.workflows.size],
        ["actions", registry.actions.size],
        ["spreadsheet schemas", registry.schemas.size],
        ["rich menu layouts", registry.layouts.size],
        ["rich menus", registry.menus.size],
        ["design presets", registry.presets.size],
        ["gas modules", registry.gasModules?.modules.length ?? 0],
      ];
      console.log("Core Assets");
      for (const [label, count] of rows) console.log(`  ${label.padEnd(22)} ${count}`);
      console.log(`  ${"validation".padEnd(22)} ${issues.filter((i) => i.severity === "error").length} error(s), ${issues.filter((i) => i.severity === "warning").length} warning(s)`);
      console.log("\nReference-project audit (read-only, Phase 1A): docs/reusable-assets-audit.md");
      return hasErrors(issues) ? 1 : 0;
    }
    case "list-industries":
      for (const { asset } of registry.industries.values()) {
        console.log(`${asset.industry.padEnd(14)} ${`${asset.id}@${asset.version}`.padEnd(24)} menu=${asset.recommendedRichMenu}  workflows=${asset.recommendedWorkflows.join(",")}`);
      }
      return 0;
    case "list-workflows":
      for (const { asset } of registry.workflows.values()) {
        console.log(`${`${asset.id}@${asset.version}`.padEnd(28)} ${asset.status.padEnd(8)} actions=${asset.actions.join(",")}  entries=${Object.keys(asset.entries).join(",")}`);
      }
      return 0;
    case "list-actions":
      for (const [key, { asset }] of registry.actions) {
        console.log(`${key.padEnd(22)} v${asset.version.padEnd(7)} ${asset.status.padEnd(10)} exposure=${asset.exposure.join(",") || "-"}  module=${asset.gas?.module ?? "-"}`);
      }
      return 0;
    case "validate": {
      const issues = validateAssets(registry);
      print(issues);
      console.log(hasErrors(issues) ? "\nvalidate: FAIL" : `\nvalidate: OK (${issues.length} warning(s))`);
      return hasErrors(issues) ? 1 : 0;
    }
    case "lock-assets": {
      const { added, updated, blocked } = updateLock(registry);
      if (blocked.length > 0) {
        print(blocked);
        console.log("\nlock-assets: refused. Fix the errors above first");
        return 1;
      }
      console.log(`lock-assets: ${added.length} added, ${updated.length} updated`);
      return 0;
    }
    case "create-project": {
      const assetIssues = validateAssets(registry).filter((i) => i.severity === "error");
      if (assetIssues.length > 0) {
        print(assetIssues);
        console.log("\ncreate-project: Core Assets are invalid; run `validate`");
        return 1;
      }
      const result = createProject(loadBrief(args), registry, { force: flag(args, "force"), runGasChecks: !flag(args, "skip-gas-checks") });
      print(result.issues);
      if (!result.qa) {
        console.log("\ncreate-project: FAIL (nothing written)");
        return 1;
      }
      console.log(`\nwrote ${result.written.length} file(s) to ${path.relative(FACTORY_ROOT, result.projectDir!)}${result.removed.length ? `, removed ${result.removed.length} stale file(s)` : ""}`);
      printReport("QA", result.qa);
      printReport("LINE QA", result.lineQa!);
      return result.qa.result === "PASS" && result.lineQa!.result === "PASS" ? 0 : 1;
    }
    case "generate-gas": {
      // Regeneration of an existing project: the same pipeline, forced, limited to files it owns.
      const { brief, issues } = parseBrief(loadBrief(args));
      if (!brief) {
        print(issues);
        return 1;
      }
      const dir = projectDirFor(brief.project.year, brief.project.slug);
      if (!fs.existsSync(path.join(dir, "project.json"))) {
        console.log(`generate-gas: ${dir} is not an existing project; use create-project`);
        return 1;
      }
      const result = runPipeline(brief, registry, { createdOn: existingCreatedOn(dir)! });
      print(result.issues);
      if (hasErrors(result.issues)) return 1;
      const { written, removed } = writeProject(dir, brief.project.slug, result.files, { force: true }, result.binaries);
      const { qa, lineQa, passed } = writeQa(dir, registry, flag(args, "run-gas-checks"));
      console.log(`generate-gas: wrote ${written.length} file(s) (${written.filter((f) => f.startsWith("gas/")).length} in gas/), removed ${removed.length}; QA ${qa.result}; LINE QA ${lineQa.result}`);
      return passed ? 0 : 1;
    }
    case "generate-rich-menu-spec": {
      const { brief, issues } = parseBrief(loadBrief(args));
      if (!brief) {
        print(issues);
        return 1;
      }
      const result = runPipeline(brief, registry, { createdOn: brief.project.createdOn ?? new Date().toISOString().slice(0, 10) });
      print(result.issues);
      if (hasErrors(result.issues)) return 1;
      const out = path.resolve(arg(args, "out") ?? path.join(FACTORY_ROOT, "output", brief.project.slug));
      for (const rel of ["rich-menu/design-spec.json", "rich-menu/menu-config.json"]) writeFile(path.join(out, path.basename(rel)), result.files[rel]);
      console.log(`generate-rich-menu-spec: wrote design-spec.json and menu-config.json to ${out}`);
      return 0;
    }
    case "qa": {
      const dir = arg(args, "project");
      if (!dir) throw new Error("--project <dir> is required");
      const { qa, lineQa, passed } = writeQa(path.resolve(dir), registry, flag(args, "run-gas-checks"));
      printReport("QA", qa);
      printReport("LINE QA", lineQa);
      console.log(`reports: ${path.join(dir, "qa/QA_REPORT.md")}, ${path.join(dir, "qa/LINE_QA_REPORT.md")}`);
      return passed ? 0 : 1;
    }
    case "render-rich-menu": {
      // Renders from the project's design-spec.json into output/ (never into the project) and compares.
      const dir = projectArg(args);
      const spec = readJson<DesignSpec>(path.join(dir, "rich-menu/design-spec.json"));
      const rendered = localRenderer.render(spec);
      print(rendered.issues);
      const out = path.resolve(arg(args, "out") ?? path.join(FACTORY_ROOT, "output", path.basename(dir)));
      writeFile(path.join(out, "rich-menu.png"), rendered.png);
      writeFile(path.join(out, "preview.svg"), rendered.svg);
      const record = readJson<ImageRecord>(path.join(dir, "rich-menu/image.json"));
      const sha = hashBytes(rendered.png);
      const same = sha === record.sha256;
      console.log(`render-rich-menu: ${spec.canvas.width}x${spec.canvas.height} PNG, ${rendered.png.length} bytes, sha256 ${sha}`);
      console.log(`  written to ${out}`);
      console.log(`  project image.json sha256 ${record.sha256}: ${same ? "IDENTICAL (deterministic)" : "DIFFERENT (regenerate the project with generate-gas)"}`);
      return same && !hasErrors(rendered.issues) ? 0 : 1;
    }
    case "line-validate": {
      const dir = projectArg(args);
      const report = runLineQa(dir, registry, { runChecks: flag(args, "run-tests") });
      printReport("LINE QA (not written to disk)", report);
      return report.result === "PASS" ? 0 : 1;
    }
    case "line-deploy": {
      const dir = projectArg(args);
      const environment = envArg(args);
      const plan = planDeploy(dir, registry, environment);
      console.log(formatPlan(plan));
      if (plan.blocked.length > 0) {
        print(plan.blocked);
        console.log("\nline-deploy: BLOCKED by LINE QA errors. Nothing was sent to LINE.");
        return 1;
      }
      if (!flag(args, "live")) {
        console.log("\nline-deploy: DRY RUN. No API call was made. Add --live to deploy.");
        return 0;
      }
      const entry = await executeDeploy(plan, lineApiFromEnv());
      console.log(`\nline-deploy: ${entry.status.toUpperCase()}${entry.richMenuId ? ` richMenuId=${entry.richMenuId}` : ""}${entry.failedStep ? ` at step "${entry.failedStep}": ${entry.error}` : ""}`);
      if (entry.status === "failed" && entry.richMenuId) console.log(`  the partly created menu is recorded; remove it with: line-delete --project ${dir} --env ${environment} --rich-menu-id ${entry.richMenuId} --live`);
      console.log(`  recorded in ${HISTORY_FILE}; previous default: ${entry.previousDefaultRichMenuId ?? "(none)"}`);
      return entry.status === "succeeded" ? 0 : 1;
    }
    case "line-status": {
      const dir = projectArg(args);
      const history = readHistory(dir);
      for (const environment of ENVIRONMENTS) {
        const last = lastDeploy(history, environment);
        console.log(`${environment.padEnd(11)} ${last ? `${last.operation} ${last.at} richMenuId=${last.richMenuId} (${last.richMenuAsset ?? last.richMenuName ?? ""})` : "never deployed"}`);
      }
      const failed = history.entries.filter((e) => e.status === "failed").length;
      if (failed > 0) console.log(`${failed} failed operation(s) recorded in ${HISTORY_FILE}`);
      if (flag(args, "remote")) for (const line of await remoteStatus(dir, envArg(args), lineApiFromEnv())) console.log(line);
      return 0;
    }
    case "line-rollback": {
      const dir = projectArg(args);
      const plan = planRollback(dir, envArg(args));
      console.log(`rollback ${plan.environment}: default ${plan.from ?? "?"} → ${plan.to ?? "(nothing)"}`);
      if (!plan.to) {
        console.log(`line-rollback: not possible: ${plan.reason}`);
        return 1;
      }
      if (!flag(args, "live")) {
        console.log("line-rollback: DRY RUN. Add --live to switch the default rich menu back. Nothing is deleted.");
        return 0;
      }
      const entry = await executeRollback(dir, plan, lineApiFromEnv());
      console.log(`line-rollback: ${entry.status.toUpperCase()}${entry.error ? `: ${entry.error}` : ""}`);
      return entry.status === "succeeded" ? 0 : 1;
    }
    case "line-delete": {
      const dir = projectArg(args);
      const environment = envArg(args);
      const id = arg(args, "rich-menu-id");
      if (!id) throw new Error("--rich-menu-id <id> is required");
      if (!flag(args, "live")) {
        console.log(`line-delete: DRY RUN. Would delete ${id} on ${environment} unless it is the current default. Add --live.`);
        return 0;
      }
      const entry = await executeDelete(dir, environment, id, lineApiFromEnv());
      console.log(`line-delete: deleted ${entry.richMenuId}`);
      return 0;
    }
    case "line-smoke-test": {
      const dir = projectArg(args);
      const environment = envArg(args);
      if (environment === "production") throw new Error("line-smoke-test never runs against production; use --env test with a test LINE Official Account");
      if (!flag(args, "live")) {
        console.log("line-smoke-test: NOT RUN. It calls a real test LINE Official Account; add --live and set LINE_CHANNEL_ACCESS_TOKEN.");
        console.log("Manual mobile checks: delivery/E2E_TEST.md");
        return 0;
      }
      const report = await runSmokeTest(dir, environment, lineApiFromEnv());
      for (const c of report.automated) console.log(`  ${c.status.padEnd(6)} ${c.check} (${c.detail})`);
      console.log(`line-smoke-test: automated checks ${report.result}; written to ${SMOKE_RESULT_FILE}. Manual checks still required (E2E_TEST.md).`);
      return report.result === "PASS" ? 0 : 1;
    }
    default:
      console.log(HELP);
      return command ? 1 : 0;
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (cause) => {
    console.error(`factory: ${(cause as Error).message}`);
    process.exitCode = 1;
  },
);

