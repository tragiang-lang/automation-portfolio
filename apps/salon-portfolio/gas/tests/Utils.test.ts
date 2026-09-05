import { formatDateYYYYMMDDInTokyo, nowIso } from "../src/Utils";

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

describe("nowIso", () => {
  it("returns a valid ISO 8601 string from the injected clock", () => {
    const fixed = new Date("2026-06-01T00:00:00.000Z");
    const result = nowIso(() => fixed);
    expect(result).toBe("2026-06-01T00:00:00.000Z");
    expect(new Date(result).toISOString()).toBe(result);
  });
});
