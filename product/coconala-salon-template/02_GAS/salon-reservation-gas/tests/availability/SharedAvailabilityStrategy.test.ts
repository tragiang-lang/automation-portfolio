import { createSharedAvailabilityStrategy } from "../../src/availability/SharedAvailabilityStrategy";

const candidate = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };

describe("createSharedAvailabilityStrategy", () => {
  it("is available with no staff dimension when the shared calendar is free", () => {
    const strategy = createSharedAvailabilityStrategy([]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: true });
  });

  it("reports CALENDAR_CONFLICT against the single shared calendar", () => {
    const strategy = createSharedAvailabilityStrategy([
      { start: "2026-09-10T10:00", end: "2026-09-10T11:00" },
    ]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "CALENDAR_CONFLICT" });
  });
});
