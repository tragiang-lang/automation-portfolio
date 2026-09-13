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
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];
