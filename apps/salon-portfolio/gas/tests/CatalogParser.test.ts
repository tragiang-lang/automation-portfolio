import { parseServiceRow, parseStaffRow } from "../src/CatalogParser";

describe("parseServiceRow", () => {
  it("coerces already-typed values (Sheets auto-typing) unchanged", () => {
    expect(
      parseServiceRow({
        ServiceID: "SV001",
        Name: "ジェルネイル",
        DurationMinutes: 60,
        Price: 6000,
        Active: true,
        StaffRequired: true,
        DisplayOrder: 1,
      }),
    ).toEqual({
      ServiceID: "SV001",
      Name: "ジェルネイル",
      DurationMinutes: 60,
      Price: 6000,
      Active: true,
      StaffRequired: true,
      DisplayOrder: 1,
    });
  });

  it("coerces text-formatted cell values", () => {
    expect(
      parseServiceRow({
        ServiceID: "SV002",
        Name: "まつげエクステ",
        DurationMinutes: "90",
        Price: "8000",
        Active: "TRUE",
        StaffRequired: "FALSE",
        DisplayOrder: "2",
      }),
    ).toEqual({
      ServiceID: "SV002",
      Name: "まつげエクステ",
      DurationMinutes: 90,
      Price: 8000,
      Active: true,
      StaffRequired: false,
      DisplayOrder: 2,
    });
  });

  it("trims string fields and defaults missing numeric fields to NaN, not a thrown error", () => {
    const result = parseServiceRow({ ServiceID: " SV003 ", Name: " ネイルオフ " });
    expect(result.ServiceID).toBe("SV003");
    expect(result.Name).toBe("ネイルオフ");
    expect(Number.isNaN(result.DurationMinutes)).toBe(true);
  });
});

describe("parseStaffRow", () => {
  it("coerces a fully-populated staff row", () => {
    expect(
      parseStaffRow({
        StaffID: "ST001",
        Name: "田中",
        Active: true,
        CalendarID: "staff-tanaka@group.calendar.google.com",
        DisplayOrder: 1,
      }),
    ).toEqual({
      StaffID: "ST001",
      Name: "田中",
      Active: true,
      CalendarID: "staff-tanaka@group.calendar.google.com",
      DisplayOrder: 1,
    });
  });

  it("leaves CalendarID undefined when the cell is blank (fallback to the shared calendar happens elsewhere)", () => {
    const result = parseStaffRow({ StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: "", DisplayOrder: 2 });
    expect(result.CalendarID).toBeUndefined();
  });
});
