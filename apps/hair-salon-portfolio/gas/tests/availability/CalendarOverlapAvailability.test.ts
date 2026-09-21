import {
  createCalendarOverlapAvailability,
  findConflictingIntervals,
  isSlotFreeOfConflicts,
} from "../../src/availability/CalendarOverlapAvailability";
import { BusyInterval } from "../../src/availability/AvailabilityStrategy";

const candidate = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };

describe("isSlotFreeOfConflicts", () => {
  const cases: [string, BusyInterval[], boolean][] = [
    ["no existing events", [], true],
    ["existing event ends before candidate starts", [{ start: "2026-09-10T09:00", end: "2026-09-10T10:00" }], true],
    ["existing event starts after candidate ends", [{ start: "2026-09-10T11:00", end: "2026-09-10T12:00" }], true],
    ["existing event identical to candidate", [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }], false],
    ["existing event overlaps the tail", [{ start: "2026-09-10T10:30", end: "2026-09-10T11:30" }], false],
    ["existing event overlaps the head", [{ start: "2026-09-10T09:30", end: "2026-09-10T10:30" }], false],
    ["existing event fully contains candidate", [{ start: "2026-09-10T09:00", end: "2026-09-10T12:00" }], false],
  ];

  it.each(cases)("%s -> free=%s", (_label, events, expectedFree) => {
    expect(isSlotFreeOfConflicts(candidate, events)).toBe(expectedFree);
  });
});

describe("findConflictingIntervals", () => {
  it("returns an empty array when no existing event overlaps", () => {
    const events: BusyInterval[] = [{ start: "2026-09-10T09:00", end: "2026-09-10T10:00" }];
    expect(findConflictingIntervals(candidate, events)).toEqual([]);
  });

  it("returns the one overlapping interval", () => {
    const overlapping: BusyInterval = { start: "2026-09-10T10:30", end: "2026-09-10T11:30" };
    expect(findConflictingIntervals(candidate, [overlapping])).toEqual([overlapping]);
  });

  it("returns every overlapping interval when more than one conflicts", () => {
    const first: BusyInterval = { start: "2026-09-10T09:30", end: "2026-09-10T10:15" };
    const second: BusyInterval = { start: "2026-09-10T10:45", end: "2026-09-10T11:15" };
    const nonOverlapping: BusyInterval = { start: "2026-09-10T11:00", end: "2026-09-10T12:00" };
    expect(findConflictingIntervals(candidate, [first, second, nonOverlapping])).toEqual([first, second]);
  });
});

describe("createCalendarOverlapAvailability", () => {
  it("reports available when no busy interval conflicts", () => {
    const strategy = createCalendarOverlapAvailability([
      { start: "2026-09-10T09:00", end: "2026-09-10T10:00" },
    ]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: true });
  });

  it("reports CALENDAR_CONFLICT when a busy interval overlaps", () => {
    const strategy = createCalendarOverlapAvailability([
      { start: "2026-09-10T10:30", end: "2026-09-10T11:30" },
    ]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "CALENDAR_CONFLICT" });
  });
});
