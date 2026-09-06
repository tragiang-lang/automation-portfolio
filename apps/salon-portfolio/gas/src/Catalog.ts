import { SHEET_NAMES } from "./SheetNames";
import { SERVICES_HEADERS, STAFF_HEADERS, ServiceRow, StaffRow } from "./SheetSchemas";
import { getHeaderMap, getSheet, readRawRows } from "./Sheets";
import { rowsToObjects } from "./RowMapper";
import { parseServiceRow, parseStaffRow } from "./CatalogParser";

/**
 * Thin, internal-only SERVICES/STAFF repository (Phase 4 Task 3) — not
 * exposed as its own `Api.ts` action this phase (there is no picker UI
 * yet to consume `getServices`/`getStaff`; see
 * docs/reservation-transaction-architecture.md). Reads every row (active
 * and inactive); `ReservationRules.resolveService`/`resolveStaffSelection`
 * already decide bookability/eligibility. Not unit tested by Jest (Phase
 * 0 §Q) — `CatalogParser.ts`'s coercion functions carry the tested logic.
 */

export function getServiceRows(): ServiceRow[] {
  const sheet = getSheet(SHEET_NAMES.SERVICES);
  const headerMap = getHeaderMap(sheet);
  const rawRows = rowsToObjects<Record<string, unknown>>(
    headerMap,
    readRawRows(sheet),
    SERVICES_HEADERS,
  );
  return rawRows.map(parseServiceRow);
}

export function getStaffRows(): StaffRow[] {
  const sheet = getSheet(SHEET_NAMES.STAFF);
  const headerMap = getHeaderMap(sheet);
  const rawRows = rowsToObjects<Record<string, unknown>>(
    headerMap,
    readRawRows(sheet),
    STAFF_HEADERS,
  );
  return rawRows.map(parseStaffRow);
}
