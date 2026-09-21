/**
 * Client-facing reservation submission contract — mirrors the GAS
 * backend's `ReservationRequest` (`gas/src/models/ReservationRequest.ts`)
 * field-for-field. Kept as a separate frontend type (not imported across
 * the gas/web package boundary) matching this repo's existing convention
 * (`types/runtime-config.ts` mirrors `gas/src/models/Config.ts` the same
 * way).
 */

export const ANY_STAFF = "ANY" as const;

export interface ReservationSubmission {
  submissionId: string;
  serviceId: string;
  staffId?: string | typeof ANY_STAFF;
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface ReservationSubmissionSuccess {
  reservationId: string;
  needsConfirmation?: boolean;
  /** True only for `lib/config/reservationDemoSubmission.ts`'s local
   *  result — the real GAS `createReservation` response never sets this. */
  isDemo?: boolean;
}

export interface ReservationSubmissionFailure {
  code: string;
  message: string;
}

export type ReservationSubmissionResult =
  | { ok: true; data: ReservationSubmissionSuccess }
  | { ok: false; error: ReservationSubmissionFailure };

/**
 * Phase 5 additions — public catalog/availability projections, mirroring
 * `gas/src/models/Catalog.ts` (`PublicService`/`PublicStaff`) and the
 * `GetAvailabilityResponseData` shape `Api.ts::getAvailabilityAction`
 * returns. Same "separate frontend mirror" convention as
 * `ReservationSubmission` above.
 */

export interface ApiFailure {
  code: string;
  message: string;
}

export type ApiActionResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export interface PublicService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the SERVICES sheet
   *  has no Description/Category column yet, or GAS hasn't been upgraded.
   *  Never used for pricing/duration/eligibility. */
  description?: string;
  category?: string;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the STAFF sheet has
   *  no Role/Bio/ImagePath column yet, or GAS hasn't been upgraded. Never
   *  used for staff-eligibility logic. */
  role?: string;
  introduction?: string;
  photoSrc?: string;
}

export interface AvailableTimeSlot {
  time: string;
}

/** One staff member's availability + conflict periods for a specific
 *  date+time+service candidate (staff-conflict display) — mirrors
 *  `gas/src/models/ReservationDomain.ts::StaffAvailabilityEntry`. */
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

export interface GetAvailabilityResult {
  date: string;
  slots: AvailableTimeSlot[];
  /** Present only when the request included `time` and staff selection is
   *  on — see `gas/src/Api.ts::GetAvailabilityResponseData`. */
  staff?: StaffAvailabilityEntry[];
}

export interface AvailabilityRequest {
  serviceId: string;
  staffId?: string | typeof ANY_STAFF;
  date: string;
  /** `HH:mm` — when provided, the response includes the per-staff
   *  availability breakdown for this exact candidate. */
  time?: string;
}

export interface CancelReservationRequest {
  reservationId: string;
  cancellationToken: string;
}

export interface CancelReservationResult {
  reservationId: string;
}
