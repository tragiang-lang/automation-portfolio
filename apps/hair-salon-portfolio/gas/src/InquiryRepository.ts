import { InquiryRequest } from "./models/InquiryRequest";
import { InquiryRow, INQUIRIES_HEADERS } from "./SheetSchemas";
import { SHEET_NAMES } from "./SheetNames";
import { getHeaderMap, getSheet, readRawRows, appendRow } from "./Sheets";
import { findRowIndexByColumnValue, objectToRow, rowsToObjects } from "./RowMapper";

/**
 * INQUIRIES row builder + Sheets read/write — mirrors
 * ReservationRepository.ts's split: `buildPendingInquiryRow` is pure and
 * Jest-tested, everything else is a thin wrapper over `Sheets.ts` and is
 * not unit tested, matching that module's own convention.
 */

/** Pure: builds the INQUIRIES row for a brand-new inquiry. Unlike a
 *  reservation, an inquiry has no pending/confirmed state machine — it is
 *  "受付済" (received) the moment it's recorded, since there is no
 *  server-side re-check to fail. `Source` is always "website" today (the
 *  only inquiry channel this Starter MVP has). */
export function buildPendingInquiryRow(request: InquiryRequest, inquiryId: string, now: Date): InquiryRow {
  return {
    InquiryID: inquiryId,
    SubmissionID: request.submissionId,
    CreatedAt: now.toISOString(),
    Name: request.name,
    Email: request.email,
    Phone: request.phone,
    Subject: request.subject,
    Message: request.message,
    Source: "website",
    Status: "受付済",
  };
}

function toRawRow(row: InquiryRow): unknown[] {
  return objectToRow(INQUIRIES_HEADERS, row as unknown as Record<string, unknown>);
}

/** Thin: appends one INQUIRIES row. Not unit tested (Google global) —
 *  `buildPendingInquiryRow` above carries the tested logic. */
export function appendInquiryRow(row: InquiryRow): void {
  appendRow(getSheet(SHEET_NAMES.INQUIRIES), toRawRow(row));
}

/** Thin: idempotency backstop lookup, mirrors
 *  ReservationRepository.findReservationBySubmissionId. */
export function findInquiryBySubmissionId(submissionId: string): InquiryRow | null {
  const sheet = getSheet(SHEET_NAMES.INQUIRIES);
  const headerMap = getHeaderMap(sheet);
  const dataRows = readRawRows(sheet);
  const index = findRowIndexByColumnValue(headerMap, dataRows, "SubmissionID", submissionId);
  if (index === null) {
    return null;
  }
  const [row] = rowsToObjects<Record<string, unknown>>(headerMap, [dataRows[index]], INQUIRIES_HEADERS);
  return row as unknown as InquiryRow;
}
