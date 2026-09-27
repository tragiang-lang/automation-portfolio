import type { ActionContext } from "./context";

/**
 * Generalized form of the salon apps' idempotency pattern: CacheService
 * fast path, the sheet itself as the durable backstop, and a script lock
 * around "look up, then create" so two simultaneous deliveries of the
 * same submission cannot both create a row.
 *
 * For LINE events the submission id is the webhook's `webhookEventId`, so
 * LINE's automatic redelivery never creates a duplicate record.
 */

const CACHE_TTL_SECONDS = 600;

export interface ClaimResult<T> {
  result: T;
  duplicate: boolean;
}

export function claimOnce<T>(
  ctx: ActionContext,
  namespace: string,
  submissionId: string,
  findExisting: () => T | null,
  create: () => T,
): ClaimResult<T> {
  const cacheKey = `${namespace}:${submissionId}`;
  const cached = ctx.cache.get(cacheKey);
  if (cached) {
    try {
      return { result: JSON.parse(cached) as T, duplicate: true };
    } catch {
      // fall through to the sheet backstop
    }
  }
  return ctx.lock.withLock(() => {
    const existing = findExisting();
    if (existing !== null) {
      ctx.cache.put(cacheKey, JSON.stringify(existing), CACHE_TTL_SECONDS);
      return { result: existing, duplicate: true };
    }
    const created = create();
    ctx.cache.put(cacheKey, JSON.stringify(created), CACHE_TTL_SECONDS);
    return { result: created, duplicate: false };
  });
}
