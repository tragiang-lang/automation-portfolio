import { SHEET_NAMES } from "./SheetNames";
import { SITES_HEADERS, SiteRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { rowsToObjects } from "./RowMapper";

/**
 * Thin, internal-only SITES repository (Task 4) — same role as
 * ConfigStore.getSiteReportConfig(): resolves the configured spreadsheet,
 * validates the SITES sheet exists with its required headers, and reads
 * every data row into the generic SiteRow shape. Not unit tested by Jest
 * (same convention as SheetStore.ts/ConfigStore.ts's real-Sheets-touching
 * functions) — RowMapper.rowsToObjects/mapSiteRow and Validation.ts's
 * validateSiteRow carry all the tested logic Api.ts's buildSitesResult
 * builds on.
 */
export function getSiteRows(): SiteRow[] {
  const spreadsheet = getConfiguredSpreadsheet();
  const sheet = getRequiredSheet(spreadsheet, SHEET_NAMES.SITES);
  const headerMap = requireHeaders(SHEET_NAMES.SITES, getHeaderRow(sheet));
  // Same double-cast escape hatch ConfigStore.getSiteReportConfig() uses:
  // rowsToObjects<T> requires T extends Record<string, unknown>, but
  // SiteRow declares concrete field types rather than an index signature.
  return rowsToObjects(headerMap, readRawRows(sheet), SITES_HEADERS) as unknown as SiteRow[];
}
