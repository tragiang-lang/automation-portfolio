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
}

export interface ReservationSubmissionFailure {
  code: string;
  message: string;
}

export type ReservationSubmissionResult =
  | { ok: true; data: ReservationSubmissionSuccess }
  | { ok: false; error: ReservationSubmissionFailure };
