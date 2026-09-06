import { ANY_STAFF } from "../models/ReservationRequest";
import {
  AvailabilityInput,
  AvailabilityResult,
  AvailabilityStrategy,
  BusyInterval,
} from "./AvailabilityStrategy";
import { isSlotFreeOfConflicts } from "./CalendarOverlapAvailability";

export interface StaffAvailabilityInput {
  staffSelection: string | typeof ANY_STAFF;
  /** Active, eligible staff ids already sorted in `DisplayOrder` — the
   *  order "any available" resolution walks (Phase 0 §J: "first free, in
   *  DisplayOrder"). Staff/service compatibility filtering is not applied
   *  here: the current STAFF sheet schema (Phase 3A) has no
   *  service-compatibility column, so every active staff member is
   *  eligible for every service (Phase 3C §41 — "only implement this if
   *  the existing data model defines it"). */
  eligibleStaffIdsInOrder: string[];
  /** Busy intervals grouped by staffId, already fetched/normalized by a
   *  future Calendar adapter — never fetched here (Phase 3C §37/§53). A
   *  staffId absent from this map is treated as having no busy intervals
   *  at all, not as an error. */
  busyIntervalsByStaffId: Record<string, BusyInterval[]>;
}

/** Staff-selection availability strategy (Phase 0 §J/§K, Phase 3C
 *  §40/§41): resolves both the specific-staff case and the "any available
 *  staff" case, returning the concretely assigned staffId either way —
 *  "ANY" is never itself persisted or returned as the assignment. */
export function createStaffAvailabilityStrategy(
  input: StaffAvailabilityInput,
): AvailabilityStrategy {
  return {
    isAvailable(candidate: AvailabilityInput): AvailabilityResult {
      if (input.staffSelection === ANY_STAFF) {
        for (const staffId of input.eligibleStaffIdsInOrder) {
          const busy = input.busyIntervalsByStaffId[staffId] ?? [];
          if (isSlotFreeOfConflicts(candidate, busy)) {
            return { available: true, assignedStaffId: staffId };
          }
        }
        return { available: false, reason: "NO_STAFF_AVAILABLE" };
      }

      const busy = input.busyIntervalsByStaffId[input.staffSelection] ?? [];
      return isSlotFreeOfConflicts(candidate, busy)
        ? { available: true, assignedStaffId: input.staffSelection }
        : { available: false, reason: "STAFF_NOT_AVAILABLE" };
    },
  };
}
