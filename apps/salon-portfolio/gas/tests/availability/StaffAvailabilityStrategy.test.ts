import { createStaffAvailabilityStrategy } from "../../src/availability/StaffAvailabilityStrategy";
import { ANY_STAFF } from "../../src/models/ReservationRequest";

const candidate = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };
const busyAllDay = { start: "2026-09-10T00:00", end: "2026-09-10T23:59" };

describe("createStaffAvailabilityStrategy — specific staff", () => {
  it("is available when the named staff member has no conflict", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: "ST002",
      eligibleStaffIdsInOrder: ["ST001", "ST002"],
      busyIntervalsByStaffId: { ST001: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: true, assignedStaffId: "ST002" });
  });

  it("reports STAFF_NOT_AVAILABLE when the named staff member conflicts", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: "ST001",
      eligibleStaffIdsInOrder: ["ST001", "ST002"],
      busyIntervalsByStaffId: { ST001: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "STAFF_NOT_AVAILABLE" });
  });
});

describe("createStaffAvailabilityStrategy — ANY_STAFF", () => {
  it("succeeds and assigns the first free staff in DisplayOrder when one of several is free", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: ANY_STAFF,
      eligibleStaffIdsInOrder: ["ST001", "ST002", "ST003"],
      busyIntervalsByStaffId: { ST001: [busyAllDay], ST003: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: true, assignedStaffId: "ST002" });
  });

  it("reports NO_STAFF_AVAILABLE when every eligible staff member conflicts", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: ANY_STAFF,
      eligibleStaffIdsInOrder: ["ST001", "ST002"],
      busyIntervalsByStaffId: { ST001: [busyAllDay], ST002: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "NO_STAFF_AVAILABLE" });
  });

  it("treats a staff member with no recorded busy intervals as free", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: ANY_STAFF,
      eligibleStaffIdsInOrder: ["ST001"],
      busyIntervalsByStaffId: {},
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: true, assignedStaffId: "ST001" });
  });
});
