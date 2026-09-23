import fs from "node:fs";
import path from "node:path";
import { error, Issue, warning } from "../lib/issues";
import { checkLock } from "../registry/assetLock";
import { CoreAssetRegistry, GAS_MODULES_DIR } from "../registry/registry";
import type { ActionAsset, WorkflowAsset } from "../schemas/assets";
import { validateContrast, validateLayoutGeometry, validateMenuStructure, validateSheets, validateWorkflow } from "./rules";

export interface MergedConfigKey {
  key: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
  /** Asset ids that declared this key. */
  sources: string[];
}

/** Merges config keys declared by actions and workflows. The same key declared differently is a conflict. */
export function mergeConfigKeys(actions: readonly ActionAsset[], workflows: readonly WorkflowAsset[]): { keys: MergedConfigKey[]; issues: Issue[] } {
  const keys = new Map<string, MergedConfigKey>();
  const issues: Issue[] = [];
  const add = (source: string, spec: { key: string; type: string; required: boolean; default?: string; description: string }) => {
    const existing = keys.get(spec.key);
    if (!existing) {
      keys.set(spec.key, { ...spec, sources: [source] });
      return;
    }
    if (existing.type !== spec.type || existing.default !== spec.default || existing.required !== spec.required) {
      issues.push(error("SS_CONFIG_CONFLICT", `CONFIG key ${spec.key} is declared differently by ${existing.sources.join(", ")} and ${source}`));
    }
    if (!existing.sources.includes(source)) existing.sources.push(source);
  };
  for (const action of actions) for (const spec of action.dependencies.configKeys) add(`${action.id}@${action.version}`, spec);
  for (const workflow of workflows) for (const spec of workflow.configKeys) add(`${workflow.id}@${workflow.version}`, spec);
  return { keys: [...keys.values()], issues };
}

/** Everything `factory validate` checks across the whole Core Asset library. */
export function validateAssets(registry: CoreAssetRegistry): Issue[] {
  const issues: Issue[] = [...registry.loadIssues];
  const allSheets = [...registry.schemas.values()].flatMap((l) => l.asset.sheets);
  const moduleIds = new Set(registry.gasModules?.modules.map((m) => m.id) ?? []);

  for (const { asset, file } of registry.actions.values()) {
    if (asset.status === "available" && !asset.gas) issues.push(error("WF_ACTIONS_EXIST", `available action ${asset.id} has no gas.module`, file));
    if (asset.gas && !moduleIds.has(asset.gas.module)) issues.push(error("GAS_FILES", `gas module "${asset.gas.module}" is not in modules.json`, file));
    const module = registry.gasModules?.modules.find((m) => m.id === asset.gas?.module);
    if (module && !module.files.includes(`src/actions/${asset.id}.ts`)) {
      issues.push(error("GAS_FILES", `gas module "${module.id}" must contain src/actions/${asset.id}.ts exporting ${asset.id}`, file));
    }
    for (const sheet of asset.dependencies.sheets) {
      if (!registry.schemaOwningSheet(sheet)) issues.push(error("WF_DEPENDENCIES", `sheet ${sheet} is not defined by any spreadsheet schema`, file));
    }
  }

  for (const { asset, file } of registry.workflows.values()) {
    issues.push(...validateWorkflow(asset, registry, file));
    const actions = asset.actions.map((ref) => registry.resolveAction(ref)).filter((a): a is ActionAsset => a !== undefined);
    issues.push(...mergeConfigKeys(actions, [asset]).issues.map((i) => ({ ...i, where: file })));
  }

  const sheetOwners = new Map<string, string>();
  for (const { asset, file } of registry.schemas.values()) {
    issues.push(...validateSheets(asset.sheets, allSheets, file));
    for (const sheet of asset.sheets) {
      const owner = sheetOwners.get(sheet.name);
      if (owner) issues.push(error("SS_DUPLICATE_SHEETS", `sheet ${sheet.name} is already owned by ${owner}; sheet names must be unique across schemas`, file));
      else sheetOwners.set(sheet.name, asset.id);
    }
  }

  for (const { asset, file } of registry.layouts.values()) issues.push(...validateLayoutGeometry(asset.size, asset.slots, file));

  for (const { asset, file } of registry.menus.values()) {
    issues.push(...validateMenuStructure(asset, registry.layouts.get(asset.layout)?.asset, (id) => registry.workflows.get(id)?.asset, file));
  }

  for (const { asset, file } of registry.presets.values()) issues.push(...validateContrast(asset.colors, file));

  for (const { asset, file } of registry.industries.values()) {
    for (const id of asset.recommendedWorkflows) if (!registry.workflows.has(id)) issues.push(error("WF_EXISTS", `recommended workflow ${id} does not exist`, file));
    const menu = registry.menus.get(asset.recommendedRichMenu)?.asset;
    if (!menu) issues.push(error("RM_ACTIONS_VALID", `recommended rich menu ${asset.recommendedRichMenu} does not exist`, file));
    else if (!menu.industries.includes(asset.industry)) issues.push(warning("RM_ACTIONS_VALID", `rich menu ${menu.id} does not list industry ${asset.industry}`, file));
    for (const id of asset.recommendedDesignPresets) if (!registry.presets.has(id)) issues.push(error("DS_CONTRAST", `recommended design preset ${id} does not exist`, file));
  }

  for (const { asset, file } of registry.intentCatalogs.values()) {
    for (const intent of asset.intents) for (const id of intent.workflows) if (!registry.workflows.has(id)) issues.push(error("WF_EXISTS", `intent ${intent.id} maps to unknown workflow ${id}`, file));
  }

  for (const module of registry.gasModules?.modules ?? []) {
    for (const rel of [...module.files, ...module.tests]) {
      if (!fs.existsSync(path.join(registry.dir, GAS_MODULES_DIR, rel))) issues.push(error("GAS_FILES", `module ${module.id} lists missing file ${rel}`, `${GAS_MODULES_DIR}/modules.json`));
    }
    if (module.tests.length === 0) issues.push(warning("GAS_TESTS_EXIST", `module ${module.id} has no tests`, `${GAS_MODULES_DIR}/modules.json`));
  }

  issues.push(...checkLock(registry));
  return issues;
}
