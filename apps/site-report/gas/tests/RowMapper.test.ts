import {
  assertRequiredHeaders,
  buildHeaderMap,
  findRowIndexByColumnValue,
  mapReportPhotoRow,
  mapReportRow,
  mapSiteRow,
  mapWorkerRow,
  mapWorkTypeRow,
  MalformedRowValueError,
  MissingHeadersError,
  objectToRow,
  rowsToObjects,
} from "../src/RowMapper";
import { ReportPhotoRow, ReportRow, SiteRow, WorkerRow, WorkTypeRow } from "../src/SheetSchemas";

describe("buildHeaderMap", () => {
  it("maps header names to their column index", () => {
    expect(buildHeaderMap(["Key", "Value", "Description"])).toEqual({
      Key: 0,
      Value: 1,
      Description: 2,
    });
  });

  it("trims whitespace and ignores empty header cells", () => {
    expect(buildHeaderMap([" Key ", "", "Value"])).toEqual({
      Key: 0,
      Value: 2,
    });
  });
});

describe("assertRequiredHeaders", () => {
  it("does not throw when every required header is present", () => {
    expect(() =>
      assertRequiredHeaders({ Key: 0, Value: 1 }, ["Key", "Value"]),
    ).not.toThrow();
  });

  it("throws MissingHeadersError listing every missing header", () => {
    expect(() =>
      assertRequiredHeaders({ Key: 0 }, ["Key", "Value", "Description"]),
    ).toThrow(MissingHeadersError);
    try {
      assertRequiredHeaders({ Key: 0 }, ["Key", "Value", "Description"]);
    } catch (error) {
      expect((error as MissingHeadersError).missing).toEqual([
        "Value",
        "Description",
      ]);
    }
  });
});

describe("rowsToObjects", () => {
  const headerMap = buildHeaderMap(["Name", "Active", "DisplayOrder"]);

  it("maps data rows to objects using only the requested columns", () => {
    const result = rowsToObjects(
      headerMap,
      [["Alice", true, 1], ["Bob", false, 2]],
      ["Name", "Active", "DisplayOrder"],
    );
    expect(result).toEqual([
      { Name: "Alice", Active: true, DisplayOrder: 1 },
      { Name: "Bob", Active: false, DisplayOrder: 2 },
    ]);
  });

  it("defaults a missing cell value to an empty string, never undefined", () => {
    const result = rowsToObjects<{ Name: unknown; Active: unknown }>(
      headerMap,
      [["Alice", undefined, 1]],
      ["Name", "Active"],
    );
    expect(result[0].Active).toBe("");
  });

  it("throws MissingHeadersError when a required column is absent", () => {
    expect(() =>
      rowsToObjects(headerMap, [["Alice"]], ["Name", "CalendarID"]),
    ).toThrow(MissingHeadersError);
  });

  it("includes an optional column's value when the sheet has that header", () => {
    const withRole = buildHeaderMap(["Name", "Active", "DisplayOrder", "Role"]);
    const result = rowsToObjects(
      withRole,
      [["Alice", true, 1, "Manager"]],
      ["Name", "Active", "DisplayOrder"],
      ["Role"],
    );
    expect(result).toEqual([{ Name: "Alice", Active: true, DisplayOrder: 1, Role: "Manager" }]);
  });

  it("never throws when an optional column's header is entirely absent from the sheet", () => {
    expect(() =>
      rowsToObjects(headerMap, [["Alice", true, 1]], ["Name", "Active", "DisplayOrder"], ["Role"]),
    ).not.toThrow();
    const result = rowsToObjects(
      headerMap,
      [["Alice", true, 1]],
      ["Name", "Active", "DisplayOrder"],
      ["Role"],
    );
    expect(result[0]).not.toHaveProperty("Role");
  });
});

describe("objectToRow", () => {
  it("serializes in deterministic column order", () => {
    expect(
      objectToRow(["Name", "Active"], { Active: true, Name: "Alice" }),
    ).toEqual(["Alice", true]);
  });

  it("converts undefined and null to empty string", () => {
    expect(
      objectToRow(["Name", "Notes"], { Name: "Alice", Notes: undefined }),
    ).toEqual(["Alice", ""]);
    expect(
      objectToRow(["Name", "Notes"], { Name: "Alice", Notes: null }),
    ).toEqual(["Alice", ""]);
  });

  it("throws instead of silently producing [object Object]", () => {
    expect(() =>
      objectToRow(["Name", "CreatedAt"], { Name: "Alice", CreatedAt: new Date() }),
    ).toThrow(TypeError);
  });
});

describe("findRowIndexByColumnValue", () => {
  const headerMap = { ReservationID: 0, SubmissionID: 1, Status: 2 };
  const dataRows = [
    ["RES-A", "sub-1", "処理中"],
    ["RES-B", "sub-2", "受付済"],
  ];

  it("returns the 0-based index of the first matching row", () => {
    expect(findRowIndexByColumnValue(headerMap, dataRows, "SubmissionID", "sub-2")).toBe(1);
  });

  it("returns null when no row matches", () => {
    expect(findRowIndexByColumnValue(headerMap, dataRows, "SubmissionID", "sub-missing")).toBeNull();
  });

  it("returns null when the column itself does not exist in the header map", () => {
    expect(findRowIndexByColumnValue(headerMap, dataRows, "NotAColumn", "sub-1")).toBeNull();
  });

  it("coerces both sides through String() before comparing", () => {
    const numericHeaderMap = { Code: 0 };
    expect(findRowIndexByColumnValue(numericHeaderMap, [[42]], "Code", "42")).toBe(0);
  });
});

describe("mapSiteRow", () => {
  const validRow: SiteRow = {
    siteId: "STE-1",
    siteCode: "S001",
    name: "Site A",
    address: "Tokyo",
    clientName: "Acme",
    status: "ACTIVE",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };

  it("maps a valid row to a Site", () => {
    expect(mapSiteRow(validRow)).toEqual({
      siteId: "STE-1",
      siteCode: "S001",
      name: "Site A",
      address: "Tokyo",
      clientName: "Acme",
      status: "ACTIVE",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    });
  });

  it("converts an empty optional cell to undefined", () => {
    const site = mapSiteRow({ ...validRow, address: "", clientName: "", startDate: "", endDate: "" });
    expect(site.address).toBeUndefined();
    expect(site.clientName).toBeUndefined();
    expect(site.startDate).toBeUndefined();
    expect(site.endDate).toBeUndefined();
  });

  it("preserves an empty required cell as an empty string rather than inventing a value", () => {
    const site = mapSiteRow({ ...validRow, siteId: "" });
    expect(site.siteId).toBe("");
  });

  it("converts a Date timestamp cell to an ISO string", () => {
    const date = new Date("2026-09-12T03:04:05.000Z");
    const site = mapSiteRow({ ...validRow, createdAt: date as unknown as string });
    expect(site.createdAt).toBe("2026-09-12T03:04:05.000Z");
  });

  it("preserves IDs as strings", () => {
    expect(typeof mapSiteRow(validRow).siteId).toBe("string");
  });

  it("rejects a status value outside the allowed set", () => {
    expect(() => mapSiteRow({ ...validRow, status: "PENDING" })).toThrow(MalformedRowValueError);
  });
});

describe("mapWorkerRow", () => {
  const validRow: WorkerRow = {
    workerId: "WRK-1",
    lineUserId: "U123",
    displayName: "Taro",
    email: "t@example.com",
    role: "foreman",
    status: "ACTIVE",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };

  it("maps a valid row to a Worker", () => {
    expect(mapWorkerRow(validRow)).toEqual({
      workerId: "WRK-1",
      lineUserId: "U123",
      displayName: "Taro",
      email: "t@example.com",
      role: "foreman",
      status: "ACTIVE",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    });
  });

  it("converts an empty optional cell to undefined", () => {
    const worker = mapWorkerRow({ ...validRow, email: "", role: "" });
    expect(worker.email).toBeUndefined();
    expect(worker.role).toBeUndefined();
  });

  it("rejects a status value outside the allowed set", () => {
    expect(() => mapWorkerRow({ ...validRow, status: "ON_LEAVE" })).toThrow(MalformedRowValueError);
  });
});

describe("mapReportRow", () => {
  const validRow: ReportRow = {
    reportId: "RPT-1",
    siteId: "STE-1",
    workerId: "WRK-1",
    lineUserId: "U123",
    workerName: "Taro",
    reportDate: "2026-09-12",
    workType: "wiring",
    comment: "done",
    photoCount: 3,
    status: "SUBMITTED",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };

  it("maps a valid row to a SiteReport", () => {
    expect(mapReportRow(validRow)).toEqual({
      reportId: "RPT-1",
      siteId: "STE-1",
      workerId: "WRK-1",
      lineUserId: "U123",
      workerName: "Taro",
      reportDate: "2026-09-12",
      workType: "wiring",
      comment: "done",
      photoCount: 3,
      status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    });
  });

  it("converts an empty optional cell to undefined", () => {
    const report = mapReportRow({ ...validRow, workerId: "", comment: "" });
    expect(report.workerId).toBeUndefined();
    expect(report.comment).toBeUndefined();
  });

  it("coerces a numeric-string photoCount cell to a number", () => {
    const report = mapReportRow({ ...validRow, photoCount: "3" as unknown as number });
    expect(report.photoCount).toBe(3);
  });

  it("rejects a non-numeric photoCount cell instead of silently defaulting it", () => {
    expect(() => mapReportRow({ ...validRow, photoCount: "not-a-number" as unknown as number })).toThrow(
      MalformedRowValueError,
    );
  });

  it("rejects an empty required photoCount cell instead of silently defaulting to zero", () => {
    expect(() => mapReportRow({ ...validRow, photoCount: "" as unknown as number })).toThrow(
      MalformedRowValueError,
    );
  });

  it("rejects a status value other than SUBMITTED", () => {
    expect(() => mapReportRow({ ...validRow, status: "DRAFT" })).toThrow(MalformedRowValueError);
  });
});

describe("mapReportPhotoRow", () => {
  const validRow: ReportPhotoRow = {
    photoId: "PHO-1",
    reportId: "RPT-1",
    fileId: "F1",
    fileUrl: "https://drive.google.com/x",
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-09-12T00:00:00.000Z",
  };

  it("maps a valid row to a ReportPhoto", () => {
    expect(mapReportPhotoRow(validRow)).toEqual({
      photoId: "PHO-1",
      reportId: "RPT-1",
      fileId: "F1",
      fileUrl: "https://drive.google.com/x",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
  });

  it("preserves an empty required cell as an empty string rather than inventing a value", () => {
    const photo = mapReportPhotoRow({ ...validRow, reportId: "" });
    expect(photo.reportId).toBe("");
  });

  it("converts a Date timestamp cell to an ISO string", () => {
    const date = new Date("2026-09-12T03:04:05.000Z");
    const photo = mapReportPhotoRow({ ...validRow, createdAt: date as unknown as string });
    expect(photo.createdAt).toBe("2026-09-12T03:04:05.000Z");
  });
});

describe("mapWorkTypeRow", () => {
  it("maps a valid row to a WorkType", () => {
    const row: WorkTypeRow = { code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10 };
    expect(mapWorkTypeRow(row)).toEqual({ code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10 });
  });

  it("rejects a status outside ACTIVE/INACTIVE as malformed", () => {
    const row: WorkTypeRow = { code: "X", name: "Y", status: "PENDING", sortOrder: 1 };
    expect(() => mapWorkTypeRow(row)).toThrow(MalformedRowValueError);
  });

  it("rejects a non-numeric sortOrder as malformed", () => {
    const row = { code: "X", name: "Y", status: "ACTIVE", sortOrder: "not-a-number" } as unknown as WorkTypeRow;
    expect(() => mapWorkTypeRow(row)).toThrow(MalformedRowValueError);
  });
});

describe("mapReportRow — workTypeName", () => {
  const validRow: ReportRow = {
    reportId: "RPT-1",
    siteId: "STE-1",
    lineUserId: "U1",
    workerName: "Taro",
    reportDate: "2026-09-12",
    workType: "EXTERIOR_WALL",
    photoCount: 0,
    status: "SUBMITTED",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };

  it("converts an empty workTypeName cell to undefined", () => {
    expect(mapReportRow({ ...validRow, workTypeName: "" }).workTypeName).toBeUndefined();
  });

  it("passes through a present workTypeName", () => {
    expect(mapReportRow({ ...validRow, workTypeName: "外壁工事" }).workTypeName).toBe("外壁工事");
  });
});
