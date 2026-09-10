import { NormalizedReservation } from "./models/ReservationDomain";
import { ReservationRow, RESERVATIONS_HEADERS } from "./SheetSchemas";
import { SHEET_NAMES } from "./SheetNames";
import { getHeaderMap, getSheet, readRawRows, appendRow, updateRow } from "./Sheets";
import { findRowIndexByColumnValue, objectToRow, rowsToObjects } from "./RowMapper";

/**
 * RESERVATIONS row builder + Sheets read/write (Phase 4 Task 6).
 * `buildPendingReservationRow` is pure and Jest-tested; everything else
 * here is a thin wrapper over `Sheets.ts` and is not unit tested (Phase 0
 * §Q), matching `ConfigStore.getConfig`'s own split.
 */

/** Pure: builds the RESERVATIONS row for a brand-new reservation, always
 *  `Status = 処理中` (Phase 0 §U step 3). "ANY" staff selection is never
 *  itself persisted (Phase 3C) — by the time this is called the caller
 *  has already resolved a concrete staff id, or none. */
export function buildPendingReservationRow(
  reservation: NormalizedReservation,
  now: Date,
  cancellationToken: string,
): ReservationRow {
  const createdAt = now.toISOString();
  return {
    ReservationID: reservation.reservationId,
    SubmissionID: reservation.submissionId,
    CreatedAt: createdAt,
    UpdatedAt: createdAt,
    Name: reservation.customerName,
    Email: reservation.email,
    Phone: reservation.phone,
    Date: reservation.date,
    Time: reservation.startTime,
    ServiceID: reservation.serviceId,
    StaffID: reservation.assignedStaffId,
    Notes: reservation.notes,
    Status: "処理中",
    CalendarEventID: undefined,
    EmailStatus: "pending",
    CancellationToken: cancellationToken,
  };
}

// `ReservationRow` declares concrete field types (not an index signature),
// so it isn't directly assignable to objectToRow<T>'s generic constraint
// despite being structurally compatible — same reasoning as ConfigStore's
// ConfigRow/HolidayRow casts (Phase 3A).
function toRawRow(row: ReservationRow): unknown[] {
  return objectToRow(RESERVATIONS_HEADERS, row as unknown as Record<string, unknown>);
}

/** Thin: appends one RESERVATIONS row. Not unit tested (Google global) —
 *  `buildPendingReservationRow` above carries the tested logic. */
export function appendReservationRow(row: ReservationRow): void {
  appendRow(getSheet(SHEET_NAMES.RESERVATIONS), toRawRow(row));
}

interface FoundReservationRow {
  sheet: GoogleAppsScript.Spreadsheet.Sheet;
  rowNumber: number;
  row: ReservationRow;
}

function findReservationRow(columnName: string, value: string): FoundReservationRow | null {
  const sheet = getSheet(SHEET_NAMES.RESERVATIONS);
  const headerMap = getHeaderMap(sheet);
  const dataRows = readRawRows(sheet);
  const index = findRowIndexByColumnValue(headerMap, dataRows, columnName, value);
  if (index === null) {
    return null;
  }
  const [row] = rowsToObjects<Record<string, unknown>>(headerMap, [dataRows[index]], RESERVATIONS_HEADERS);
  return { sheet, rowNumber: index + 2, row: row as unknown as ReservationRow };
}

export function findReservationBySubmissionId(submissionId: string): ReservationRow | null {
  return findReservationRow("SubmissionID", submissionId)?.row ?? null;
}

export function findReservationByReservationId(reservationId: string): ReservationRow | null {
  return findReservationRow("ReservationID", reservationId)?.row ?? null;
}

export function markReservationConfirmed(reservationId: string, calendarEventId: string, now: Date): void {
  const found = findReservationRow("ReservationID", reservationId);
  if (!found) {
    throw new Error(`Reservation "${reservationId}" was not found while marking it confirmed.`);
  }
  const updated: ReservationRow = {
    ...found.row,
    Status: "受付済",
    CalendarEventID: calendarEventId,
    UpdatedAt: now.toISOString(),
  };
  updateRow(found.sheet, found.rowNumber, toRawRow(updated));
}

export function markReservationNeedsConfirmation(reservationId: string, now: Date): void {
  const found = findReservationRow("ReservationID", reservationId);
  if (!found) {
    throw new Error(`Reservation "${reservationId}" was not found while marking it for confirmation.`);
  }
  const updated: ReservationRow = { ...found.row, Status: "要確認", UpdatedAt: now.toISOString() };
  updateRow(found.sheet, found.rowNumber, toRawRow(updated));
}

/** Best-effort footnote update — never throws over an EmailStatus write
 *  failure, since the reservation itself is already final by the time
 *  this is called (Phase 0 §M: an email-log concern, not a transaction
 *  state one). */
export function updateReservationEmailStatus(
  reservationId: string,
  emailStatus: "sent" | "failed",
  now: Date,
): void {
  const found = findReservationRow("ReservationID", reservationId);
  if (!found) {
    return;
  }
  const updated: ReservationRow = { ...found.row, EmailStatus: emailStatus, UpdatedAt: now.toISOString() };
  updateRow(found.sheet, found.rowNumber, toRawRow(updated));
}
