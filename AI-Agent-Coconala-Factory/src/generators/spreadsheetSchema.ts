import type { WorkflowPlan } from "../agents/workflowPlanner";
import { error, Issue } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import type { ActionAsset, SheetSpec, WorkflowAsset } from "../schemas/assets";
import type { ClientBrief } from "../schemas/brief";
import { MergedConfigKey, mergeConfigKeys } from "../validation/validateAssets";

/**
 * Spreadsheet Schema Generator: merges the reusable schema assets the
 * selected workflows reference into one project schema, and collects the
 * CONFIG keys their actions need. Sheet definitions are copied from the
 * versioned assets, never re-declared per project.
 */

export interface ProjectSheet extends SheetSpec {
  sourceSchema: string;
}

export interface ProjectSchema {
  sheets: ProjectSheet[];
  configKeys: MergedConfigKey[];
}

export function generateSpreadsheetSchema(
  plan: WorkflowPlan,
  registry: CoreAssetRegistry,
  brief: ClientBrief,
): { schema: ProjectSchema; configSeed: Record<string, string>; issues: Issue[] } {
  const issues: Issue[] = [];
  const workflows = plan.selected.map((s) => registry.workflows.get(s.id)!.asset);
  const schemaIds = [...new Set(workflows.flatMap((w) => w.spreadsheet.schemas))];
  const sheets: ProjectSheet[] = [];
  for (const id of schemaIds) {
    const schema = registry.schemas.get(id)?.asset;
    if (!schema) {
      issues.push(error("WF_SCHEMAS_EXIST", `spreadsheet schema ${id} does not exist`));
      continue;
    }
    for (const sheet of schema.sheets) sheets.push({ ...sheet, sourceSchema: `${schema.id}@${schema.version}` });
  }
  // CONFIG first so the owner sees it as the first tab.
  sheets.sort((a, b) => (a.name === "CONFIG" ? -1 : b.name === "CONFIG" ? 1 : 0));

  const actions = unique(workflows.flatMap((w) => w.actions))
    .map((ref) => registry.resolveAction(ref))
    .filter((a): a is ActionAsset => a !== undefined);
  const merged = mergeConfigKeys(actions, workflows as WorkflowAsset[]);
  issues.push(...merged.issues);

  const configSeed: Record<string, string> = {};
  for (const key of merged.keys) {
    if (key.key in brief.config) configSeed[key.key] = brief.config[key.key];
  }
  return { schema: { sheets, configKeys: merged.keys }, configSeed, issues };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
