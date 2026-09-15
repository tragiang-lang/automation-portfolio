import { SHEET_NAMES, SheetName } from "./SheetNames";
import {
  CONFIG_HEADERS,
  ConfigRow,
  REQUIRED_HEADERS,
  SITES_HEADERS,
  SiteRow,
  WORK_TYPES_HEADERS,
  WorkTypeRow,
  PROGRESS_STATUS_HEADERS,
  ProgressStatusRow,
} from "./SheetSchemas";
import { SPREADSHEET_ID_PROPERTY, appendRow, getHeaderRow, getRequiredSheet, readRawRows } from "./SheetStore";
import { buildHeaderMap, findRowIndexByColumnValue, objectToRow, rowsToObjects } from "./RowMapper";
import { buildRawConfigMap } from "./ConfigParser";
import { SITE_REPORT_CONFIG_KEYS } from "./Config";

/**
 * One-time Google-resource provisioning for Site Report (Task 6).
 *
 * Deliberately reuses every existing schema/adapter module instead of
 * re-declaring sheet names, headers, or CONFIG keys anywhere in this file
 * — SheetNames.ts/SheetSchemas.ts/Config.ts/RowMapper.ts/ConfigParser.ts
 * stay the single source of truth for both the running app and this
 * provisioning path. `setupSiteReport()` at the bottom is the only
 * function here that touches SpreadsheetApp/DriveApp/PropertiesService;
 * every other export is pure and Jest-tested — same split as every other
 * module in this project (ConfigStore.ts, SheetStore.ts,
 * SitesRepository.ts).
 *
 * Idempotency contract (never violated by any code path below):
 *  - never deletes a spreadsheet, a canonical sheet, or a data row.
 *  - never overwrites a CONFIG value or a SITES row that already exists,
 *    no matter what value an operator put there.
 *  - never creates a second Spreadsheet once `SPREADSHEET_ID` is set, and
 *    never creates a second Drive folder once `CONFIG.DRIVE_ROOT_FOLDER_ID`
 *    is set.
 *  - a header row that already contains every required column is left
 *    completely untouched, even if column order differs or extra columns
 *    exist — identical tolerance to RowMapper.assertRequiredHeaders, which
 *    is what every real read/write path in this app already enforces, so
 *    setupSiteReport() never flags a sheet the running app already reads
 *    from successfully. Only a header row that is completely empty gets
 *    written; a header row that is present but missing a required column
 *    stops the whole run with SetupSchemaMismatchError rather than
 *    guessing a fix.
 */

export const SITE_REPORT_SPREADSHEET_NAME = "Site Report";
export const SITE_REPORT_DRIVE_FOLDER_NAME = "Site Report Photos";
export const DEMO_SITE_ID = "SITE-DEMO-001";

export const DEFAULT_BUSINESS_NAME = "Site Report Demo";
export const DEFAULT_ADMIN_EMAIL_PLACEHOLDER = "REPLACE_WITH_ADMIN_EMAIL@example.com";
export const DEFAULT_TIMEZONE_FALLBACK = "Asia/Tokyo";

// --- Pure, Jest-tested from here down — no SpreadsheetApp/DriveApp/PropertiesService call. ---

export type SheetHeaderState = { kind: "empty" } | { kind: "ok" } | { kind: "mismatch"; missing: string[] };

/** Same tolerance as RowMapper.assertRequiredHeaders (reordered or extra
 *  columns are fine, only presence of every required column matters).
 *  "empty" means no header row has been written at all yet (safe to
 *  write); "mismatch" means a header row exists but is missing at least
 *  one required column (unsafe to touch automatically — it could be
 *  sitting above real operator data in unexpected columns). */
export function describeSheetHeaderState(
  existingHeaderRow: unknown[],
  expectedHeaders: readonly string[],
): SheetHeaderState {
  const hasAnyHeaderCell = existingHeaderRow.some((cell) => String(cell ?? "").trim().length > 0);
  if (!hasAnyHeaderCell) {
    return { kind: "empty" };
  }
  const headerMap = buildHeaderMap(existingHeaderRow);
  const missing = expectedHeaders.filter((header) => !(header in headerMap));
  if (missing.length > 0) {
    return { kind: "mismatch", missing };
  }
  return { kind: "ok" };
}

/** Thrown when a sheet already has a header row missing a required
 *  column — setupSiteReport() stops immediately rather than rewriting a
 *  header that might sit above real operator data. Never thrown for
 *  reordered or extra columns (see describeSheetHeaderState above). */
export class SetupSchemaMismatchError extends Error {
  constructor(
    public readonly sheetName: SheetName,
    public readonly missing: string[],
    public readonly existingHeaders: string[],
    public readonly expectedHeaders: readonly string[],
  ) {
    super(
      `Sheet "${sheetName}" already has a header row but is missing required column(s): ` +
        `${missing.join(", ")}. Existing headers: [${existingHeaders.join(", ")}]. ` +
        `Expected headers: [${expectedHeaders.join(", ")}]. Fix the header row manually ` +
        `(never delete existing data) and re-run setupSiteReport().`,
    );
    this.name = "SetupSchemaMismatchError";
  }
}

export interface ConfigDefaults {
  /** Always the already-resolved Drive folder ID — either reused from an
   *  existing CONFIG row or a folder setupSiteReport() just created. */
  driveRootFolderId: string;
  businessName?: string;
  adminEmail?: string;
  timezone?: string;
}

/** Returns only the CONFIG rows that do not exist yet — a key already
 *  present in `existingConfig` (whatever its value, even blank) is never
 *  returned, so an operator's own edit is never overwritten. Key names
 *  come from Config.ts's SITE_REPORT_CONFIG_KEYS, never re-declared here. */
export function buildConfigRowsToInsert(
  existingConfig: Record<string, unknown>,
  defaults: ConfigDefaults,
): ConfigRow[] {
  const candidates: { key: string; value: string }[] = [
    { key: SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME, value: defaults.businessName ?? DEFAULT_BUSINESS_NAME },
    { key: SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL, value: defaults.adminEmail ?? DEFAULT_ADMIN_EMAIL_PLACEHOLDER },
    { key: SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID, value: defaults.driveRootFolderId },
    { key: SITE_REPORT_CONFIG_KEYS.TIMEZONE, value: defaults.timezone ?? DEFAULT_TIMEZONE_FALLBACK },
  ];
  return candidates.filter(({ key }) => !(key in existingConfig)).map(({ key, value }) => ({ Key: key, Value: value }));
}

/** Builds the one demo SITES row setupSiteReport() ensures exists, so
 *  GET_SITES/the LIFF site picker has something to show immediately after
 *  provisioning. Field values are the fixed demo set; `now` is injectable
 *  for deterministic tests (same convention as ids/ReportId.ts). Leaves
 *  the optional startDate/endDate fields unset, same as a real site with
 *  no fixed schedule (Site.ts's own documented case). */
export function buildSampleSiteRow(now: Date = new Date()): SiteRow {
  const createdAt = now.toISOString();
  return {
    siteId: DEMO_SITE_ID,
    siteCode: "DEMO001",
    name: "Demo Site",
    address: "Demo Address",
    clientName: "Demo Client",
    status: "ACTIVE",
    createdAt,
    updatedAt: createdAt,
  };
}

/** The 22 initial 作業種別 (Phase 1 P0 spec §4.2). sortOrder is the
 *  dropdown's display order, 1-indexed, matching this table's row order —
 *  never re-derived from array index at seed time so a future re-ordering
 *  of this list alone (without also renumbering) would be caught by the
 *  "contiguous sortOrder" test rather than silently shipping a gap. */
export const WORK_TYPE_SEED_ROWS: readonly { code: string; name: string; sortOrder: number }[] = [
  { code: "SUMIDASHI", name: "墨出し", sortOrder: 1 },
  { code: "SURVEYING", name: "測量", sortOrder: 2 },
  { code: "EXCAVATION", name: "掘削", sortOrder: 3 },
  { code: "FOUNDATION", name: "基礎工事", sortOrder: 4 },
  { code: "REBAR", name: "鉄筋工事", sortOrder: 5 },
  { code: "FORMWORK", name: "型枠工事", sortOrder: 6 },
  { code: "CONCRETE", name: "コンクリート工事", sortOrder: 7 },
  { code: "STRUCTURE", name: "躯体工事", sortOrder: 8 },
  { code: "SCAFFOLDING", name: "足場工事", sortOrder: 9 },
  { code: "EXTERIOR_WALL", name: "外壁工事", sortOrder: 10 },
  { code: "ROOFING", name: "屋根工事", sortOrder: 11 },
  { code: "WATERPROOFING", name: "防水工事", sortOrder: 12 },
  { code: "PAINTING", name: "塗装工事", sortOrder: 13 },
  { code: "INTERIOR", name: "内装工事", sortOrder: 14 },
  { code: "MEP", name: "設備工事", sortOrder: 15 },
  { code: "ELECTRICAL", name: "電気工事", sortOrder: 16 },
  { code: "PLUMBING", name: "配管工事", sortOrder: 17 },
  { code: "DEMOLITION", name: "解体工事", sortOrder: 18 },
  { code: "LOGISTICS", name: "搬入・搬出", sortOrder: 19 },
  { code: "CLEANING", name: "清掃", sortOrder: 20 },
  { code: "INSPECTION", name: "検査", sortOrder: 21 },
  { code: "OTHER", name: "その他", sortOrder: 22 },
] as const;

/** Returns only the seed rows whose code is not already in `existingCodes`
 *  — same "never overwrite/duplicate an operator's data" contract as
 *  buildConfigRowsToInsert. An operator who deactivates or edits a seeded
 *  row's name is never overwritten on rerun (its code still "exists"). */
export function buildWorkTypeRowsToInsert(existingCodes: Set<string>): WorkTypeRow[] {
  return WORK_TYPE_SEED_ROWS.filter((seed) => !existingCodes.has(seed.code)).map((seed) => ({
    code: seed.code,
    name: seed.name,
    status: "ACTIVE",
    sortOrder: seed.sortOrder,
  }));
}

/** The 3 initial 進捗状況 (Phase 2 spec §5.1). sortOrder is the dropdown's
 *  display order, matching this table's row order — same convention as
 *  WORK_TYPE_SEED_ROWS. */
export const PROGRESS_STATUS_SEED_ROWS: readonly { code: string; name: string; sortOrder: number }[] = [
  { code: "NOT_STARTED", name: "未着手", sortOrder: 1 },
  { code: "IN_PROGRESS", name: "進行中", sortOrder: 2 },
  { code: "DONE", name: "完了", sortOrder: 3 },
] as const;

/** Returns only the seed rows whose code is not already in `existingCodes`
 *  — exact structural copy of buildWorkTypeRowsToInsert's "never
 *  overwrite/duplicate an operator's data" contract. */
export function buildProgressStatusRowsToInsert(existingCodes: Set<string>): ProgressStatusRow[] {
  return PROGRESS_STATUS_SEED_ROWS.filter((seed) => !existingCodes.has(seed.code)).map((seed) => ({
    code: seed.code,
    name: seed.name,
    status: "ACTIVE",
    sortOrder: seed.sortOrder,
  }));
}

/** True when the given REPORTS header row does not yet contain a
 *  "workTypeName" cell — a header row written before this column existed
 *  (pre-existing production sheet), or a brand-new sheet whose header was
 *  just written from REQUIRED_HEADERS[REPORTS] (12 columns, deliberately
 *  not including workTypeName — see SheetSchemas.ts's REQUIRED_HEADERS
 *  comment). Column order/extra columns are irrelevant, matching
 *  describeSheetHeaderState's own tolerance. */
export function needsWorkTypeNameColumn(existingHeaderRow: unknown[]): boolean {
  return !("workTypeName" in buildHeaderMap(existingHeaderRow));
}

/** The four REPORTS columns Phase 2 adds, in their canonical order. */
const REPORTS_PHASE2_HEADERS = ["progressStatus", "progressStatusName", "hasIssue", "issueDetail"] as const;

/** Returns the subset of REPORTS_PHASE2_HEADERS absent from the given
 *  header row — a header row written before Phase 2 (whether it has
 *  workTypeName or not) is missing all four; column order/extra columns
 *  are irrelevant, matching needsWorkTypeNameColumn's own tolerance. */
export function missingReportsPhase2Headers(existingHeaderRow: unknown[]): string[] {
  const headerMap = buildHeaderMap(existingHeaderRow);
  return REPORTS_PHASE2_HEADERS.filter((header) => !(header in headerMap));
}

export interface RemovableSheetInfo {
  name: string;
  isEmpty: boolean;
}

/** Identifies the leftover default tab(s) (typically "Sheet1") a brand
 *  new Spreadsheet always comes with, so setupSiteReport() can tidy them
 *  away — but ONLY ones that are both non-canonical and completely empty.
 *  Never returns a canonical sheet name, and never a non-canonical sheet
 *  that already holds any data (an operator's own extra tab is left
 *  alone). setupSiteReport() only calls this right after creating a brand
 *  new spreadsheet — a reused, pre-existing spreadsheet's extra tabs are
 *  never inspected by setupSiteReport() at all. */
export function findRemovableDefaultSheets(
  sheetInfos: RemovableSheetInfo[],
  canonicalNames: readonly string[],
): string[] {
  return sheetInfos.filter((sheet) => !canonicalNames.includes(sheet.name) && sheet.isEmpty).map((sheet) => sheet.name);
}

export interface ProvisioningSummaryInput {
  spreadsheet: { name: string; id: string; url: string };
  driveFolder: { name: string; id: string; url: string };
  configSampleInserted: boolean;
  demoSiteInserted: boolean;
  workTypesInserted: number;
  reportsWorkTypeNameColumnAdded: boolean;
  progressStatusesInserted: number;
  reportsPhase2ColumnsAdded: boolean;
}

/** Builds the human-readable end-of-run summary setupSiteReport() logs —
 *  pure string formatting, never touches a GAS global, so it is directly
 *  Jest-tested for exact content. Never logs a secret/credential — it
 *  only ever receives resource names/IDs/URLs, the same values already
 *  visible to the operator inside the Spreadsheet/Drive UI once
 *  setupSiteReport() finishes. The "Sheets:" block lists every name in
 *  SheetNames.ts's SHEET_NAMES, never a separately hardcoded list, so it
 *  cannot silently drift from the five canonical sheets. */
export function buildProvisioningSummary(input: ProvisioningSummaryInput): string {
  const lines: string[] = [
    "=== Site Report Provisioning Complete ===",
    "",
    "Spreadsheet:",
    `  Name: ${input.spreadsheet.name}`,
    `  ID: ${input.spreadsheet.id}`,
    `  URL: ${input.spreadsheet.url}`,
    "",
    "Drive folder:",
    `  Name: ${input.driveFolder.name}`,
    `  ID: ${input.driveFolder.id}`,
    `  URL: ${input.driveFolder.url}`,
    "",
    "Sheets:",
    ...Object.values(SHEET_NAMES).map((name) => `  ${name}: OK`),
    "",
    "Script Properties:",
    "  SPREADSHEET_ID: configured",
    "",
    "Sample data:",
    `  CONFIG: ${input.configSampleInserted ? "configured" : "already present"}`,
    `  ACTIVE site: ${input.demoSiteInserted ? "configured" : "already present"}`,
    `  WORK_TYPES: ${input.workTypesInserted > 0 ? `${input.workTypesInserted} inserted` : "already present"}`,
    `  REPORTS.workTypeName column: ${input.reportsWorkTypeNameColumnAdded ? "added" : "already present"}`,
    `  PROGRESS_STATUS: ${input.progressStatusesInserted > 0 ? `${input.progressStatusesInserted} inserted` : "already present"}`,
    `  REPORTS Phase 2 columns: ${input.reportsPhase2ColumnsAdded ? "added" : "already present"}`,
    "",
    "Next steps:",
    "  1. Review CONFIG sheet",
    "  2. Replace demo ADMIN_EMAIL",
    "  3. Review SITES",
    "  4. Deploy Web App",
    "  5. Copy /exec URL to Vercel GAS_WEBAPP_URL",
  ];
  return lines.join("\n");
}

// --- Orchestration: the only function below that touches SpreadsheetApp/
// DriveApp/PropertiesService. Not unit tested by Jest — same convention as
// every other real-Google-API-touching function in this project
// (SheetStore.ts's getConfiguredSpreadsheet, DriveStorage.ts's
// uploadReportPhoto). Every decision it makes (what already counts as
// "provisioned", what sample data to write) is delegated to the pure
// functions above, which carry all the tested logic. ---

/** One-time provisioning entry point (Task 6). Run manually from the Apps
 *  Script editor after the project is pushed — never called by
 *  doGet/doPost, and safe to run more than once (see the idempotency
 *  contract in this file's header comment). */
export function setupSiteReport(): void {
  const now = new Date();
  const scriptProperties = PropertiesService.getScriptProperties();

  // 1. Spreadsheet: reuse via SPREADSHEET_ID if already set, else create
  // exactly one new spreadsheet and record its ID immediately.
  const existingSpreadsheetId = scriptProperties.getProperty(SPREADSHEET_ID_PROPERTY);
  const spreadsheet = existingSpreadsheetId
    ? SpreadsheetApp.openById(existingSpreadsheetId)
    : SpreadsheetApp.create(SITE_REPORT_SPREADSHEET_NAME);
  const spreadsheetJustCreated = !existingSpreadsheetId;
  if (spreadsheetJustCreated) {
    scriptProperties.setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
  }

  // 2. All 5 canonical sheets + headers, in the exact order SheetSchemas.ts
  // declares. Throws immediately on the first schema mismatch — nothing
  // past this point ever runs against a sheet whose header row cannot be
  // trusted.
  for (const name of Object.values(SHEET_NAMES)) {
    const sheet = spreadsheet.getSheetByName(name) ?? spreadsheet.insertSheet(name);
    const expectedHeaders = REQUIRED_HEADERS[name];
    const existingHeaderRow = getHeaderRow(sheet);
    const state = describeSheetHeaderState(existingHeaderRow, expectedHeaders);
    if (state.kind === "empty") {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([[...expectedHeaders]]);
    } else if (state.kind === "mismatch") {
      throw new SetupSchemaMismatchError(
        name,
        state.missing,
        existingHeaderRow.map((cell) => String(cell ?? "")),
        expectedHeaders,
      );
    }
  }

  // Tidy the default "Sheet1"-style tab a brand new Spreadsheet always
  // comes with — only on the run that created the spreadsheet, and only
  // for a tab that is still completely empty. Never touches an operator's
  // own extra tab on a reused spreadsheet (spreadsheetJustCreated is false
  // there, so this block never runs at all).
  if (spreadsheetJustCreated) {
    const sheetInfos = spreadsheet.getSheets().map((sheet) => ({
      name: sheet.getName(),
      isEmpty: sheet.getLastRow() === 0 && sheet.getLastColumn() === 0,
    }));
    const sheetsByName = new Map(spreadsheet.getSheets().map((sheet) => [sheet.getName(), sheet]));
    for (const name of findRemovableDefaultSheets(sheetInfos, Object.values(SHEET_NAMES))) {
      const sheet = sheetsByName.get(name);
      if (sheet) {
        spreadsheet.deleteSheet(sheet);
      }
    }
  }

  // 3. Read CONFIG's current state (headers are guaranteed present by
  // step 2 above — getRequiredSheet is used only for the not-found guard
  // it already provides, consistent with every other repository in this
  // project).
  const configSheet = getRequiredSheet(spreadsheet, SHEET_NAMES.CONFIG);
  const configHeaderMap = buildHeaderMap(getHeaderRow(configSheet));
  // Same double-cast escape hatch ConfigStore.getSiteReportConfig() uses:
  // rowsToObjects<T> requires T extends Record<string, unknown>, but
  // ConfigRow declares concrete field types rather than an index signature.
  const configRows = rowsToObjects(configHeaderMap, readRawRows(configSheet), CONFIG_HEADERS) as unknown as ConfigRow[];
  const existingConfig = buildRawConfigMap(configRows.map((row) => ({ Key: row.Key, Value: row.Value })));

  // 4. Drive folder: reuse the ID already recorded in CONFIG, else create
  // exactly one new folder — never more than once per run, and never
  // again once CONFIG.DRIVE_ROOT_FOLDER_ID is set.
  const existingFolderId = existingConfig[SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID];
  const folder =
    typeof existingFolderId === "string" && existingFolderId.trim().length > 0
      ? DriveApp.getFolderById(existingFolderId.trim())
      : DriveApp.createFolder(SITE_REPORT_DRIVE_FOLDER_NAME);
  const driveRootFolderId = folder.getId();

  // 5. Append only the CONFIG rows that do not exist yet.
  const configRowsToInsert = buildConfigRowsToInsert(existingConfig, { driveRootFolderId });
  for (const row of configRowsToInsert) {
    appendRow(configSheet, objectToRow(CONFIG_HEADERS, row as unknown as Record<string, unknown>));
  }

  // 6. Ensure exactly one demo ACTIVE site exists (never a duplicate).
  const sitesSheet = getRequiredSheet(spreadsheet, SHEET_NAMES.SITES);
  const sitesHeaderMap = buildHeaderMap(getHeaderRow(sitesSheet));
  const sitesRawRows = readRawRows(sitesSheet);
  const demoAlreadyExists = findRowIndexByColumnValue(sitesHeaderMap, sitesRawRows, "siteId", DEMO_SITE_ID) !== null;
  if (!demoAlreadyExists) {
    const sampleSite = buildSampleSiteRow(now);
    appendRow(sitesSheet, objectToRow(SITES_HEADERS, sampleSite as unknown as Record<string, unknown>));
  }

  // 6b. REPORTS backward-compatible migration: append the workTypeName
  // header cell if not already present, in the next free column — never
  // touches any existing header cell. Safe on both a brand-new REPORTS
  // sheet (step 2's generic loop above only wrote the 12-column
  // REQUIRED_HEADERS[REPORTS]) and a pre-existing production sheet.
  // Idempotent: a rerun finds the header already present and no-ops.
  const reportsSheet = getRequiredSheet(spreadsheet, SHEET_NAMES.REPORTS);
  const reportsHeaderRow = getHeaderRow(reportsSheet);
  const workTypeNameColumnAdded = needsWorkTypeNameColumn(reportsHeaderRow);
  if (workTypeNameColumnAdded) {
    reportsSheet.getRange(1, reportsHeaderRow.length + 1).setValue("workTypeName");
  }

  // 6c. Ensure every seed 作業種別 exists (never a duplicate, never an
  // overwrite of an operator's own edit).
  const workTypesSheet = getRequiredSheet(spreadsheet, SHEET_NAMES.WORK_TYPES);
  const workTypesHeaderMap = buildHeaderMap(getHeaderRow(workTypesSheet));
  const workTypesRawRows = readRawRows(workTypesSheet);
  const existingCodeIndex = workTypesHeaderMap["code"];
  const existingCodes = new Set(
    existingCodeIndex === undefined ? [] : workTypesRawRows.map((row) => String(row[existingCodeIndex] ?? "")),
  );
  const workTypeRowsToInsert = buildWorkTypeRowsToInsert(existingCodes);
  for (const row of workTypeRowsToInsert) {
    appendRow(workTypesSheet, objectToRow(WORK_TYPES_HEADERS, row as unknown as Record<string, unknown>));
  }

  // 6d. REPORTS Phase 2 migration: append any of progressStatus/
  // progressStatusName/hasIssue/issueDetail not already present, in one
  // batch, after whatever workTypeName step 6b just did — never touches
  // an existing header cell. Idempotent: a rerun finds all four already
  // present and no-ops. Re-reads the header row since 6b may have just
  // changed its length.
  const reportsHeaderRowAfterWorkType = getHeaderRow(reportsSheet);
  const missingPhase2Headers = missingReportsPhase2Headers(reportsHeaderRowAfterWorkType);
  if (missingPhase2Headers.length > 0) {
    reportsSheet
      .getRange(1, reportsHeaderRowAfterWorkType.length + 1, 1, missingPhase2Headers.length)
      .setValues([missingPhase2Headers]);
  }

  // 6e. Ensure every seed 進捗状況 exists (never a duplicate, never an
  // overwrite of an operator's own edit) — same pattern as 6c.
  const progressStatusSheet = getRequiredSheet(spreadsheet, SHEET_NAMES.PROGRESS_STATUS);
  const progressStatusHeaderMap = buildHeaderMap(getHeaderRow(progressStatusSheet));
  const progressStatusRawRows = readRawRows(progressStatusSheet);
  const existingProgressCodeIndex = progressStatusHeaderMap["code"];
  const existingProgressCodes = new Set(
    existingProgressCodeIndex === undefined
      ? []
      : progressStatusRawRows.map((row) => String(row[existingProgressCodeIndex] ?? "")),
  );
  const progressStatusRowsToInsert = buildProgressStatusRowsToInsert(existingProgressCodes);
  for (const row of progressStatusRowsToInsert) {
    appendRow(progressStatusSheet, objectToRow(PROGRESS_STATUS_HEADERS, row as unknown as Record<string, unknown>));
  }

  // 7. Log the final summary — never includes a secret/credential, only
  // resource names/IDs/URLs the operator can already see in the
  // Spreadsheet/Drive UI.
  console.log(
    buildProvisioningSummary({
      spreadsheet: { name: spreadsheet.getName(), id: spreadsheet.getId(), url: spreadsheet.getUrl() },
      driveFolder: { name: folder.getName(), id: driveRootFolderId, url: folder.getUrl() },
      configSampleInserted: configRowsToInsert.length > 0,
      demoSiteInserted: !demoAlreadyExists,
      workTypesInserted: workTypeRowsToInsert.length,
      reportsWorkTypeNameColumnAdded: workTypeNameColumnAdded,
      progressStatusesInserted: progressStatusRowsToInsert.length,
      reportsPhase2ColumnsAdded: missingPhase2Headers.length > 0,
    }),
  );
}
