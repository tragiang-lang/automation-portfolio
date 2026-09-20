import { SheetName } from "./SheetNames";
import { REQUIRED_HEADERS } from "./SheetSchemas";
import { buildHeaderMap, assertRequiredHeaders } from "./RowMapper";

/**
 * Thin Google Sheets adapter (same role as
 * apps/salon-portfolio/gas/src/Sheets.ts — "adapter only, no business
 * rules"). Every function in this section is a near-literal wrapper over
 * SpreadsheetApp and is NOT unit tested by Jest, matching that project's
 * own documented convention (Phase 0 §Q): a GAS-service wrapper this thin
 * is covered by manual verification, not a mocked-global unit test. The
 * pure functions below (assertSheetFound, requireHeaders) carry all the
 * actually-tested logic.
 *
 * Like salon, this is a standalone Apps Script project — no "active
 * spreadsheet" exists for a Web App request, so the target spreadsheet is
 * read from the same SPREADSHEET_ID Script Property salon uses (not a new
 * key — reusing the identical property name keeps the two projects'
 * deployment setup consistent).
 */

const SPREADSHEET_ID_PROPERTY = "SPREADSHEET_ID";

export function getConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  if (!id) {
    throw new Error(`Script Property "${SPREADSHEET_ID_PROPERTY}" is not set.`);
  }
  return SpreadsheetApp.openById(id);
}

export function getSheetByName(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: SheetName,
): GoogleAppsScript.Spreadsheet.Sheet | null {
  return spreadsheet.getSheetByName(name);
}

/** Returns the header row (row 1) as a plain array — callers pass this
 *  into requireHeaders below. */
export function getHeaderRow(sheet: GoogleAppsScript.Spreadsheet.Sheet): unknown[] {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return [];
  }
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

/** Returns every data row (everything below the header row) as raw
 *  values — callers pass this into RowMapper.rowsToObjects. */
export function readRawRows(sheet: GoogleAppsScript.Spreadsheet.Sheet): unknown[][] {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

/** Appends one row at the bottom of the sheet, in the exact column order
 *  given (build it with RowMapper.objectToRow). Not unit tested — a
 *  near-literal wrapper over SpreadsheetApp, same convention as every
 *  other function in this section (Task 5, same shape as salon's
 *  Sheets.ts's appendRow). */
export function appendRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: unknown[]): void {
  sheet.appendRow(row);
}

/** Convenience: resolve + require a sheet exists in one call. Still thin
 *  (delegates entirely to getSheetByName + the pure assertSheetFound
 *  below) — not unit tested itself, same reasoning as the rest of this
 *  section. */
export function getRequiredSheet(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: SheetName,
): GoogleAppsScript.Spreadsheet.Sheet {
  return assertSheetFound(name, getSheetByName(spreadsheet, name));
}

// --- Pure, Jest-tested from here down — no SpreadsheetApp/PropertiesService call. ---

/** Throws a descriptive error when `sheet` is null (the sheet was not
 *  found by name) — pure given an already-resolved lookup result, so it
 *  is directly testable without any GAS global. */
export function assertSheetFound(
  name: SheetName,
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null,
): GoogleAppsScript.Spreadsheet.Sheet {
  if (!sheet) {
    throw new Error(`Sheet "${name}" was not found in the spreadsheet.`);
  }
  return sheet;
}

/** Builds the header->column-index map for `name` from an already-read
 *  header row, and throws RowMapper.MissingHeadersError if any of
 *  SheetSchemas.REQUIRED_HEADERS[name] is absent. Extra/unrecognized
 *  columns in the sheet are always accepted — assertRequiredHeaders only
 *  ever checks presence of the required set, so a sheet with an added
 *  descriptive column never breaks this check (same tolerance CONFIG's
 *  key/value parsing applies to unrecognized keys — see
 *  ConfigParser.ts). Pure — fed a plain array, testable without
 *  SpreadsheetApp. */
export function requireHeaders(name: SheetName, headerRow: unknown[]): Record<string, number> {
  const headerMap = buildHeaderMap(headerRow);
  assertRequiredHeaders(headerMap, REQUIRED_HEADERS[name]);
  return headerMap;
}
