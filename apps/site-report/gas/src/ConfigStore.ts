import { SHEET_NAMES } from "./SheetNames";
import { CONFIG_HEADERS, ConfigRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { rowsToObjects } from "./RowMapper";
import { buildRawConfigMap, ConfigFieldIssue, parseSiteReportConfig } from "./ConfigParser";
import { SiteReportConfig } from "./Config";

/** Thrown whenever CONFIG data fails parsing (missing/empty required
 *  key). `issues` is for server-side diagnostics only — a future Api.ts
 *  action must map this to a stable public error code, never forward
 *  `issues` verbatim to a client (same boundary rule as salon's
 *  ConfigError / Api.ts's mapConfigErrorToResponse). */
export class SiteReportConfigError extends Error {
  constructor(public readonly issues: ConfigFieldIssue[]) {
    super("CONFIG_INVALID");
    this.name = "SiteReportConfigError";
  }
}

/** Pure core of the repository: given already-read raw CONFIG rows,
 *  parses them into a SiteReportConfig or throws SiteReportConfigError.
 *  Fed plain arrays in tests — never touches SpreadsheetApp (same split
 *  as salon's buildAppConfigFromRawRows). */
export function buildSiteReportConfigFromRawRows(configRows: ConfigRow[]): SiteReportConfig {
  const rawMap = buildRawConfigMap(configRows.map((row) => ({ Key: row.Key, Value: row.Value })));
  const result = parseSiteReportConfig(rawMap);
  if (!result.ok) {
    throw new SiteReportConfigError(result.issues);
  }
  return result.config;
}

/** Reads CONFIG from the real spreadsheet and returns the typed
 *  SiteReportConfig. Thin orchestration only — not unit tested by Jest;
 *  buildSiteReportConfigFromRawRows above carries all the tested logic
 *  (same convention as salon's getConfig()). */
export function getSiteReportConfig(): SiteReportConfig {
  const spreadsheet = getConfiguredSpreadsheet();
  const sheet = getRequiredSheet(spreadsheet, SHEET_NAMES.CONFIG);
  const headerMap = requireHeaders(SHEET_NAMES.CONFIG, getHeaderRow(sheet));
  // rowsToObjects<T> requires T to satisfy Record<string, unknown>, but
  // ConfigRow declares concrete field types (not an index signature) —
  // the double cast is the same escape hatch salon's ConfigStore.ts uses
  // for the identical structural-but-not-assignable situation.
  const configRows = rowsToObjects(headerMap, readRawRows(sheet), CONFIG_HEADERS) as unknown as ConfigRow[];
  return buildSiteReportConfigFromRawRows(configRows);
}
