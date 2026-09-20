import { SHEET_NAMES } from "../src/SheetNames";
import { MissingHeadersError } from "../src/RowMapper";
import { assertSheetFound, requireHeaders } from "../src/SheetStore";

describe("assertSheetFound", () => {
  it("returns the sheet unchanged when it was found", () => {
    const fakeSheet = { getSheetName: () => "CONFIG" } as unknown as GoogleAppsScript.Spreadsheet.Sheet;
    expect(assertSheetFound(SHEET_NAMES.CONFIG, fakeSheet)).toBe(fakeSheet);
  });

  it("throws a descriptive error when the sheet is null (not found)", () => {
    expect(() => assertSheetFound(SHEET_NAMES.CONFIG, null)).toThrow(
      'Sheet "CONFIG" was not found in the spreadsheet.',
    );
  });
});

describe("requireHeaders", () => {
  it("returns a header map for exactly-matching headers", () => {
    const headerMap = requireHeaders(SHEET_NAMES.CONFIG, ["Key", "Value"]);
    expect(headerMap).toEqual({ Key: 0, Value: 1 });
  });

  it("accepts extra/unrecognized columns alongside the required ones", () => {
    const headerMap = requireHeaders(SHEET_NAMES.CONFIG, ["Key", "Value", "Description"]);
    expect(headerMap).toEqual({ Key: 0, Value: 1, Description: 2 });
  });

  it("throws MissingHeadersError when a required header is absent", () => {
    expect(() => requireHeaders(SHEET_NAMES.CONFIG, ["Key"])).toThrow(MissingHeadersError);
  });

  it("throws MissingHeadersError for a completely wrong header set", () => {
    expect(() => requireHeaders(SHEET_NAMES.SITES, ["foo", "bar"])).toThrow(MissingHeadersError);
  });

  it("validates every one of the five sheet schemas", () => {
    expect(() =>
      requireHeaders(SHEET_NAMES.WORKERS, [
        "workerId", "lineUserId", "displayName", "email", "role", "status", "createdAt", "updatedAt",
      ]),
    ).not.toThrow();
    expect(() =>
      requireHeaders(SHEET_NAMES.REPORTS, [
        "reportId", "siteId", "workerId", "lineUserId", "workerName", "reportDate", "workType", "comment", "photoCount", "status", "createdAt", "updatedAt",
      ]),
    ).not.toThrow();
    expect(() =>
      requireHeaders(SHEET_NAMES.REPORT_PHOTOS, [
        "photoId", "reportId", "fileId", "fileUrl", "fileName", "mimeType", "createdAt",
      ]),
    ).not.toThrow();
    expect(() => requireHeaders(SHEET_NAMES.SITES, ["siteId"])).toThrow(MissingHeadersError);
  });
});
