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

import { BusinessHours } from "./models/Config";

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

/** Sunday-first order matching `Date.prototype.getUTCDay()`'s 0-6 index —
 *  used only to translate a weekday index into `BusinessHours`' key
 *  names, never to compute the index itself from a real instant (Phase
 *  3C §22: business-hours evaluation operates on an already-resolved
 *  calendar date string, not on "now"). */
const WEEKDAY_ORDER: readonly (keyof BusinessHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Weekday of a `YYYY-MM-DD` calendar date string. Pure calendar
 *  arithmetic — once the date components are already known (as they are
 *  for a reservation request's `date` field), no Asia/Tokyo offset
 *  conversion is needed to find its weekday; `Date.UTC` is used only as a
 *  proleptic-Gregorian calculator, never interpreted as an instant. */
export function getWeekdayForDateString(dateStr: string): keyof BusinessHours {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_ORDER[dayIndex];
}

/** Parses a strict `HH:mm` string into minutes since midnight. Callers
 *  (SlotEngine, ReservationRules) are responsible for validating the
 *  format first — this assumes well-formed input. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Inverse of `timeToMinutes` for a same-day value (0-1439). */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Converts an Asia/Tokyo local `YYYY-MM-DD` + `HH:mm` pair into the real
 *  UTC instant (epoch milliseconds) it represents — the one place this
 *  domain converts a Tokyo-local wall-clock reading into something
 *  comparable against a real `Date`/`now` (Phase 3C §12/§25). */
export function tokyoDateTimeToInstant(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - TOKYO_OFFSET_MS;
}

/** Adds `days` calendar days to a `YYYY-MM-DD` string, staying in pure
 *  date arithmetic (no time-of-day, no timezone offset — a calendar day
 *  is timezone-agnostic once you already have Y/M/D components). Used for
 *  the `reservation.maxBookingDays` booking-horizon check. */
export function addDaysToTokyoDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/** True only for a string that is both `YYYY-MM-DD`-shaped and a real
 *  calendar date (rejects 2026-02-30, 2026-13-01, etc.) — callers must
 *  still check the format pattern first if they want a distinct
 *  "malformed" vs "impossible date" error. */
export function isValidCalendarDateString(dateStr: string): boolean {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Combines a date + time into one Tokyo-local string in a format that
 *  sorts chronologically as a plain string (`YYYY-MM-DDTHH:mm`) — this is
 *  the representation `BusyInterval`/`SlotCandidate` overlap comparisons
 *  rely on (Phase 3C §38/§39: no `Date` parsing needed for the overlap
 *  check itself). */
export function toTokyoLocalDateTimeString(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`;
}

/** Inverse direction of `tokyoDateTimeToInstant`: formats a real instant
 *  (e.g. a Calendar event's `getStartTime()`) as the Asia/Tokyo-local
 *  `YYYY-MM-DDTHH:mm` string the `BusyInterval`/`SlotCandidate` overlap
 *  comparisons rely on (Phase 4 Task 1). */
export function formatInstantAsTokyoLocalDateTimeString(date: Date): string {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoTime.getUTCFullYear();
  const month = String(tokyoTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tokyoTime.getUTCDate()).padStart(2, "0");
  const hours = String(tokyoTime.getUTCHours()).padStart(2, "0");
  const minutes = String(tokyoTime.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** The `[00:00, 24:00)` Asia/Tokyo-local instant range for one calendar
 *  date — the query window `Calendar.ts::getBusyEvents` (Phase 4 Task 9)
 *  uses, matching `docs/phase0-specification.md` §J Stage 2's "[date
 *  00:00, date 24:00)" wording exactly. */
export function tokyoCalendarDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(tokyoDateTimeToInstant(dateStr, "00:00")),
    end: new Date(tokyoDateTimeToInstant(addDaysToTokyoDateString(dateStr, 1), "00:00")),
  };
}
