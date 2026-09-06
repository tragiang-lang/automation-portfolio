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

/** Shared Y/M/D breakdown of a Date in the Asia/Tokyo calendar day —
 *  private helper backing both public formatters below so the fixed
 *  UTC+9 offset logic lives in exactly one place. */
function tokyoDateParts(date: Date): { year: number; month: number; day: number } {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  return {
    year: tokyoTime.getUTCFullYear(),
    month: tokyoTime.getUTCMonth() + 1,
    day: tokyoTime.getUTCDate(),
  };
}

/** Formats a Date as YYYYMMDD in the Asia/Tokyo calendar day — used by
 *  ID generators (Phase 3A §17). */
export function formatDateYYYYMMDDInTokyo(date: Date): string {
  const { year, month, day } = tokyoDateParts(date);
  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

/** Formats a Date as YYYY-MM-DD (dashed) in the Asia/Tokyo calendar day —
 *  used to normalize HOLIDAYS.Date cells that Sheets auto-typed into a
 *  native Date object when read back via Range.getValues() (Phase 3A
 *  final review finding 1). */
export function formatDateYYYYMMDDDashedInTokyo(date: Date): string {
  const { year, month, day } = tokyoDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
