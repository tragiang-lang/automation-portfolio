/**
 * Client-facing inquiry submission contract — mirrors the GAS backend's
 * `InquiryRequest` (`gas/src/models/InquiryRequest.ts`) field-for-field,
 * same "separate frontend mirror" convention as `types/reservation.ts`.
 */
import type { ApiActionResult } from "@/types/reservation";

export interface InquirySubmission {
  submissionId: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface InquirySubmissionSuccess {
  inquiryId: string;
}

export type InquirySubmissionResult = ApiActionResult<InquirySubmissionSuccess>;
