import { AvailabilityStrategy, BusyInterval } from "./AvailabilityStrategy";
import { createCalendarOverlapAvailability } from "./CalendarOverlapAvailability";

/** The no-staff-dimension availability strategy (Phase 0 spec §J/§K):
 *  used when `features.staffSelection` is false — every candidate is
 *  checked only against the single shared/fallback calendar's busy
 *  intervals. A thin naming wrapper over `CalendarOverlapAvailability` so
 *  both strategies named in Phase 0 §B exist distinctly, without
 *  duplicating the overlap logic itself. */
export function createSharedAvailabilityStrategy(
  busyIntervals: BusyInterval[],
): AvailabilityStrategy {
  return createCalendarOverlapAvailability(busyIntervals);
}
