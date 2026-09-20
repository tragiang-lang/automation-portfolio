import { getDemoAvailability } from "./demoAvailability";

// Demo business hours (config/demo-content.ts::SITE_CONFIG.hours):
// monday 10:00-19:00, wednesday closed, saturday 10:00-20:00.
const MONDAY = "2026-09-14";
const WEDNESDAY_CLOSED = "2026-09-16";
const SATURDAY = "2026-09-19";

// Configured holiday (lib/config/runtimeConfig.ts::DEMO_RUNTIME_CONFIG.holidays)
// that falls on a Thursday — a weekday the demo business is normally open,
// so this actually exercises the holiday check rather than the weekday one.
const HOLIDAY = "2026-01-01";

const LONG_SERVICE_ID = "SV002"; // 90 minutes (ジェルネイル アート込み)
const SHORT_SERVICE_ID = "SV007"; // 30 minutes (ハンドケア オフのみ)

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

describe("getDemoAvailability", () => {
  it("is a pure synchronous function — no network/Calendar access", () => {
    const result = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, date: MONDAY });
    expect(result).not.toBeInstanceOf(Promise);
  });

  it("returns identical slots for identical input (determinism)", () => {
    const first = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST001", date: MONDAY });
    const second = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST001", date: MONDAY });
    expect(second).toEqual(first);
  });

  it("returns no slots on a day the demo business is closed", () => {
    expect(getDemoAvailability({ serviceId: SHORT_SERVICE_ID, date: WEDNESDAY_CLOSED })).toEqual([]);
  });

  it("returns no slots on a configured holiday, even one that falls on an otherwise-open weekday", () => {
    expect(getDemoAvailability({ serviceId: SHORT_SERVICE_ID, date: HOLIDAY })).toEqual([]);
  });

  it("still returns slots on a normal open weekday (existing behavior unchanged)", () => {
    const slots = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, date: MONDAY });
    expect(slots.length).toBeGreaterThan(0);
  });

  it("stays deterministic for the same holiday input", () => {
    const first = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST001", date: HOLIDAY });
    const second = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST001", date: HOLIDAY });
    expect(second).toEqual(first);
    expect(second).toEqual([]);
  });

  it("every slot fits within business hours once the service duration is added", () => {
    const slots = getDemoAvailability({ serviceId: LONG_SERVICE_ID, date: MONDAY });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(toMinutes(slot.time)).toBeGreaterThanOrEqual(toMinutes("10:00"));
      // 90-minute service on a 10:00-19:00 day — last possible start is 17:30.
      expect(toMinutes(slot.time)).toBeLessThanOrEqual(toMinutes("17:30"));
    }
  });

  it("a shorter service can use later start times than a longer one on the same day", () => {
    const longSlots = getDemoAvailability({ serviceId: LONG_SERVICE_ID, date: SATURDAY });
    const shortSlots = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, date: SATURDAY });
    for (const slot of longSlots) {
      // 90-minute service on a 10:00-20:00 day — last possible start is 18:30.
      expect(toMinutes(slot.time)).toBeLessThanOrEqual(toMinutes("18:30"));
    }
    for (const slot of shortSlots) {
      // 30-minute service on a 10:00-20:00 day — last possible start is 19:30.
      expect(toMinutes(slot.time)).toBeLessThanOrEqual(toMinutes("19:30"));
    }
  });

  it("every returned slot satisfies the AvailableTimeSlot shape", () => {
    const slots = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, date: SATURDAY });
    for (const slot of slots) {
      expect(Object.keys(slot)).toEqual(["time"]);
      expect(slot.time).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("stays deterministic across different staff selections", () => {
    const withStaffA = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST001", date: SATURDAY });
    const withStaffARepeat = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST001", date: SATURDAY });
    expect(withStaffARepeat).toEqual(withStaffA);

    const withStaffB = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST002", date: SATURDAY });
    const withStaffBRepeat = getDemoAvailability({ serviceId: SHORT_SERVICE_ID, staffId: "ST002", date: SATURDAY });
    expect(withStaffBRepeat).toEqual(withStaffB);
  });
});
