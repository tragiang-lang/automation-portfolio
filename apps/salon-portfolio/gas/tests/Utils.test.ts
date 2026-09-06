import {
  formatDateYYYYMMDDDashedInTokyo,
  formatDateYYYYMMDDInTokyo,
  nowIso,
} from "../src/Utils";

describe("formatDateYYYYMMDDInTokyo", () => {
  it("formats a UTC instant that is still the previous day in Tokyo", () => {
    // 2026-01-01T14:59:00Z + 9h = 2026-01-01T23:59:00 JST
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-01-01T14:59:00.000Z")),
    ).toBe("20260101");
  });

  it("formats a UTC instant that has already rolled into the next Tokyo day", () => {
    // 2026-01-01T15:00:00Z + 9h = 2026-01-02T00:00:00 JST
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-01-01T15:00:00.000Z")),
    ).toBe("20260102");
  });

  it("zero-pads single-digit months and days", () => {
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-03-05T01:00:00.000Z")),
    ).toBe("20260305");
  });
});

describe("formatDateYYYYMMDDDashedInTokyo", () => {
  it("formats the Asia/Tokyo rollover case with dashes", () => {
    // 2025-12-31T15:00:00Z + 9h = 2026-01-01T00:00:00 JST
    expect(
      formatDateYYYYMMDDDashedInTokyo(new Date("2025-12-31T15:00:00.000Z")),
    ).toBe("2026-01-01");
  });

  it("zero-pads single-digit months and days", () => {
    expect(
      formatDateYYYYMMDDDashedInTokyo(new Date("2026-03-05T01:00:00.000Z")),
    ).toBe("2026-03-05");
  });
});

describe("nowIso", () => {
  it("returns a valid ISO 8601 string from the injected clock", () => {
    const fixed = new Date("2026-06-01T00:00:00.000Z");
    const result = nowIso(() => fixed);
    expect(result).toBe("2026-06-01T00:00:00.000Z");
    expect(new Date(result).toISOString()).toBe(result);
  });
});

import {
  getWeekdayForDateString,
  timeToMinutes,
  minutesToTimeString,
  tokyoDateTimeToInstant,
  addDaysToTokyoDateString,
  isValidCalendarDateString,
  toTokyoLocalDateTimeString,
} from "../src/Utils";

describe("getWeekdayForDateString", () => {
  it("maps known dates to the correct weekday", () => {
    expect(getWeekdayForDateString("2026-09-06")).toBe("sunday");
    expect(getWeekdayForDateString("2026-09-07")).toBe("monday");
    expect(getWeekdayForDateString("2026-09-09")).toBe("wednesday");
    expect(getWeekdayForDateString("2026-09-10")).toBe("thursday");
  });
});

describe("timeToMinutes / minutesToTimeString", () => {
  it("round-trips HH:mm through minutes", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(minutesToTimeString(0)).toBe("00:00");
    expect(minutesToTimeString(570)).toBe("09:30");
    expect(minutesToTimeString(1439)).toBe("23:59");
  });
});

describe("tokyoDateTimeToInstant", () => {
  it("treats the date/time as Asia/Tokyo local, not UTC", () => {
    // 2026-09-10T00:30 JST === 2026-09-09T15:30:00Z
    const instant = tokyoDateTimeToInstant("2026-09-10", "00:30");
    expect(new Date(instant).toISOString()).toBe("2026-09-09T15:30:00.000Z");
  });
});

describe("addDaysToTokyoDateString", () => {
  it("adds calendar days without drifting across a month boundary", () => {
    expect(addDaysToTokyoDateString("2026-09-28", 3)).toBe("2026-10-01");
  });
  it("supports zero days (same date)", () => {
    expect(addDaysToTokyoDateString("2026-09-10", 0)).toBe("2026-09-10");
  });
});

describe("isValidCalendarDateString", () => {
  it("accepts a real calendar date", () => {
    expect(isValidCalendarDateString("2026-09-10")).toBe(true);
  });
  it("rejects an impossible date", () => {
    expect(isValidCalendarDateString("2026-02-30")).toBe(false);
  });
  it("rejects an out-of-range month", () => {
    expect(isValidCalendarDateString("2026-13-01")).toBe(false);
  });
});

describe("toTokyoLocalDateTimeString", () => {
  it("combines date and time into one sortable local string", () => {
    expect(toTokyoLocalDateTimeString("2026-09-10", "10:00")).toBe(
      "2026-09-10T10:00",
    );
  });
});
