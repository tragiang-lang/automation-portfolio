import { ConfigRow, HolidayRow } from "../src/SheetSchemas";
import {
  buildAppConfigFromRawRows,
  ConfigError,
  normalizeHolidayDates,
} from "../src/ConfigStore";

function validConfigRows(): ConfigRow[] {
  return [
    { Key: "business.name", Value: "Demo Salon", Description: "店舗名" },
    { Key: "business.phone", Value: "03-0000-0000", Description: "電話番号" },
    { Key: "business.email", Value: "owner@example.com", Description: "店舗メール" },
    { Key: "business.address", Value: "東京都千代田区1-1-1", Description: "住所" },
    { Key: "hours.monday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.tuesday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.wednesday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.thursday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.friday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.saturday", Value: "10:00-18:00", Description: "" },
    { Key: "hours.sunday", Value: "closed", Description: "" },
    { Key: "reservation.timezone", Value: "Asia/Tokyo", Description: "" },
    { Key: "reservation.slotMinutes", Value: 30, Description: "" },
    { Key: "reservation.minLeadHours", Value: 1, Description: "" },
    { Key: "reservation.maxBookingDays", Value: 60, Description: "" },
    { Key: "features.contactForm", Value: true, Description: "" },
    { Key: "features.reservation", Value: true, Description: "" },
    { Key: "features.staffSelection", Value: true, Description: "" },
    { Key: "features.calendar", Value: true, Description: "" },
    { Key: "features.emailNotification", Value: true, Description: "" },
    { Key: "staff.anyAvailableOption", Value: true, Description: "" },
    { Key: "calendar.id", Value: "primary", Description: "" },
    { Key: "email.ownerNotifyAddress", Value: "owner@example.com", Description: "" },
    { Key: "email.fromName", Value: "Demo Salon", Description: "" },
  ];
}

describe("normalizeHolidayDates", () => {
  it("formats a native Date cell (Sheets auto-typing) as YYYY-MM-DD in Asia/Tokyo, including the rollover case", () => {
    // 2025-12-31T15:00:00Z + 9h = 2026-01-01T00:00:00 JST
    const rows: HolidayRow[] = [
      { Date: new Date("2025-12-31T15:00:00.000Z"), Label: "New Year" },
    ];
    expect(normalizeHolidayDates(rows)).toEqual(["2026-01-01"]);
  });

  it("passes through an already-string cell unchanged (trimmed)", () => {
    const rows: HolidayRow[] = [{ Date: " 2026-01-01 ", Label: "" }];
    expect(normalizeHolidayDates(rows)).toEqual(["2026-01-01"]);
  });

  it("filters out empty/missing cells", () => {
    const rows: HolidayRow[] = [
      { Date: "", Label: "" },
      { Date: undefined, Label: "" },
      { Date: "2026-05-05", Label: "" },
    ];
    expect(normalizeHolidayDates(rows)).toEqual(["2026-05-05"]);
  });
});

describe("buildAppConfigFromRawRows", () => {
  it("builds a valid AppConfig from valid rows", () => {
    const config = buildAppConfigFromRawRows(validConfigRows(), ["2026-01-01"]);
    expect(config.business.name).toBe("Demo Salon");
    expect(config.holidays).toEqual(["2026-01-01"]);
  });

  it("throws ConfigError when a required key is missing (parse-level)", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "calendar.id");
    expect(() => buildAppConfigFromRawRows(rows, [])).toThrow(ConfigError);
  });

  it("throws ConfigError carrying the field issues, for server-side logging only", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "calendar.id");
    try {
      buildAppConfigFromRawRows(rows, []);
      throw new Error("expected buildAppConfigFromRawRows to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toContainEqual(
        expect.objectContaining({ field: "calendar.id" }),
      );
    }
  });

  it("throws ConfigError when a value is well-typed but semantically invalid (validation-level)", () => {
    const rows = validConfigRows().map((row) =>
      row.Key === "reservation.slotMinutes" ? { ...row, Value: -5 } : row,
    );
    expect(() => buildAppConfigFromRawRows(rows, [])).toThrow(ConfigError);
  });
});
