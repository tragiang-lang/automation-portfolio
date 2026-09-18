/**
 * Reservation request/record contracts — Phase 0 spec §E, reused
 * verbatim. This is the client-facing shape a future `createReservation`
 * action will accept; Phase 3C only establishes the domain that decides
 * whether a request of this shape is valid and currently available.
 */

/** Sentinel staffId meaning "no specific staff — assign any available
 *  one" (Phase 0 §E, §K). */
export const ANY_STAFF = "ANY" as const;

export interface ReservationRequest {
  /** Client-generated idempotency key (Phase 0 §P). Carried through the
   *  domain so a future orchestration phase can use it — Phase 3C does
   *  not implement any idempotency/duplicate-detection logic itself. */
  submissionId: string;
  /** Decision 5: exactly one service per reservation — no multi-service
   *  booking. */
  serviceId: string;
  /** Omitted/ignored entirely when `features.staffSelection` is false
   *  (Phase 0 §K). */
  staffId?: string | typeof ANY_STAFF;
  /** `YYYY-MM-DD`, Asia/Tokyo. */
  date: string;
  /** `HH:mm`, 24h. */
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

/** Reservation state machine values (Phase 0 spec §I). Phase 3C never
 *  assigns a status — this exists only so `ReservationRecord` type-checks
 *  against the eventual Sheets row shape; no code path in this phase
 *  produces a `ReservationRecord`. */
export type ReservationStatus =
  | "処理中"
  | "受付済"
  | "要確認"
  | "キャンセル依頼あり"
  | "キャンセル済";

/** Persisted-row shape (Phase 0 §E) — distinct from the request DTO on
 *  purpose. Not produced anywhere in Phase 3C; declared here only so a
 *  future orchestration phase's type can be checked against this same
 *  source of truth instead of being redefined. */
export interface ReservationRecord extends ReservationRequest {
  reservationId: string;
  createdAt: string;
  updatedAt: string;
  status: ReservationStatus;
  calendarEventId?: string;
  emailStatus: "pending" | "sent" | "failed";
  cancellationToken: string;
}
