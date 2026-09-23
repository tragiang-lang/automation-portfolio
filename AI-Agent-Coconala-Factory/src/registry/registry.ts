import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CORE_ASSETS_DIR, listFiles } from "../lib/fsx";
import { error, Issue } from "../lib/issues";
import {
  ACTION_REF,
  ActionAsset,
  ASSET_SCHEMAS,
  AssetKind,
  DesignPresetAsset,
  IndustryAsset,
  IntentCatalogAsset,
  majorOf,
  QaRulesAsset,
  RichMenuAsset,
  RichMenuLayoutAsset,
  SpreadsheetSchemaAsset,
  WorkflowAsset,
} from "../schemas/assets";

export interface Loaded<T> {
  asset: T;
  /** Path relative to the core-assets directory. */
  file: string;
}

export const gasModuleCatalog = z.object({
  kind: z.literal("gas-module-catalog"),
  id: z.string(),
  version: z.string(),
  description: z.string(),
  modules: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      always: z.boolean().default(false),
      description: z.string(),
      files: z.array(z.string()).min(1),
      tests: z.array(z.string()).default([]),
    }),
  ),
});
export type GasModuleCatalog = z.infer<typeof gasModuleCatalog>;

export const GAS_MODULES_DIR = "gas-modules";
export const ASSET_LOCK_FILE = "asset-lock.json";

/**
 * Every Core Asset, loaded and shape-checked. Registries for actions,
 * workflows, schemas, layouts, menus, presets, industries, intents and QA
 * rules. Loading never throws: bad files become `loadIssues` so `factory
 * validate` can report all problems at once.
 */
export class CoreAssetRegistry {
  readonly actions = new Map<string, Loaded<ActionAsset>>(); // key: id@major
  readonly workflows = new Map<string, Loaded<WorkflowAsset>>();
  readonly schemas = new Map<string, Loaded<SpreadsheetSchemaAsset>>();
  readonly layouts = new Map<string, Loaded<RichMenuLayoutAsset>>();
  readonly menus = new Map<string, Loaded<RichMenuAsset>>();
  readonly presets = new Map<string, Loaded<DesignPresetAsset>>();
  readonly industries = new Map<string, Loaded<IndustryAsset>>();
  readonly intentCatalogs = new Map<string, Loaded<IntentCatalogAsset>>();
  readonly qaRules = new Map<string, Loaded<QaRulesAsset>>();
  gasModules: GasModuleCatalog | null = null;
  readonly loadIssues: Issue[] = [];

  private constructor(readonly dir: string) {}

  static load(dir: string = CORE_ASSETS_DIR): CoreAssetRegistry {
    const registry = new CoreAssetRegistry(dir);
    for (const file of listFiles(dir)) {
      if (!file.endsWith(".json") || file === ASSET_LOCK_FILE || file.startsWith(`${GAS_MODULES_DIR}/`)) continue;
      registry.loadFile(file);
    }
    registry.loadGasModules();
    return registry;
  }

  private loadFile(file: string): void {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(this.dir, file), "utf8"));
    } catch (cause) {
      this.loadIssues.push(error("ASSET_PARSE", `invalid JSON: ${(cause as Error).message}`, file));
      return;
    }
    const kind = (raw as { kind?: unknown })?.kind;
    if (typeof kind !== "string" || !(kind in ASSET_SCHEMAS)) {
      this.loadIssues.push(error("ASSET_KIND", `unknown or missing "kind": ${String(kind)}`, file));
      return;
    }
    const parsed = ASSET_SCHEMAS[kind as AssetKind].safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        this.loadIssues.push(error("ASSET_SCHEMA", `${issue.path.join(".") || "(root)"}: ${issue.message}`, file));
      }
      return;
    }
    this.register(kind as AssetKind, parsed.data, file);
  }

  private register(kind: AssetKind, asset: unknown, file: string): void {
    const put = <T extends { id: string }>(map: Map<string, Loaded<T>>, key: string, value: T) => {
      const existing = map.get(key);
      if (existing) {
        this.loadIssues.push(error("ASSET_DUPLICATE_ID", `"${key}" is defined twice (also in ${existing.file})`, file));
        return;
      }
      map.set(key, { asset: value, file });
    };
    switch (kind) {
      case "action": {
        const action = asset as ActionAsset;
        put(this.actions, `${action.id}@${majorOf(action.version)}`, action);
        break;
      }
      case "workflow":
        put(this.workflows, (asset as WorkflowAsset).id, asset as WorkflowAsset);
        break;
      case "spreadsheet-schema":
        put(this.schemas, (asset as SpreadsheetSchemaAsset).id, asset as SpreadsheetSchemaAsset);
        break;
      case "rich-menu-layout":
        put(this.layouts, (asset as RichMenuLayoutAsset).id, asset as RichMenuLayoutAsset);
        break;
      case "rich-menu":
        put(this.menus, (asset as RichMenuAsset).id, asset as RichMenuAsset);
        break;
      case "design-preset":
        put(this.presets, (asset as DesignPresetAsset).id, asset as DesignPresetAsset);
        break;
      case "industry":
        put(this.industries, (asset as IndustryAsset).id, asset as IndustryAsset);
        break;
      case "intent-catalog":
        put(this.intentCatalogs, (asset as IntentCatalogAsset).id, asset as IntentCatalogAsset);
        break;
      case "qa-rules":
        put(this.qaRules, (asset as QaRulesAsset).id, asset as QaRulesAsset);
        break;
    }
  }

  private loadGasModules(): void {
    const file = path.join(this.dir, GAS_MODULES_DIR, "modules.json");
    if (!fs.existsSync(file)) {
      this.loadIssues.push(error("ASSET_MISSING", "gas-modules/modules.json is missing", GAS_MODULES_DIR));
      return;
    }
    const parsed = gasModuleCatalog.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
    if (!parsed.success) {
      this.loadIssues.push(error("ASSET_SCHEMA", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "gas-modules/modules.json"));
      return;
    }
    this.gasModules = parsed.data;
  }

  /** Resolves `createInquiry@1`. Unpinned refs (`createInquiry`) never resolve. */
  resolveAction(ref: string): ActionAsset | undefined {
    return ACTION_REF.test(ref) ? this.actions.get(ref)?.asset : undefined;
  }

  /** Latest version of the industry profile for a business key such as `hair_salon`. */
  industryFor(industryKey: string): IndustryAsset | undefined {
    return [...this.industries.values()]
      .map((loaded) => loaded.asset)
      .filter((asset) => asset.industry === industryKey)
      .sort((a, b) => majorOf(b.version) - majorOf(a.version))[0];
  }

  intentCatalog(): IntentCatalogAsset | undefined {
    return [...this.intentCatalogs.values()].map((l) => l.asset).sort((a, b) => b.id.localeCompare(a.id))[0];
  }

  /** Which schema owns a sheet name (sheet names are unique across schemas). */
  schemaOwningSheet(sheetName: string): SpreadsheetSchemaAsset | undefined {
    return [...this.schemas.values()].map((l) => l.asset).find((schema) => schema.sheets.some((sheet) => sheet.name === sheetName));
  }
}
