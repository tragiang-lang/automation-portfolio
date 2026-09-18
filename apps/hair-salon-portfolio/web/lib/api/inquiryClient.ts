import { InquirySubmission, InquirySubmissionSuccess } from "@/types/inquiry";
import { callGasApiAction } from "@/lib/api/apiActionClient";

/**
 * Client-safe wrapper for the Inquiry flow's one browser-initiated GAS
 * action, through the same `/api/gas` proxy `reservationClient.ts` uses —
 * same architecture as booking, not a Google Form (Starter MVP §5).
 */
export async function submitInquiry(submission: InquirySubmission) {
  return callGasApiAction<InquirySubmissionSuccess>("createInquiry", submission);
}
