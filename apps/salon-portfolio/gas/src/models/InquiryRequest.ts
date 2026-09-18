/**
 * Inquiry request contract — the client-facing shape `createInquiry`
 * accepts, mirroring `ReservationRequest.ts`'s own contract/conventions.
 * name/email/message required; phone/subject optional (spec §2's Inquiry
 * Form fields).
 */
export interface InquiryRequest {
  /** Client-generated idempotency key, same role as
   *  `ReservationRequest.submissionId`. */
  submissionId: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/** Inquiry state — deliberately just one value today (no confirm/cancel
 *  workflow like reservations have); kept as its own type so a future
 *  status (e.g. "対応済") doesn't require touching InquiryRow. */
export type InquiryStatus = "受付済";
