import type { RuntimeSchema } from "../services/context";

/**
 * Plans what `setupSpreadsheet()` must do to bring a spreadsheet in line
 * with the generated schema. The plan is pure and tested. Applying it
 * (services/gas/applySpreadsheetSetup.ts) is a thin GAS adapter.
 *
 * The plan is additive only. It never deletes or reorders a sheet, a
 * column, or a row, so running setup again on a live spreadsheet is safe.
 */

export type SetupStep =
  | { kind: "createSheet"; sheet: string; headers: string[] }
  | { kind: "appendHeaders"; sheet: string; headers: string[] }
  | { kind: "seedConfig"; key: string; value: string; description: string };

export interface ExistingSpreadsheet {
  /** Sheet name -> header row (row 1). Absent sheets are not listed. */
  headers: Record<string, string[]>;
  /** Keys already present in CONFIG. */
  configKeys: string[];
}

export function planSpreadsheetSetup(
  schema: RuntimeSchema,
  existing: ExistingSpreadsheet,
  configSeed: Record<string, string>,
): SetupStep[] {
  const steps: SetupStep[] = [];
  for (const sheet of schema.sheets) {
    const current = existing.headers[sheet.name];
    if (!current) {
      steps.push({ kind: "createSheet", sheet: sheet.name, headers: [...sheet.columns] });
      continue;
    }
    const missing = sheet.columns.filter((column) => !current.includes(column));
    if (missing.length > 0) {
      steps.push({ kind: "appendHeaders", sheet: sheet.name, headers: missing });
    }
  }
  for (const entry of schema.configKeys) {
    if (existing.configKeys.includes(entry.key)) {
      continue;
    }
    steps.push({
      kind: "seedConfig",
      key: entry.key,
      value: configSeed[entry.key] ?? entry.default ?? "",
      description: entry.description,
    });
  }
  return steps;
}
