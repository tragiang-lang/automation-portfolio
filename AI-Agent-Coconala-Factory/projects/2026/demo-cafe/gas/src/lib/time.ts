/**
 * Asia/Tokyo date helpers. Tokyo has had a fixed UTC+9 offset with no DST
 * since 1951, so a plain offset is exact and avoids depending on Intl
 * timezone data under the ES2019 Apps Script target.
 */

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RANGE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-4]):([0-5]\d)$/;

export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function tokyo(date: Date): Date {
  return new Date(date.getTime() + TOKYO_OFFSET_MS);
}

export function formatCompactDate(date: Date): string {
  const t = tokyo(date);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
}

export function formatLocalDate(date: Date): string {
  const t = tokyo(date);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function formatLocalDateTime(date: Date): string {
  const t = tokyo(date);
  return `${formatLocalDate(date)}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

export function isValidLocalDate(value: string): boolean {
  const match = LOCAL_DATE.exec(value);
  if (!match) {
    return false;
  }
  const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    probe.getUTCFullYear() === Number(match[1]) &&
    probe.getUTCMonth() === Number(match[2]) - 1 &&
    probe.getUTCDate() === Number(match[3])
  );
}

/** Parses `YYYY-MM-DDTHH:mm` (Tokyo local) into a real instant, or null. */
export function parseLocalDateTime(value: string): Date | null {
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match || !isValidLocalDate(`${match[1]}-${match[2]}-${match[3]}`)) {
    return null;
  }
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  return new Date(utc - TOKYO_OFFSET_MS);
}

/** Start of a Tokyo calendar day as a real instant. */
export function startOfLocalDate(localDate: string): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - TOKYO_OFFSET_MS);
}

export function weekdayOf(localDate: string): WeekdayKey {
  const [y, m, d] = localDate.split("-").map(Number);
  return WEEKDAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Parses an opening-hours cell such as `10:00-19:00`. `closed`/blank/invalid → null. */
export function parseTimeRange(value: string): { open: number; close: number } | null {
  const match = TIME_RANGE.exec(value.trim());
  if (!match) {
    return null;
  }
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  return close > open && close <= 24 * 60 ? { open, close } : null;
}

/** Human-readable Japanese date-time for LINE replies, e.g. `10月1日(木) 14:00`. */
export function formatJapaneseDateTime(localDateTime: string): string {
  const [date, time] = localDateTime.split("T");
  const [, m, d] = date.split("-").map(Number);
  return `${m}月${d}日(${WEEKDAY_LABELS_JA[WEEKDAY_KEYS.indexOf(weekdayOf(date))]}) ${time}`;
}
