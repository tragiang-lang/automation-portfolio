import {
  resolveCalendarIdForStaff,
  resolveCalendarIdsForSelection,
  buildAvailabilityStrategyFromBusyByCalendarId,
} from "../../src/availability/ReservationAvailabilityFactory";
import { StaffRow } from "../../src/SheetSchemas";

const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, CalendarID: "cal-a", DisplayOrder: 1 };
const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: undefined, DisplayOrder: 2 };
const FALLBACK = "shared-cal";

describe("resolveCalendarIdForStaff", () => {
  it("uses the staff's own CalendarID when present", () => {
    expect(resolveCalendarIdForStaff(staffA, FALLBACK)).toBe("cal-a");
  });

  it("falls back to the shared calendar when the staff has none", () => {
    expect(resolveCalendarIdForStaff(staffB, FALLBACK)).toBe(FALLBACK);
  });
});

describe("resolveCalendarIdsForSelection", () => {
  it("returns just the fallback calendar for 'none'", () => {
    expect(resolveCalendarIdsForSelection({ kind: "none" }, FALLBACK)).toEqual([FALLBACK]);
  });

  it("returns just that staff's calendar for 'specific'", () => {
    expect(resolveCalendarIdsForSelection({ kind: "specific", staff: staffA }, FALLBACK)).toEqual(["cal-a"]);
  });

  it("returns every eligible staff's calendar (with fallback applied per-staff) for 'any'", () => {
    expect(
      resolveCalendarIdsForSelection({ kind: "any", eligibleStaff: [staffA, staffB] }, FALLBACK),
    ).toEqual(["cal-a", FALLBACK]);
  });
});

describe("buildAvailabilityStrategyFromBusyByCalendarId", () => {
  const candidateInput = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };

  it("'none': available when the shared calendar has no conflicting event", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId({ kind: "none" }, FALLBACK, { [FALLBACK]: [] });
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: true });
  });

  it("'none': unavailable when the shared calendar has a conflicting event", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId({ kind: "none" }, FALLBACK, {
      [FALLBACK]: [{ start: "2026-09-10T10:30", end: "2026-09-10T11:30" }],
    });
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: false, reason: "CALENDAR_CONFLICT" });
  });

  it("'specific': resolves against that one staff's busy intervals and assigns that staff id", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId(
      { kind: "specific", staff: staffA },
      FALLBACK,
      { "cal-a": [] },
    );
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: true, assignedStaffId: "ST001" });
  });

  it("'any': assigns the first free staff in DisplayOrder", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId(
      { kind: "any", eligibleStaff: [staffA, staffB] },
      FALLBACK,
      { "cal-a": [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }], [FALLBACK]: [] },
    );
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: true, assignedStaffId: "ST002" });
  });

  it("'any': NO_STAFF_AVAILABLE when every eligible staff is busy", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId(
      { kind: "any", eligibleStaff: [staffA] },
      FALLBACK,
      { "cal-a": [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }] },
    );
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: false, reason: "NO_STAFF_AVAILABLE" });
  });
});
