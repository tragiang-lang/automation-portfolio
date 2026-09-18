import { InquiryRow } from "./SheetSchemas";

/**
 * Idempotency for the Inquiry flow — mirrors Idempotency.ts's
 * CacheService-fast-path-plus-sheet-backstop shape for reservations. A
 * distinct cache-key prefix keeps the two flows' cached results from ever
 * colliding on the same submissionId.
 */

export interface InquiryIdempotencyResult {
  inquiryId: string;
}

const CACHE_PREFIX = "inquiry-submission:";
const CACHE_TTL_SECONDS = 600;

export function buildInquiryIdempotencyCacheKey(submissionId: string): string {
  return `${CACHE_PREFIX}${submissionId}`;
}

/** Pure: reconstructs the same result shape createInquiry originally
 *  returned, from an already-found INQUIRIES row. */
export function mapInquiryRowToResult(row: InquiryRow): InquiryIdempotencyResult {
  return { inquiryId: row.InquiryID };
}

/** Thin: fast-path idempotency check via CacheService. Not unit tested —
 *  a Google global. */
export function getCachedInquiryResult(submissionId: string): InquiryIdempotencyResult | null {
  const raw = CacheService.getScriptCache().get(buildInquiryIdempotencyCacheKey(submissionId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as InquiryIdempotencyResult;
  } catch {
    return null;
  }
}

export function setCachedInquiryResult(submissionId: string, result: InquiryIdempotencyResult): void {
  CacheService.getScriptCache().put(buildInquiryIdempotencyCacheKey(submissionId), JSON.stringify(result), CACHE_TTL_SECONDS);
}
