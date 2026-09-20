import { SHEET_NAMES } from "./SheetNames";
import { SITES_HEADERS, SiteRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { MalformedRowValueError, mapSiteRow, rowsToObjects } from "./RowMapper";
import { validateSiteRow, ValidationIssue } from "./Validation";
import { Site } from "./models/Site";

/**
 * Thin, internal-only SITES repository (Task 4) — same role as
 * ConfigStore.getSiteReportConfig(): resolves the configured spreadsheet,
 * validates the SITES sheet exists with its required headers, and reads
 * every data row into the generic SiteRow shape. Not unit tested by Jest
 * (same convention as SheetStore.ts/ConfigStore.ts's real-Sheets-touching
 * functions) — RowMapper.rowsToObjects/mapSiteRow and Validation.ts's
 * validateSiteRow carry all the tested logic Api.ts's/
 * SubmitReportService.ts's buildSitesResult builds on.
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

/** Outcome of mapping+validating every SITES row (Task 4; relocated here
 *  in Task 5 from Api.ts so SubmitReportService.ts's site-existence check
 *  can reuse it without importing Api.ts — Api.ts re-exports both names
 *  unchanged for backward compatibility, so this is a pure code move, not
 *  a behavior change). Deliberately preserves Task 3's mapping/validation
 *  split: a "malformed" result comes from mapSiteRow's structural
 *  coercion rejecting a value outright (RowMapper.MalformedRowValueError);
 *  an "invalid" result comes from validateSiteRow reporting a
 *  business-rule issue (required field empty, disallowed status, bad date
 *  format) on an otherwise well-shaped row. Either way, the whole result
 *  fails rather than silently dropping/defaulting the bad row (Task 4
 *  §11). */
export type SitesResult =
  | { ok: true; sites: Site[] }
  | { ok: false; kind: "malformed"; index: number; field: string; reason: string }
  | { ok: false; kind: "invalid"; index: number; issues: ValidationIssue[] };

/** Pure core of GET_SITES (and SUBMIT_REPORT's site lookup): given
 *  already-read raw SITES rows (in Spreadsheet order), maps and validates
 *  each one. Never touches SpreadsheetApp — fed plain arrays in tests,
 *  same split as ConfigStore.buildSiteReportConfigFromRawRows. For each
 *  row, mapSiteRow runs first (it throws for a value that cannot be
 *  coerced into a Site field at all, e.g. a status outside
 *  ACTIVE/INACTIVE — a strict subset of what validateSiteRow itself would
 *  flag as a business-rule issue for that same field), then
 *  validateSiteRow runs on the same raw row to catch business-rule
 *  problems mapSiteRow tolerates (e.g. an empty required siteId, which
 *  mapSiteRow preserves as "" rather than inventing a value for). Row
 *  order is preserved — no sorting. */
export function buildSitesResult(rows: SiteRow[]): SitesResult {
  const sites: Site[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    let site: Site;
    try {
      site = mapSiteRow(row);
    } catch (error) {
      if (error instanceof MalformedRowValueError) {
        return { ok: false, kind: "malformed", index, field: error.field, reason: error.reason };
      }
      throw error;
    }
    const issues = validateSiteRow(row);
    if (issues.length > 0) {
      return { ok: false, kind: "invalid", index, issues };
    }
    sites.push(site);
  }
  // Phase 1 P0: only ACTIVE sites are ever surfaced to GET_SITES or
  // SUBMIT_REPORT's site lookup (both call this function) — every row is
  // still fully mapped+validated above regardless of status, so an
  // invalid INACTIVE row still fails the whole result rather than being
  // silently filtered away unnoticed.
  return { ok: true, sites: sites.filter((site) => site.status === "ACTIVE") };
}
