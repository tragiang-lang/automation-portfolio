jest.mock("../src/ConfigStore", () => ({
  ...jest.requireActual("../src/ConfigStore"),
  getSiteReportConfig: jest.fn(),
}));
jest.mock("../src/SitesRepository", () => ({
  // buildSitesResult is pure and moved here from Api.ts in Task 5 (so
  // SubmitReportService.ts can reuse it) — kept real; only the
  // Sheets-touching getSiteRows is mocked.
  ...jest.requireActual("../src/SitesRepository"),
  getSiteRows: jest.fn(),
}));
jest.mock("../src/WorkTypesRepository", () => ({
  // Same convention: buildWorkTypesResult is pure and kept real; only the
  // Sheets-touching getWorkTypeRows is mocked.
  ...jest.requireActual("../src/WorkTypesRepository"),
  getWorkTypeRows: jest.fn(),
}));
jest.mock("../src/SubmitReportService", () => ({
  ...jest.requireActual("../src/SubmitReportService"),
  submitReport: jest.fn(),
}));
jest.mock("../src/ProgressStatusRepository", () => ({
  // Same convention: buildProgressStatusResult is pure and kept real; only the
  // Sheets-touching getProgressStatusRows is mocked.
  ...jest.requireActual("../src/ProgressStatusRepository"),
  getProgressStatusRows: jest.fn(),
}));

import {
  buildErrorResponse,
  buildSitesResult,
  buildSuccessResponse,
  ERROR_CODES,
  getSitesAction,
  getWorkTypesAction,
  handleApiRequest,
  mapConfigErrorToResponse,
  mapMissingHeadersErrorToResponse,
  parseApiRequest,
  submitReportAction,
} from "../src/Api";
import { getSiteReportConfig, SiteReportConfigError } from "../src/ConfigStore";
import { getSiteRows } from "../src/SitesRepository";
import { getWorkTypeRows } from "../src/WorkTypesRepository";
import { submitReport } from "../src/SubmitReportService";
import { MissingHeadersError } from "../src/RowMapper";
import { SiteRow, WorkTypeRow, ProgressStatusRow } from "../src/SheetSchemas";
import { buildWorkTypesResult } from "../src/WorkTypesRepository";
import { buildProgressStatusResult } from "../src/ProgressStatusRepository";
import { SiteReportConfig } from "../src/Config";
import { SiteReport } from "../src/models/Report";
import { ReportPhoto } from "../src/models/ReportPhoto";

const mockSubmitReport = submitReport as jest.Mock;

const mockGetSiteReportConfig = getSiteReportConfig as jest.Mock;
const mockGetSiteRows = getSiteRows as jest.Mock;
const mockGetWorkTypeRows = getWorkTypeRows as jest.Mock;

const validConfig: SiteReportConfig = {
  businessName: "Acme Construction",
  adminEmail: "admin@example.com",
  driveRootFolderId: "1AbCdEf",
  timezone: "Asia/Tokyo",
};

function siteRow(overrides: Partial<SiteRow> = {}): SiteRow {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): a mockImplementation set by one
  // test (e.g. submitReport throwing) must not leak into a later test —
  // clearAllMocks only clears call history, not implementations.
  jest.resetAllMocks();
  mockGetSiteReportConfig.mockReturnValue(validConfig);
});

describe("parseApiRequest", () => {
  it("parses a well-formed request", () => {
    expect(parseApiRequest('{"action":"GET_SITES"}')).toEqual({
      ok: true,
      request: { action: "GET_SITES" },
    });
  });

  it("rejects an empty or missing body", () => {
    expect(parseApiRequest(undefined).ok).toBe(false);
    expect(parseApiRequest("").ok).toBe(false);
    expect(parseApiRequest("   ").ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    expect(parseApiRequest("{not json").ok).toBe(false);
  });

  it("rejects a body missing a non-empty action field", () => {
    expect(parseApiRequest("{}").ok).toBe(false);
    expect(parseApiRequest('{"action":""}').ok).toBe(false);
    expect(parseApiRequest('{"action":123}').ok).toBe(false);
    expect(parseApiRequest("[1,2,3]").ok).toBe(false);
  });
});

describe("response builders", () => {
  it("buildSuccessResponse wraps data in the ok envelope", () => {
    expect(buildSuccessResponse({ sites: [] })).toEqual({ ok: true, data: { sites: [] } });
  });

  it("buildErrorResponse wraps a code/message in the error envelope", () => {
    expect(buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "bad request")).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "bad request" },
    });
  });
});

describe("mapConfigErrorToResponse", () => {
  it("maps to a stable CONFIG_INVALID error without leaking the raw issues", () => {
    const error = new SiteReportConfigError([{ field: "TIMEZONE", reason: "missing or empty string" }]);
    const response = mapConfigErrorToResponse(error);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("TIMEZONE");
      expect(serialized).not.toContain("missing or empty string");
    }
  });
});

describe("mapMissingHeadersErrorToResponse", () => {
  it("maps to a stable SHEET_ERROR without leaking the missing header names", () => {
    const error = new MissingHeadersError(["siteId", "siteCode"]);
    const response = mapMissingHeadersErrorToResponse(error);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("SHEET_ERROR");
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("siteId");
      expect(serialized).not.toContain("siteCode");
    }
  });
});

describe("buildSitesResult", () => {
  it("maps every valid row to a Site, preserving Spreadsheet row order", () => {
    const rows = [
      siteRow({ siteId: "STE-3", siteCode: "S003" }),
      siteRow({ siteId: "STE-1", siteCode: "S001" }),
      siteRow({ siteId: "STE-2", siteCode: "S002" }),
    ];
    const result = buildSitesResult(rows);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sites.map((site: { siteId: string }) => site.siteId)).toEqual(["STE-3", "STE-1", "STE-2"]);
    }
  });

  it("returns an empty list for zero data rows", () => {
    expect(buildSitesResult([])).toEqual({ ok: true, sites: [] });
  });

  it("maps representative fields for a valid row", () => {
    const result = buildSitesResult([siteRow()]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sites).toEqual([
        {
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
        },
      ]);
    }
  });

  it("converts empty optional cells to undefined in the mapped Site", () => {
    const result = buildSitesResult([siteRow({ address: "", clientName: "", startDate: "", endDate: "" })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sites[0].address).toBeUndefined();
      expect(result.sites[0].clientName).toBeUndefined();
      expect(result.sites[0].startDate).toBeUndefined();
      expect(result.sites[0].endDate).toBeUndefined();
    }
  });

  it("reports the first row that fails business validation instead of corrupting it into a valid Site", () => {
    const result = buildSitesResult([siteRow(), siteRow({ siteId: "" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") {
      expect(result.index).toBe(1);
      expect(result.issues).toContainEqual({ field: "siteId", reason: "is required" });
    } else {
      throw new Error("expected an invalid-kind result");
    }
  });

  it("reports the first row mapSiteRow rejects as malformed instead of dropping or defaulting it", () => {
    const result = buildSitesResult([siteRow(), siteRow({ status: "PENDING" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "malformed") {
      expect(result.index).toBe(1);
      expect(result.field).toBe("status");
    } else {
      throw new Error("expected a malformed-kind result");
    }
  });

  it("filters out INACTIVE sites from the result", () => {
    const result = buildSitesResult([
      siteRow({ siteId: "STE-1", status: "ACTIVE" }),
      siteRow({ siteId: "STE-2", status: "INACTIVE" }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sites.map((site) => site.siteId)).toEqual(["STE-1"]);
    }
  });

  it("still validates an INACTIVE row's other fields before filtering it out", () => {
    const result = buildSitesResult([siteRow({ siteId: "", status: "INACTIVE" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") {
      expect(result.issues).toContainEqual({ field: "siteId", reason: "is required" });
    } else {
      throw new Error("expected an invalid-kind result");
    }
  });
});

function workTypeRow(overrides: Partial<WorkTypeRow> = {}): WorkTypeRow {
  return { code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10, ...overrides };
}

describe("buildWorkTypesResult", () => {
  it("maps every valid row to a WorkType", () => {
    const result = buildWorkTypesResult([workTypeRow()]);
    expect(result).toEqual({
      ok: true,
      workTypes: [{ code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10 }],
    });
  });

  it("returns an empty list for zero data rows", () => {
    expect(buildWorkTypesResult([])).toEqual({ ok: true, workTypes: [] });
  });

  it("filters out INACTIVE work types", () => {
    const result = buildWorkTypesResult([
      workTypeRow({ code: "A", sortOrder: 1 }),
      workTypeRow({ code: "B", sortOrder: 2, status: "INACTIVE" }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workTypes.map((w) => w.code)).toEqual(["A"]);
    }
  });

  it("sorts the result by sortOrder ascending regardless of sheet row order", () => {
    const result = buildWorkTypesResult([
      workTypeRow({ code: "B", sortOrder: 20 }),
      workTypeRow({ code: "A", sortOrder: 10 }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workTypes.map((w) => w.code)).toEqual(["A", "B"]);
    }
  });

  it("reports the first row that fails business validation instead of corrupting it", () => {
    const result = buildWorkTypesResult([workTypeRow(), workTypeRow({ code: "" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") {
      expect(result.index).toBe(1);
      expect(result.issues).toContainEqual({ field: "code", reason: "is required" });
    } else {
      throw new Error("expected an invalid-kind result");
    }
  });

  it("reports the first row mapWorkTypeRow rejects as malformed", () => {
    const result = buildWorkTypesResult([workTypeRow(), workTypeRow({ status: "PENDING" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "malformed") {
      expect(result.index).toBe(1);
      expect(result.field).toBe("status");
    } else {
      throw new Error("expected a malformed-kind result");
    }
  });
});

function progressStatusRow(overrides: Partial<ProgressStatusRow> = {}): ProgressStatusRow {
  return { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2, ...overrides };
}

describe("buildProgressStatusResult", () => {
  it("maps every valid row to a ProgressStatus", () => {
    const result = buildProgressStatusResult([progressStatusRow()]);
    expect(result).toEqual({
      ok: true,
      progressStatuses: [{ code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2 }],
    });
  });

  it("returns an empty list for zero data rows", () => {
    expect(buildProgressStatusResult([])).toEqual({ ok: true, progressStatuses: [] });
  });

  it("filters out INACTIVE progress statuses", () => {
    const result = buildProgressStatusResult([
      progressStatusRow({ code: "A", sortOrder: 1 }),
      progressStatusRow({ code: "B", sortOrder: 2, status: "INACTIVE" }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.progressStatuses.map((p) => p.code)).toEqual(["A"]);
    }
  });

  it("sorts the result by sortOrder ascending regardless of sheet row order", () => {
    const result = buildProgressStatusResult([
      progressStatusRow({ code: "B", sortOrder: 20 }),
      progressStatusRow({ code: "A", sortOrder: 10 }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.progressStatuses.map((p) => p.code)).toEqual(["A", "B"]);
    }
  });

  it("reports the first row that fails business validation instead of corrupting it", () => {
    const result = buildProgressStatusResult([progressStatusRow(), progressStatusRow({ code: "" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") {
      expect(result.index).toBe(1);
      expect(result.issues).toContainEqual({ field: "code", reason: "is required" });
    } else {
      throw new Error("expected an invalid-kind result");
    }
  });

  it("reports the first row mapProgressStatusRow rejects as malformed", () => {
    const result = buildProgressStatusResult([progressStatusRow(), progressStatusRow({ status: "PENDING" })]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "malformed") {
      expect(result.index).toBe(1);
      expect(result.field).toBe("status");
    } else {
      throw new Error("expected a malformed-kind result");
    }
  });
});

describe("getSitesAction", () => {
  it("returns the success envelope with sites read from the configured sheet", () => {
    mockGetSiteRows.mockReturnValue([siteRow()]);
    const response = getSitesAction();
    expect(response).toEqual({
      ok: true,
      data: {
        sites: [
          {
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
          },
        ],
      },
    });
  });

  it("returns an empty sites array for a valid sheet with no data rows", () => {
    mockGetSiteRows.mockReturnValue([]);
    expect(getSitesAction()).toEqual({ ok: true, data: { sites: [] } });
  });

  it("excludes INACTIVE sites from the GET_SITES response", () => {
    mockGetSiteRows.mockReturnValue([
      siteRow({ siteId: "STE-1", status: "ACTIVE" }),
      siteRow({ siteId: "STE-2", status: "INACTIVE" }),
    ]);
    const response = getSitesAction();
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.sites.map((site) => site.siteId)).toEqual(["STE-1"]);
    }
  });

  it("returns a structured DATA_INVALID error for a row failing business validation, without leaking row details", () => {
    mockGetSiteRows.mockReturnValue([siteRow({ siteId: "" })]);
    const response = getSitesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.DATA_INVALID);
      expect(JSON.stringify(response)).not.toContain("is required");
    }
  });

  it("returns a structured DATA_INVALID error for a malformed row, without leaking the raw value", () => {
    mockGetSiteRows.mockReturnValue([siteRow({ status: "PENDING" })]);
    const response = getSitesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.DATA_INVALID);
      expect(JSON.stringify(response)).not.toContain("PENDING");
    }
  });

  it("returns CONFIG_INVALID and never reads SITES when CONFIG itself is invalid", () => {
    mockGetSiteReportConfig.mockImplementation(() => {
      throw new SiteReportConfigError([{ field: "TIMEZONE", reason: "missing or empty string" }]);
    });
    const response = getSitesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    }
    expect(mockGetSiteRows).not.toHaveBeenCalled();
  });

  it("returns SHEET_ERROR when the SITES sheet is missing a required header", () => {
    mockGetSiteRows.mockImplementation(() => {
      throw new MissingHeadersError(["siteId"]);
    });
    const response = getSitesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.SHEET_ERROR);
      expect(JSON.stringify(response)).not.toContain("siteId");
    }
  });

  it("returns INTERNAL_ERROR for an unexpected Spreadsheet exception (e.g. sheet not found) without leaking details", () => {
    mockGetSiteRows.mockImplementation(() => {
      throw new Error('Sheet "SITES" was not found in the spreadsheet.');
    });
    const response = getSitesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(JSON.stringify(response)).not.toContain("not found");
    }
  });
});

describe("getWorkTypesAction", () => {
  it("returns the success envelope with ACTIVE work types read from the configured sheet, sorted by sortOrder", () => {
    mockGetWorkTypeRows.mockReturnValue([workTypeRow({ code: "B", sortOrder: 2 }), workTypeRow({ code: "A", sortOrder: 1 })]);
    const response = getWorkTypesAction();
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.workTypes.map((w) => w.code)).toEqual(["A", "B"]);
    }
  });

  it("returns an empty work types array for a valid sheet with no data rows", () => {
    mockGetWorkTypeRows.mockReturnValue([]);
    expect(getWorkTypesAction()).toEqual({ ok: true, data: { workTypes: [] } });
  });

  it("returns a structured DATA_INVALID error for a row failing business validation, without leaking row details", () => {
    mockGetWorkTypeRows.mockReturnValue([workTypeRow({ code: "" })]);
    const response = getWorkTypesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.DATA_INVALID);
      expect(JSON.stringify(response)).not.toContain("is required");
    }
  });

  it("returns CONFIG_INVALID when getSiteReportConfig throws, same as getSitesAction", () => {
    mockGetSiteReportConfig.mockImplementationOnce(() => {
      throw new SiteReportConfigError([{ field: "ADMIN_EMAIL", reason: "is required" }]);
    });
    const response = getWorkTypesAction();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    }
  });
});

describe("handleApiRequest", () => {
  it("routes the GET_SITES action to getSitesAction", () => {
    mockGetSiteRows.mockReturnValue([]);
    expect(handleApiRequest('{"action":"GET_SITES"}')).toEqual({ ok: true, data: { sites: [] } });
  });

  it("dispatches GET_WORK_TYPES to getWorkTypesAction", () => {
    mockGetWorkTypeRows.mockReturnValue([]);
    const response = handleApiRequest(JSON.stringify({ action: "GET_WORK_TYPES" }));
    expect(response).toEqual({ ok: true, data: { workTypes: [] } });
  });

  it("rejects an unsupported action", () => {
    const response = handleApiRequest('{"action":"NOT_REAL"}');
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
  });

  it("rejects an empty request body", () => {
    const response = handleApiRequest(undefined);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
  });

  it("routes the SUBMIT_REPORT action to submitReportAction", () => {
    const report: SiteReport = {
      reportId: "RPT-1",
      siteId: "STE-1",
      lineUserId: "U123",
      workerName: "Taro",
      reportDate: "2026-09-12",
      workType: "wiring",
      photoCount: 0,
      status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    };
    mockSubmitReport.mockReturnValue({ kind: "success", report, photos: [], notificationSent: true });
    const response = handleApiRequest(
      '{"action":"SUBMIT_REPORT","payload":{"siteId":"STE-1","lineUserId":"U123","workerName":"Taro","reportDate":"2026-09-12","workType":"wiring","photos":[]}}',
    );
    expect(response).toEqual({
      ok: true,
      data: { reportId: "RPT-1", photoCount: 0, notificationSent: true },
    });
  });
});

describe("submitReportAction", () => {
  const validPayload = {
    siteId: "STE-1",
    lineUserId: "U123",
    workerName: "Taro",
    reportDate: "2026-09-12",
    workType: "wiring",
    photos: [],
  };

  function successOutcome(overrides: Partial<SiteReport> = {}, photos: ReportPhoto[] = []) {
    const report: SiteReport = {
      reportId: "RPT-1",
      siteId: "STE-1",
      lineUserId: "U123",
      workerName: "Taro",
      reportDate: "2026-09-12",
      workType: "wiring",
      photoCount: photos.length,
      status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
      ...overrides,
    };
    return { kind: "success" as const, report, photos, notificationSent: true };
  }

  it("returns the success envelope with reportId, photoCount, and notificationSent", () => {
    mockSubmitReport.mockReturnValue(successOutcome());
    const response = submitReportAction(validPayload);
    expect(response).toEqual({
      ok: true,
      data: { reportId: "RPT-1", photoCount: 0, notificationSent: true },
    });
  });

  it("returns a VALIDATION_ERROR response and never calls submitReport when the request fails validation", () => {
    const response = submitReportAction({ ...validPayload, siteId: "" });
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(mockSubmitReport).not.toHaveBeenCalled();
  });

  it("returns SITE_NOT_FOUND for an unknown site", () => {
    mockSubmitReport.mockReturnValue({ kind: "site_not_found" });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.SITE_NOT_FOUND);
    }
  });

  it("returns DATA_INVALID when the SITES sheet itself is unavailable", () => {
    mockSubmitReport.mockReturnValue({ kind: "sites_unavailable" });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.DATA_INVALID);
    }
  });

  it("maps a work_type_not_found outcome to WORK_TYPE_NOT_FOUND", () => {
    mockSubmitReport.mockReturnValue({ kind: "work_type_not_found" });
    const response = submitReportAction(validPayload);
    expect(response).toEqual({
      ok: false,
      error: { code: ERROR_CODES.WORK_TYPE_NOT_FOUND, message: "The referenced work type could not be found." },
    });
  });

  it("maps a work_types_unavailable outcome to DATA_INVALID", () => {
    mockSubmitReport.mockReturnValue({ kind: "work_types_unavailable" });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.DATA_INVALID);
    }
  });

  it("returns a DRIVE_ERROR response without leaking the raw reason", () => {
    mockSubmitReport.mockReturnValue({ kind: "drive_upload_failed", reason: "Drive quota exceeded for user X" });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.DRIVE_ERROR);
      expect(JSON.stringify(response)).not.toContain("quota exceeded for user X");
    }
  });

  it("returns a SHEET_ERROR response for a REPORTS write failure without leaking the raw reason", () => {
    mockSubmitReport.mockReturnValue({ kind: "reports_write_failed", reason: "internal Sheets stack trace" });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.SHEET_ERROR);
      expect(JSON.stringify(response)).not.toContain("internal Sheets stack trace");
    }
  });

  it("returns a SHEET_ERROR response for a REPORT_PHOTOS write failure", () => {
    mockSubmitReport.mockReturnValue({ kind: "report_photos_write_failed", reason: "boom" });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.SHEET_ERROR);
    }
  });

  it("maps a thrown SiteReportConfigError to CONFIG_INVALID, same as getSitesAction", () => {
    mockSubmitReport.mockImplementation(() => {
      throw new SiteReportConfigError([{ field: "TIMEZONE", reason: "missing or empty string" }]);
    });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    }
  });

  it("maps a thrown MissingHeadersError to SHEET_ERROR, same as getSitesAction", () => {
    mockSubmitReport.mockImplementation(() => {
      throw new MissingHeadersError(["siteId"]);
    });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.SHEET_ERROR);
    }
  });

  it("maps an unexpected thrown error to INTERNAL_ERROR without leaking details", () => {
    mockSubmitReport.mockImplementation(() => {
      throw new Error("unexpected internal failure detail");
    });
    const response = submitReportAction(validPayload);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(JSON.stringify(response)).not.toContain("unexpected internal failure detail");
    }
  });
});
