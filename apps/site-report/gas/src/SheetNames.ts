/**
 * Canonical Google Sheets tab names for site-report. Every reference to a
 * sheet by name must go through this constant — same convention as
 * apps/salon-portfolio/gas/src/SheetNames.ts.
 */
export const SHEET_NAMES = {
  CONFIG: "CONFIG",
  SITES: "SITES",
  WORKERS: "WORKERS",
  REPORTS: "REPORTS",
  REPORT_PHOTOS: "REPORT_PHOTOS",
  WORK_TYPES: "WORK_TYPES",
  /** Phase 2: 進捗状況 master data — same role/shape as WORK_TYPES. */
  PROGRESS_STATUS: "PROGRESS_STATUS",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];
