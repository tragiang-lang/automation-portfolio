import fs from "node:fs";
import path from "node:path";
import { parseBrief, runPipeline } from "./agents/orchestrator";
import { existingCreatedOn, writeProject } from "./generators/projectWriter";
import { FACTORY_ROOT, readJson, writeFile } from "./lib/fsx";
import { formatIssues, hasErrors, Issue } from "./lib/issues";
import { createProject, projectDirFor, writeQa } from "./project";
import { updateLock } from "./registry/assetLock";
import { CoreAssetRegistry } from "./registry/registry";
import { validateAssets } from "./validation/validateAssets";

/**
 * Minimal, deterministic factory CLI. `npm run factory -- <command> [options]`.
 * No prompts and no network. Every command's exit code says whether it succeeded.
 */

const HELP = `AI-Agent-Coconala-Factory (Phase 1)

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
                             Re-run the QA Agent on a project directory
`;

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

function main(argv: string[]): number {
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
      console.log(`QA: ${result.qa.result} (pass ${result.qa.summary.pass}, fail ${result.qa.summary.fail}, warn ${result.qa.summary.warn}, skipped ${result.qa.summary.skipped})`);
      for (const check of result.qa.checks.filter((c) => c.status === "fail" || c.status === "warn")) console.log(`  ${check.status} ${check.rule}: ${check.details.join("; ")}`);
      return result.qa.result === "PASS" ? 0 : 1;
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
      const { written, removed } = writeProject(dir, brief.project.slug, result.files, { force: true });
      const qa = writeQa(dir, registry, flag(args, "run-gas-checks"));
      console.log(`generate-gas: wrote ${written.filter((f) => f.startsWith("gas/")).length} gas file(s), removed ${removed.length}; QA ${qa.result}`);
      return qa.result === "PASS" ? 0 : 1;
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
      const report = writeQa(path.resolve(dir), registry, flag(args, "run-gas-checks"));
      console.log(`QA: ${report.result} (pass ${report.summary.pass}, fail ${report.summary.fail}, warn ${report.summary.warn}, skipped ${report.summary.skipped})`);
      for (const check of report.checks.filter((c) => c.status === "fail" || c.status === "warn")) console.log(`  ${check.status} ${check.rule}: ${check.details.join("; ")}`);
      console.log(`report: ${path.join(dir, "qa/QA_REPORT.md")}`);
      return report.result === "PASS" ? 0 : 1;
    }
    default:
      console.log(HELP);
      return command ? 1 : 0;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (cause) {
  console.error(`factory: ${(cause as Error).message}`);
  process.exitCode = 1;
}

