/**
 * Client-generated idempotency key for `ReservationSubmission.submissionId`
 * (Phase 4 contract — any non-empty string, reused across retries of the
 * same submission; `gas/src/Validation.ts` does not enforce a UUID format).
 * Prefers `crypto.randomUUID()`; falls back to a timestamp+random string
 * where it's unavailable (older browsers, some test environments) so this
 * never throws.
 */
export function generateSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
