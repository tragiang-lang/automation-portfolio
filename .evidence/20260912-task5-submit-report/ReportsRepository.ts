import { SHEET_NAMES } from "./SheetNames";
import { REPORTS_HEADERS, REPORT_PHOTOS_HEADERS, ReportPhotoRow, ReportRow } from "./SheetSchemas";
import { appendRow, getConfiguredSpreadsheet, getRequiredSheet } from "./SheetStore";
import { objectToRow } from "./RowMapper";

/**
 * Thin, internal-only REPORTS/REPORT_PHOTOS writers (Task 5) — same role
 * as SitesRepository.getSiteRows(): resolves the configured spreadsheet,
 * requires the sheet, and appends one row built from the existing
 * schema. Not unit tested by Jest (same convention as every other
 * real-Sheets-touching function in this project) —
 * SubmitReportService.ts's orchestration and RowMapper.objectToRow carry
 * the tested logic; this module is mocked wholesale in
 * SubmitReportService.test.ts.
 */

export function appendReportRow(row: ReportRow): void {
  const sheet = getRequiredSheet(getConfiguredSpreadsheet(), SHEET_NAMES.REPORTS);
  // Same double-cast escape hatch SitesRepository.getSiteRows() uses:
  // objectToRow takes Record<string, unknown>, but ReportRow declares
  // concrete field types rather than an index signature.
  appendRow(sheet, objectToRow(REPORTS_HEADERS, row as unknown as Record<string, unknown>));
}

export function appendReportPhotoRow(row: ReportPhotoRow): void {
  const sheet = getRequiredSheet(getConfiguredSpreadsheet(), SHEET_NAMES.REPORT_PHOTOS);
  appendRow(sheet, objectToRow(REPORT_PHOTOS_HEADERS, row as unknown as Record<string, unknown>));
}
