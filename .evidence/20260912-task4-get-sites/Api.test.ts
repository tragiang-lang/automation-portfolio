jest.mock("../src/ConfigStore", () => ({
  ...jest.requireActual("../src/ConfigStore"),
  getSiteReportConfig: jest.fn(),
}));
jest.mock("../src/SitesRepository", () => ({
  getSiteRows: jest.fn(),
}));

import {
  buildErrorResponse,
  buildSitesResult,
  buildSuccessResponse,
  ERROR_CODES,
  getSitesAction,
  handleApiRequest,
  mapConfigErrorToResponse,
  mapMissingHeadersErrorToResponse,
  parseApiRequest,
} from "../src/Api";
import { getSiteReportConfig, SiteReportConfigError } from "../src/ConfigStore";
import { getSiteRows } from "../src/SitesRepository";
import { MissingHeadersError } from "../src/RowMapper";
import { SiteRow } from "../src/SheetSchemas";
import { SiteReportConfig } from "../src/Config";

const mockGetSiteReportConfig = getSiteReportConfig as jest.Mock;
const mockGetSiteRows = getSiteRows as jest.Mock;

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
  jest.clearAllMocks();
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

describe("handleApiRequest", () => {
  it("routes the GET_SITES action to getSitesAction", () => {
    mockGetSiteRows.mockReturnValue([]);
    expect(handleApiRequest('{"action":"GET_SITES"}')).toEqual({ ok: true, data: { sites: [] } });
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
});
