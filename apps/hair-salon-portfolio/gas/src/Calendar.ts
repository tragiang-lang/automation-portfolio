import { BusyInterval } from "./availability/AvailabilityStrategy";
import { formatInstantAsTokyoLocalDateTimeString, tokyoDateTimeToInstant } from "./Utils";

/**
 * Thin Calendar adapter (Phase 0 §T: "query/create only — does not decide
 * availability, that's the availability strategies"). The only place
 * `CalendarApp` is called anywhere in this project.
 */

/** Pure: maps one already-fetched event's real start/end instants into a
 *  `BusyInterval` (the exact seam `availability/*Strategy.ts` expects).
 *  Exported and Jest-covered even though its only caller, `getBusyEvents`
 *  below, is not itself unit tested (Phase 0 §Q). */
export function toBusyInterval(start: Date, end: Date, staffId?: string): BusyInterval {
  return {
    start: formatInstantAsTokyoLocalDateTimeString(start),
    end: formatInstantAsTokyoLocalDateTimeString(end),
    staffId,
  };
}

export function getBusyEvents(
  calendarId: string,
  rangeStart: Date,
  rangeEnd: Date,
  staffId?: string,
): BusyInterval[] {
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throw new Error(`Calendar "${calendarId}" was not found or is not accessible.`);
  }
  return calendar
    .getEvents(rangeStart, rangeEnd)
    .map((event) =>
      // CalendarEvent.getStartTime()/getEndTime() return
      // GoogleAppsScript.Base.Date, a distinct (narrower) typing from the
      // global Date even though it is the same object at runtime — wrap
      // through getTime() to get a real `Date` for toBusyInterval.
      toBusyInterval(new Date(event.getStartTime().getTime()), new Date(event.getEndTime().getTime()), staffId),
    );
}

export interface CreateReservationEventInput {
  calendarId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Creates the real Calendar event for a confirmed reservation (Phase 0
 *  §U step 6) and returns its event id. `date`/`startTime`/`endTime` are
 *  Asia/Tokyo-local strings — `CalendarApp.createEvent` always interprets
 *  its `Date` arguments as absolute instants, never as a server-local
 *  wall-clock reading, so the Tokyo conversion is required regardless of
 *  the Apps Script project's own timezone setting. */
export function createReservationEvent(input: CreateReservationEventInput): string {
  const calendar = CalendarApp.getCalendarById(input.calendarId);
  if (!calendar) {
    throw new Error(`Calendar "${input.calendarId}" was not found or is not accessible.`);
  }
  const start = new Date(tokyoDateTimeToInstant(input.date, input.startTime));
  const end = new Date(tokyoDateTimeToInstant(input.date, input.endTime));
  const event = calendar.createEvent(input.title, start, end, { description: input.description });
  return event.getId();
}

/** Deletes a confirmed reservation's Calendar event on cancellation, so
 *  the slot it held stops appearing as busy in future availability
 *  checks. Tolerant of the calendar or event already being gone (a
 *  missing calendar, or an event already deleted/never created) — a
 *  cancellation must still succeed in that case, not fail with a false
 *  "reservation not found" for the customer. */
export function deleteReservationEvent(calendarId: string, eventId: string): void {
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    return;
  }
  const event = calendar.getEventById(eventId);
  if (!event) {
    return;
  }
  event.deleteEvent();
}
