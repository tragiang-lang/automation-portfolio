# Site Report Task 2 — GAS Config + Sheets Schema Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note for this run:** executed inline, in the same session
> that wrote this plan, without per-task subagent dispatch or interactive
> checkpoints — the calling task spec asks for one final structured report
> (its own "Final response format" section), not incremental approval
> gates. Steps are still tracked and verified in order.

**Goal:** Give `apps/site-report/gas` a real CONFIG-reading configuration
layer (`getSiteReportConfig()` → typed `SiteReportConfig`) and generic,
tested Sheets-access/header-validation helpers for all five site-report
sheets — infrastructure only, no `GET_SITES`/`SUBMIT_REPORT`/CRUD.

**Architecture:** Mirror `apps/salon-portfolio/gas`'s existing
Sheets/ConfigStore/ConfigParser split exactly: a thin, real-`SpreadsheetApp`-touching
adapter (untested by Jest, same as salon's `Sheets.ts` per its own
"Phase 0 §Q" convention) plus pure, fully-tested parsing/validation
functions fed plain arrays. `apps/site-report/gas` stays fully
self-contained — no `packages/gas-core`, nothing shared cross-`apps/`.

**Tech Stack:** Same as Task 1 — TypeScript, `@types/google-apps-script`,
ts-jest, esbuild, clasp.

**Spec:** The calling conversation's "Task 2 — GAS Config + Sheets Schema
Foundation" prompt.

## Global Constraints (from the spec)

- No `packages/gas-core`; do not create one; do not modify
  `apps/salon-portfolio`.
- No CRUD, no `GET_SITES`/`SUBMIT_REPORT`, no LIFF/Drive/Gmail/worker
  resolution/report workflow.
- Reuse the existing `SITE_REPORT_CONFIG_KEYS`/`SiteReportConfig` type
  from Task 1's `Config.ts` as-is — do not redesign it.
- `SheetNames.ts`/`SheetSchemas.ts` stay the source of truth for headers —
  do not duplicate the header lists elsewhere.
- No real Google Spreadsheet/Drive/Gmail/LINE/LIFF required to run
  `npm test`; keep tests deterministic.
- Task 1's `npm test`/`npm run build`/`npm run typecheck` must keep
  passing inside `apps/site-report/gas`.
- Do not commit.

---

## Finding 1 — repository's actual "don't mock GAS globals" test convention

Inspecting `apps/salon-portfolio/gas` (`Sheets.ts`, `ConfigStore.ts`,
`ConfigParser.ts`, `ConfigValidator.ts`, their tests) shows the
established convention is **not** "mock `SpreadsheetApp` with a Jest
mock" — it's "keep the real-`SpreadsheetApp`-touching functions so thin
they need no test, and push every branch of real logic into pure
functions fed plain arrays/objects instead." `Sheets.ts` itself has zero
tests; `ConfigStore.test.ts` tests only the pure
`buildAppConfigFromRawRows`/`normalizeHolidayDates` exports, never
`getConfig()` itself. This plan follows the identical split, so "missing
sheet detected" and "missing header detected" become pure, directly
testable functions (`assertSheetFound`, `requireHeaders`) that accept an
already-resolved `Sheet | null` / a plain header-row array — never a
mocked global.

**Decision on duplicate/unexpected CONFIG keys** (spec asks this be
explicit): follow salon's `buildRawConfigMap` behavior exactly — trimmed
keys, first occurrence of a duplicate key wins (later duplicate rows
silently ignored, deterministic), and any key not in
`SITE_REPORT_CONFIG_KEYS` is silently ignored (never rejected) — same as
salon's parser never erroring on an unrecognized CONFIG row. This keeps
the CONFIG sheet forward-compatible with future keys/description columns
without a schema migration, matching the existing repo's own tolerance
(salon's CONFIG sheet already carries a `Description` column no parser
code reads).

**Decision on scope of validation:** all four `SiteReportConfig` fields
are validated only as "present and non-empty after trim" — no email-format
or IANA-timezone-name check. Salon's `ConfigValidator.ts` adds such
semantic checks (email regex, `"Asia/Tokyo"` exact-match, positive
numbers) because its config has fields those checks apply to; site-report's
four fields have no such established constraint yet, and adding one now
would be inventing a rule the spec never asked for ("avoid ... complex
configuration framework"). This is called out in Known Limitations.

---

## Task A: Generic Sheets access helper (`SheetStore.ts`)

**Files:**
- Create: `apps/site-report/gas/src/SheetStore.ts`
- Test: `apps/site-report/gas/tests/SheetStore.test.ts`

**Interfaces:**
- Consumes: `SHEET_NAMES`/`SheetName` (`SheetNames.ts`), `REQUIRED_HEADERS`
  (`SheetSchemas.ts`), `buildHeaderMap`/`assertRequiredHeaders`/
  `MissingHeadersError` (`RowMapper.ts`).
- Produces: `getConfiguredSpreadsheet()`, `getSheetByName(spreadsheet,
  name)`, `getHeaderRow(sheet)`, `readRawRows(sheet)` (all thin, untested);
  `assertSheetFound(name, sheet)`, `requireHeaders(name, headerRow)` (pure,
  tested) — consumed by Task B's `ConfigStore.ts`.

- [ ] **Step 1: Write failing tests for the pure functions**

```typescript
// apps/site-report/gas/tests/SheetStore.test.ts
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
```

- [ ] **Step 2: Run tests, confirm they fail** (module doesn't exist yet)

Run: `cd apps/site-report/gas && npm test -- SheetStore`
Expected: FAIL — `Cannot find module '../src/SheetStore'`

- [ ] **Step 3: Write `SheetStore.ts`**

```typescript
import { SheetName } from "./SheetNames";
import { REQUIRED_HEADERS } from "./SheetSchemas";
import { buildHeaderMap, assertRequiredHeaders } from "./RowMapper";

/**
 * Thin Google Sheets adapter (same role as
 * apps/salon-portfolio/gas/src/Sheets.ts — "adapter only, no business
 * rules"). Every function in this section is a near-literal wrapper over
 * SpreadsheetApp and is NOT unit tested by Jest, matching that project's
 * own documented convention (Phase 0 §Q): a GAS-service wrapper this thin
 * is covered by manual verification, not a mocked-global unit test. The
 * pure functions below (assertSheetFound, requireHeaders) carry all the
 * actually-tested logic.
 *
 * Like salon, this is a standalone Apps Script project — no "active
 * spreadsheet" exists for a Web App request, so the target spreadsheet is
 * read from the same SPREADSHEET_ID Script Property salon uses (not a new
 * key; per Task 2 spec, don't invent a second spreadsheet-id config).
 */

const SPREADSHEET_ID_PROPERTY = "SPREADSHEET_ID";

export function getConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  if (!id) {
    throw new Error(`Script Property "${SPREADSHEET_ID_PROPERTY}" is not set.`);
  }
  return SpreadsheetApp.openById(id);
}

export function getSheetByName(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: SheetName,
): GoogleAppsScript.Spreadsheet.Sheet | null {
  return spreadsheet.getSheetByName(name);
}

/** Returns the header row (row 1) as a plain array — callers pass this
 *  into requireHeaders below. */
export function getHeaderRow(sheet: GoogleAppsScript.Spreadsheet.Sheet): unknown[] {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return [];
  }
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

/** Returns every data row (everything below the header row) as raw
 *  values — callers pass this into RowMapper.rowsToObjects. */
export function readRawRows(sheet: GoogleAppsScript.Spreadsheet.Sheet): unknown[][] {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

/** Convenience: resolve + require a sheet exists in one call. Still thin
 *  (delegates entirely to getSheetByName + the pure assertSheetFound
 *  below) — not unit tested itself, same reasoning as the rest of this
 *  section. */
export function getRequiredSheet(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: SheetName,
): GoogleAppsScript.Spreadsheet.Sheet {
  return assertSheetFound(name, getSheetByName(spreadsheet, name));
}

// --- Pure, Jest-tested from here down — no SpreadsheetApp/PropertiesService call. ---

/** Throws a descriptive error when `sheet` is null (the sheet was not
 *  found by name) — pure given an already-resolved lookup result, so it
 *  is directly testable without any GAS global. */
export function assertSheetFound(
  name: SheetName,
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null,
): GoogleAppsScript.Spreadsheet.Sheet {
  if (!sheet) {
    throw new Error(`Sheet "${name}" was not found in the spreadsheet.`);
  }
  return sheet;
}

/** Builds the header->column-index map for `name` from an already-read
 *  header row, and throws RowMapper.MissingHeadersError if any of
 *  SheetSchemas.REQUIRED_HEADERS[name] is absent. Extra/unrecognized
 *  columns in the sheet are always accepted (assertRequiredHeaders only
 *  ever checks presence of the required set) — see Finding 1's "no CONFIG
 *  key/column is ever rejected" decision, applied here at the header
 *  level too. Pure — fed a plain array, testable without SpreadsheetApp. */
export function requireHeaders(name: SheetName, headerRow: unknown[]): Record<string, number> {
  const headerMap = buildHeaderMap(headerRow);
  assertRequiredHeaders(headerMap, REQUIRED_HEADERS[name]);
  return headerMap;
}
```

- [ ] **Step 4: Run tests, confirm PASS**

Run: `cd apps/site-report/gas && npm test -- SheetStore`

- [ ] **Step 5: Run typecheck**

Run: `cd apps/site-report/gas && npm run typecheck`

---

## Task B: CONFIG parsing (`ConfigParser.ts`)

**Files:**
- Create: `apps/site-report/gas/src/ConfigParser.ts`
- Test: `apps/site-report/gas/tests/ConfigParser.test.ts`

**Interfaces:**
- Consumes: nothing from Task A.
- Produces: `ConfigFieldIssue`, `buildRawConfigMap(rows)`,
  `parseSiteReportConfig(rawConfig)` — consumed by Task C's
  `ConfigStore.ts`.

- [ ] **Step 1: Write failing tests**

```typescript
// apps/site-report/gas/tests/ConfigParser.test.ts
import { buildRawConfigMap, parseSiteReportConfig } from "../src/ConfigParser";

describe("buildRawConfigMap", () => {
  it("trims keys and keeps values as-is", () => {
    const map = buildRawConfigMap([
      { Key: " BUSINESS_NAME ", Value: "Acme Construction" },
      { Key: "TIMEZONE", Value: "Asia/Tokyo" },
    ]);
    expect(map).toEqual({ BUSINESS_NAME: "Acme Construction", TIMEZONE: "Asia/Tokyo" });
  });

  it("first occurrence of a duplicate key wins (documented decision)", () => {
    const map = buildRawConfigMap([
      { Key: "ADMIN_EMAIL", Value: "first@example.com" },
      { Key: "ADMIN_EMAIL", Value: "second@example.com" },
    ]);
    expect(map.ADMIN_EMAIL).toBe("first@example.com");
  });

  it("ignores rows with an empty key", () => {
    expect(buildRawConfigMap([{ Key: "", Value: "ignored" }])).toEqual({});
  });
});

function validRawConfig() {
  return {
    BUSINESS_NAME: "Acme Construction",
    ADMIN_EMAIL: "admin@example.com",
    DRIVE_ROOT_FOLDER_ID: "1AbCdEf",
    TIMEZONE: "Asia/Tokyo",
  };
}

describe("parseSiteReportConfig", () => {
  it("builds a valid SiteReportConfig from a fully-populated raw map", () => {
    const result = parseSiteReportConfig(validRawConfig());
    expect(result).toEqual({
      ok: true,
      config: {
        businessName: "Acme Construction",
        adminEmail: "admin@example.com",
        driveRootFolderId: "1AbCdEf",
        timezone: "Asia/Tokyo",
      },
    });
  });

  it("silently ignores an unrecognized key (documented decision)", () => {
    const result = parseSiteReportConfig({ ...validRawConfig(), SOME_FUTURE_KEY: "x" });
    expect(result.ok).toBe(true);
  });

  it("reports a missing required key as an issue", () => {
    const raw = validRawConfig() as Record<string, unknown>;
    delete raw.ADMIN_EMAIL;
    const result = parseSiteReportConfig(raw);
    expect(result).toEqual({
      ok: false,
      issues: [{ field: "ADMIN_EMAIL", reason: "missing or empty string" }],
    });
  });

  it("reports a present-but-empty required value as an issue", () => {
    const result = parseSiteReportConfig({ ...validRawConfig(), TIMEZONE: "   " });
    expect(result).toEqual({
      ok: false,
      issues: [{ field: "TIMEZONE", reason: "missing or empty string" }],
    });
  });

  it("collects every missing/empty field as a separate issue", () => {
    const result = parseSiteReportConfig({ BUSINESS_NAME: "Acme Construction" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((i) => i.field).sort()).toEqual(
        ["ADMIN_EMAIL", "DRIVE_ROOT_FOLDER_ID", "TIMEZONE"].sort(),
      );
    }
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail** (module doesn't exist)

Run: `cd apps/site-report/gas && npm test -- ConfigParser`

- [ ] **Step 3: Write `ConfigParser.ts`**

```typescript
import { SITE_REPORT_CONFIG_KEYS, SiteReportConfig } from "./Config";

/** One field-level parsing failure — mirrors
 *  apps/salon-portfolio/gas/src/ConfigParser.ts's ConfigFieldIssue shape
 *  (field + reason), the project's existing error-reporting style. */
export interface ConfigFieldIssue {
  field: string;
  reason: string;
}

export type SiteReportConfigParseResult =
  | { ok: true; config: SiteReportConfig }
  | { ok: false; issues: ConfigFieldIssue[] };

/** Builds a Key -> raw Value map from CONFIG sheet data rows. Trims
 *  string keys; the first occurrence of a duplicate key wins (later
 *  duplicate rows are ignored) — same documented, deterministic policy as
 *  apps/salon-portfolio/gas/src/ConfigParser.ts's buildRawConfigMap. */
export function buildRawConfigMap(
  rows: { Key: unknown; Value: unknown }[],
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row.Key ?? "").trim();
    if (key.length === 0 || key in map) {
      continue;
    }
    map[key] = row.Value;
  }
  return map;
}

/** Parses a raw cell value as a trimmed, non-empty string — undefined for
 *  a missing key or a whitespace-only value (same convention as salon's
 *  parseNonEmptyString). */
function parseNonEmptyString(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Pure CONFIG parser: raw Key/Value map -> typed SiteReportConfig, or a
 *  list of field-level issues. Never throws — malformed input always
 *  produces `{ ok: false }` (same contract as salon's parseAppConfig).
 * Any raw-map key outside SITE_REPORT_CONFIG_KEYS is silently ignored —
 * documented decision, see Task 2 plan's Finding 1. Every one of the
 * four required keys is checked, and every missing/empty one is reported
 * (not just the first), so a caller sees the full picture in one pass. */
export function parseSiteReportConfig(
  rawConfig: Record<string, unknown>,
): SiteReportConfigParseResult {
  const issues: ConfigFieldIssue[] = [];

  const requireString = (key: string): string => {
    const value = parseNonEmptyString(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "missing or empty string" });
      return "";
    }
    return value;
  };

  const businessName = requireString(SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME);
  const adminEmail = requireString(SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL);
  const driveRootFolderId = requireString(SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID);
  const timezone = requireString(SITE_REPORT_CONFIG_KEYS.TIMEZONE);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, config: { businessName, adminEmail, driveRootFolderId, timezone } };
}
```

- [ ] **Step 4: Run tests, confirm PASS**

Run: `cd apps/site-report/gas && npm test -- ConfigParser`

---

## Task C: CONFIG repository orchestration (`ConfigStore.ts`)

**Files:**
- Create: `apps/site-report/gas/src/ConfigStore.ts`
- Test: `apps/site-report/gas/tests/ConfigStore.test.ts`

**Interfaces:**
- Consumes: `SheetStore.ts`'s `getConfiguredSpreadsheet`/`getRequiredSheet`/
  `getHeaderRow`/`readRawRows`/`requireHeaders` (Task A);
  `ConfigParser.ts`'s `buildRawConfigMap`/`parseSiteReportConfig`
  (Task B); `SheetSchemas.ts`'s `CONFIG_HEADERS`/`ConfigRow`;
  `SheetNames.ts`'s `SHEET_NAMES`; `RowMapper.ts`'s `rowsToObjects`.
- Produces: `SiteReportConfigError`, `buildSiteReportConfigFromRawRows(rows)`
  (pure, tested), `getSiteReportConfig()` (thin orchestration, untested —
  same split as salon's `getConfig()`).

- [ ] **Step 1: Write failing tests**

```typescript
// apps/site-report/gas/tests/ConfigStore.test.ts
import { ConfigRow } from "../src/SheetSchemas";
import { buildSiteReportConfigFromRawRows, SiteReportConfigError } from "../src/ConfigStore";

function validConfigRows(): ConfigRow[] {
  return [
    { Key: "BUSINESS_NAME", Value: "Acme Construction" },
    { Key: "ADMIN_EMAIL", Value: "admin@example.com" },
    { Key: "DRIVE_ROOT_FOLDER_ID", Value: "1AbCdEf" },
    { Key: "TIMEZONE", Value: "Asia/Tokyo" },
  ];
}

describe("buildSiteReportConfigFromRawRows", () => {
  it("builds a valid SiteReportConfig from valid rows", () => {
    const config = buildSiteReportConfigFromRawRows(validConfigRows());
    expect(config).toEqual({
      businessName: "Acme Construction",
      adminEmail: "admin@example.com",
      driveRootFolderId: "1AbCdEf",
      timezone: "Asia/Tokyo",
    });
  });

  it("throws SiteReportConfigError when a required key is missing", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "TIMEZONE");
    expect(() => buildSiteReportConfigFromRawRows(rows)).toThrow(SiteReportConfigError);
  });

  it("SiteReportConfigError carries the field issues for server-side logging", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "TIMEZONE");
    try {
      buildSiteReportConfigFromRawRows(rows);
      throw new Error("expected buildSiteReportConfigFromRawRows to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SiteReportConfigError);
      expect((error as SiteReportConfigError).issues).toContainEqual({
        field: "TIMEZONE",
        reason: "missing or empty string",
      });
    }
  });

  it("throws when a required value is present but empty", () => {
    const rows = validConfigRows().map((row) => (row.Key === "ADMIN_EMAIL" ? { ...row, Value: "   " } : row));
    expect(() => buildSiteReportConfigFromRawRows(rows)).toThrow(SiteReportConfigError);
  });

  it("first occurrence of a duplicate CONFIG row wins", () => {
    const rows = [...validConfigRows(), { Key: "BUSINESS_NAME", Value: "Different Name" }];
    const config = buildSiteReportConfigFromRawRows(rows);
    expect(config.businessName).toBe("Acme Construction");
  });

  it("ignores an unrecognized CONFIG key", () => {
    const rows = [...validConfigRows(), { Key: "SOME_FUTURE_KEY", Value: "x" } as unknown as ConfigRow];
    expect(() => buildSiteReportConfigFromRawRows(rows)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd apps/site-report/gas && npm test -- ConfigStore`

- [ ] **Step 3: Write `ConfigStore.ts`**

```typescript
import { SHEET_NAMES } from "./SheetNames";
import { CONFIG_HEADERS, ConfigRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { rowsToObjects } from "./RowMapper";
import { buildRawConfigMap, ConfigFieldIssue, parseSiteReportConfig } from "./ConfigParser";
import { SiteReportConfig } from "./Config";

/** Thrown whenever CONFIG data fails parsing (missing/empty required
 *  key). `issues` is for server-side diagnostics only — a future Api.ts
 *  action must map this to a stable public error code, never forward
 *  `issues` verbatim to a client (same boundary rule as salon's
 *  ConfigError / Api.ts's mapConfigErrorToResponse). */
export class SiteReportConfigError extends Error {
  constructor(public readonly issues: ConfigFieldIssue[]) {
    super("CONFIG_INVALID");
    this.name = "SiteReportConfigError";
  }
}

/** Pure core of the repository: given already-read raw CONFIG rows,
 *  parses them into a SiteReportConfig or throws SiteReportConfigError.
 *  Fed plain arrays in tests — never touches SpreadsheetApp (same split
 *  as salon's buildAppConfigFromRawRows). */
export function buildSiteReportConfigFromRawRows(configRows: ConfigRow[]): SiteReportConfig {
  const rawMap = buildRawConfigMap(configRows.map((row) => ({ Key: row.Key, Value: row.Value })));
  const result = parseSiteReportConfig(rawMap);
  if (!result.ok) {
    throw new SiteReportConfigError(result.issues);
  }
  return result.config;
}

/** Reads CONFIG from the real spreadsheet and returns the typed
 *  SiteReportConfig. Thin orchestration only — not unit tested by Jest;
 *  buildSiteReportConfigFromRawRows above carries all the tested logic
 *  (same convention as salon's getConfig()). */
export function getSiteReportConfig(): SiteReportConfig {
  const spreadsheet = getConfiguredSpreadsheet();
  const sheet = getRequiredSheet(spreadsheet, SHEET_NAMES.CONFIG);
  const headerMap = requireHeaders(SHEET_NAMES.CONFIG, getHeaderRow(sheet));
  // rowsToObjects<T> requires T to satisfy Record<string, unknown>, but
  // ConfigRow declares concrete field types (not an index signature) —
  // the double cast is the same escape hatch salon's ConfigStore.ts uses
  // for the identical structural-but-not-assignable situation.
  const configRows = rowsToObjects(headerMap, readRawRows(sheet), CONFIG_HEADERS) as unknown as ConfigRow[];
  return buildSiteReportConfigFromRawRows(configRows);
}
```

- [ ] **Step 4: Run tests, confirm PASS**

Run: `cd apps/site-report/gas && npm test -- ConfigStore`

- [ ] **Step 5: Run the full suite + build + typecheck**

Run: `cd apps/site-report/gas && npm test && npm run build && npm run typecheck`

---

## Task D: Documentation + verification

**Files:**
- Modify: `docs/site-report-architecture-overview.md`

- [ ] **Step 1: Add a concise "CONFIG + Sheets Schema Foundation (Task 2)"
  section** covering: CONFIG sheet structure (Key/Value, same as before),
  where `SPREADSHEET_ID` lives (Script Property, same as salon), the
  duplicate-key/unrecognized-key decisions from Finding 1, and what this
  still does not do (no `Api.ts` wiring, no other sheet's CRUD, no
  semantic/format validation beyond non-empty).

- [ ] **Step 2: Full verification (gas)**

Run: `cd apps/site-report/gas && npm test && npm run typecheck && npm run build`

- [ ] **Step 3: Web health check (unchanged by this task, verify no
  regression)**

Run: `cd apps/site-report/web && npm test && npm run typecheck && npm run build && npm run lint`
(build before typecheck — `LayoutProps` needs `.next/types` generated by a
build first, same ordering note as Task 1.)

- [ ] **Step 4: Salon regression spot-check**

Run: `cd apps/salon-portfolio/gas && npm test` — expect the same 15
pre-existing `Api.test.ts` failures as Task 1's evidence log, confirming
this task didn't add or remove any salon failures (zero files touched
under `apps/salon-portfolio` regardless — diff audit confirms this
directly too).

- [ ] **Step 5: Git diff audit** — `git status --short`, `git diff
  --stat`, `git diff --name-only`, `git diff -- apps/site-report/`,
  `git diff -- apps/salon-portfolio/` (expect empty). Save to
  `.evidence/<timestamp>-task2-site-report-config-sheets/`.

- [ ] **Step 6: Produce the final structured report** per the calling
  task's own format.

---

## Self-Review Notes

- **Spec coverage:** CONFIG loading/typing/validation (Task B+C), sheet
  access + header validation for all 5 sheets (Task A), duplicate/
  unexpected-key decision documented (Finding 1), no CRUD/workflow added,
  tests cover all 13 numbered cases the spec lists (valid CONFIG loads;
  CONFIG sheet missing → `assertSheetFound` test; required key missing;
  required value empty; duplicate key; unexpected key; correct mapping;
  all 5 sheets resolve headers; missing sheet detected; valid headers
  pass; missing required header fails; wrong headers fail; extra columns
  accepted).
- **Placeholder scan:** no `TODO`/fill-in-later in any code block above.
- **Type consistency:** `SiteReportConfig`/`SITE_REPORT_CONFIG_KEYS`
  (Task 1, unchanged) ↔ `ConfigParser.ts`'s `parseSiteReportConfig` return
  shape ↔ `ConfigStore.ts`'s `buildSiteReportConfigFromRawRows` return
  type all match field-for-field (`businessName`/`adminEmail`/
  `driveRootFolderId`/`timezone`). `SheetName` (Task 1's `SheetNames.ts`)
  is the parameter type for both `SheetStore.ts` functions.
