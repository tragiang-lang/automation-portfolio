import { ReservationIssueCode } from "../models/ReservationDomain";

/** A busy Tokyo-local interval, already normalized by whatever supplies
 *  it (a future Calendar adapter, or a test fixture) — this module never
 *  fetches events itself (Phase 3C §37/§53, hard rule: no `CalendarApp`
 *  call anywhere in this plan). `start`/`end` use the same
 *  `YYYY-MM-DDTHH:mm` Tokyo-local format as `Utils.toTokyoLocalDateTimeString`,
 *  which sorts correctly as a plain string. */
export interface BusyInterval {
  start: string;
  end: string;
  /** Present when this interval belongs to one staff member's calendar
   *  (Phase 3C §40/§77) rather than the single shared calendar. */
  staffId?: string;
}

export type AvailabilityFailureReason = Extract<
  ReservationIssueCode,
  "CALENDAR_CONFLICT" | "STAFF_NOT_AVAILABLE" | "NO_STAFF_AVAILABLE"
>;

export interface AvailabilityInput {
  candidateStart: string;
  candidateEnd: string;
}

export type AvailabilityResult =
  | { available: true; assignedStaffId?: string }
  | { available: false; reason: AvailabilityFailureReason };

/** Replaceable availability source (Phase 3C §35-36) — the production
 *  implementation is `CalendarOverlapAvailability`/
 *  `StaffAvailabilityStrategy`/`SharedAvailabilityStrategy` (Tasks 5-7);
 *  a test can supply any object satisfying this shape without touching
 *  Calendar at all. */
export interface AvailabilityStrategy {
  isAvailable(input: AvailabilityInput): AvailabilityResult;
}

/** Two half-open intervals `[start, end)` overlap iff each starts before
 *  the other ends (Phase 3C §39). Pure string comparison is correct here
 *  because both operands are `YYYY-MM-DDTHH:mm`, which sorts
 *  chronologically as plain text. */
export function intervalsOverlap(
  candidateStart: string,
  candidateEnd: string,
  existingStart: string,
  existingEnd: string,
): boolean {
  return candidateStart < existingEnd && candidateEnd > existingStart;
}
