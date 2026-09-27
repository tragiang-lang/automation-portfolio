import { describe, expect, it } from "vitest";
import { ConfigReader } from "../../src/config/configReader";
import { generateId } from "../../src/lib/ids";
import { ActionError, failure, toFailure } from "../../src/lib/result";
import { assertHeaders, buildHeaderMap, MissingHeadersError, objectToRow, rowsToObjects } from "../../src/lib/rowMapper";
import { addDays, formatJapaneseDateTime, formatLocalDateTime, isValidLocalDate, parseLocalDateTime, parseTimeRange, weekdayOf } from "../../src/lib/time";

describe("time", () => {
  it("parses Tokyo local date-times into real instants", () => {
    expect(parseLocalDateTime("2026-10-01T14:00")?.toISOString()).toBe("2026-10-01T05:00:00.000Z");
    expect(formatLocalDateTime(new Date("2026-10-01T05:00:00.000Z"))).toBe("2026-10-01T14:00");
  });

  it("rejects impossible dates and malformed input", () => {
    expect(parseLocalDateTime("2026-02-30T10:00")).toBeNull();
    expect(parseLocalDateTime("2026-10-01 10:00")).toBeNull();
    expect(isValidLocalDate("2026-13-01")).toBe(false);
  });

  it("computes weekdays, day arithmetic and opening hours", () => {
    expect(weekdayOf("2026-10-01")).toBe("thu");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(parseTimeRange("10:00-19:00")).toEqual({ open: 600, close: 1140 });
    expect(parseTimeRange("closed")).toBeNull();
    expect(parseTimeRange("19:00-10:00")).toBeNull();
    expect(formatJapaneseDateTime("2026-10-01T14:00")).toBe("10月1日(木) 14:00");
  });
});

describe("ids", () => {
  it("builds PREFIX-YYYYMMDD-XXXXXX from the Tokyo date", () => {
    expect(generateId("INQ", new Date("2026-09-30T16:00:00Z"), () => 0)).toBe("INQ-20261001-AAAAAA");
  });
});

describe("rowMapper", () => {
  it("maps rows by header and refuses missing required headers", () => {
    const map = buildHeaderMap(["a", " b ", "", "a"]);
    expect(map).toEqual({ a: 0, b: 1 });
    expect(rowsToObjects(map, [[1, 2]])).toEqual([{ a: 1, b: 2 }]);
    expect(() => assertHeaders("S", map, ["a", "c"])).toThrow(MissingHeadersError);
  });

  it("serializes blanks as empty strings and rejects objects", () => {
    expect(objectToRow(["a", "b", "c"], { a: 1, b: undefined })).toEqual([1, "", ""]);
    expect(() => objectToRow(["a"], { a: { nested: true } })).toThrow(TypeError);
  });
});

describe("result", () => {
  it("never leaks raw exception text", () => {
    const response = toFailure(new Error("Exception: secret path /Users/owner"));
    expect(response).toEqual(failure("INTERNAL_ERROR"));
    expect(JSON.stringify(response)).not.toContain("secret");
  });

  it("forwards field issues only for validation errors", () => {
    const issues = [{ field: "email", code: "REQUIRED", message: "x" }];
    expect(toFailure(new ActionError("VALIDATION_ERROR", "d", issues))).toMatchObject({ error: { issues } });
    expect(toFailure(new ActionError("SLOT_UNAVAILABLE", "detail"))).not.toHaveProperty("error.issues");
  });
});

describe("ConfigReader", () => {
  const reader = new ConfigReader(
    [
      { key: "a", value: "1" },
      { key: "a", value: "2" },
      { key: "flag", value: "TRUE" },
      { key: "bad", value: "1e3" },
    ],
    [
      { key: "withDefault", required: false, default: "x", description: "" },
      { key: "must", required: true, description: "" },
    ],
  );

  it("keeps the first duplicate key and applies defaults", () => {
    expect(reader.number("a")).toBe(1);
    expect(reader.optionalString("withDefault")).toBe("x");
    expect(reader.boolean("flag", false)).toBe(true);
  });

  it("rejects non-strict numbers and reports missing required keys by name", () => {
    expect(() => reader.number("bad")).toThrow(ActionError);
    expect(() => reader.requiredString("must")).toThrow(/must/);
    expect(reader.missingRequiredKeys()).toEqual(["must"]);
  });
});
