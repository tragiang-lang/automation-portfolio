import {
  AvailabilityInput,
  AvailabilityResult,
  AvailabilityStrategy,
  BusyInterval,
  intervalsOverlap,
} from "./AvailabilityStrategy";

/** True if none of `existingEvents` overlaps the candidate interval.
 *  Shared by every availability strategy in this package so the overlap
 *  rule (Phase 3C §39) is implemented exactly once. */
export function isSlotFreeOfConflicts(
  candidate: AvailabilityInput,
  existingEvents: BusyInterval[],
): boolean {
  return !existingEvents.some((event) =>
    intervalsOverlap(candidate.candidateStart, candidate.candidateEnd, event.start, event.end),
  );
}

/** Production availability strategy foundation for a single calendar's
 *  worth of already-normalized busy intervals (Phase 3C §37). Never calls
 *  `CalendarApp` — `existingEvents` is supplied by the caller, which in a
 *  future phase will be a thin `Calendar.ts` adapter's output. */
export function createCalendarOverlapAvailability(
  existingEvents: BusyInterval[],
): AvailabilityStrategy {
  return {
    isAvailable(input: AvailabilityInput): AvailabilityResult {
      return isSlotFreeOfConflicts(input, existingEvents)
        ? { available: true }
        : { available: false, reason: "CALENDAR_CONFLICT" };
    },
  };
}
