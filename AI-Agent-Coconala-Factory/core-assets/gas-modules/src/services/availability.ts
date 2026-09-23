import type { ConfigReader } from "../config/configReader";
import {
  addMinutes,
  formatLocalDate,
  formatLocalDateTime,
  minutesToTime,
  parseLocalDateTime,
  parseTimeRange,
  startOfLocalDate,
  WEEKDAY_KEYS,
  WeekdayKey,
  weekdayOf,
} from "../lib/time";
import type { Row } from "./context";

/**
 * Basic single-resource availability for reservation-basic-v1: opening
 * hours per weekday, closed dates, lead time, booking window, and a
 * capacity of N overlapping bookings. Pure, with no Google globals.
 *
 * Extension points (not implemented in Phase 1): Google Calendar busy
 * times and per-staff availability. Both plug in as extra `BookedInterval`
 * sources or a different capacity rule. See docs/architecture.md.
 */

export const ACTIVE_STATUSES = ["REQUESTED", "CONFIRMED"];

export interface ReservationPolicy {
  hours: Record<WeekdayKey, { open: number; close: number } | null>;
  slotMinutes: number;
  defaultDurationMinutes: number;
  minLeadHours: number;
  maxDaysAhead: number;
  capacity: number;
  closedDates: string[];
}

export interface BookedInterval {
  start: Date;
  end: Date;
}

export type SlotRejection = "INVALID_DATETIME" | "CLOSED" | "OUTSIDE_HOURS" | "TOO_SOON" | "TOO_FAR" | "FULL";

export function loadPolicy(config: ConfigReader): ReservationPolicy {
  const hours = {} as ReservationPolicy["hours"];
  for (const day of WEEKDAY_KEYS) {
    hours[day] = parseTimeRange(config.optionalString(`hours.${day}`) ?? "closed");
  }
  return {
    hours,
    slotMinutes: config.number("reservation.slotMinutes", 30),
    defaultDurationMinutes: config.number("reservation.defaultDurationMinutes", 60),
    minLeadHours: config.number("reservation.minLeadHours", 3),
    maxDaysAhead: config.number("reservation.maxDaysAhead", 60),
    capacity: config.number("reservation.capacity", 1),
    closedDates: (config.optionalString("reservation.closedDates") ?? "")
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  };
}

/** Sheets may auto-type date/time cells into Date objects; normalize both
 *  forms back to `YYYY-MM-DD` / `HH:mm` strings. */
export function normalizeCell(value: unknown, kind: "date" | "time"): string {
  if (value instanceof Date) {
    const local = formatLocalDateTime(value);
    return kind === "date" ? local.slice(0, 10) : local.slice(11, 16);
  }
  return String(value ?? "").trim();
}

export function activeBookings(rows: Row[]): BookedInterval[] {
  const intervals: BookedInterval[] = [];
  for (const row of rows) {
    if (!ACTIVE_STATUSES.includes(String(row.status ?? "").trim())) {
      continue;
    }
    const date = normalizeCell(row.date, "date");
    const start = parseLocalDateTime(`${date}T${normalizeCell(row.startTime, "time")}`);
    const end = parseLocalDateTime(`${date}T${normalizeCell(row.endTime, "time")}`);
    if (start && end && end > start) {
      intervals.push({ start, end });
    }
  }
  return intervals;
}

export function checkSlot(
  policy: ReservationPolicy,
  bookings: BookedInterval[],
  start: Date,
  durationMinutes: number,
  now: Date,
): { ok: true } | { ok: false; reason: SlotRejection } {
  const local = formatLocalDateTime(start);
  const date = local.slice(0, 10);
  const hours = policy.hours[weekdayOf(date)];
  if (!hours || policy.closedDates.includes(date)) {
    return { ok: false, reason: "CLOSED" };
  }
  const startMinutes = Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
  if (startMinutes < hours.open || startMinutes + durationMinutes > hours.close) {
    return { ok: false, reason: "OUTSIDE_HOURS" };
  }
  if (start.getTime() < now.getTime() + policy.minLeadHours * 60 * 60 * 1000) {
    return { ok: false, reason: "TOO_SOON" };
  }
  const lastBookableDay = startOfLocalDate(formatLocalDate(now)).getTime() + (policy.maxDaysAhead + 1) * 24 * 60 * 60 * 1000;
  if (start.getTime() >= lastBookableDay) {
    return { ok: false, reason: "TOO_FAR" };
  }
  const end = addMinutes(start, durationMinutes);
  const overlapping = bookings.filter((booking) => start < booking.end && end > booking.start).length;
  if (overlapping >= policy.capacity) {
    return { ok: false, reason: "FULL" };
  }
  return { ok: true };
}

/** Bookable start times (`HH:mm`) for one Tokyo calendar date. */
export function listAvailableStartTimes(
  policy: ReservationPolicy,
  bookings: BookedInterval[],
  date: string,
  durationMinutes: number,
  now: Date,
): string[] {
  const hours = policy.hours[weekdayOf(date)];
  if (!hours) {
    return [];
  }
  const times: string[] = [];
  for (let minute = hours.open; minute + durationMinutes <= hours.close; minute += policy.slotMinutes) {
    const time = minutesToTime(minute);
    const start = parseLocalDateTime(`${date}T${time}`);
    if (start && checkSlot(policy, bookings, start, durationMinutes, now).ok) {
      times.push(time);
    }
  }
  return times;
}
