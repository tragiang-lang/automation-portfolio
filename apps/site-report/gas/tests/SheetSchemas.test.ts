import { SHEET_NAMES } from "../src/SheetNames";
import {
  CONFIG_HEADERS,
  REQUIRED_HEADERS,
  SITES_HEADERS,
  WORKERS_HEADERS,
  REPORTS_HEADERS,
  REPORT_PHOTOS_HEADERS,
  WORK_TYPES_HEADERS,
} from "../src/SheetSchemas";

describe("SheetSchemas", () => {
  it("defines exactly the six site-report sheets", () => {
    expect(Object.keys(SHEET_NAMES).sort()).toEqual(
      ["CONFIG", "REPORTS", "REPORT_PHOTOS", "SITES", "WORKERS", "WORK_TYPES"].sort(),
    );
  });

  it("has a REQUIRED_HEADERS entry for every sheet name", () => {
    Object.values(SHEET_NAMES).forEach((name) => {
      expect(REQUIRED_HEADERS[name]).toBeDefined();
      expect(REQUIRED_HEADERS[name].length).toBeGreaterThan(0);
    });
  });

  it("CONFIG has Key/Value columns", () => {
    expect(CONFIG_HEADERS).toEqual(["Key", "Value"]);
  });

  it("SITES/WORKERS/REPORTS/REPORT_PHOTOS/WORK_TYPES match the expected column lists", () => {
    expect(SITES_HEADERS).toEqual([
      "siteId",
      "siteCode",
      "name",
      "address",
      "clientName",
      "status",
      "startDate",
      "endDate",
      "createdAt",
      "updatedAt",
    ]);
    expect(WORKERS_HEADERS).toEqual([
      "workerId",
      "lineUserId",
      "displayName",
      "email",
      "role",
      "status",
      "createdAt",
      "updatedAt",
    ]);
    expect(REPORTS_HEADERS).toEqual([
      "reportId",
      "siteId",
      "workerId",
      "lineUserId",
      "workerName",
      "reportDate",
      "workType",
      "comment",
      "photoCount",
      "status",
      "createdAt",
      "updatedAt",
      "workTypeName",
    ]);
    expect(REPORT_PHOTOS_HEADERS).toEqual([
      "photoId",
      "reportId",
      "fileId",
      "fileUrl",
      "fileName",
      "mimeType",
      "createdAt",
    ]);
    expect(WORK_TYPES_HEADERS).toEqual(["code", "name", "status", "sortOrder"]);
  });

  it("REQUIRED_HEADERS.REPORTS stays the original 12 columns, never the 13-column REPORTS_HEADERS", () => {
    // Regression guard for the Phase 1 migration hazard (spec §4.4/§6):
    // making workTypeName "required" would abort setupSiteReport() on
    // every existing production spreadsheet.
    expect(REQUIRED_HEADERS[SHEET_NAMES.REPORTS]).toEqual([
      "reportId",
      "siteId",
      "workerId",
      "lineUserId",
      "workerName",
      "reportDate",
      "workType",
      "comment",
      "photoCount",
      "status",
      "createdAt",
      "updatedAt",
    ]);
    expect(REQUIRED_HEADERS[SHEET_NAMES.REPORTS]).not.toEqual(REPORTS_HEADERS);
  });
});
