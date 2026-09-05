/**
 * Pure date/timezone helpers shared across the backend. The application
 * timezone is always Asia/Tokyo (Phase 0 §D) — never the server's local
 * timezone, never browser-locale-dependent formatting (Phase 3A §16/§18).
 *
 * Asia/Tokyo has used a fixed UTC+9 offset with no daylight saving since
 * 1951, so a plain offset is correct here (and avoids relying on `Intl`
 * timezone data, which is not guaranteed under this project's `ES2019`
 * lib target).
 */

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Current instant as an ISO 8601 UTC string — the canonical internal
 *  timestamp representation (Phase 3A §18). `clock` is injectable for
 *  deterministic tests. */
export function nowIso(clock: () => Date = () => new Date()): string {
  return clock().toISOString();
}

/** Formats a Date as YYYYMMDD in the Asia/Tokyo calendar day — used by
 *  ID generators (Phase 3A §17). */
export function formatDateYYYYMMDDInTokyo(date: Date): string {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoTime.getUTCFullYear();
  const month = String(tokyoTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tokyoTime.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
