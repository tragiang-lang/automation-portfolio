import path from "node:path";
import { parseBrief, runPipeline } from "./agents/orchestrator";
import { existingCreatedOn, writeProject } from "./generators/projectWriter";
import { PROJECTS_DIR, toStableJson, writeFile } from "./lib/fsx";
import { hasErrors, Issue } from "./lib/issues";
import { qaReportMarkdown, QaReport, runQa } from "./qa/qaAgent";
import type { CoreAssetRegistry } from "./registry/registry";

export interface CreateProjectOptions {
  force: boolean;
  runGasChecks: boolean;
  /** Override for tests. Defaults to projects/<year>/<slug>. */
  projectsDir?: string;
  today?: string;
}

export interface CreateProjectResult {
  projectDir?: string;
  issues: Issue[];
  qa?: QaReport;
  written: string[];
  removed: string[];
}

export function projectDirFor(year: number, slug: string, projectsDir: string = PROJECTS_DIR): string {
  return path.join(projectsDir, String(year), slug);
}

/** Full pipeline for one brief: generate, write safely, then run QA on what was written. */
export function createProject(rawBrief: unknown, registry: CoreAssetRegistry, options: CreateProjectOptions): CreateProjectResult {
  const { brief, issues: briefIssues } = parseBrief(rawBrief);
  if (!brief) return { issues: briefIssues, written: [], removed: [] };

  const projectDir = projectDirFor(brief.project.year, brief.project.slug, options.projectsDir);
  const createdOn = brief.project.createdOn ?? existingCreatedOn(projectDir) ?? options.today ?? new Date().toISOString().slice(0, 10);
  const result = runPipeline(brief, registry, { createdOn });
  if (hasErrors(result.issues)) return { projectDir, issues: result.issues, written: [], removed: [] };

  const { written, removed } = writeProject(projectDir, brief.project.slug, result.files, { force: options.force });
  const qa = writeQa(projectDir, registry, options.runGasChecks);
  return { projectDir, issues: result.issues, qa, written, removed };
}

export function writeQa(projectDir: string, registry: CoreAssetRegistry, runGasChecks: boolean): QaReport {
  const { logs, ...report } = runQa(projectDir, registry, { runGasChecks });
  writeFile(path.join(projectDir, "qa/qa-report.json"), toStableJson(report));
  writeFile(path.join(projectDir, "qa/QA_REPORT.md"), qaReportMarkdown(report));
  if (Object.keys(logs).length > 0) {
    const log = Object.entries(logs).map(([step, output]) => `===== ${step} =====\n${output}\n`);
    writeFile(path.join(projectDir, "qa/gas-checks.log"), log.join("\n"));
  }
  return report;
}
