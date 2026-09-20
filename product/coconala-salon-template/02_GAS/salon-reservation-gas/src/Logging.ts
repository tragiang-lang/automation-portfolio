import { SHEET_NAMES } from "./SheetNames";
import { ERROR_LOG_HEADERS, EMAIL_LOG_HEADERS, ErrorLogRow, EmailLogRow } from "./SheetSchemas";
import { getSheet, appendRow } from "./Sheets";
import { objectToRow } from "./RowMapper";

/**
 * ERROR_LOG / EMAIL_LOG writers (Phase 0 §N/§O) — the durable, human-
 * visible-enough audit trail `Api.ts`'s orchestration writes to for every
 * Layer C failure and every email send attempt. `context`/`ContextJSON`
 * may reference ids (reservationId, calendarEventId) but must never carry
 * email/phone/notes content (Phase 0 §O).
 */

export interface LogErrorInput {
  action: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity: "warning" | "error" | "critical";
}

export function buildErrorLogRow(input: LogErrorInput, errorId: string, now: Date): ErrorLogRow {
  return {
    ErrorID: errorId,
    CreatedAt: now.toISOString(),
    Action: input.action,
    Message: input.message,
    Stack: input.stack,
    ContextJSON: input.context ? JSON.stringify(input.context) : undefined,
    Severity: input.severity,
  };
}

export interface LogEmailInput {
  relatedType: "Reservation" | "Inquiry" | "CancellationRequest";
  relatedId: string;
  recipientType: "customer" | "owner";
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed";
  errorMessage?: string;
}

export function buildEmailLogRow(input: LogEmailInput, emailLogId: string, now: Date): EmailLogRow {
  return {
    EmailLogID: emailLogId,
    CreatedAt: now.toISOString(),
    RelatedType: input.relatedType,
    RelatedID: input.relatedId,
    RecipientType: input.recipientType,
    RecipientEmail: input.recipientEmail,
    Subject: input.subject,
    Status: input.status,
    ErrorMessage: input.errorMessage,
  };
}

/** Thin: appends one ERROR_LOG row. Swallows its own failure to
 *  `console.error` — a logging failure must never crash the caller's own
 *  error handling. Not unit tested (Google globals: `Utilities`,
 *  `SpreadsheetApp` via `Sheets.ts`). */
export function logError(input: LogErrorInput, now: Date = new Date()): void {
  try {
    const errorId = Utilities.getUuid();
    appendRow(getSheet(SHEET_NAMES.ERROR_LOG), objectToRow(ERROR_LOG_HEADERS, buildErrorLogRow(input, errorId, now) as unknown as Record<string, unknown>));
  } catch (loggingError) {
    console.error("[Logging] failed to write ERROR_LOG row:", input.action, input.message, loggingError);
  }
}

export function logEmail(input: LogEmailInput, now: Date = new Date()): void {
  try {
    const emailLogId = Utilities.getUuid();
    appendRow(getSheet(SHEET_NAMES.EMAIL_LOG), objectToRow(EMAIL_LOG_HEADERS, buildEmailLogRow(input, emailLogId, now) as unknown as Record<string, unknown>));
  } catch (loggingError) {
    console.error("[Logging] failed to write EMAIL_LOG row:", input.relatedId, loggingError);
  }
}
