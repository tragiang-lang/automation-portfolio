import { SHEET_NAMES } from "./SheetNames";
import { PROGRESS_STATUS_HEADERS, ProgressStatusRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { MalformedRowValueError, mapProgressStatusRow, rowsToObjects } from "./RowMapper";
import { validateProgressStatusRow, ValidationIssue } from "./Validation";
import { ProgressStatus } from "./models/ProgressStatus";

/**
 * Thin, internal-only PROGRESS_STATUS repository (Phase 2) — exact
 * structural copy of WorkTypesRepository.ts's getWorkTypeRows/
 * buildWorkTypesResult. Not unit tested by Jest for the Sheets-touching
 * function (same convention as every other real-Sheets-touching function
 * in this project); buildProgressStatusResult below carries all the
 * tested logic.
 */
export function getProgressStatusRows(): ProgressStatusRow[] {
  const spreadsheet = getConfiguredSpreadsheet();
  const sheet = getRequiredSheet(spreadsheet, SHEET_NAMES.PROGRESS_STATUS);
  const headerMap = requireHeaders(SHEET_NAMES.PROGRESS_STATUS, getHeaderRow(sheet));
  // Same double-cast escape hatch WorkTypesRepository.getWorkTypeRows()
  // uses: rowsToObjects<T> requires T extends Record<string, unknown>,
  // but ProgressStatusRow declares concrete field types rather than an
  // index signature.
  return rowsToObjects(headerMap, readRawRows(sheet), PROGRESS_STATUS_HEADERS) as unknown as ProgressStatusRow[];
}

export type ProgressStatusesResult =
  | { ok: true; progressStatuses: ProgressStatus[] }
  | { ok: false; kind: "malformed"; index: number; field: string; reason: string }
  | { ok: false; kind: "invalid"; index: number; issues: ValidationIssue[] };

/** Pure core of GET_PROGRESS_STATUS (and SUBMIT_REPORT's progress-status
 *  lookup) — exact structural copy of WorkTypesRepository.buildWorkTypesResult:
 *  maps+validates every row, then filters to ACTIVE and sorts by
 *  sortOrder ascending. */
export function buildProgressStatusResult(rows: ProgressStatusRow[]): ProgressStatusesResult {
  const progressStatuses: ProgressStatus[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    let progressStatus: ProgressStatus;
    try {
      progressStatus = mapProgressStatusRow(row);
    } catch (error) {
      if (error instanceof MalformedRowValueError) {
        return { ok: false, kind: "malformed", index, field: error.field, reason: error.reason };
      }
      throw error;
    }
    const issues = validateProgressStatusRow(row);
    if (issues.length > 0) {
      return { ok: false, kind: "invalid", index, issues };
    }
    progressStatuses.push(progressStatus);
  }
  const active = progressStatuses.filter((progressStatus) => progressStatus.status === "ACTIVE");
  active.sort((a, b) => a.sortOrder - b.sortOrder);
  return { ok: true, progressStatuses: active };
}
