import { SHEET_NAMES } from "./SheetNames";
import { WORK_TYPES_HEADERS, WorkTypeRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { MalformedRowValueError, mapWorkTypeRow, rowsToObjects } from "./RowMapper";
import { validateWorkTypeRow, ValidationIssue } from "./Validation";
import { WorkType } from "./models/WorkType";

/**
 * Thin, internal-only WORK_TYPES repository (Phase 1 P0) — same role and
 * shape as SitesRepository.ts's getSiteRows/buildSitesResult. Not unit
 * tested by Jest for the Sheets-touching function (same convention as
 * every other real-Sheets-touching function in this project);
 * buildWorkTypesResult below carries all the tested logic.
 */
export function getWorkTypeRows(): WorkTypeRow[] {
  const spreadsheet = getConfiguredSpreadsheet();
  const sheet = getRequiredSheet(spreadsheet, SHEET_NAMES.WORK_TYPES);
  const headerMap = requireHeaders(SHEET_NAMES.WORK_TYPES, getHeaderRow(sheet));
  // Same double-cast escape hatch SitesRepository.getSiteRows() uses:
  // rowsToObjects<T> requires T extends Record<string, unknown>, but
  // WorkTypeRow declares concrete field types rather than an index
  // signature.
  return rowsToObjects(headerMap, readRawRows(sheet), WORK_TYPES_HEADERS) as unknown as WorkTypeRow[];
}

export type WorkTypesResult =
  | { ok: true; workTypes: WorkType[] }
  | { ok: false; kind: "malformed"; index: number; field: string; reason: string }
  | { ok: false; kind: "invalid"; index: number; issues: ValidationIssue[] };

/** Pure core of GET_WORK_TYPES (and SUBMIT_REPORT's work-type lookup):
 *  maps+validates every row (never touches SpreadsheetApp), then the
 *  ok:true branch filters to ACTIVE and sorts by sortOrder ascending — the
 *  stable display order the dropdown renders in, independent of the raw
 *  sheet's physical row order (unlike buildSitesResult, which preserves
 *  sheet order — WORK_TYPES has an explicit sortOrder column precisely so
 *  an operator can reorder the dropdown without reordering sheet rows). */
export function buildWorkTypesResult(rows: WorkTypeRow[]): WorkTypesResult {
  const workTypes: WorkType[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    let workType: WorkType;
    try {
      workType = mapWorkTypeRow(row);
    } catch (error) {
      if (error instanceof MalformedRowValueError) {
        return { ok: false, kind: "malformed", index, field: error.field, reason: error.reason };
      }
      throw error;
    }
    const issues = validateWorkTypeRow(row);
    if (issues.length > 0) {
      return { ok: false, kind: "invalid", index, issues };
    }
    workTypes.push(workType);
  }
  const active = workTypes.filter((workType) => workType.status === "ACTIVE");
  active.sort((a, b) => a.sortOrder - b.sortOrder);
  return { ok: true, workTypes: active };
}
