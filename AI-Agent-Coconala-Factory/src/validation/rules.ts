import { contrastRatio, WCAG_AA_NORMAL } from "../lib/contrast";
import { error, Issue, warning } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import type { Bounds, ColorTokens, ColumnSpec, RichMenuAsset, RichMenuLayoutAsset, SheetSpec, WorkflowAsset } from "../schemas/assets";

/**
 * Validation rules shared by `factory validate` (Core Assets) and the QA
 * Agent (client projects), so a rule never drifts between the two.
 */

// ------------------------------------------------------------ spreadsheet

function defaultMatchesType(column: ColumnSpec): boolean {
  const value = column.default;
  if (value === undefined || value === "") return true;
  switch (column.type) {
    case "number":
      return /^-?\d+(\.\d+)?$/.test(value);
    case "integer":
      return /^-?\d+$/.test(value);
    case "boolean":
      return /^(TRUE|FALSE)$/i.test(value);
    case "enum":
      return (column.enum ?? []).includes(value);
    default:
      return true;
  }
}

/** Column/key/reference rules. `knownSheets` is the scope references must resolve in. */
export function validateSheets(sheets: readonly SheetSpec[], knownSheets: readonly SheetSpec[], where: string): Issue[] {
  const issues: Issue[] = [];
  const seenSheets = new Set<string>();
  for (const sheet of sheets) {
    const at = `${where} > ${sheet.name}`;
    if (seenSheets.has(sheet.name)) issues.push(error("SS_DUPLICATE_SHEETS", `sheet ${sheet.name} is defined twice`, where));
    seenSheets.add(sheet.name);
    const names = sheet.columns.map((c) => c.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    for (const name of new Set(duplicates)) issues.push(error("SS_DUPLICATE_COLUMNS", `column "${name}" is defined more than once`, at));
    if (!names.includes(sheet.primaryKey)) issues.push(error("SS_KEYS_AND_REFERENCES", `primaryKey "${sheet.primaryKey}" is not a column`, at));
    else if (!sheet.columns.find((c) => c.name === sheet.primaryKey)?.required) issues.push(error("SS_COLUMNS_VALID", `primaryKey "${sheet.primaryKey}" must be required`, at));
    for (const index of sheet.indexes) if (!names.includes(index)) issues.push(error("SS_KEYS_AND_REFERENCES", `index "${index}" is not a column`, at));
    for (const column of sheet.columns) {
      if (column.type === "enum" && !(column.enum && column.enum.length > 0)) issues.push(error("SS_COLUMNS_VALID", `enum column "${column.name}" has no enum values`, at));
      if (column.type !== "enum" && column.enum) issues.push(error("SS_COLUMNS_VALID", `column "${column.name}" has enum values but type ${column.type}`, at));
      if (!defaultMatchesType(column)) issues.push(error("SS_COLUMNS_VALID", `default of "${column.name}" does not match type ${column.type}`, at));
      if (column.references) {
        const [refSheet, refColumn] = column.references.split(".");
        const target = knownSheets.find((s) => s.name === refSheet);
        if (!target || !target.columns.some((c) => c.name === refColumn)) {
          issues.push(error("SS_KEYS_AND_REFERENCES", `"${column.name}" references ${column.references}, which does not exist here`, at));
        }
      }
    }
  }
  return issues;
}

// -------------------------------------------------------------- rich menu

/** LINE Messaging API rich-menu limits. */
export const LINE_RICH_MENU_LIMITS = { minWidth: 800, maxWidth: 2500, minHeight: 250, minAspect: 1.45, maxAreas: 20, maxPostbackData: 300, maxChatBarText: 14 };

export function validateLayoutGeometry(size: { width: number; height: number }, areas: readonly { id: string; bounds: Bounds }[], where: string): Issue[] {
  const issues: Issue[] = [];
  const L = LINE_RICH_MENU_LIMITS;
  if (size.width < L.minWidth || size.width > L.maxWidth) issues.push(error("RM_LAYOUT_VALID", `width ${size.width} must be ${L.minWidth}-${L.maxWidth}`, where));
  if (size.height < L.minHeight) issues.push(error("RM_LAYOUT_VALID", `height ${size.height} must be at least ${L.minHeight}`, where));
  if (size.width / size.height < L.minAspect) issues.push(error("RM_LAYOUT_VALID", `aspect ratio width/height must be at least ${L.minAspect}`, where));
  if (areas.length > L.maxAreas) issues.push(error("RM_LAYOUT_VALID", `${areas.length} areas exceed the LINE maximum of ${L.maxAreas}`, where));
  const ids = new Set<string>();
  for (const area of areas) {
    if (ids.has(area.id)) issues.push(error("RM_LAYOUT_VALID", `slot "${area.id}" is defined twice`, where));
    ids.add(area.id);
    const b = area.bounds;
    if (b.x + b.width > size.width || b.y + b.height > size.height) issues.push(error("RM_LAYOUT_VALID", `slot "${area.id}" extends outside the ${size.width}x${size.height} canvas`, where));
  }
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const a = areas[i].bounds;
      const b = areas[j].bounds;
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) {
        issues.push(error("RM_LAYOUT_VALID", `slots "${areas[i].id}" and "${areas[j].id}" overlap`, where));
      }
    }
  }
  return issues;
}

export function validateMenuStructure(
  menu: RichMenuAsset,
  layout: RichMenuLayoutAsset | undefined,
  workflowLookup: (id: string) => WorkflowAsset | undefined,
  where: string,
): Issue[] {
  const issues: Issue[] = [];
  if (!layout) return [error("RM_LAYOUT_VALID", `layout "${menu.layout}" does not exist`, where)];
  const slotIds = layout.slots.map((s) => s.id);
  const used = menu.items.map((item) => item.slot);
  for (const item of menu.items) {
    if (!slotIds.includes(item.slot)) issues.push(error("RM_LAYOUT_VALID", `item "${item.label}" uses slot "${item.slot}", which layout ${layout.id} does not have`, where));
    if (!item.label.trim()) issues.push(error("RM_LABELS", `slot "${item.slot}" has an empty label`, where));
    if (item.action.type === "workflow") {
      const workflow = workflowLookup(item.action.workflowId);
      if (!workflow) issues.push(error("RM_ACTIONS_VALID", `button "${item.label}" references unknown workflow "${item.action.workflowId}"`, where));
      else if (!workflow.entries[item.action.entry]) issues.push(error("RM_ACTIONS_VALID", `workflow "${workflow.id}" has no entry "${item.action.entry}"`, where));
    }
  }
  for (const slot of slotIds) if (!used.includes(slot)) issues.push(error("RM_LABELS", `layout slot "${slot}" has no button`, where));
  for (const slot of new Set(used.filter((s, i) => used.indexOf(s) !== i))) issues.push(error("RM_LAYOUT_VALID", `slot "${slot}" is used by more than one button`, where));
  if (!menu.items.some((item) => item.role === "primary")) issues.push(warning("RM_LABELS", "no primary button: the menu has no clear main call to action", where));
  return issues;
}

// ----------------------------------------------------------------- design

export function validateContrast(colors: ColorTokens, where: string): Issue[] {
  const pairs: [string, string, string][] = [
    ["onPrimary on primary (primary button label)", colors.onPrimary, colors.primary],
    ["text on surface (secondary button label)", colors.text, colors.surface],
    ["text on background", colors.text, colors.background],
  ];
  return pairs
    .map(([label, fg, bg]) => ({ label, ratio: contrastRatio(fg, bg) }))
    .filter(({ ratio }) => ratio < WCAG_AA_NORMAL)
    .map(({ label, ratio }) => error("DS_CONTRAST", `${label} contrast ${ratio}:1 is below ${WCAG_AA_NORMAL}:1`, where));
}

// --------------------------------------------------------------- workflow

/** Rules for one workflow against the registry: actions, entries, schemas, dependencies. */
export function validateWorkflow(workflow: WorkflowAsset, registry: CoreAssetRegistry, where: string): Issue[] {
  const issues: Issue[] = [];
  for (const ref of workflow.actions) {
    const action = registry.resolveAction(ref);
    if (!action) issues.push(error("WF_ACTIONS_EXIST", `action "${ref}" does not exist in the Action Registry`, where));
    else if (action.status !== "available" && workflow.status === "stable") issues.push(error("WF_ACTIONS_EXIST", `stable workflow uses ${action.status} action "${ref}"`, where));
  }
  for (const [name, entry] of Object.entries(workflow.entries)) {
    if (!workflow.actions.includes(entry.action)) issues.push(error("WF_ACTION_INPUTS", `entry "${name}" runs ${entry.action}, which is not listed in actions`, where));
    const action = registry.resolveAction(entry.action);
    if (action && !action.exposure.includes("line")) issues.push(error("WF_ACTION_INPUTS", `entry "${name}" runs ${entry.action}, which is not LINE-enabled`, where));
    if (entry.mode === "awaitText" && !entry.prompt) issues.push(error("WF_ACTION_INPUTS", `awaitText entry "${name}" needs a prompt`, where));
    if (entry.type === "datetimepicker" && action && !("startDateTime" in action.input)) {
      issues.push(error("WF_ACTION_INPUTS", `datetimepicker entry "${name}" runs ${entry.action}, which has no startDateTime input`, where));
    }
    if (entry.mode === "awaitText" && action && !("message" in action.input)) {
      issues.push(error("WF_ACTION_INPUTS", `awaitText entry "${name}" runs ${entry.action}, which has no message input`, where));
    }
  }
  const providedSheets = new Set<string>();
  for (const schemaId of workflow.spreadsheet.schemas) {
    const schema = registry.schemas.get(schemaId)?.asset;
    if (!schema) issues.push(error("WF_SCHEMAS_EXIST", `spreadsheet schema "${schemaId}" does not exist`, where));
    else schema.sheets.forEach((sheet) => providedSheets.add(sheet.name));
  }
  for (const sheet of workflow.spreadsheet.requiredSheets) {
    if (!providedSheets.has(sheet)) issues.push(error("SS_REQUIRED_SHEETS", `required sheet ${sheet} is not provided by the workflow's schemas`, where));
  }
  for (const ref of workflow.actions) {
    for (const sheet of registry.resolveAction(ref)?.dependencies.sheets ?? []) {
      if (!providedSheets.has(sheet)) issues.push(error("WF_DEPENDENCIES", `action ${ref} needs sheet ${sheet}, which the workflow's schemas do not provide`, where));
    }
  }
  return issues;
}
