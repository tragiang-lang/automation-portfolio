import { ReservationRow } from "./SheetSchemas";

/**
 * Idempotency (Phase 0 §P): a `CacheService` fast path plus the
 * RESERVATIONS sheet itself as the durable backstop (`ReservationRepository`'s
 * `findReservationBySubmissionId` does the actual sheet lookup — this
 * module only builds the cache key and reconstructs the result shape from
 * an already-found row).
 */

export interface IdempotencyResult {
  reservationId: string;
  needsConfirmation?: boolean;
}

const CACHE_PREFIX = "reservation-submission:";
const CACHE_TTL_SECONDS = 600;

export function buildIdempotencyCacheKey(submissionId: string): string {
  return `${CACHE_PREFIX}${submissionId}`;
}

/** Pure: reconstructs the same result shape `createReservation` originally
 *  returned, from an already-found RESERVATIONS row — the Sheet-backstop
 *  idempotency path (Phase 0 §P). */
export function mapReservationRowToResult(row: ReservationRow): IdempotencyResult {
  return {
    reservationId: row.ReservationID,
    needsConfirmation: row.Status === "要確認" ? true : undefined,
  };
}

/** Thin: fast-path idempotency check via CacheService. Not unit tested —
 *  a Google global. */
export function getCachedReservationResult(submissionId: string): IdempotencyResult | null {
  const raw = CacheService.getScriptCache().get(buildIdempotencyCacheKey(submissionId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as IdempotencyResult;
  } catch {
    return null;
  }
}

export function setCachedReservationResult(submissionId: string, result: IdempotencyResult): void {
  CacheService.getScriptCache().put(buildIdempotencyCacheKey(submissionId), JSON.stringify(result), CACHE_TTL_SECONDS);
}
