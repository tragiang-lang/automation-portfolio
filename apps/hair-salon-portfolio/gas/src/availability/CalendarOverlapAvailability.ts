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
  return findConflictingIntervals(candidate, existingEvents).length === 0;
}

/** Every existing event that overlaps the candidate interval — the
 *  conflict-detail counterpart to `isSlotFreeOfConflicts` above, used to
 *  show a customer-facing "busy 10:00-11:30" period rather than a plain
 *  yes/no (staff-conflict display, spec §8). Same `intervalsOverlap` rule,
 *  just not collapsed to a boolean. */
export function findConflictingIntervals(
  candidate: AvailabilityInput,
  existingEvents: BusyInterval[],
): BusyInterval[] {
  return existingEvents.filter((event) =>
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
