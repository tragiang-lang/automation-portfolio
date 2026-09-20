import { SHEET_NAMES } from "../src/SheetNames";
import { CONFIG_HEADERS, SITES_HEADERS, WORK_TYPES_HEADERS, PROGRESS_STATUS_HEADERS } from "../src/SheetSchemas";
import { objectToRow } from "../src/RowMapper";
import { validateSiteRow, validateWorkTypeRow, validateProgressStatusRow } from "../src/Validation";
import { mapSiteRow, mapWorkTypeRow, mapProgressStatusRow } from "../src/RowMapper";
import { SITE_REPORT_CONFIG_KEYS } from "../src/Config";
import {
  DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
  DEFAULT_BUSINESS_NAME,
  DEFAULT_TIMEZONE_FALLBACK,
  DEMO_SITE_ID,
  SetupSchemaMismatchError,
  WORK_TYPE_SEED_ROWS,
  PROGRESS_STATUS_SEED_ROWS,
  buildConfigRowsToInsert,
  buildProvisioningSummary,
  buildSampleSiteRow,
  buildWorkTypeRowsToInsert,
  buildProgressStatusRowsToInsert,
  describeSheetHeaderState,
  findRemovableDefaultSheets,
  needsWorkTypeNameColumn,
  missingReportsPhase2Headers,
} from "../src/Setup";

describe("describeSheetHeaderState", () => {
  it("reports 'empty' for a sheet with no header row at all", () => {
    expect(describeSheetHeaderState([], SITES_HEADERS)).toEqual({ kind: "empty" });
  });

  it("reports 'empty' when every header cell is blank", () => {
    expect(describeSheetHeaderState(["", "", ""], SITES_HEADERS)).toEqual({ kind: "empty" });
  });

  it("reports 'ok' for an exact match, in order", () => {
    expect(describeSheetHeaderState([...CONFIG_HEADERS], CONFIG_HEADERS)).toEqual({ kind: "ok" });
  });

  it("reports 'ok' for the required headers present in a different order", () => {
    expect(describeSheetHeaderState(["Value", "Key"], CONFIG_HEADERS)).toEqual({ kind: "ok" });
  });

  it("reports 'ok' when extra, unrecognized columns are present alongside every required one", () => {
    expect(describeSheetHeaderState(["Key", "Value", "Description"], CONFIG_HEADERS)).toEqual({ kind: "ok" });
  });

  it("reports 'mismatch' listing every missing required header", () => {
    expect(describeSheetHeaderState(["siteId", "name"], SITES_HEADERS)).toEqual({
      kind: "mismatch",
      missing: ["siteCode", "address", "clientName", "status", "startDate", "endDate", "createdAt", "updatedAt"],
    });
  });
});

describe("SetupSchemaMismatchError", () => {
  it("carries the sheet name, missing/existing/expected headers and a descriptive message", () => {
    const error = new SetupSchemaMismatchError(SHEET_NAMES.SITES, ["status"], ["siteId", "name"], SITES_HEADERS);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("SetupSchemaMismatchError");
    expect(error.sheetName).toBe(SHEET_NAMES.SITES);
    expect(error.missing).toEqual(["status"]);
    expect(error.existingHeaders).toEqual(["siteId", "name"]);
    expect(error.expectedHeaders).toEqual(SITES_HEADERS);
    expect(error.message).toContain("SITES");
    expect(error.message).toContain("status");
    expect(error.message).toContain("siteId, name");
  });
});

describe("buildConfigRowsToInsert", () => {
  it("returns all 4 required keys when CONFIG is completely empty", () => {
    const rows = buildConfigRowsToInsert({}, { driveRootFolderId: "FOLDER123" });
    expect(rows.map((row) => row.Key).sort()).toEqual(Object.values(SITE_REPORT_CONFIG_KEYS).sort());
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME, Value: DEFAULT_BUSINESS_NAME });
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL, Value: DEFAULT_ADMIN_EMAIL_PLACEHOLDER });
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID, Value: "FOLDER123" });
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.TIMEZONE, Value: DEFAULT_TIMEZONE_FALLBACK });
  });

  it("returns nothing when every key is already present, even with an operator-edited value", () => {
    const existingConfig = {
      [SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME]: "Acme Construction",
      [SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL]: "real-admin@acme.example",
      [SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID]: "REAL_FOLDER_ID",
      [SITE_REPORT_CONFIG_KEYS.TIMEZONE]: "Asia/Tokyo",
    };
    expect(buildConfigRowsToInsert(existingConfig, { driveRootFolderId: "FOLDER123" })).toEqual([]);
  });

  it("never overwrites a key present with a blank value", () => {
    const existingConfig = { [SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL]: "" };
    const rows = buildConfigRowsToInsert(existingConfig, { driveRootFolderId: "FOLDER123" });
    expect(rows.some((row) => row.Key === SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL)).toBe(false);
  });

  it("returns only the missing subset when some keys already exist", () => {
    const existingConfig = { [SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME]: "Acme Construction" };
    const rows = buildConfigRowsToInsert(existingConfig, { driveRootFolderId: "FOLDER123" });
    expect(rows.map((row) => row.Key).sort()).toEqual(
      [SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL, SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID, SITE_REPORT_CONFIG_KEYS.TIMEZONE].sort(),
    );
  });

  it("uses caller-provided overrides instead of the defaults when given", () => {
    const rows = buildConfigRowsToInsert(
      {},
      { driveRootFolderId: "FOLDER123", businessName: "Custom Co", adminEmail: "x@example.com", timezone: "UTC" },
    );
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME, Value: "Custom Co" });
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL, Value: "x@example.com" });
    expect(rows).toContainEqual({ Key: SITE_REPORT_CONFIG_KEYS.TIMEZONE, Value: "UTC" });
  });
});

describe("buildSampleSiteRow", () => {
  const now = new Date("2026-01-15T03:04:05.000Z");

  it("builds the fixed demo site fields with the injected timestamp", () => {
    expect(buildSampleSiteRow(now)).toEqual({
      siteId: DEMO_SITE_ID,
      siteCode: "DEMO001",
      name: "Demo Site",
      address: "Demo Address",
      clientName: "Demo Client",
      status: "ACTIVE",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("produces a row that the app's own SITES validator accepts with zero issues", () => {
    const row = buildSampleSiteRow(now);
    expect(validateSiteRow(row)).toEqual([]);
  });

  it("produces a row that RowMapper.mapSiteRow can map without throwing", () => {
    const row = buildSampleSiteRow(now);
    expect(() => mapSiteRow(row)).not.toThrow();
  });

  it("serializes cleanly through objectToRow against the canonical SITES_HEADERS", () => {
    const row = buildSampleSiteRow(now);
    const serialized = objectToRow(SITES_HEADERS, row as unknown as Record<string, unknown>);
    expect(serialized).toHaveLength(SITES_HEADERS.length);
    expect(serialized).toEqual([
      DEMO_SITE_ID,
      "DEMO001",
      "Demo Site",
      "Demo Address",
      "Demo Client",
      "ACTIVE",
      "",
      "",
      now.toISOString(),
      now.toISOString(),
    ]);
  });
});

describe("WORK_TYPE_SEED_ROWS", () => {
  it("has exactly 22 rows with unique codes and contiguous sortOrder starting at 1", () => {
    expect(WORK_TYPE_SEED_ROWS).toHaveLength(22);
    const codes = WORK_TYPE_SEED_ROWS.map((row) => row.code);
    expect(new Set(codes).size).toBe(22);
    expect(WORK_TYPE_SEED_ROWS.map((row) => row.sortOrder)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });

  it("includes 外壁工事 as EXTERIOR_WALL and その他 as OTHER", () => {
    expect(WORK_TYPE_SEED_ROWS).toContainEqual(expect.objectContaining({ code: "EXTERIOR_WALL", name: "外壁工事" }));
    expect(WORK_TYPE_SEED_ROWS).toContainEqual(expect.objectContaining({ code: "OTHER", name: "その他" }));
  });

  it("every seed row passes the app's own WORK_TYPES validator with zero issues", () => {
    for (const seed of WORK_TYPE_SEED_ROWS) {
      const row = { ...seed, status: "ACTIVE" as const };
      expect(validateWorkTypeRow(row)).toEqual([]);
      expect(() => mapWorkTypeRow(row)).not.toThrow();
    }
  });
});

describe("buildWorkTypeRowsToInsert", () => {
  it("returns all 22 seed rows when WORK_TYPES is empty", () => {
    const rows = buildWorkTypeRowsToInsert(new Set());
    expect(rows).toHaveLength(22);
    expect(rows.every((row) => row.status === "ACTIVE")).toBe(true);
  });

  it("skips a code that already exists, never duplicating it", () => {
    const rows = buildWorkTypeRowsToInsert(new Set(["EXTERIOR_WALL"]));
    expect(rows.some((row) => row.code === "EXTERIOR_WALL")).toBe(false);
    expect(rows).toHaveLength(21);
  });

  it("returns nothing when every seed code already exists", () => {
    const allCodes = new Set(WORK_TYPE_SEED_ROWS.map((row) => row.code));
    expect(buildWorkTypeRowsToInsert(allCodes)).toEqual([]);
  });

  it("serializes cleanly through objectToRow against WORK_TYPES_HEADERS", () => {
    const [row] = buildWorkTypeRowsToInsert(new Set());
    const serialized = objectToRow(WORK_TYPES_HEADERS, row as unknown as Record<string, unknown>);
    expect(serialized).toHaveLength(WORK_TYPES_HEADERS.length);
  });
});

describe("needsWorkTypeNameColumn", () => {
  it("returns true when the header row has no workTypeName cell (pre-existing production sheet)", () => {
    expect(
      needsWorkTypeNameColumn([
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
      ]),
    ).toBe(true);
  });

  it("returns false once workTypeName is present, regardless of position", () => {
    expect(needsWorkTypeNameColumn(["reportId", "workTypeName", "siteId"])).toBe(false);
  });
});

describe("PROGRESS_STATUS_SEED_ROWS", () => {
  it("has exactly 3 rows with unique codes and contiguous sortOrder starting at 1", () => {
    expect(PROGRESS_STATUS_SEED_ROWS).toHaveLength(3);
    const codes = PROGRESS_STATUS_SEED_ROWS.map((row) => row.code);
    expect(new Set(codes).size).toBe(3);
    expect(PROGRESS_STATUS_SEED_ROWS.map((row) => row.sortOrder)).toEqual([1, 2, 3]);
  });

  it("includes 未着手 as NOT_STARTED, 進行中 as IN_PROGRESS, and 完了 as DONE", () => {
    expect(PROGRESS_STATUS_SEED_ROWS).toContainEqual(expect.objectContaining({ code: "NOT_STARTED", name: "未着手" }));
    expect(PROGRESS_STATUS_SEED_ROWS).toContainEqual(expect.objectContaining({ code: "IN_PROGRESS", name: "進行中" }));
    expect(PROGRESS_STATUS_SEED_ROWS).toContainEqual(expect.objectContaining({ code: "DONE", name: "完了" }));
  });

  it("every seed row passes the app's own PROGRESS_STATUS validator with zero issues", () => {
    for (const seed of PROGRESS_STATUS_SEED_ROWS) {
      const row = { ...seed, status: "ACTIVE" as const };
      expect(validateProgressStatusRow(row)).toEqual([]);
      expect(() => mapProgressStatusRow(row)).not.toThrow();
    }
  });
});

describe("buildProgressStatusRowsToInsert", () => {
  it("returns all 3 seed rows when PROGRESS_STATUS is empty", () => {
    const rows = buildProgressStatusRowsToInsert(new Set());
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "ACTIVE")).toBe(true);
  });

  it("skips a code that already exists, never duplicating it", () => {
    const rows = buildProgressStatusRowsToInsert(new Set(["DONE"]));
    expect(rows.some((row) => row.code === "DONE")).toBe(false);
    expect(rows).toHaveLength(2);
  });

  it("returns nothing when every seed code already exists", () => {
    const allCodes = new Set(PROGRESS_STATUS_SEED_ROWS.map((row) => row.code));
    expect(buildProgressStatusRowsToInsert(allCodes)).toEqual([]);
  });

  it("serializes cleanly through objectToRow against PROGRESS_STATUS_HEADERS", () => {
    const [row] = buildProgressStatusRowsToInsert(new Set());
    const serialized = objectToRow(PROGRESS_STATUS_HEADERS, row as unknown as Record<string, unknown>);
    expect(serialized).toHaveLength(PROGRESS_STATUS_HEADERS.length);
  });
});

describe("missingReportsPhase2Headers", () => {
  const legacyReportsHeaderRow = [
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
  ];

  it("returns all four Phase 2 headers for a pre-Phase-1 REPORTS sheet", () => {
    expect(missingReportsPhase2Headers(legacyReportsHeaderRow)).toEqual([
      "progressStatus",
      "progressStatusName",
      "hasIssue",
      "issueDetail",
    ]);
  });

  it("returns all four Phase 2 headers for a Phase-1-only REPORTS sheet (workTypeName present, Phase 2 columns absent)", () => {
    expect(missingReportsPhase2Headers([...legacyReportsHeaderRow, "workTypeName"])).toEqual([
      "progressStatus",
      "progressStatusName",
      "hasIssue",
      "issueDetail",
    ]);
  });

  it("returns an empty array once all four are present, regardless of position", () => {
    expect(
      missingReportsPhase2Headers([
        "reportId",
        "progressStatus",
        "progressStatusName",
        "hasIssue",
        "issueDetail",
        "siteId",
      ]),
    ).toEqual([]);
  });

  it("returns only the still-missing subset when some Phase 2 headers are already present", () => {
    expect(missingReportsPhase2Headers([...legacyReportsHeaderRow, "workTypeName", "progressStatus"])).toEqual([
      "progressStatusName",
      "hasIssue",
      "issueDetail",
    ]);
  });
});

describe("findRemovableDefaultSheets", () => {
  it("returns a non-canonical, completely empty sheet name", () => {
    expect(findRemovableDefaultSheets([{ name: "Sheet1", isEmpty: true }], Object.values(SHEET_NAMES))).toEqual([
      "Sheet1",
    ]);
  });

  it("never returns a canonical sheet name, even if it happens to be empty", () => {
    expect(findRemovableDefaultSheets([{ name: SHEET_NAMES.SITES, isEmpty: true }], Object.values(SHEET_NAMES))).toEqual(
      [],
    );
  });

  it("never returns a non-canonical sheet that already holds data", () => {
    expect(findRemovableDefaultSheets([{ name: "Notes", isEmpty: false }], Object.values(SHEET_NAMES))).toEqual([]);
  });
});

describe("buildProvisioningSummary", () => {
  const baseInput = {
    spreadsheet: { name: "Site Report", id: "SPREADSHEET_ID_PLACEHOLDER", url: "https://example.com/spreadsheet" },
    driveFolder: { name: "Site Report Photos", id: "FOLDER_ID_PLACEHOLDER", url: "https://example.com/folder" },
    configSampleInserted: true,
    demoSiteInserted: true,
    workTypesInserted: 22,
    reportsWorkTypeNameColumnAdded: true,
    progressStatusesInserted: 3,
    reportsPhase2ColumnsAdded: true,
  };

  it("lists every canonical sheet name as OK, sourced from SHEET_NAMES", () => {
    const summary = buildProvisioningSummary(baseInput);
    for (const name of Object.values(SHEET_NAMES)) {
      expect(summary).toContain(`  ${name}: OK`);
    }
  });

  it("reports 'configured' for freshly-inserted sample data, including PROGRESS_STATUS and the Phase 2 columns", () => {
    const summary = buildProvisioningSummary(baseInput);
    expect(summary).toContain("CONFIG: configured");
    expect(summary).toContain("ACTIVE site: configured");
    expect(summary).toContain("WORK_TYPES: 22 inserted");
    expect(summary).toContain("REPORTS.workTypeName column: added");
    expect(summary).toContain("PROGRESS_STATUS: 3 inserted");
    expect(summary).toContain("REPORTS Phase 2 columns: added");
  });

  it("reports 'already present' on a rerun that inserted nothing new", () => {
    const summary = buildProvisioningSummary({
      ...baseInput,
      configSampleInserted: false,
      demoSiteInserted: false,
      workTypesInserted: 0,
      reportsWorkTypeNameColumnAdded: false,
      progressStatusesInserted: 0,
      reportsPhase2ColumnsAdded: false,
    });
    expect(summary).toContain("CONFIG: already present");
    expect(summary).toContain("ACTIVE site: already present");
    expect(summary).toContain("WORK_TYPES: already present");
    expect(summary).toContain("REPORTS.workTypeName column: already present");
    expect(summary).toContain("PROGRESS_STATUS: already present");
    expect(summary).toContain("REPORTS Phase 2 columns: already present");
  });

  it("never includes anything besides the given resource names/IDs/URLs (no secret-shaped content)", () => {
    const summary = buildProvisioningSummary(baseInput);
    expect(summary).not.toMatch(/token|password|credential|secret/i);
  });

  it("includes the resolved spreadsheet and Drive folder identifiers", () => {
    const summary = buildProvisioningSummary(baseInput);
    expect(summary).toContain("SPREADSHEET_ID_PLACEHOLDER");
    expect(summary).toContain("FOLDER_ID_PLACEHOLDER");
  });
});
