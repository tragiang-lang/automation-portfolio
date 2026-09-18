import { SheetName } from "./SheetNames";
import { buildHeaderMap } from "./RowMapper";

/**
 * Thin Google Sheets adapter (Phase 0 §T: "Sheets read/write adapter
 * only — no business rules, no validation"). Every function here is a
 * near-literal wrapper over SpreadsheetApp and is NOT unit tested by
 * Jest (Phase 0 §Q) — it is covered by the manual integration checklist
 * in docs/config-and-sheets-guide.md instead.
 *
 * This is a standalone Apps Script project (not bound to one specific
 * Spreadsheet), so a Web App request has no "active spreadsheet" —
 * the target spreadsheet is read from the SPREADSHEET_ID Script
 * Property instead of being hard-coded (Phase 3A §11).
 */

const SPREADSHEET_ID_PROPERTY = "SPREADSHEET_ID";

export function getConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id = PropertiesService.getScriptProperties().getProperty(
    SPREADSHEET_ID_PROPERTY,
  );
  if (!id) {
    throw new Error(
      `Script Property "${SPREADSHEET_ID_PROPERTY}" is not set. See docs/config-and-sheets-guide.md.`,
    );
  }
  return SpreadsheetApp.openById(id);
}

export function getSheet(
  name: SheetName,
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = getConfiguredSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet "${name}" was not found in the spreadsheet.`);
  }
  return sheet;
}

/** Returns the header row (row 1) as a header->column-index map. */
export function getHeaderMap(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): Record<string, number> {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return {};
  }
  const headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  return buildHeaderMap(headerRow);
}

/** Returns every data row (everything below the header row) as raw
 *  values — callers pass this into RowMapper.rowsToObjects. */
export function readRawRows(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): unknown[][] {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

/** Appends one row at the bottom of the sheet, in the exact column order
 *  given (build it with RowMapper.objectToRow). */
export function appendRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: unknown[],
): void {
  sheet.appendRow(row);
}

/** Overwrites one existing row (1-based sheet row number; the header row
 *  is row 1) with new values, in the exact column order given. */
export function updateRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rowNumber: number,
  row: unknown[],
): void {
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}
