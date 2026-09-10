/**
 * Application-level API error codes (Phase 0 §H, extended per Phase 3A
 * §9 with CONFIG_INVALID — the code list is documented there as
 * "extensible"). Every code maps to a fixed, safe-to-show Japanese
 * message in Api.ts — never a raw exception message.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  INVALID_CANCELLATION_TOKEN: "INVALID_CANCELLATION_TOKEN",
  SYSTEM_BUSY: "SYSTEM_BUSY",
  CALENDAR_ERROR: "CALENDAR_ERROR",
  SHEET_ERROR: "SHEET_ERROR",
  MAIL_ERROR: "MAIL_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Phase 3A addition: CONFIG sheet data failed parsing/validation. */
  CONFIG_INVALID: "CONFIG_INVALID",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
