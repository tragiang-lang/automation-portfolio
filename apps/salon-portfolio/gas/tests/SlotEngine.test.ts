import { generateCandidateSlots } from "../src/SlotEngine";

describe("generateCandidateSlots", () => {
  it("generates 30-minute-interval starts for a 60-minute service inside 10:00-19:00", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-19:00",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    const starts = candidates.map((c) => c.startTime);
    expect(starts[0]).toBe("10:00");
    expect(starts).toContain("18:00");
    expect(starts).not.toContain("18:30"); // 18:30 + 60min = 19:30 > 19:00
    expect(candidates[0]).toEqual({ date: "2026-09-10", startTime: "10:00", endTime: "11:00" });
  });

  it("supports an interval coarser than the service duration", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-19:00",
      durationMinutes: 30,
      slotIntervalMinutes: 60,
      isHoliday: false,
    });
    const starts = candidates.map((c) => c.startTime);
    expect(starts).toContain("10:00");
    expect(starts).toContain("18:00");
    expect(starts).not.toContain("18:30");
  });

  it("includes the exact final slot that fits closing time", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-11:00",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    expect(candidates).toEqual([{ date: "2026-09-10", startTime: "10:00", endTime: "11:00" }]);
  });

  it("excludes a service that would cross closing time entirely", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-11:00",
      durationMinutes: 90,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    expect(candidates).toEqual([]);
  });

  it("returns no slots on a closed day", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "closed",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    expect(candidates).toEqual([]);
  });

  it("returns no slots on a holiday even if business hours are configured", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-19:00",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: true,
    });
    expect(candidates).toEqual([]);
  });

  it("returns no slots for a non-positive duration", () => {
    expect(
      generateCandidateSlots({
        date: "2026-09-10",
        businessHours: "10:00-19:00",
        durationMinutes: 0,
        slotIntervalMinutes: 30,
        isHoliday: false,
      }),
    ).toEqual([]);
  });

  it("returns no slots for a non-positive interval", () => {
    expect(
      generateCandidateSlots({
        date: "2026-09-10",
        businessHours: "10:00-19:00",
        durationMinutes: 60,
        slotIntervalMinutes: 0,
        isHoliday: false,
      }),
    ).toEqual([]);
  });
});
