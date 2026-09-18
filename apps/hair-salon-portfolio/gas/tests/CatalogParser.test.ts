import { parseServiceRow, parseStaffRow } from "../src/CatalogParser";

describe("parseServiceRow", () => {
  it("coerces already-typed values (Sheets auto-typing) unchanged", () => {
    expect(
      parseServiceRow({
        ServiceID: "SV001",
        Name: "カット",
        DurationMinutes: 60,
        Price: 6000,
        Active: true,
        StaffRequired: true,
        DisplayOrder: 1,
      }),
    ).toEqual({
      ServiceID: "SV001",
      Name: "カット",
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
        Name: "カット＋パーマ",
        DurationMinutes: "90",
        Price: "8000",
        Active: "TRUE",
        StaffRequired: "FALSE",
        DisplayOrder: "2",
      }),
    ).toEqual({
      ServiceID: "SV002",
      Name: "カット＋パーマ",
      DurationMinutes: 90,
      Price: 8000,
      Active: true,
      StaffRequired: false,
      DisplayOrder: 2,
    });
  });

  it("trims string fields and defaults missing numeric fields to NaN, not a thrown error", () => {
    const result = parseServiceRow({ ServiceID: " SV003 ", Name: " トリートメント " });
    expect(result.ServiceID).toBe("SV003");
    expect(result.Name).toBe("トリートメント");
    expect(Number.isNaN(result.DurationMinutes)).toBe(true);
  });
});

describe("parseServiceRow optional presentation fields (V1.1 Task 4)", () => {
  it("trims and includes Description/Category when present", () => {
    const result = parseServiceRow({
      ServiceID: "SV001",
      Name: "カット",
      DurationMinutes: 60,
      Price: 6000,
      Active: true,
      StaffRequired: false,
      DisplayOrder: 1,
      Description: "  指先に一色。  ",
      Category: " カット ",
    });
    expect(result.Description).toBe("指先に一色。");
    expect(result.Category).toBe("カット");
  });

  it("leaves Description/Category undefined when the cell is blank or the column is absent", () => {
    const result = parseServiceRow({
      ServiceID: "SV001",
      Name: "x",
      DurationMinutes: 60,
      Price: 6000,
      Active: true,
      StaffRequired: false,
      DisplayOrder: 1,
      Description: "",
    });
    expect(result.Description).toBeUndefined();
    expect(result.Category).toBeUndefined();
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

describe("parseStaffRow optional presentation fields (V1.1 Task 4)", () => {
  it("trims and includes Role/Bio/ImagePath when present", () => {
    const result = parseStaffRow({
      StaffID: "ST001",
      Name: "田中",
      Active: true,
      DisplayOrder: 1,
      Role: " 店長 ",
      Bio: " 丁寧な施術。 ",
      ImagePath: " /images/staff/st001.jpg ",
    });
    expect(result.Role).toBe("店長");
    expect(result.Bio).toBe("丁寧な施術。");
    expect(result.ImagePath).toBe("/images/staff/st001.jpg");
  });

  it("leaves Role/Bio/ImagePath undefined when blank or absent", () => {
    const result = parseStaffRow({ StaffID: "ST001", Name: "x", Active: true, DisplayOrder: 1 });
    expect(result.Role).toBeUndefined();
    expect(result.Bio).toBeUndefined();
    expect(result.ImagePath).toBeUndefined();
  });
});
