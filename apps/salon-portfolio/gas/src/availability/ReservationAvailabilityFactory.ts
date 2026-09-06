import { ANY_STAFF } from "../models/ReservationRequest";
import { StaffSelectionResolution } from "../models/ReservationDomain";
import { StaffRow } from "../SheetSchemas";
import { AvailabilityStrategy, BusyInterval } from "./AvailabilityStrategy";
import { createSharedAvailabilityStrategy } from "./SharedAvailabilityStrategy";
import { createStaffAvailabilityStrategy } from "./StaffAvailabilityStrategy";

/**
 * Pure wiring between a resolved `StaffSelectionResolution` (Phase 3C) and
 * the two existing availability strategy constructors — the seam
 * `createReservation`'s orchestration (Phase 4 Task 12) uses both before
 * the lock (advisory) and, narrowed to one already-resolved staff/none,
 * again under the lock (Phase 0 §J/§K/§U). Never calls `CalendarApp`
 * itself; `busyByCalendarId` is always supplied by the caller (Task 9's
 * `Calendar.ts`, or a test fixture).
 */

export function resolveCalendarIdForStaff(staff: StaffRow, fallbackCalendarId: string): string {
  return staff.CalendarID && staff.CalendarID.trim().length > 0 ? staff.CalendarID : fallbackCalendarId;
}

export function resolveCalendarIdsForSelection(
  staffSelection: StaffSelectionResolution,
  fallbackCalendarId: string,
): string[] {
  switch (staffSelection.kind) {
    case "none":
      return [fallbackCalendarId];
    case "specific":
      return [resolveCalendarIdForStaff(staffSelection.staff, fallbackCalendarId)];
    case "any":
      return staffSelection.eligibleStaff.map((staff) => resolveCalendarIdForStaff(staff, fallbackCalendarId));
  }
}

export function buildAvailabilityStrategyFromBusyByCalendarId(
  staffSelection: StaffSelectionResolution,
  fallbackCalendarId: string,
  busyByCalendarId: Record<string, BusyInterval[]>,
): AvailabilityStrategy {
  if (staffSelection.kind === "none") {
    return createSharedAvailabilityStrategy(busyByCalendarId[fallbackCalendarId] ?? []);
  }

  if (staffSelection.kind === "specific") {
    const calendarId = resolveCalendarIdForStaff(staffSelection.staff, fallbackCalendarId);
    return createStaffAvailabilityStrategy({
      staffSelection: staffSelection.staff.StaffID,
      eligibleStaffIdsInOrder: [staffSelection.staff.StaffID],
      busyIntervalsByStaffId: { [staffSelection.staff.StaffID]: busyByCalendarId[calendarId] ?? [] },
    });
  }

  const eligibleStaffIdsInOrder = staffSelection.eligibleStaff.map((staff) => staff.StaffID);
  const busyIntervalsByStaffId: Record<string, BusyInterval[]> = {};
  for (const staff of staffSelection.eligibleStaff) {
    const calendarId = resolveCalendarIdForStaff(staff, fallbackCalendarId);
    busyIntervalsByStaffId[staff.StaffID] = busyByCalendarId[calendarId] ?? [];
  }
  return createStaffAvailabilityStrategy({ staffSelection: ANY_STAFF, eligibleStaffIdsInOrder, busyIntervalsByStaffId });
}
