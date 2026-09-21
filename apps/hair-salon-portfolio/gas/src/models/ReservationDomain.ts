import { StaffRow } from "../SheetSchemas";

/**
 * Domain-internal types for reservation validation, business-rule
 * evaluation, and availability. Distinct from `models/ErrorCodes.ts`
 * (the public API's coarse `ErrorCode` union) on purpose (Phase 3C §69):
 * these are fine-grained, presentation-agnostic domain codes that a
 * future `Api.ts` action maps down onto the public envelope — they are
 * never returned to the client directly.
 */

export type ReservationIssueCode =
  | "REQUIRED_FIELD_MISSING"
  | "INVALID_FORMAT"
  | "INVALID_DATE"
  | "TOO_LONG"
  | "MENU_NOT_FOUND"
  | "MENU_NOT_BOOKABLE"
  | "STAFF_NOT_FOUND"
  | "STAFF_NOT_AVAILABLE"
  | "STAFF_SELECTION_NOT_SUPPORTED"
  | "OUTSIDE_BUSINESS_HOURS"
  | "HOLIDAY"
  | "PAST_DATE"
  | "OUTSIDE_BOOKING_WINDOW"
  | "CALENDAR_CONFLICT"
  | "NO_STAFF_AVAILABLE";

export interface ValidationIssue {
  field: string;
  code: ReservationIssueCode;
  message?: string;
}

/** Resolution of the request's staff choice against CONFIG + the STAFF
 *  catalog (Phase 3C §19-21). `"none"` is the `features.staffSelection =
 *  false` case — not an error, just "there is no staff dimension". */
export type StaffSelectionResolution =
  | { kind: "none" }
  | { kind: "specific"; staff: StaffRow }
  | { kind: "any"; eligibleStaff: StaffRow[] };

/** The fully-resolved, server-authoritative reservation, ready for a
 *  future orchestration phase to persist. `durationMinutes`/`price`/
 *  `serviceName` come from the resolved `ServiceRow`, never from the raw
 *  request (Phase 3C §17/§51). `assignedStaffId` is set once an
 *  `AvailabilityStrategy` has actually resolved a concrete staff member
 *  (including the "any available" -> first-free resolution, Phase 0
 *  §J/§K) — this is advisory at Phase 3C's evaluation time, not a
 *  reservation guarantee (see docs/reservation-domain-architecture.md
 *  "Concurrency" section, written in Task 13). */
/** One staff member's availability for a specific candidate date+time
 *  (Phase: staff conflict display, spec §6/§8) — the per-staff
 *  counterpart to the plain yes/no `AvailabilityResult`. `conflicts` is
 *  empty exactly when `available` is true. */
export interface StaffAvailabilityConflict {
  startTime: string;
  endTime: string;
}

export interface StaffAvailabilityEntry {
  staffId: string;
  name: string;
  available: boolean;
  conflicts: StaffAvailabilityConflict[];
}

export interface NormalizedReservation {
  reservationId: string;
  submissionId: string;
  customerName: string;
  email: string;
  phone?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  staffSelection: StaffSelectionResolution;
  assignedStaffId?: string;
  notes?: string;
}
