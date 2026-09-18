import { getConfiguredSpreadsheet } from "./Sheets";
import { DEMO_SHEETS } from "./DemoSeed";

/**
 * Explicit, safe demo-data setup (Phase 3A §21). Never overwrites or
 * deletes an existing sheet — if a sheet with the target name already
 * exists, it is left completely untouched and reported as "skipped".
 * Must be run manually from the Apps Script editor (select
 * `setupDemoSheets` in the function dropdown and click Run); it is never
 * called from doGet/doPost.
 */
export function setupDemoSheets(): string[] {
  const spreadsheet = getConfiguredSpreadsheet();
  const results: string[] = [];

  for (const seed of DEMO_SHEETS) {
    const existing = spreadsheet.getSheetByName(seed.name);
    if (existing) {
      results.push(`skipped (already exists): ${seed.name}`);
      continue;
    }
    const sheet = spreadsheet.insertSheet(seed.name);
    sheet.getRange(1, 1, 1, seed.headers.length).setValues([[...seed.headers]]);
    if (seed.rows.length > 0) {
      sheet
        .getRange(2, 1, seed.rows.length, seed.headers.length)
        .setValues(seed.rows);
    }
    results.push(`created: ${seed.name} (${seed.rows.length} demo rows)`);
  }

  return results;
}
