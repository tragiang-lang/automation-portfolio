import {
  validateReportPhotoRow,
  validateReportRow,
  validateSiteRow,
  validateWorkerRow,
  validateWorkTypeRow,
  validateProgressStatusRow,
} from "../src/Validation";
import { ReportPhotoRow, ReportRow, SiteRow, WorkerRow, WorkTypeRow, ProgressStatusRow } from "../src/SheetSchemas";

describe("validateSiteRow", () => {
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

  it("returns no issues for a valid row", () => {
    expect(validateSiteRow(validRow)).toEqual([]);
  });

  it("reports a missing required ID", () => {
    const issues = validateSiteRow({ ...validRow, siteId: "" });
    expect(issues).toContainEqual({ field: "siteId", reason: "is required" });
  });

  it("reports a missing required text field", () => {
    const issues = validateSiteRow({ ...validRow, name: "" });
    expect(issues).toContainEqual({ field: "name", reason: "is required" });
  });

  it("reports an invalid status value", () => {
    const issues = validateSiteRow({ ...validRow, status: "PENDING" });
    expect(issues).toContainEqual({
      field: "status",
      reason: 'must be "ACTIVE" or "INACTIVE", got "PENDING"',
    });
  });

  it("reports an invalid timestamp", () => {
    const issues = validateSiteRow({ ...validRow, createdAt: "not-a-date" });
    expect(issues).toContainEqual({ field: "createdAt", reason: "must be a valid ISO 8601 timestamp" });
  });

  it("reports an invalid optional date without requiring it", () => {
    const missing = validateSiteRow({ ...validRow, startDate: "" });
    expect(missing).toEqual([]);
    const malformed = validateSiteRow({ ...validRow, startDate: "2026-13-40" });
    expect(malformed).toContainEqual({
      field: "startDate",
      reason: "must be a valid calendar date in YYYY-MM-DD format",
    });
  });

  it("accumulates every issue in one pass rather than stopping at the first", () => {
    const issues = validateSiteRow({ ...validRow, siteId: "", name: "", status: "BAD" });
    expect(issues).toHaveLength(3);
  });
});

describe("validateWorkerRow", () => {
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

  it("returns no issues for a valid row", () => {
    expect(validateWorkerRow(validRow)).toEqual([]);
  });

  it("reports a missing required ID", () => {
    expect(validateWorkerRow({ ...validRow, workerId: "" })).toContainEqual({
      field: "workerId",
      reason: "is required",
    });
  });

  it("reports a missing required text field", () => {
    expect(validateWorkerRow({ ...validRow, displayName: "" })).toContainEqual({
      field: "displayName",
      reason: "is required",
    });
  });

  it("reports an invalid status value", () => {
    expect(validateWorkerRow({ ...validRow, status: "ON_LEAVE" })).toContainEqual({
      field: "status",
      reason: 'must be "ACTIVE" or "INACTIVE", got "ON_LEAVE"',
    });
  });
});

describe("validateReportRow", () => {
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

  it("returns no issues for a valid row", () => {
    expect(validateReportRow(validRow)).toEqual([]);
  });

  it("reports the missing report/site relationship", () => {
    expect(validateReportRow({ ...validRow, siteId: "" })).toContainEqual({
      field: "siteId",
      reason: "is required",
    });
  });

  it("reports a missing required text field", () => {
    expect(validateReportRow({ ...validRow, workerName: "" })).toContainEqual({
      field: "workerName",
      reason: "is required",
    });
  });

  it("reports an invalid status value", () => {
    expect(validateReportRow({ ...validRow, status: "DRAFT" })).toContainEqual({
      field: "status",
      reason: 'must be "SUBMITTED", got "DRAFT"',
    });
  });

  it("reports an invalid report date", () => {
    expect(validateReportRow({ ...validRow, reportDate: "2026/09/12" })).toContainEqual({
      field: "reportDate",
      reason: "must be a valid calendar date in YYYY-MM-DD format",
    });
  });

  it("reports an invalid timestamp", () => {
    expect(validateReportRow({ ...validRow, updatedAt: "not-a-date" })).toContainEqual({
      field: "updatedAt",
      reason: "must be a valid ISO 8601 timestamp",
    });
  });

  it("reports a malformed photoCount without treating it as valid", () => {
    expect(validateReportRow({ ...validRow, photoCount: -1 })).toContainEqual({
      field: "photoCount",
      reason: "must be a non-negative integer",
    });
  });

  it("does not require the optional workerId relationship", () => {
    expect(validateReportRow({ ...validRow, workerId: "" })).toEqual([]);
  });
});

describe("validateReportPhotoRow", () => {
  const validRow: ReportPhotoRow = {
    photoId: "PHO-1",
    reportId: "RPT-1",
    fileId: "F1",
    fileUrl: "https://drive.google.com/x",
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-09-12T00:00:00.000Z",
  };

  it("returns no issues for a valid row", () => {
    expect(validateReportPhotoRow(validRow)).toEqual([]);
  });

  it("reports the missing photo/report relationship", () => {
    expect(validateReportPhotoRow({ ...validRow, reportId: "" })).toContainEqual({
      field: "reportId",
      reason: "is required",
    });
  });

  it("reports a missing required text field", () => {
    expect(validateReportPhotoRow({ ...validRow, fileName: "" })).toContainEqual({
      field: "fileName",
      reason: "is required",
    });
  });

  it("reports an invalid timestamp", () => {
    expect(validateReportPhotoRow({ ...validRow, createdAt: "not-a-date" })).toContainEqual({
      field: "createdAt",
      reason: "must be a valid ISO 8601 timestamp",
    });
  });
});

describe("validateWorkTypeRow", () => {
  const validRow: WorkTypeRow = { code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10 };

  it("returns no issues for a valid row", () => {
    expect(validateWorkTypeRow(validRow)).toEqual([]);
  });

  it("reports a missing required code", () => {
    expect(validateWorkTypeRow({ ...validRow, code: "" })).toContainEqual({ field: "code", reason: "is required" });
  });

  it("reports a missing required name", () => {
    expect(validateWorkTypeRow({ ...validRow, name: "" })).toContainEqual({ field: "name", reason: "is required" });
  });

  it("reports an invalid status value", () => {
    expect(validateWorkTypeRow({ ...validRow, status: "PENDING" })).toContainEqual({
      field: "status",
      reason: 'must be "ACTIVE" or "INACTIVE", got "PENDING"',
    });
  });

  it("reports a negative sortOrder", () => {
    expect(validateWorkTypeRow({ ...validRow, sortOrder: -1 })).toContainEqual({
      field: "sortOrder",
      reason: "must be a non-negative integer",
    });
  });
});

describe("validateProgressStatusRow", () => {
  const validRow: ProgressStatusRow = { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2 };

  it("returns no issues for a valid row", () => {
    expect(validateProgressStatusRow(validRow)).toEqual([]);
  });

  it("reports a missing required code", () => {
    expect(validateProgressStatusRow({ ...validRow, code: "" })).toContainEqual({
      field: "code",
      reason: "is required",
    });
  });

  it("reports a missing required name", () => {
    expect(validateProgressStatusRow({ ...validRow, name: "" })).toContainEqual({
      field: "name",
      reason: "is required",
    });
  });

  it("reports an invalid status value", () => {
    expect(validateProgressStatusRow({ ...validRow, status: "PENDING" })).toContainEqual({
      field: "status",
      reason: 'must be "ACTIVE" or "INACTIVE", got "PENDING"',
    });
  });

  it("reports a negative sortOrder", () => {
    expect(validateProgressStatusRow({ ...validRow, sortOrder: -1 })).toContainEqual({
      field: "sortOrder",
      reason: "must be a non-negative integer",
    });
  });
});
