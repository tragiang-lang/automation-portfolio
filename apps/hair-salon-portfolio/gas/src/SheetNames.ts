/**
 * Canonical Google Sheets tab names for this project (Phase 0 spec §C).
 * Every reference to a sheet by name must go through this constant —
 * never hard-code a tab name string elsewhere.
 */
export const SHEET_NAMES = {
  CONFIG: "CONFIG",
  HOLIDAYS: "HOLIDAYS",
  SERVICES: "SERVICES",
  STAFF: "STAFF",
  RESERVATIONS: "RESERVATIONS",
  CANCELLATION_REQUESTS: "CANCELLATION_REQUESTS",
  INQUIRIES: "INQUIRIES",
  EMAIL_LOG: "EMAIL_LOG",
  ERROR_LOG: "ERROR_LOG",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];
