import { z } from "zod";

/**
 * Shapes of every Core Asset file. Structural rules live here. Cross-asset
 * rules (does this workflow's action exist? does this menu's layout slot
 * exist?) live in src/validation/validateAssets.ts because they need the
 * whole registry.
 *
 * Versioning convention (docs/decisions/0003-asset-versioning.md):
 *  - kebab-case assets carry their major version in the id: `inquiry-basic-v1`
 *    with `version: "1.x.y"`. A breaking change means a new id (`-v2`).
 *  - Actions are addressed as `<actionId>@<major>`, e.g. `createInquiry@1`.
 */

export const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
export const VERSIONED_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*-v(\d+)$/;
export const ACTION_ID = /^[a-z][A-Za-z0-9]*$/;
export const ACTION_REF = /^([a-z][A-Za-z0-9]*)@(\d+)$/;
export const SHEET_NAME = /^[A-Z][A-Z0-9_]*$/;
export const CONFIG_KEY = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

export const semver = z.string().regex(SEMVER, "must be semver MAJOR.MINOR.PATCH");

export function majorOf(version: string): number {
  return Number(SEMVER.exec(version)?.[1] ?? NaN);
}

/** Adds the "id suffix -vN must equal version major N" rule. */
function versionedIdentity<T extends z.ZodRawShape>(shape: T) {
  return z
    .object({ id: z.string().regex(VERSIONED_ID, "id must be kebab-case ending in -v<major>"), version: semver, ...shape })
    .superRefine((raw, ctx) => {
      const value = raw as { id: string; version: string };
      const idMajor = Number(VERSIONED_ID.exec(value.id)?.[1]);
      if (idMajor !== majorOf(value.version)) {
        ctx.addIssue({ code: "custom", path: ["version"], message: `version ${value.version} does not match id major v${idMajor}` });
      }
    });
}

// ---------------------------------------------------------------- actions

export const FIELD_TYPES = ["string", "number", "integer", "boolean", "email", "phone", "date", "time", "datetime", "object", "array"] as const;

export const fieldSpec = z.object({
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
  enum: z.array(z.string()).min(1).optional(),
  description: z.string().optional(),
});

export const configKeySpec = z.object({
  key: z.string().regex(CONFIG_KEY, "config keys look like section.name"),
  type: z.enum(["string", "number", "boolean", "email", "url", "text"]),
  required: z.boolean(),
  default: z.string().optional(),
  description: z.string().min(1),
});

export const actionAsset = z.object({
  kind: z.literal("action"),
  id: z.string().regex(ACTION_ID, "action ids are camelCase"),
  version: semver,
  description: z.string().min(1),
  status: z.enum(["available", "planned"]),
  exposure: z.array(z.enum(["api", "line"])),
  reusable: z.boolean(),
  industrySpecific: z.boolean(),
  input: z.record(z.string(), fieldSpec),
  output: z.record(z.string(), fieldSpec),
  dependencies: z.object({
    sheets: z.array(z.string().regex(SHEET_NAME)).default([]),
    configKeys: z.array(configKeySpec).default([]),
    services: z.array(z.enum(["tables", "cache", "lock", "mail", "line"])).default([]),
    scriptProperties: z.array(z.string()).default([]),
  }),
  validation: z.array(z.string()).default([]),
  errors: z.array(z.object({ code: z.string(), when: z.string() })).default([]),
  gas: z.object({ module: z.string().min(1) }).optional(),
});
export type ActionAsset = z.infer<typeof actionAsset>;

// -------------------------------------------------------------- workflows

export const lineEntry = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("postback"),
    action: z.string().regex(ACTION_REF),
    mode: z.enum(["direct", "awaitText"]).default("direct"),
    prompt: z.string().optional(),
    params: z.record(z.string(), z.string()).default({}),
    displayText: z.string().optional(),
  }),
  z.object({
    type: z.literal("datetimepicker"),
    action: z.string().regex(ACTION_REF),
    mode: z.literal("direct").default("direct"),
    pickerMode: z.enum(["date", "time", "datetime"]),
    params: z.record(z.string(), z.string()).default({}),
  }),
]);
export type LineEntry = z.infer<typeof lineEntry>;

export const workflowAsset = versionedIdentity({
  kind: z.literal("workflow"),
  name: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["stable", "draft", "deprecated"]),
  industries: z.array(z.string()).min(1),
  trigger: z.enum(["LINE_RICH_MENU", "API"]),
  actions: z.array(z.string().regex(ACTION_REF, "action refs look like createInquiry@1")).min(1),
  entries: z.record(z.string(), lineEntry),
  spreadsheet: z.object({
    schemas: z.array(z.string().regex(VERSIONED_ID)).min(1),
    requiredSheets: z.array(z.string().regex(SHEET_NAME)).min(1),
  }),
  configKeys: z.array(configKeySpec).default([]),
  notifications: z.array(z.object({ event: z.string(), channel: z.enum(["email", "line"]), to: z.enum(["owner", "customer"]) })).default([]),
  extensionPoints: z.array(z.object({ id: z.string(), description: z.string() })).default([]),
});
export type WorkflowAsset = z.infer<typeof workflowAsset>;

// --------------------------------------------------- spreadsheet schemas

export const COLUMN_TYPES = ["string", "text", "number", "integer", "boolean", "email", "phone", "date", "time", "datetime", "enum", "url"] as const;

export const columnSpec = z.object({
  name: z.string().regex(/^[a-z][A-Za-z0-9]*$/, "column names are camelCase"),
  type: z.enum(COLUMN_TYPES),
  required: z.boolean().default(false),
  default: z.string().optional(),
  enum: z.array(z.string()).optional(),
  description: z.string().min(1),
  /** `SHEET.column` this column points to. */
  references: z.string().regex(/^[A-Z][A-Z0-9_]*\.[a-z][A-Za-z0-9]*$/).optional(),
  /** Holds personal data. Drives the security notes in delivery docs. */
  pii: z.boolean().default(false),
});
export type ColumnSpec = z.infer<typeof columnSpec>;

export const sheetSpec = z.object({
  name: z.string().regex(SHEET_NAME),
  description: z.string().min(1),
  primaryKey: z.string(),
  indexes: z.array(z.string()).default([]),
  columns: z.array(columnSpec).min(1),
});
export type SheetSpec = z.infer<typeof sheetSpec>;

export const spreadsheetSchemaAsset = versionedIdentity({
  kind: z.literal("spreadsheet-schema"),
  description: z.string().min(1),
  sheets: z.array(sheetSpec).min(1),
});
export type SpreadsheetSchemaAsset = z.infer<typeof spreadsheetSchemaAsset>;

// ------------------------------------------------------------- rich menu

export const bounds = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Bounds = z.infer<typeof bounds>;

export const richMenuLayoutAsset = versionedIdentity({
  kind: z.literal("rich-menu-layout"),
  description: z.string().min(1),
  size: z.object({ width: z.number().int(), height: z.number().int() }),
  slots: z.array(z.object({ id: z.string().regex(/^[a-z]$/), bounds, emphasis: z.enum(["hero", "normal"]).default("normal") })).min(1),
});
export type RichMenuLayoutAsset = z.infer<typeof richMenuLayoutAsset>;

export const richMenuItemAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("workflow"), workflowId: z.string().regex(VERSIONED_ID), entry: z.string().default("default") }),
  z.object({ type: z.literal("uri"), configKey: z.string().regex(CONFIG_KEY) }),
]);
export type RichMenuItemAction = z.infer<typeof richMenuItemAction>;

export const richMenuAsset = versionedIdentity({
  kind: z.literal("rich-menu"),
  description: z.string().min(1),
  industries: z.array(z.string()).min(1),
  layout: z.string().regex(VERSIONED_ID),
  chatBarText: z.string().min(1).max(14),
  items: z
    .array(
      z.object({
        slot: z.string().regex(/^[a-z]$/),
        label: z.string().min(1).max(12),
        subLabel: z.string().max(20).optional(),
        role: z.enum(["primary", "secondary"]),
        icon: z.string().min(1),
        action: richMenuItemAction,
      }),
    )
    .min(1),
});
export type RichMenuAsset = z.infer<typeof richMenuAsset>;

// --------------------------------------------------------- design presets

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const colorTokens = z.object({
  background: z.string().regex(HEX),
  surface: z.string().regex(HEX),
  primary: z.string().regex(HEX),
  onPrimary: z.string().regex(HEX),
  accent: z.string().regex(HEX),
  text: z.string().regex(HEX),
  muted: z.string().regex(HEX),
  border: z.string().regex(HEX),
});
export type ColorTokens = z.infer<typeof colorTokens>;

export const designPresetAsset = versionedIdentity({
  kind: z.literal("design-preset"),
  name: z.string().min(1),
  description: z.string().min(1),
  suitableIndustries: z.array(z.string()).min(1),
  colors: colorTokens,
  typography: z.object({ direction: z.string(), headingStyle: z.string(), labelWeight: z.enum(["regular", "medium", "bold"]), minLabelPx: z.number().int().min(40) }),
  spacing: z.object({ gutterPx: z.number().int().min(0), tilePaddingPx: z.number().int().min(0), cornerRadiusPx: z.number().int().min(0) }),
  hierarchy: z.string(),
  iconStyle: z.string(),
  buttonStyle: z.string(),
  imagery: z.string(),
});
export type DesignPresetAsset = z.infer<typeof designPresetAsset>;

// -------------------------------------------------------------- industries

export const industryAsset = versionedIdentity({
  kind: z.literal("industry"),
  industry: z.string().regex(/^[a-z][a-z0-9_]*$/),
  category: z.string(),
  displayName: z.string(),
  businessType: z.string(),
  customerIntents: z.array(z.string()).min(1),
  lineUseCases: z.array(z.string()),
  recommendedWorkflows: z.array(z.string().regex(VERSIONED_ID)).min(1),
  recommendedRichMenu: z.string().regex(VERSIONED_ID),
  recommendedDesignPresets: z.array(z.string().regex(VERSIONED_ID)).min(1),
  terminology: z.record(z.string(), z.string()),
  requiredData: z.array(z.string()),
  notificationRequirements: z.array(z.string()),
  risks: z.array(z.string()),
  /** Extra keywords per intent id, used only when this industry is selected. Common keywords stay in the intent catalog. */
  intentAliases: z.record(z.string(), z.array(z.string().min(1)).min(1)).optional(),
  assumptions: z.array(z.string()).optional(),
  extensionPoints: z
    .object({
      implemented: z.array(z.string()).default([]),
      planned: z.array(z.object({ id: z.string(), description: z.string() })).default([]),
    })
    .optional(),
});
export type IndustryAsset = z.infer<typeof industryAsset>;

export const intentCatalogAsset = versionedIdentity({
  kind: z.literal("intent-catalog"),
  intents: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z][a-z_]*$/),
        description: z.string(),
        workflows: z.array(z.string().regex(VERSIONED_ID)).min(1),
        keywords: z.array(z.string()).min(1),
      }),
    )
    .min(1),
});
export type IntentCatalogAsset = z.infer<typeof intentCatalogAsset>;

// ----------------------------------------------------------------- qa rules

export const qaRulesAsset = versionedIdentity({
  kind: z.literal("qa-rules"),
  rules: z.array(z.object({ id: z.string(), area: z.enum(["workflow", "spreadsheet", "gas", "rich-menu", "delivery", "security", "design", "line"]), severity: z.enum(["error", "warning"]), description: z.string() })),
});
export type QaRulesAsset = z.infer<typeof qaRulesAsset>;

export const ASSET_SCHEMAS = {
  action: actionAsset,
  workflow: workflowAsset,
  "spreadsheet-schema": spreadsheetSchemaAsset,
  "rich-menu-layout": richMenuLayoutAsset,
  "rich-menu": richMenuAsset,
  "design-preset": designPresetAsset,
  industry: industryAsset,
  "intent-catalog": intentCatalogAsset,
  "qa-rules": qaRulesAsset,
} as const;
export type AssetKind = keyof typeof ASSET_SCHEMAS;
