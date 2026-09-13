import { SHEET_NAMES } from "../src/SheetNames";
import {
  CONFIG_HEADERS,
  REQUIRED_HEADERS,
  SITES_HEADERS,
  WORKERS_HEADERS,
  REPORTS_HEADERS,
  REPORT_PHOTOS_HEADERS,
} from "../src/SheetSchemas";

describe("SheetSchemas", () => {
  it("defines exactly the five site-report sheets", () => {
    expect(Object.keys(SHEET_NAMES).sort()).toEqual(
      ["CONFIG", "REPORTS", "REPORT_PHOTOS", "SITES", "WORKERS"].sort(),
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

  it("SITES/WORKERS/REPORTS/REPORT_PHOTOS match the expected column lists", () => {
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
  });
});
