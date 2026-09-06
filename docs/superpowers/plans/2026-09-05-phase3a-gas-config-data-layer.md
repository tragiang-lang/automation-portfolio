# Phase 3A — GAS Configuration + Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `salon-portfolio` GAS backend a reusable CONFIG configuration system and a thin Google Sheets data layer, exposed through one `getConfig` API action — no reservation/contact/calendar/mail/auth workflow.

**Architecture:** Pure parsing/validation/serialization modules (Jest-testable, no GAS globals) feed a thin `ConfigStore`/`Sheets` repository layer that touches `SpreadsheetApp`; `Api.ts` dispatches `doPost` actions through the existing `{ok,data}`/`{ok:false,error}` envelope already used by the Phase 1 health check.

**Tech Stack:** TypeScript, esbuild (bundles `src/Code.ts` → `build/Code.js`), Jest + ts-jest, `@types/google-apps-script`, clasp (build-only, no push).

**Spec:** [`docs/phase0-specification.md`](../../phase0-specification.md) (source of truth for schema/naming — supersedes the generic illustrative examples in the Phase 3A task prompt wherever they differ), read alongside the Phase 3A task prompt for scope boundaries.

## Global Constraints

- Do NOT modify `apps/salon-portfolio/web/**` (frontend stays on demo data; Phase 3B connects it).
- Do NOT implement: reservation workflow, `getAvailableSlots`/`checkAvailability`/`createReservation`, Calendar, Gmail, `createInquiry`, `requestCancellation`, authentication, Supabase, `healthCheck` action, `getServices`/`getStaff` actions, clasp push/deploy.
- Sheet names, CONFIG keys, `AppConfig` shape, error codes, and the API envelope must match `docs/phase0-specification.md` §C/§D/§G/§H exactly — do not invent parallel names.
- No dependency-injection container introduced solely to enable testing (Phase 0 §Q Decision 3) — pure modules are pure by plain-function construction; GAS-service-calling modules (`Sheets.ts`) stay thin and are covered by manual testing, not Jest.
- Never hard-code a spreadsheet ID — read it from the `SPREADSHEET_ID` Script Property (new convention, documented in Task 12).
- Timezone is always `Asia/Tokyo`, implemented as a fixed UTC+9 offset (Japan has no DST) — never `Intl`/locale-dependent formatting, never server-local time.
- `getConfig`'s response must never include `calendarId`, `emailOwnerNotifyAddress`, or `emailFromName` (Phase 0 §H's example response omits them — they are private).
- Boolean parsing accepts only a native boolean or the exact string `"true"`/`"false"` (any case) — never `"yes"/"no"/"1"/"0"`.
- Do not add a lint script/config to the `gas` package — none exists today (Phase 1 baseline); do not introduce new tooling not required by this task.
- Do NOT commit. Do NOT run `clasp push`.

---

## Task 1: Sheet Names, Schemas, and Row Mapper

**Files:**
- Create: `apps/salon-portfolio/gas/src/SheetNames.ts`
- Create: `apps/salon-portfolio/gas/src/SheetSchemas.ts`
- Create: `apps/salon-portfolio/gas/src/RowMapper.ts`
- Test: `apps/salon-portfolio/gas/tests/SheetSchemas.test.ts`
- Test: `apps/salon-portfolio/gas/tests/RowMapper.test.ts`

**Interfaces:**
- Produces: `SHEET_NAMES` const object and `SheetName` union type; `CONFIG_HEADERS`, `HOLIDAYS_HEADERS`, `SERVICES_HEADERS`, `STAFF_HEADERS`, `RESERVATIONS_HEADERS`, `CANCELLATION_REQUESTS_HEADERS`, `INQUIRIES_HEADERS`, `EMAIL_LOG_HEADERS`, `ERROR_LOG_HEADERS` (readonly string-array constants); `REQUIRED_HEADERS: Record<SheetName, readonly string[]>`; row interfaces `ConfigRow`, `HolidayRow`, `ServiceRow`, `StaffRow`, `ReservationRow`, `CancellationRequestRow`, `InquiryRow`, `EmailLogRow`, `ErrorLogRow`; `buildHeaderMap(headerRow: unknown[]): Record<string, number>`; `assertRequiredHeaders(headerMap, required): void` (throws `MissingHeadersError`); `rowsToObjects<T>(headerMap, dataRows, columns): T[]`; `objectToRow(columns, obj): unknown[]`.

- [ ] **Step 1: Write `SheetNames.ts`**

```ts
/**
 * Canonical Google Sheets tab names for this project (Phase 0 spec §C).
 * Every reference to a sheet by name must go through this constant —
 * never hard-code a tab name string elsewhere.
 */
export const SHEET_NAMES = {
  CONFIG: "CONFIG",
  HOLIDAYS: "HOLIDAYS",
  SERVICES: "SERVICES",
  STAFF: "STAFF",
  RESERVATIONS: "RESERVATIONS",
  CANCELLATION_REQUESTS: "CANCELLATION_REQUESTS",
  INQUIRIES: "INQUIRIES",
  EMAIL_LOG: "EMAIL_LOG",
  ERROR_LOG: "ERROR_LOG",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];
```

- [ ] **Step 2: Write `SheetSchemas.ts`**

```ts
import { SHEET_NAMES, SheetName } from "./SheetNames";

/** CONFIG: human-editable key/value/description rows (Phase 0 §C). */
export const CONFIG_HEADERS = ["Key", "Value", "Description"] as const;
export interface ConfigRow {
  Key: unknown;
  Value: unknown;
  Description?: unknown;
}

/** HOLIDAYS: one row per closed date (Phase 0 §C). */
export const HOLIDAYS_HEADERS = ["Date", "Label"] as const;
export interface HolidayRow {
  Date: unknown;
  Label?: unknown;
}

/** SERVICES: salon menu/service catalog (Phase 0 §C). */
export const SERVICES_HEADERS = [
  "ServiceID",
  "Name",
  "DurationMinutes",
  "Price",
  "Active",
  "StaffRequired",
  "DisplayOrder",
] as const;
export interface ServiceRow {
  ServiceID: string;
  Name: string;
  DurationMinutes: number;
  Price: number;
  Active: boolean;
  StaffRequired: boolean;
  DisplayOrder: number;
}

/** STAFF: salon stylist catalog (Phase 0 §C). */
export const STAFF_HEADERS = [
  "StaffID",
  "Name",
  "Active",
  "CalendarID",
  "DisplayOrder",
] as const;
export interface StaffRow {
  StaffID: string;
  Name: string;
  Active: boolean;
  CalendarID?: string;
  DisplayOrder: number;
}

/** RESERVATIONS: persisted reservation records (Phase 0 §C/§E). Schema
 *  only in Phase 3A — no code path writes to this sheet yet. */
export const RESERVATIONS_HEADERS = [
  "ReservationID",
  "SubmissionID",
  "CreatedAt",
  "UpdatedAt",
  "Name",
  "Email",
  "Phone",
  "Date",
  "Time",
  "ServiceID",
  "StaffID",
  "Notes",
  "Status",
  "CalendarEventID",
  "EmailStatus",
  "CancellationToken",
] as const;
export interface ReservationRow {
  ReservationID: string;
  SubmissionID: string;
  CreatedAt: string;
  UpdatedAt: string;
  Name: string;
  Email: string;
  Phone?: string;
  Date: string;
  Time: string;
  ServiceID: string;
  StaffID?: string;
  Notes?: string;
  Status: string;
  CalendarEventID?: string;
  EmailStatus: string;
  CancellationToken: string;
}

/** CANCELLATION_REQUESTS (Phase 0 §C/§L). Schema only in Phase 3A. */
export const CANCELLATION_REQUESTS_HEADERS = [
  "CancellationRequestID",
  "ReservationID",
  "RequestedAt",
  "RequesterName",
  "RequesterEmail",
  "Reason",
  "Status",
  "ProcessedAt",
  "ProcessedBy",
  "Notes",
] as const;
export interface CancellationRequestRow {
  CancellationRequestID: string;
  ReservationID: string;
  RequestedAt: string;
  RequesterName: string;
  RequesterEmail: string;
  Reason?: string;
  Status: string;
  ProcessedAt?: string;
  ProcessedBy?: string;
  Notes?: string;
}

/** INQUIRIES: contact-form submissions (Phase 0 §C/§F). Schema only. */
export const INQUIRIES_HEADERS = [
  "InquiryID",
  "SubmissionID",
  "CreatedAt",
  "Name",
  "Email",
  "Phone",
  "Subject",
  "Message",
  "Source",
  "Status",
] as const;
export interface InquiryRow {
  InquiryID: string;
  SubmissionID: string;
  CreatedAt: string;
  Name: string;
  Email: string;
  Phone?: string;
  Subject?: string;
  Message: string;
  Source?: string;
  Status: string;
}

/** EMAIL_LOG (Phase 0 §C/§M). Schema only. */
export const EMAIL_LOG_HEADERS = [
  "EmailLogID",
  "CreatedAt",
  "RelatedType",
  "RelatedID",
  "RecipientType",
  "RecipientEmail",
  "Subject",
  "Status",
  "ErrorMessage",
] as const;
export interface EmailLogRow {
  EmailLogID: string;
  CreatedAt: string;
  RelatedType: string;
  RelatedID: string;
  RecipientType: string;
  RecipientEmail: string;
  Subject: string;
  Status: string;
  ErrorMessage?: string;
}

/** ERROR_LOG (Phase 0 §C/§N/§O). Never stores secrets or raw personal
 *  data — `ContextJSON` may reference an id but not contact details. */
export const ERROR_LOG_HEADERS = [
  "ErrorID",
  "CreatedAt",
  "Action",
  "Message",
  "Stack",
  "ContextJSON",
  "Severity",
] as const;
export interface ErrorLogRow {
  ErrorID: string;
  CreatedAt: string;
  Action: string;
  Message: string;
  Stack?: string;
  ContextJSON?: string;
  Severity: string;
}

/** Required headers per sheet, keyed by canonical sheet name — used for
 *  missing-header detection (Phase 3A §15) before any row mapping. */
export const REQUIRED_HEADERS: Record<SheetName, readonly string[]> = {
  [SHEET_NAMES.CONFIG]: CONFIG_HEADERS,
  [SHEET_NAMES.HOLIDAYS]: HOLIDAYS_HEADERS,
  [SHEET_NAMES.SERVICES]: SERVICES_HEADERS,
  [SHEET_NAMES.STAFF]: STAFF_HEADERS,
  [SHEET_NAMES.RESERVATIONS]: RESERVATIONS_HEADERS,
  [SHEET_NAMES.CANCELLATION_REQUESTS]: CANCELLATION_REQUESTS_HEADERS,
  [SHEET_NAMES.INQUIRIES]: INQUIRIES_HEADERS,
  [SHEET_NAMES.EMAIL_LOG]: EMAIL_LOG_HEADERS,
  [SHEET_NAMES.ERROR_LOG]: ERROR_LOG_HEADERS,
};
```

- [ ] **Step 3: Write `tests/SheetSchemas.test.ts`**

```ts
import { SHEET_NAMES } from "../src/SheetNames";
import {
  CONFIG_HEADERS,
  HOLIDAYS_HEADERS,
  REQUIRED_HEADERS,
  RESERVATIONS_HEADERS,
} from "../src/SheetSchemas";

describe("SheetSchemas", () => {
  it("defines exactly the nine sheets from phase0-specification.md §C", () => {
    expect(Object.keys(SHEET_NAMES).sort()).toEqual(
      [
        "CANCELLATION_REQUESTS",
        "CONFIG",
        "EMAIL_LOG",
        "ERROR_LOG",
        "HOLIDAYS",
        "INQUIRIES",
        "RESERVATIONS",
        "SERVICES",
        "STAFF",
      ].sort(),
    );
  });

  it("has a REQUIRED_HEADERS entry for every sheet name", () => {
    Object.values(SHEET_NAMES).forEach((name) => {
      expect(REQUIRED_HEADERS[name]).toBeDefined();
      expect(REQUIRED_HEADERS[name].length).toBeGreaterThan(0);
    });
  });

  it("CONFIG has Key/Value/Description columns", () => {
    expect(CONFIG_HEADERS).toEqual(["Key", "Value", "Description"]);
  });

  it("HOLIDAYS has Date/Label columns", () => {
    expect(HOLIDAYS_HEADERS).toEqual(["Date", "Label"]);
  });

  it("RESERVATIONS includes the reservation ID and status columns", () => {
    expect(RESERVATIONS_HEADERS).toContain("ReservationID");
    expect(RESERVATIONS_HEADERS).toContain("Status");
    expect(RESERVATIONS_HEADERS).toContain("CancellationToken");
  });
});
```

- [ ] **Step 4: Run `npx jest tests/SheetSchemas.test.ts` from `apps/salon-portfolio/gas` and confirm it fails**

Expected: FAIL — `Cannot find module '../src/SheetNames'` (files don't exist until Step 1/2 are saved; if already saved, this step trivially passes — still run it to confirm no typo).

- [ ] **Step 5: Write `RowMapper.ts`**

```ts
/**
 * Pure header-mapping and row<->object helpers shared by every sheet
 * repository. Never touches SpreadsheetApp — fed plain arrays so it is
 * fully Jest-testable (Phase 0 §Q, Phase 3A §15/§16).
 */

export class MissingHeadersError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing required headers: ${missing.join(", ")}`);
    this.name = "MissingHeadersError";
  }
}

/** Maps header name -> zero-based column index, from a raw header row. */
export function buildHeaderMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, index) => {
    const key = String(cell).trim();
    if (key.length > 0) {
      map[key] = index;
    }
  });
  return map;
}

/** Throws MissingHeadersError listing every header in `required` that is
 *  absent from `headerMap` — fail clearly rather than write into the
 *  wrong column (Phase 3A §15). */
export function assertRequiredHeaders(
  headerMap: Record<string, number>,
  required: readonly string[],
): void {
  const missing = required.filter((header) => !(header in headerMap));
  if (missing.length > 0) {
    throw new MissingHeadersError(missing);
  }
}

/** Converts data rows (no header row) into plain objects keyed by header
 *  name, using only the columns named in `columns` — deterministic
 *  order, extra sheet columns are ignored. Throws MissingHeadersError if
 *  any required column is absent from the sheet's actual header row. */
export function rowsToObjects<T extends Record<string, unknown>>(
  headerMap: Record<string, number>,
  dataRows: unknown[][],
  columns: readonly string[],
): T[] {
  assertRequiredHeaders(headerMap, columns);
  return dataRows.map((row) => {
    const obj = {} as Record<string, unknown>;
    for (const column of columns) {
      const index = headerMap[column];
      obj[column] = row[index] ?? "";
    }
    return obj as T;
  });
}

/** Converts a plain object into a row array in `columns` order — the
 *  inverse of rowsToObjects. Empty/undefined/null values become ""
 *  (never "undefined" or "[object Object]"); non-primitive values throw
 *  so a caller must pre-format dates/objects into strings before this is
 *  called (Phase 3A §16). */
export function objectToRow(
  columns: readonly string[],
  obj: Record<string, unknown>,
): unknown[] {
  return columns.map((column) => {
    const value = obj[column];
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "object") {
      throw new TypeError(
        `objectToRow: column "${column}" holds a non-primitive value; format it to a string/number/boolean before serializing.`,
      );
    }
    return value;
  });
}
```

- [ ] **Step 6: Write `tests/RowMapper.test.ts`**

```ts
import {
  assertRequiredHeaders,
  buildHeaderMap,
  MissingHeadersError,
  objectToRow,
  rowsToObjects,
} from "../src/RowMapper";

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
```

- [ ] **Step 7: Run `npx jest tests/SheetSchemas.test.ts tests/RowMapper.test.ts` and confirm all tests pass**

Expected: PASS — both suites, all `it` blocks green.

- [ ] **Step 8: Commit**

```bash
git add apps/salon-portfolio/gas/src/SheetNames.ts apps/salon-portfolio/gas/src/SheetSchemas.ts apps/salon-portfolio/gas/src/RowMapper.ts apps/salon-portfolio/gas/tests/SheetSchemas.test.ts apps/salon-portfolio/gas/tests/RowMapper.test.ts
git commit -m "feat(gas): add sheet names, schemas, and pure row mapper"
```

---

## Task 2: Sheets.ts — thin Google Sheets data layer

**Files:**
- Create: `apps/salon-portfolio/gas/src/Sheets.ts`

**Interfaces:**
- Consumes: `SheetName` from `./SheetNames`; `buildHeaderMap` from `./RowMapper`.
- Produces: `getConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet`; `getSheet(name: SheetName): GoogleAppsScript.Spreadsheet.Sheet`; `getHeaderMap(sheet): Record<string, number>`; `readRawRows(sheet): unknown[][]`; `appendRow(sheet, row: unknown[]): void`; `updateRow(sheet, rowNumber: number, row: unknown[]): void`.

This module is a near-literal `SpreadsheetApp` wrapper (Phase 0 §T: "Sheets read/write adapter only ... no business rules, no validation") and is deliberately **not** unit tested by Jest — `SpreadsheetApp` does not exist outside the Apps Script runtime. It is covered by the manual verification steps in Task 12's documentation instead (Phase 0 §Q).

- [ ] **Step 1: Write `Sheets.ts`**

```ts
import { SheetName } from "./SheetNames";
import { buildHeaderMap } from "./RowMapper";

/**
 * Thin Google Sheets adapter (Phase 0 §T: "Sheets read/write adapter
 * only — no business rules, no validation"). Every function here is a
 * near-literal wrapper over SpreadsheetApp and is NOT unit tested by
 * Jest (Phase 0 §Q) — it is covered by the manual integration checklist
 * in docs/config-and-sheets-guide.md instead.
 *
 * This is a standalone Apps Script project (not bound to one specific
 * Spreadsheet), so a Web App request has no "active spreadsheet" —
 * the target spreadsheet is read from the SPREADSHEET_ID Script
 * Property instead of being hard-coded (Phase 3A §11).
 */

const SPREADSHEET_ID_PROPERTY = "SPREADSHEET_ID";

export function getConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id = PropertiesService.getScriptProperties().getProperty(
    SPREADSHEET_ID_PROPERTY,
  );
  if (!id) {
    throw new Error(
      `Script Property "${SPREADSHEET_ID_PROPERTY}" is not set. See docs/config-and-sheets-guide.md.`,
    );
  }
  return SpreadsheetApp.openById(id);
}

export function getSheet(
  name: SheetName,
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = getConfiguredSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet "${name}" was not found in the spreadsheet.`);
  }
  return sheet;
}

/** Returns the header row (row 1) as a header->column-index map. */
export function getHeaderMap(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): Record<string, number> {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return {};
  }
  const headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  return buildHeaderMap(headerRow);
}

/** Returns every data row (everything below the header row) as raw
 *  values — callers pass this into RowMapper.rowsToObjects. */
export function readRawRows(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): unknown[][] {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

/** Appends one row at the bottom of the sheet, in the exact column order
 *  given (build it with RowMapper.objectToRow). */
export function appendRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: unknown[],
): void {
  sheet.appendRow(row);
}

/** Overwrites one existing row (1-based sheet row number; the header row
 *  is row 1) with new values, in the exact column order given. */
export function updateRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rowNumber: number,
  row: unknown[],
): void {
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS — no errors (this file only uses ambient `GoogleAppsScript`/`PropertiesService`/`SpreadsheetApp` types already available via `@types/google-apps-script`, already a devDependency).

- [ ] **Step 3: Commit**

```bash
git add apps/salon-portfolio/gas/src/Sheets.ts
git commit -m "feat(gas): add thin Sheets.ts data-access adapter"
```

---

## Task 3: Timestamp helper and reservation ID generator

**Files:**
- Create: `apps/salon-portfolio/gas/src/Utils.ts`
- Create: `apps/salon-portfolio/gas/src/ids/ReservationId.ts` (replaces the empty `.gitkeep` scaffold)
- Test: `apps/salon-portfolio/gas/tests/Utils.test.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationId.test.ts`

**Interfaces:**
- Produces: `nowIso(clock?: () => Date): string`; `formatDateYYYYMMDDInTokyo(date: Date): string`; `RESERVATION_ID_PREFIX`; `generateRandomSuffix(random?: () => number): string`; `generateReservationId(now?: Date, random?: () => number): string`.

- [ ] **Step 1: Write the failing test `tests/Utils.test.ts`**

```ts
import { formatDateYYYYMMDDInTokyo, nowIso } from "../src/Utils";

describe("formatDateYYYYMMDDInTokyo", () => {
  it("formats a UTC instant that is still the previous day in Tokyo", () => {
    // 2026-01-01T14:59:00Z + 9h = 2026-01-01T23:59:00 JST
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-01-01T14:59:00.000Z")),
    ).toBe("20260101");
  });

  it("formats a UTC instant that has already rolled into the next Tokyo day", () => {
    // 2026-01-01T15:00:00Z + 9h = 2026-01-02T00:00:00 JST
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-01-01T15:00:00.000Z")),
    ).toBe("20260102");
  });

  it("zero-pads single-digit months and days", () => {
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-03-05T01:00:00.000Z")),
    ).toBe("20260305");
  });
});

describe("nowIso", () => {
  it("returns a valid ISO 8601 string from the injected clock", () => {
    const fixed = new Date("2026-06-01T00:00:00.000Z");
    const result = nowIso(() => fixed);
    expect(result).toBe("2026-06-01T00:00:00.000Z");
    expect(new Date(result).toISOString()).toBe(result);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts`
Expected: FAIL — `Cannot find module '../src/Utils'`.

- [ ] **Step 3: Write `Utils.ts`**

```ts
/**
 * Pure date/timezone helpers shared across the backend. The application
 * timezone is always Asia/Tokyo (Phase 0 §D) — never the server's local
 * timezone, never browser-locale-dependent formatting (Phase 3A §16/§18).
 *
 * Asia/Tokyo has used a fixed UTC+9 offset with no daylight saving since
 * 1951, so a plain offset is correct here (and avoids relying on `Intl`
 * timezone data, which is not guaranteed under this project's `ES2019`
 * lib target).
 */

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Current instant as an ISO 8601 UTC string — the canonical internal
 *  timestamp representation (Phase 3A §18). `clock` is injectable for
 *  deterministic tests. */
export function nowIso(clock: () => Date = () => new Date()): string {
  return clock().toISOString();
}

/** Formats a Date as YYYYMMDD in the Asia/Tokyo calendar day — used by
 *  ID generators (Phase 3A §17). */
export function formatDateYYYYMMDDInTokyo(date: Date): string {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoTime.getUTCFullYear();
  const month = String(tokyoTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tokyoTime.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test `tests/ReservationId.test.ts`**

```ts
import {
  RESERVATION_ID_PREFIX,
  generateRandomSuffix,
  generateReservationId,
} from "../src/ids/ReservationId";

describe("generateRandomSuffix", () => {
  it("is exactly six characters", () => {
    expect(generateRandomSuffix()).toHaveLength(6);
  });

  it("only uses uppercase letters and digits", () => {
    expect(generateRandomSuffix()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("uses the injected random source deterministically", () => {
    const values = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
    let i = 0;
    const random = () => values[i++];
    expect(generateRandomSuffix(random)).toBe(
      generateRandomSuffix((() => {
        let j = 0;
        return () => values[j++];
      })()),
    );
  });
});

describe("generateReservationId", () => {
  it("matches the RES-YYYYMMDD-XXXXXX format", () => {
    const id = generateReservationId(new Date("2026-09-10T01:00:00.000Z"));
    expect(id).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
  });

  it("uses the Asia/Tokyo date, not the UTC date", () => {
    // 2026-09-09T15:30:00Z = 2026-09-10T00:30:00 JST
    const id = generateReservationId(new Date("2026-09-09T15:30:00.000Z"));
    expect(id.startsWith(`${RESERVATION_ID_PREFIX}-20260910-`)).toBe(true);
  });

  it("is not sequential — two calls with different random sources produce different suffixes", () => {
    const now = new Date("2026-09-10T01:00:00.000Z");
    const idA = generateReservationId(now, () => 0.1);
    const idB = generateReservationId(now, () => 0.9);
    expect(idA).not.toBe(idB);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationId.test.ts`
Expected: FAIL — `Cannot find module '../src/ids/ReservationId'`.

- [ ] **Step 7: Write `ids/ReservationId.ts`** (delete the sibling `.gitkeep`)

```ts
import { formatDateYYYYMMDDInTokyo } from "../Utils";

/** Reservation ID prefix (Phase 0 §E Decision 4). */
export const RESERVATION_ID_PREFIX = "RES";

const ID_SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SUFFIX_LENGTH = 6;

/** Generates a random, non-sequential six-character alphanumeric suffix
 *  from an injectable random source (defaults to Math.random) — Phase 3A
 *  §17. Not cryptographically secure; adequate for this v1 scale
 *  (collision probability is negligible against a single salon's daily
 *  reservation volume). */
export function generateRandomSuffix(
  random: () => number = Math.random,
): string {
  let suffix = "";
  for (let i = 0; i < ID_SUFFIX_LENGTH; i++) {
    const index = Math.floor(random() * ID_SUFFIX_ALPHABET.length);
    suffix += ID_SUFFIX_ALPHABET[index];
  }
  return suffix;
}

/** Generates a reservation ID in the fixed `RES-YYYYMMDD-XXXXXX` format
 *  (Phase 0 §E Decision 4): the date portion is today's date in
 *  Asia/Tokyo, and the suffix is six random alphanumeric characters —
 *  never derived from a sheet row number, never sequential. `now` and
 *  `random` are injectable for deterministic tests (Phase 3A §17). Only
 *  the generator is implemented here — no reservation row is created by
 *  this module or anywhere else in Phase 3A. */
export function generateReservationId(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  const datePart = formatDateYYYYMMDDInTokyo(now);
  const suffix = generateRandomSuffix(random);
  return `${RESERVATION_ID_PREFIX}-${datePart}-${suffix}`;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts tests/ReservationId.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 9: Commit**

```bash
git add apps/salon-portfolio/gas/src/Utils.ts apps/salon-portfolio/gas/src/ids/ReservationId.ts apps/salon-portfolio/gas/tests/Utils.test.ts apps/salon-portfolio/gas/tests/ReservationId.test.ts
git rm apps/salon-portfolio/gas/src/ids/.gitkeep
git commit -m "feat(gas): add Asia/Tokyo timestamp helper and reservation ID generator"
```

---

## Task 4: Config domain types and pure parser

**Files:**
- Create: `apps/salon-portfolio/gas/src/models/Config.ts` (replaces the empty `.gitkeep` scaffold in `src/models/`)
- Create: `apps/salon-portfolio/gas/src/ConfigParser.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigParser.test.ts`

**Interfaces:**
- Produces (`models/Config.ts`): `BusinessHours`, `BUSINESS_HOURS_DAYS` (readonly 7-day tuple), `FeatureFlags`, `ReservationSettings`, `AppConfig`, `PublicConfig`, `RawConfigMap`.
- Produces (`ConfigParser.ts`): `ConfigFieldIssue { field: string; reason: string }`; `ConfigParseResult = { ok: true; config: AppConfig } | { ok: false; issues: ConfigFieldIssue[] }`; `buildRawConfigMap(rows: { Key: unknown; Value: unknown }[]): RawConfigMap`; `parseStrictBoolean(raw: unknown): boolean | undefined`; `parseStrictNumber(raw: unknown): number | undefined`; `parseNonEmptyString(raw: unknown): string | undefined`; `parseJsonSafely<T>(raw: unknown): T | undefined`; `parseAppConfig(rawConfig: RawConfigMap, holidayDates: string[]): ConfigParseResult`.

- [ ] **Step 1: Write `models/Config.ts`** (delete the sibling `.gitkeep`)

```ts
/**
 * Typed runtime configuration shape (Phase 0 spec §D). ConfigStore.ts
 * produces this from the CONFIG + HOLIDAYS sheets; Api.ts's `getConfig`
 * action returns a PublicConfig projection of it (§20/§V — calendarId
 * and the owner-facing email settings are never sent to the frontend).
 */

export interface BusinessHours {
  monday: string | "closed";
  tuesday: string | "closed";
  wednesday: string | "closed";
  thursday: string | "closed";
  friday: string | "closed";
  saturday: string | "closed";
  sunday: string | "closed";
}

export const BUSINESS_HOURS_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export interface FeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface ReservationSettings {
  timezone: "Asia/Tokyo";
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

export interface AppConfig {
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  hours: BusinessHours;
  holidays: string[];
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: ReservationSettings;
  /** Fallback/shared Calendar ID — internal only, never exposed via
   *  getConfig (Phase 3A §20). */
  calendarId: string;
  /** Internal only, never exposed via getConfig. */
  emailOwnerNotifyAddress: string;
  emailFromName: string;
}

/** The subset of AppConfig safe to return to the frontend (Phase 3A
 *  §20; matches the example response body in phase0-specification.md
 *  §H). Excludes calendarId and the owner-facing email settings. */
export type PublicConfig = Omit<
  AppConfig,
  "calendarId" | "emailOwnerNotifyAddress" | "emailFromName"
>;

/** Raw CONFIG-sheet values, keyed by the sheet's `Key` column, before
 *  type coercion. Values may already be native boolean/number if Google
 *  Sheets auto-typed the cell. */
export type RawConfigMap = Record<string, unknown>;
```

- [ ] **Step 2: Write the failing test `tests/ConfigParser.test.ts`**

```ts
import {
  buildRawConfigMap,
  parseAppConfig,
  parseJsonSafely,
  parseNonEmptyString,
  parseStrictBoolean,
  parseStrictNumber,
} from "../src/ConfigParser";

describe("buildRawConfigMap", () => {
  it("trims keys and keeps values as-is", () => {
    const map = buildRawConfigMap([
      { Key: " business.name ", Value: "Demo Salon" },
      { Key: "reservation.slotMinutes", Value: 30 },
    ]);
    expect(map).toEqual({
      "business.name": "Demo Salon",
      "reservation.slotMinutes": 30,
    });
  });

  it("first occurrence of a duplicate key wins", () => {
    const map = buildRawConfigMap([
      { Key: "calendar.id", Value: "first" },
      { Key: "calendar.id", Value: "second" },
    ]);
    expect(map["calendar.id"]).toBe("first");
  });

  it("ignores rows with an empty key", () => {
    const map = buildRawConfigMap([{ Key: "", Value: "ignored" }]);
    expect(map).toEqual({});
  });
});

describe("parseStrictBoolean", () => {
  it("accepts a native boolean", () => {
    expect(parseStrictBoolean(true)).toBe(true);
    expect(parseStrictBoolean(false)).toBe(false);
  });

  it("accepts the exact strings true/false, any case, trimmed", () => {
    expect(parseStrictBoolean(" TRUE ")).toBe(true);
    expect(parseStrictBoolean("false")).toBe(false);
  });

  it("rejects ambiguous values", () => {
    expect(parseStrictBoolean("yes")).toBeUndefined();
    expect(parseStrictBoolean("no")).toBeUndefined();
    expect(parseStrictBoolean("1")).toBeUndefined();
    expect(parseStrictBoolean("0")).toBeUndefined();
    expect(parseStrictBoolean("")).toBeUndefined();
  });
});

describe("parseStrictNumber", () => {
  it("accepts a native finite number", () => {
    expect(parseStrictNumber(30)).toBe(30);
  });

  it("accepts a strict numeric string", () => {
    expect(parseStrictNumber(" 60 ")).toBe(60);
    expect(parseStrictNumber("1.5")).toBe(1.5);
  });

  it("rejects non-numeric or malformed strings", () => {
    expect(parseStrictNumber("abc")).toBeUndefined();
    expect(parseStrictNumber("Infinity")).toBeUndefined();
    expect(parseStrictNumber("1,000")).toBeUndefined();
    expect(parseStrictNumber("")).toBeUndefined();
  });
});

describe("parseNonEmptyString", () => {
  it("trims and accepts a non-empty string", () => {
    expect(parseNonEmptyString("  Demo Salon  ")).toBe("Demo Salon");
  });

  it("treats whitespace-only and non-string values as missing", () => {
    expect(parseNonEmptyString("   ")).toBeUndefined();
    expect(parseNonEmptyString(undefined)).toBeUndefined();
    expect(parseNonEmptyString(42)).toBeUndefined();
  });
});

describe("parseJsonSafely", () => {
  it("parses valid JSON", () => {
    expect(parseJsonSafely<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns undefined for malformed JSON instead of throwing", () => {
    expect(parseJsonSafely("{not json")).toBeUndefined();
  });

  it("returns undefined for empty or non-string input", () => {
    expect(parseJsonSafely("")).toBeUndefined();
    expect(parseJsonSafely(undefined)).toBeUndefined();
  });
});

function validRawConfig(): Record<string, unknown> {
  return {
    "business.name": "Demo Salon",
    "business.phone": "03-0000-0000",
    "business.email": "owner@example.com",
    "business.address": "東京都千代田区1-1-1",
    "hours.monday": "10:00-19:00",
    "hours.tuesday": "10:00-19:00",
    "hours.wednesday": "10:00-19:00",
    "hours.thursday": "10:00-19:00",
    "hours.friday": "10:00-19:00",
    "hours.saturday": "10:00-18:00",
    "hours.sunday": "closed",
    "reservation.timezone": "Asia/Tokyo",
    "reservation.slotMinutes": 30,
    "reservation.minLeadHours": 1,
    "reservation.maxBookingDays": 60,
    "features.contactForm": true,
    "features.reservation": true,
    "features.staffSelection": true,
    "features.calendar": true,
    "features.emailNotification": true,
    "staff.anyAvailableOption": true,
    "calendar.id": "primary",
    "email.ownerNotifyAddress": "owner@example.com",
    "email.fromName": "Demo Salon",
  };
}

describe("parseAppConfig", () => {
  it("parses a complete, well-typed raw config", () => {
    const result = parseAppConfig(validRawConfig(), ["2026-01-01"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.name).toBe("Demo Salon");
      expect(result.config.reservation.slotMinutes).toBe(30);
      expect(result.config.holidays).toEqual(["2026-01-01"]);
      expect(result.config.features.staffSelection).toBe(true);
    }
  });

  it("reports every missing required key as an issue", () => {
    const raw = validRawConfig();
    delete raw["business.name"];
    delete raw["calendar.id"];
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.issues.map((issue) => issue.field);
      expect(fields).toContain("business.name");
      expect(fields).toContain("calendar.id");
    }
  });

  it("reports a malformed boolean as an issue instead of coercing it", () => {
    const raw = validRawConfig();
    raw["features.reservation"] = "yes";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: "features.reservation" }),
      );
    }
  });

  it("reports a malformed number as an issue instead of coercing it", () => {
    const raw = validRawConfig();
    raw["reservation.slotMinutes"] = "thirty";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: "reservation.slotMinutes" }),
      );
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigParser.test.ts`
Expected: FAIL — `Cannot find module '../src/ConfigParser'`.

- [ ] **Step 4: Write `ConfigParser.ts`**

```ts
import { AppConfig, BUSINESS_HOURS_DAYS, RawConfigMap } from "./models/Config";

/** One field-level parsing failure — used to build a single, stable
 *  CONFIG_INVALID error without ever repeating the raw sheet value back
 *  to the caller (Phase 3A §9). */
export interface ConfigFieldIssue {
  field: string;
  reason: string;
}

export type ConfigParseResult =
  | { ok: true; config: AppConfig }
  | { ok: false; issues: ConfigFieldIssue[] };

const BOOLEAN_PATTERN = /^(true|false)$/i;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/** Builds a Key -> raw Value map from CONFIG sheet data rows. Trims
 *  string keys; the first occurrence of a duplicate key wins (later
 *  duplicate rows are ignored) — deterministic per Phase 3A §7. */
export function buildRawConfigMap(
  rows: { Key: unknown; Value: unknown }[],
): RawConfigMap {
  const map: RawConfigMap = {};
  for (const row of rows) {
    const key = String(row.Key ?? "").trim();
    if (key.length === 0 || key in map) {
      continue;
    }
    map[key] = row.Value;
  }
  return map;
}

/** Parses a raw cell value into a strict boolean. Accepts a native
 *  boolean (Sheets auto-types TRUE/FALSE checkboxes) or the exact string
 *  "true"/"false" (any case), trimmed. Rejects "yes"/"no"/"1"/"0" and
 *  everything else (Phase 3A §7). */
export function parseStrictBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (BOOLEAN_PATTERN.test(trimmed)) {
      return trimmed.toLowerCase() === "true";
    }
  }
  return undefined;
}

/** Parses a raw cell value into a finite number. Accepts a native number
 *  or a string matching a strict decimal pattern (no "Infinity", no hex,
 *  no thousands separators) — Phase 3A §7. */
export function parseStrictNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (NUMBER_PATTERN.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return undefined;
}

/** Parses a raw cell value as a trimmed, non-empty string. A missing key
 *  (undefined) and a whitespace-only string both resolve to undefined
 *  here — callers report both as the same "required field missing"
 *  issue (Phase 3A §7). */
export function parseNonEmptyString(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Generic safe JSON parser — reusable for a future vertical/CONFIG key
 *  that does need a JSON-shaped value. Project 1's CONFIG has no JSON
 *  fields today (business hours and holidays use discrete keys / their
 *  own sheet, per phase0-specification.md §C/§D), but this stays as a
 *  generic parsing primitive per the Phase 3A reusability requirement
 *  (§33). Never throws. */
export function parseJsonSafely<T>(raw: unknown): T | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Pure CONFIG parser: raw Key/Value map + HOLIDAYS date strings -> typed
 *  AppConfig, or a list of field-level issues. Never throws — malformed
 *  input always produces `{ ok: false }`, never a partially-built,
 *  dangerous config object (Phase 3A §7). This checks *type* correctness
 *  and presence only; semantic/range/logical-combination checks live in
 *  ConfigValidator.ts. */
export function parseAppConfig(
  rawConfig: RawConfigMap,
  holidayDates: string[],
): ConfigParseResult {
  const issues: ConfigFieldIssue[] = [];

  const requireString = (key: string): string => {
    const value = parseNonEmptyString(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "missing or empty string" });
      return "";
    }
    return value;
  };

  const requireBoolean = (key: string): boolean => {
    const value = parseStrictBoolean(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "must be boolean true/false" });
      return false;
    }
    return value;
  };

  const requireNumber = (key: string): number => {
    const value = parseStrictNumber(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "must be a number" });
      return 0;
    }
    return value;
  };

  const business = {
    name: requireString("business.name"),
    phone: requireString("business.phone"),
    email: requireString("business.email"),
    address: requireString("business.address"),
  };

  const hours = {} as AppConfig["hours"];
  for (const day of BUSINESS_HOURS_DAYS) {
    const key = `hours.${day}`;
    const raw = parseNonEmptyString(rawConfig[key]);
    if (raw === undefined) {
      issues.push({ field: key, reason: "missing or empty string" });
    }
    hours[day] = (raw ?? "closed") as AppConfig["hours"][typeof day];
  }

  const reservation: AppConfig["reservation"] = {
    timezone: "Asia/Tokyo",
    slotMinutes: requireNumber("reservation.slotMinutes"),
    minLeadHours: requireNumber("reservation.minLeadHours"),
    maxBookingDays: requireNumber("reservation.maxBookingDays"),
  };
  requireString("reservation.timezone");

  const features: AppConfig["features"] = {
    contactForm: requireBoolean("features.contactForm"),
    reservation: requireBoolean("features.reservation"),
    staffSelection: requireBoolean("features.staffSelection"),
    calendar: requireBoolean("features.calendar"),
    emailNotification: requireBoolean("features.emailNotification"),
  };

  const staffAnyAvailableOption = requireBoolean("staff.anyAvailableOption");
  const calendarId = requireString("calendar.id");
  const emailOwnerNotifyAddress = requireString("email.ownerNotifyAddress");
  const emailFromName = requireString("email.fromName");

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      business,
      hours,
      holidays: holidayDates,
      features,
      staffAnyAvailableOption,
      reservation,
      calendarId,
      emailOwnerNotifyAddress,
      emailFromName,
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigParser.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 6: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/salon-portfolio/gas/src/models/Config.ts apps/salon-portfolio/gas/src/ConfigParser.ts apps/salon-portfolio/gas/tests/ConfigParser.test.ts
git rm apps/salon-portfolio/gas/src/models/.gitkeep
git commit -m "feat(gas): add AppConfig types and pure CONFIG parser"
```

---

## Task 5: Config validator (semantic/business-rule checks)

**Files:**
- Create: `apps/salon-portfolio/gas/src/ConfigValidator.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigValidator.test.ts`

**Interfaces:**
- Consumes: `AppConfig`, `BUSINESS_HOURS_DAYS` from `./models/Config`.
- Produces: `ConfigValidationIssue { field: string; reason: string }`; `validateAppConfig(config: AppConfig): ConfigValidationIssue[]` (empty array = valid).

- [ ] **Step 1: Write the failing test `tests/ConfigValidator.test.ts`**

```ts
import { AppConfig } from "../src/models/Config";
import { validateAppConfig } from "../src/ConfigValidator";

function validConfig(): AppConfig {
  return {
    business: {
      name: "Demo Salon",
      phone: "03-0000-0000",
      email: "owner@example.com",
      address: "東京都千代田区1-1-1",
    },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-18:00",
      sunday: "closed",
    },
    holidays: ["2026-01-01", "2026-01-02"],
    features: {
      contactForm: true,
      reservation: true,
      staffSelection: true,
      calendar: true,
      emailNotification: true,
    },
    staffAnyAvailableOption: true,
    reservation: {
      timezone: "Asia/Tokyo",
      slotMinutes: 30,
      minLeadHours: 1,
      maxBookingDays: 60,
    },
    calendarId: "primary",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo Salon",
  };
}

describe("validateAppConfig", () => {
  it("returns no issues for a fully valid config", () => {
    expect(validateAppConfig(validConfig())).toEqual([]);
  });

  it("rejects a timezone other than Asia/Tokyo", () => {
    const config = validConfig();
    // @ts-expect-error — deliberately invalid for this test
    config.reservation.timezone = "UTC";
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "reservation.timezone" }),
    );
  });

  it("rejects a negative minLeadHours", () => {
    const config = validConfig();
    config.reservation.minLeadHours = -1;
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "reservation.minLeadHours" }),
    );
  });

  it("rejects a non-positive slotMinutes or maxBookingDays", () => {
    const config = validConfig();
    config.reservation.slotMinutes = 0;
    config.reservation.maxBookingDays = 0;
    const issues = validateAppConfig(config);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "reservation.slotMinutes" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "reservation.maxBookingDays" }),
    );
  });

  it("rejects malformed business hours", () => {
    const config = validConfig();
    config.hours.monday = "not-a-range";
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "hours.monday" }),
    );
  });

  it("rejects an invalid holiday date", () => {
    const config = validConfig();
    config.holidays = ["2026-02-30"];
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "holidays" }),
    );
  });

  it("rejects a malformed business or owner-notification email", () => {
    const config = validConfig();
    config.business.email = "not-an-email";
    config.emailOwnerNotifyAddress = "also-not-an-email";
    const issues = validateAppConfig(config);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "business.email" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "email.ownerNotifyAddress" }),
    );
  });

  it("rejects staff.anyAvailableOption=true when features.staffSelection is false", () => {
    const config = validConfig();
    config.features.staffSelection = false;
    config.staffAnyAvailableOption = true;
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "staff.anyAvailableOption" }),
    );
  });

  it("allows staff.anyAvailableOption=false when features.staffSelection is false", () => {
    const config = validConfig();
    config.features.staffSelection = false;
    config.staffAnyAvailableOption = false;
    expect(validateAppConfig(config)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigValidator.test.ts`
Expected: FAIL — `Cannot find module '../src/ConfigValidator'`.

- [ ] **Step 3: Write `ConfigValidator.ts`**

```ts
import { AppConfig, BUSINESS_HOURS_DAYS } from "./models/Config";

export interface ConfigValidationIssue {
  field: string;
  reason: string;
}

const HOURS_PATTERN = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidCalendarDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidBusinessHoursValue(value: string): boolean {
  return value === "closed" || HOURS_PATTERN.test(value);
}

/** Pure semantic validation of an already-type-correct AppConfig
 *  (Phase 3A §8). Returns an empty array when valid. Never throws — the
 *  goal is a predictable, enumerable failure list, not an exception. */
export function validateAppConfig(config: AppConfig): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  if (config.reservation.timezone !== "Asia/Tokyo") {
    issues.push({
      field: "reservation.timezone",
      reason: 'must be exactly "Asia/Tokyo"',
    });
  }
  if (config.reservation.slotMinutes <= 0) {
    issues.push({
      field: "reservation.slotMinutes",
      reason: "must be a positive number of minutes",
    });
  }
  if (config.reservation.minLeadHours < 0) {
    issues.push({
      field: "reservation.minLeadHours",
      reason: "must not be negative",
    });
  }
  if (config.reservation.maxBookingDays <= 0) {
    issues.push({
      field: "reservation.maxBookingDays",
      reason: "must be a positive number of days",
    });
  }

  for (const day of BUSINESS_HOURS_DAYS) {
    const value = config.hours[day];
    if (!isValidBusinessHoursValue(value)) {
      issues.push({
        field: `hours.${day}`,
        reason: 'must be "closed" or "HH:MM-HH:MM"',
      });
    }
  }

  for (const holiday of config.holidays) {
    if (!DATE_PATTERN.test(holiday) || !isValidCalendarDate(holiday)) {
      issues.push({ field: "holidays", reason: `invalid date "${holiday}"` });
    }
  }

  if (!EMAIL_PATTERN.test(config.business.email)) {
    issues.push({
      field: "business.email",
      reason: "must be a valid email address",
    });
  }
  if (!EMAIL_PATTERN.test(config.emailOwnerNotifyAddress)) {
    issues.push({
      field: "email.ownerNotifyAddress",
      reason: "must be a valid email address",
    });
  }

  if (config.calendarId.length === 0) {
    issues.push({ field: "calendar.id", reason: "must not be empty" });
  }

  // Logically invalid combination (Phase 3A §8): "any available staff"
  // only makes sense when staff selection itself is offered.
  if (config.staffAnyAvailableOption && !config.features.staffSelection) {
    issues.push({
      field: "staff.anyAvailableOption",
      reason: "cannot be true while features.staffSelection is false",
    });
  }

  return issues;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigValidator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/ConfigValidator.ts apps/salon-portfolio/gas/tests/ConfigValidator.test.ts
git commit -m "feat(gas): add pure CONFIG business-rule validator"
```

---

## Task 6: Public configuration projection

**Files:**
- Create: `apps/salon-portfolio/gas/src/PublicConfig.ts`
- Test: `apps/salon-portfolio/gas/tests/PublicConfig.test.ts`

**Interfaces:**
- Consumes: `AppConfig`, `PublicConfig` from `./models/Config`.
- Produces: `buildPublicConfig(config: AppConfig): PublicConfig`.

- [ ] **Step 1: Write the failing test `tests/PublicConfig.test.ts`**

```ts
import { AppConfig } from "../src/models/Config";
import { buildPublicConfig } from "../src/PublicConfig";

function fullConfig(): AppConfig {
  return {
    business: {
      name: "Demo Salon",
      phone: "03-0000-0000",
      email: "owner@example.com",
      address: "東京都千代田区1-1-1",
    },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-18:00",
      sunday: "closed",
    },
    holidays: ["2026-01-01"],
    features: {
      contactForm: true,
      reservation: true,
      staffSelection: true,
      calendar: true,
      emailNotification: true,
    },
    staffAnyAvailableOption: true,
    reservation: {
      timezone: "Asia/Tokyo",
      slotMinutes: 30,
      minLeadHours: 1,
      maxBookingDays: 60,
    },
    calendarId: "secret-calendar-id@group.calendar.google.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo Salon",
  };
}

describe("buildPublicConfig", () => {
  it("keeps every public field", () => {
    const result = buildPublicConfig(fullConfig());
    expect(result.business.name).toBe("Demo Salon");
    expect(result.hours.sunday).toBe("closed");
    expect(result.holidays).toEqual(["2026-01-01"]);
    expect(result.features.staffSelection).toBe(true);
    expect(result.staffAnyAvailableOption).toBe(true);
    expect(result.reservation.slotMinutes).toBe(30);
  });

  it("never includes calendarId or the owner-facing email settings", () => {
    const result = buildPublicConfig(fullConfig());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret-calendar-id");
    expect(result).not.toHaveProperty("calendarId");
    expect(result).not.toHaveProperty("emailOwnerNotifyAddress");
    expect(result).not.toHaveProperty("emailFromName");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/PublicConfig.test.ts`
Expected: FAIL — `Cannot find module '../src/PublicConfig'`.

- [ ] **Step 3: Write `PublicConfig.ts`**

```ts
import { AppConfig, PublicConfig } from "./models/Config";

/** Strips internal-only fields before a config is ever sent to the
 *  frontend (Phase 3A §20). calendarId and the owner-facing email
 *  settings must never appear in a getConfig response. */
export function buildPublicConfig(config: AppConfig): PublicConfig {
  return {
    business: config.business,
    hours: config.hours,
    holidays: config.holidays,
    features: config.features,
    staffAnyAvailableOption: config.staffAnyAvailableOption,
    reservation: config.reservation,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/PublicConfig.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/PublicConfig.ts apps/salon-portfolio/gas/tests/PublicConfig.test.ts
git commit -m "feat(gas): add public/private CONFIG projection"
```

---

## Task 7: ConfigStore repository

**Files:**
- Create: `apps/salon-portfolio/gas/src/ConfigStore.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigStore.test.ts`

**Interfaces:**
- Consumes: `SHEET_NAMES` from `./SheetNames`; `CONFIG_HEADERS`, `HOLIDAYS_HEADERS`, `ConfigRow`, `HolidayRow` from `./SheetSchemas`; `getHeaderMap`, `getSheet`, `readRawRows` from `./Sheets`; `rowsToObjects` from `./RowMapper`; `buildRawConfigMap`, `parseAppConfig`, `ConfigFieldIssue` from `./ConfigParser`; `validateAppConfig`, `ConfigValidationIssue` from `./ConfigValidator`; `AppConfig` from `./models/Config`.
- Produces: `class ConfigError extends Error { issues: (ConfigFieldIssue | ConfigValidationIssue)[] }`; `buildAppConfigFromRawRows(configRows: ConfigRow[], holidayDates: string[]): AppConfig` (pure, throws `ConfigError`); `getConfig(): AppConfig` (thin, touches `SpreadsheetApp` via `Sheets.ts`).

- [ ] **Step 1: Write the failing test `tests/ConfigStore.test.ts`**

```ts
import { ConfigRow } from "../src/SheetSchemas";
import { buildAppConfigFromRawRows, ConfigError } from "../src/ConfigStore";

function validConfigRows(): ConfigRow[] {
  return [
    { Key: "business.name", Value: "Demo Salon", Description: "店舗名" },
    { Key: "business.phone", Value: "03-0000-0000", Description: "電話番号" },
    { Key: "business.email", Value: "owner@example.com", Description: "店舗メール" },
    { Key: "business.address", Value: "東京都千代田区1-1-1", Description: "住所" },
    { Key: "hours.monday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.tuesday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.wednesday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.thursday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.friday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.saturday", Value: "10:00-18:00", Description: "" },
    { Key: "hours.sunday", Value: "closed", Description: "" },
    { Key: "reservation.timezone", Value: "Asia/Tokyo", Description: "" },
    { Key: "reservation.slotMinutes", Value: 30, Description: "" },
    { Key: "reservation.minLeadHours", Value: 1, Description: "" },
    { Key: "reservation.maxBookingDays", Value: 60, Description: "" },
    { Key: "features.contactForm", Value: true, Description: "" },
    { Key: "features.reservation", Value: true, Description: "" },
    { Key: "features.staffSelection", Value: true, Description: "" },
    { Key: "features.calendar", Value: true, Description: "" },
    { Key: "features.emailNotification", Value: true, Description: "" },
    { Key: "staff.anyAvailableOption", Value: true, Description: "" },
    { Key: "calendar.id", Value: "primary", Description: "" },
    { Key: "email.ownerNotifyAddress", Value: "owner@example.com", Description: "" },
    { Key: "email.fromName", Value: "Demo Salon", Description: "" },
  ];
}

describe("buildAppConfigFromRawRows", () => {
  it("builds a valid AppConfig from valid rows", () => {
    const config = buildAppConfigFromRawRows(validConfigRows(), ["2026-01-01"]);
    expect(config.business.name).toBe("Demo Salon");
    expect(config.holidays).toEqual(["2026-01-01"]);
  });

  it("throws ConfigError when a required key is missing (parse-level)", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "calendar.id");
    expect(() => buildAppConfigFromRawRows(rows, [])).toThrow(ConfigError);
  });

  it("throws ConfigError carrying the field issues, for server-side logging only", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "calendar.id");
    try {
      buildAppConfigFromRawRows(rows, []);
      throw new Error("expected buildAppConfigFromRawRows to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toContainEqual(
        expect.objectContaining({ field: "calendar.id" }),
      );
    }
  });

  it("throws ConfigError when a value is well-typed but semantically invalid (validation-level)", () => {
    const rows = validConfigRows().map((row) =>
      row.Key === "reservation.slotMinutes" ? { ...row, Value: -5 } : row,
    );
    expect(() => buildAppConfigFromRawRows(rows, [])).toThrow(ConfigError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigStore.test.ts`
Expected: FAIL — `Cannot find module '../src/ConfigStore'`.

- [ ] **Step 3: Write `ConfigStore.ts`**

```ts
import { SHEET_NAMES } from "./SheetNames";
import {
  CONFIG_HEADERS,
  ConfigRow,
  HOLIDAYS_HEADERS,
  HolidayRow,
} from "./SheetSchemas";
import { getHeaderMap, getSheet, readRawRows } from "./Sheets";
import { rowsToObjects } from "./RowMapper";
import {
  buildRawConfigMap,
  ConfigFieldIssue,
  parseAppConfig,
} from "./ConfigParser";
import { ConfigValidationIssue, validateAppConfig } from "./ConfigValidator";
import { AppConfig } from "./models/Config";

/** Thrown whenever CONFIG/HOLIDAYS data fails parsing or validation.
 *  `issues` is for server-side diagnostics only (console.error) — Api.ts
 *  must never forward it to the client (Phase 3A §9). */
export class ConfigError extends Error {
  constructor(
    public readonly issues: (ConfigFieldIssue | ConfigValidationIssue)[],
  ) {
    super("CONFIG_INVALID");
    this.name = "ConfigError";
  }
}

/** Pure core of the repository: given already-read raw CONFIG rows and
 *  HOLIDAYS date strings, parses and validates them into an AppConfig or
 *  throws ConfigError. Fed plain arrays in tests — never touches
 *  SpreadsheetApp (Phase 0 §Q, Phase 3A §26). */
export function buildAppConfigFromRawRows(
  configRows: ConfigRow[],
  holidayDates: string[],
): AppConfig {
  const rawMap = buildRawConfigMap(
    configRows.map((row) => ({ Key: row.Key, Value: row.Value })),
  );
  const parseResult = parseAppConfig(rawMap, holidayDates);
  if (!parseResult.ok) {
    throw new ConfigError(parseResult.issues);
  }
  const validationIssues = validateAppConfig(parseResult.config);
  if (validationIssues.length > 0) {
    throw new ConfigError(validationIssues);
  }
  return parseResult.config;
}

/** Reads CONFIG + HOLIDAYS from the real spreadsheet and returns the
 *  typed AppConfig. Thin orchestration only — not unit tested by Jest;
 *  buildAppConfigFromRawRows above carries all the tested logic (Phase 0
 *  §Q: "ConfigStore's parsing logic fed a plain 2D array ... not a real
 *  Sheet"). */
export function getConfig(): AppConfig {
  const configSheet = getSheet(SHEET_NAMES.CONFIG);
  const configHeaderMap = getHeaderMap(configSheet);
  const configRows = rowsToObjects<ConfigRow>(
    configHeaderMap,
    readRawRows(configSheet),
    CONFIG_HEADERS,
  );

  const holidaysSheet = getSheet(SHEET_NAMES.HOLIDAYS);
  const holidaysHeaderMap = getHeaderMap(holidaysSheet);
  const holidayRows = rowsToObjects<HolidayRow>(
    holidaysHeaderMap,
    readRawRows(holidaysSheet),
    HOLIDAYS_HEADERS,
  );
  const holidayDates = holidayRows
    .map((row) => String(row.Date ?? "").trim())
    .filter((date) => date.length > 0);

  return buildAppConfigFromRawRows(configRows, holidayDates);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/salon-portfolio/gas/src/ConfigStore.ts apps/salon-portfolio/gas/tests/ConfigStore.test.ts
git commit -m "feat(gas): add ConfigStore repository tying Sheets + parser + validator together"
```

---

## Task 8: API envelope, error codes, and the `getConfig` dispatcher

**Files:**
- Create: `apps/salon-portfolio/gas/src/models/ErrorCodes.ts`
- Create: `apps/salon-portfolio/gas/src/models/Api.ts`
- Create: `apps/salon-portfolio/gas/src/Api.ts`
- Test: `apps/salon-portfolio/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: `ConfigError`, `getConfig` from `./ConfigStore`; `buildPublicConfig` from `./PublicConfig`; `PublicConfig` from `./models/Config`.
- Produces (`models/ErrorCodes.ts`): `ERROR_CODES` const (10 codes from phase0-specification.md §H plus `CONFIG_INVALID`), `ErrorCode` type.
- Produces (`models/Api.ts`): `ApiRequest { action: string; payload?: unknown }`; `ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }`.
- Produces (`Api.ts`): `parseApiRequest(rawBody: string | undefined)`; `buildSuccessResponse<T>(data: T): ApiResponse<T>`; `buildErrorResponse(code, message): ApiResponse<never>`; `mapConfigErrorToResponse(error: ConfigError): ApiResponse<never>`; `getConfigAction(): ApiResponse<PublicConfig>`; `handleApiRequest(rawBody: string | undefined): ApiResponse`.

- [ ] **Step 1: Write `models/ErrorCodes.ts`**

```ts
/**
 * Application-level API error codes (Phase 0 §H, extended per Phase 3A
 * §9 with CONFIG_INVALID — the code list is documented there as
 * "extensible"). Every code maps to a fixed, safe-to-show Japanese
 * message in Api.ts — never a raw exception message.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  INVALID_CANCELLATION_TOKEN: "INVALID_CANCELLATION_TOKEN",
  SYSTEM_BUSY: "SYSTEM_BUSY",
  CALENDAR_ERROR: "CALENDAR_ERROR",
  SHEET_ERROR: "SHEET_ERROR",
  MAIL_ERROR: "MAIL_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Phase 3A addition: CONFIG sheet data failed parsing/validation. */
  CONFIG_INVALID: "CONFIG_INVALID",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

- [ ] **Step 2: Write `models/Api.ts`**

```ts
import { ErrorCode } from "./ErrorCodes";

/** Shared request/response envelope for every action (Phase 0 §H). */
export interface ApiRequest {
  action: string;
  payload?: unknown;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

- [ ] **Step 3: Write the failing test `tests/Api.test.ts`**

```ts
import {
  buildErrorResponse,
  buildSuccessResponse,
  handleApiRequest,
  mapConfigErrorToResponse,
  parseApiRequest,
} from "../src/Api";
import { ConfigError } from "../src/ConfigStore";
import { ERROR_CODES } from "../src/models/ErrorCodes";

describe("parseApiRequest", () => {
  it("parses a well-formed request", () => {
    const result = parseApiRequest('{"action":"getConfig","payload":{}}');
    expect(result).toEqual({
      ok: true,
      request: { action: "getConfig", payload: {} },
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
    expect(buildSuccessResponse({ a: 1 })).toEqual({
      ok: true,
      data: { a: 1 },
    });
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
    const error = new ConfigError([
      { field: "calendar.id", reason: "missing or empty string" },
    ]);
    const response = mapConfigErrorToResponse(error);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("calendar.id");
      expect(serialized).not.toContain("missing or empty string");
    }
  });
});

describe("handleApiRequest dispatch", () => {
  it("returns VALIDATION_ERROR for malformed request bodies", () => {
    const response = handleApiRequest("{not json");
    expect(response).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is not valid JSON.",
      },
    });
  });

  it("returns VALIDATION_ERROR for an unsupported action name", () => {
    const response = handleApiRequest('{"action":"deleteEverything"}');
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("VALIDATION_ERROR");
      expect(response.error.message).toContain("deleteEverything");
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Api.test.ts`
Expected: FAIL — `Cannot find module '../src/Api'`.

- [ ] **Step 5: Write `Api.ts`**

```ts
import { ApiRequest, ApiResponse } from "./models/Api";
import { ERROR_CODES, ErrorCode } from "./models/ErrorCodes";
import { ConfigError, getConfig } from "./ConfigStore";
import { buildPublicConfig } from "./PublicConfig";
import { PublicConfig } from "./models/Config";

/** Parses and shape-checks the raw POST body. Pure — never touches GAS
 *  globals — so the dispatch logic is Jest-testable independent of
 *  Sheets access (Decision 3: no DI seam manufactured — this is a plain
 *  function over a plain string, not an injected interface). */
export function parseApiRequest(
  rawBody: string | undefined,
): { ok: true; request: ApiRequest } | { ok: false; message: string } {
  if (!rawBody || rawBody.trim().length === 0) {
    return { ok: false, message: "Request body is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, message: "Request body is not valid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as { action?: unknown }).action !== "string" ||
    (parsed as { action: string }).action.trim().length === 0
  ) {
    return {
      ok: false,
      message: 'Request body must include a non-empty "action" field.',
    };
  }
  return { ok: true, request: parsed as ApiRequest };
}

export function buildSuccessResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function buildErrorResponse(
  code: ErrorCode,
  message: string,
): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}

/** Maps a caught ConfigError to the stable public error contract — never
 *  forwards `issues` (server-side diagnostic detail only) to the caller
 *  (Phase 3A §9). The issues are logged to the execution transcript
 *  (Phase 0 §O layer 1) for the developer to inspect manually; ERROR_LOG
 *  sheet persistence is Phase 3B+ (Phase 3A §34: establish the schema,
 *  don't wire every function into it yet). */
export function mapConfigErrorToResponse(
  error: ConfigError,
): ApiResponse<never> {
  console.error("[getConfig] CONFIG_INVALID:", JSON.stringify(error.issues));
  return buildErrorResponse(
    ERROR_CODES.CONFIG_INVALID,
    "設定情報の読み込みに失敗しました。管理者にお問い合わせください。",
  );
}

/** `getConfig` action handler (Phase 0 §G/§H, Phase 3A §19). Thin: reads
 *  real CONFIG/HOLIDAYS sheets via ConfigStore, maps to the public
 *  projection, and translates a ConfigError into the stable error
 *  envelope. Not unit tested directly (it touches SpreadsheetApp through
 *  ConfigStore.getConfig) — ConfigStore's own parsing/validation logic
 *  and mapConfigErrorToResponse above carry the tested behavior. */
export function getConfigAction(): ApiResponse<PublicConfig> {
  try {
    const config = getConfig();
    return buildSuccessResponse(buildPublicConfig(config));
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    console.error("[getConfig] unexpected error:", error);
    return buildErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "サーバーエラーが発生しました。",
    );
  }
}

/** Single POST entrypoint's dispatch logic (Phase 0 §G: "all actions
 *  share one endpoint, routed by an `action` field"). Only `getConfig`
 *  is implemented in Phase 3A (§2 scope rule) — every other action name
 *  is rejected as a validation error; there is nothing else to route to
 *  yet (getServices/getStaff/createReservation/etc. are Phase 3B+). */
export function handleApiRequest(rawBody: string | undefined): ApiResponse {
  const parsed = parseApiRequest(rawBody);
  if (!parsed.ok) {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, parsed.message);
  }
  switch (parsed.request.action) {
    case "getConfig":
      return getConfigAction();
    default:
      return buildErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported action: "${parsed.request.action}".`,
      );
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Api.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/salon-portfolio/gas/src/models/ErrorCodes.ts apps/salon-portfolio/gas/src/models/Api.ts apps/salon-portfolio/gas/src/Api.ts apps/salon-portfolio/gas/tests/Api.test.ts
git commit -m "feat(gas): add API envelope, error codes, and getConfig dispatcher"
```

---

## Task 9: Wire `doPost` to the dispatcher

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Code.ts`

**Interfaces:**
- Consumes: `handleApiRequest` from `./Api`.
- Produces: unchanged `doGet`/`doPost` global signatures (still attached to `globalThis` for the bundled IIFE, per the existing Phase 1 pattern).

Code.ts stays entrypoint-only (Phase 0 §B/§T): it extracts the raw POST body and hands it straight to `Api.ts`; it contains no parsing, routing, or business logic of its own. `doGet` is untouched — it remains the Phase 1 liveness check, unrelated to action dispatch (Phase 3A explicitly scopes only the `getConfig` action into `doPost`; `healthCheck` as an action is deferred).

- [ ] **Step 1: Replace the full contents of `Code.ts`**

```ts
import { getHealthStatus } from "./Health";
import { handleApiRequest } from "./Api";

/**
 * doGet/doPost entrypoints only — per the module boundary in the Phase 0
 * spec (§B/§T), Code.ts must not contain routing, validation, or any
 * business logic itself. doPost only extracts the raw request body and
 * hands it to Api.ts's handleApiRequest, which owns the action dispatch
 * (Phase 3A implements only the "getConfig" action; every other action
 * name currently returns a VALIDATION_ERROR — see Api.ts).
 */
function doGet(): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: getHealthStatus() }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(
  e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  const rawBody = e?.postData?.contents;
  const response = handleApiRequest(rawBody);
  return ContentService.createTextOutput(
    JSON.stringify(response),
  ).setMimeType(ContentService.MimeType.JSON);
}

// esbuild bundles this file into an IIFE (see esbuild.config.js), so
// top-level function declarations are not visible to the Apps Script
// trigger runtime unless explicitly attached to the real global object.
(globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }).doGet =
  doGet;
(
  globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }
).doPost = doPost;
```

- [ ] **Step 2: Confirm the existing Health test still passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Health.test.ts`
Expected: PASS — unaffected, since `getHealthStatus` itself is untouched.

- [ ] **Step 3: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `cd apps/salon-portfolio/gas && npm run build`
Expected: PASS — `build/Code.js` is regenerated; `grep -c "doGet\|doPost" build/Code.js` shows both names still present in the bundle (esbuild inlines `Api.ts`/`ConfigStore.ts`/etc. into the single IIFE).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/Code.ts
git commit -m "feat(gas): route doPost through the Api.ts action dispatcher"
```

---

## Task 10: Demo seed data and safe setup utility

**Files:**
- Create: `apps/salon-portfolio/gas/src/DemoSeed.ts`
- Create: `apps/salon-portfolio/gas/src/SetupDemoSheets.ts`
- Modify: `apps/salon-portfolio/gas/src/Code.ts`
- Test: `apps/salon-portfolio/gas/tests/DemoSeed.test.ts`

**Interfaces:**
- Consumes: `SHEET_NAMES`, `SheetName` from `./SheetNames`; every `*_HEADERS` constant and `REQUIRED_HEADERS` from `./SheetSchemas`; `getConfiguredSpreadsheet` from `./Sheets`; `buildAppConfigFromRawRows` from `./ConfigStore` (test only).
- Produces: `DemoSheetSeed { name: SheetName; headers: readonly string[]; rows: unknown[][] }`; `DEMO_SHEETS: DemoSheetSeed[]`; `setupDemoSheets(): string[]` (GAS-touching, manual-run only, never called from `doGet`/`doPost`).

- [ ] **Step 1: Write the failing test `tests/DemoSeed.test.ts`**

```ts
import { SHEET_NAMES } from "../src/SheetNames";
import { REQUIRED_HEADERS } from "../src/SheetSchemas";
import { DEMO_SHEETS } from "../src/DemoSeed";
import { buildAppConfigFromRawRows } from "../src/ConfigStore";
import { ConfigRow, HolidayRow } from "../src/SheetSchemas";

describe("DEMO_SHEETS", () => {
  it("covers every canonical sheet name exactly once", () => {
    const names = DEMO_SHEETS.map((seed) => seed.name).sort();
    expect(names).toEqual(Object.values(SHEET_NAMES).sort());
  });

  it("each seed's headers match that sheet's REQUIRED_HEADERS", () => {
    DEMO_SHEETS.forEach((seed) => {
      expect(seed.headers).toEqual(REQUIRED_HEADERS[seed.name]);
    });
  });

  it("every demo row has exactly as many cells as there are headers", () => {
    DEMO_SHEETS.forEach((seed) => {
      seed.rows.forEach((row) => {
        expect(row).toHaveLength(seed.headers.length);
      });
    });
  });

  it("transactional sheets (RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG, ERROR_LOG) get no fabricated rows", () => {
    const transactional = [
      SHEET_NAMES.RESERVATIONS,
      SHEET_NAMES.CANCELLATION_REQUESTS,
      SHEET_NAMES.INQUIRIES,
      SHEET_NAMES.EMAIL_LOG,
      SHEET_NAMES.ERROR_LOG,
    ];
    DEMO_SHEETS.filter((seed) => transactional.includes(seed.name)).forEach(
      (seed) => {
        expect(seed.rows).toEqual([]);
      },
    );
  });

  it("the CONFIG demo rows produce a valid AppConfig end-to-end", () => {
    const configSeed = DEMO_SHEETS.find((s) => s.name === SHEET_NAMES.CONFIG)!;
    const holidaysSeed = DEMO_SHEETS.find(
      (s) => s.name === SHEET_NAMES.HOLIDAYS,
    )!;
    const configRows: ConfigRow[] = configSeed.rows.map((row) => ({
      Key: row[0],
      Value: row[1],
      Description: row[2],
    }));
    const holidayDates = holidaysSeed.rows.map((row) => String(row[0]));
    expect(() =>
      buildAppConfigFromRawRows(configRows, holidayDates),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/DemoSeed.test.ts`
Expected: FAIL — `Cannot find module '../src/DemoSeed'`.

- [ ] **Step 3: Write `DemoSeed.ts`**

```ts
import { SHEET_NAMES, SheetName } from "./SheetNames";
import {
  CANCELLATION_REQUESTS_HEADERS,
  CONFIG_HEADERS,
  EMAIL_LOG_HEADERS,
  ERROR_LOG_HEADERS,
  HOLIDAYS_HEADERS,
  INQUIRIES_HEADERS,
  RESERVATIONS_HEADERS,
  SERVICES_HEADERS,
  STAFF_HEADERS,
} from "./SheetSchemas";

export interface DemoSheetSeed {
  name: SheetName;
  headers: readonly string[];
  rows: unknown[][];
}

/** Safe, non-production demo data for schema/data-layer verification
 *  (Phase 3A §21/§22) — never real customer information. Transactional
 *  sheets (RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG,
 *  ERROR_LOG) get their header row only; seeding fake transactional
 *  records would misrepresent real business activity. */
export const DEMO_SHEETS: DemoSheetSeed[] = [
  {
    name: SHEET_NAMES.CONFIG,
    headers: CONFIG_HEADERS,
    rows: [
      ["business.name", "Demo Salon", "店舗名"],
      ["business.phone", "03-0000-0000", "電話番号"],
      ["business.email", "owner@example.com", "店舗メール"],
      ["business.address", "東京都千代田区1-1-1", "住所"],
      ["hours.monday", "10:00-19:00", "月曜営業時間"],
      ["hours.tuesday", "10:00-19:00", "火曜営業時間"],
      ["hours.wednesday", "10:00-19:00", "水曜営業時間"],
      ["hours.thursday", "10:00-19:00", "木曜営業時間"],
      ["hours.friday", "10:00-19:00", "金曜営業時間"],
      ["hours.saturday", "10:00-18:00", "土曜営業時間"],
      ["hours.sunday", "closed", "日曜営業時間（定休日）"],
      ["reservation.timezone", "Asia/Tokyo", "タイムゾーン"],
      ["reservation.slotMinutes", 30, "予約枠の単位（分）"],
      ["reservation.minLeadHours", 1, "予約締切（時間前）"],
      ["reservation.maxBookingDays", 60, "予約可能期間（日）"],
      ["features.contactForm", true, "問い合わせ受付"],
      ["features.reservation", true, "予約受付"],
      ["features.staffSelection", true, "スタッフ指名"],
      ["features.calendar", true, "カレンダー連携"],
      ["features.emailNotification", true, "メール通知"],
      ["staff.anyAvailableOption", true, "指名なし（お任せ）を表示"],
      ["calendar.id", "primary", "カレンダーID（開発用プレースホルダー）"],
      ["email.ownerNotifyAddress", "owner@example.com", "店舗通知メール宛先"],
      ["email.fromName", "Demo Salon", "送信者表示名"],
    ],
  },
  {
    name: SHEET_NAMES.HOLIDAYS,
    headers: HOLIDAYS_HEADERS,
    rows: [
      ["2026-01-01", "元日"],
      ["2026-01-02", "年始休業"],
    ],
  },
  {
    name: SHEET_NAMES.SERVICES,
    headers: SERVICES_HEADERS,
    rows: [
      ["SV001", "ハンド | ジェルネイル", 60, 6000, true, true, 1],
      ["SV002", "フット | ジェルペディキュア", 90, 8000, true, true, 2],
      ["SV003", "その他 | パラフィンパック", 20, 1500, true, false, 3],
    ],
  },
  {
    name: SHEET_NAMES.STAFF,
    headers: STAFF_HEADERS,
    rows: [
      ["ST001", "スタッフA", true, "", 1],
      ["ST002", "スタッフB", true, "", 2],
      ["ST003", "スタッフC", true, "", 3],
    ],
  },
  { name: SHEET_NAMES.RESERVATIONS, headers: RESERVATIONS_HEADERS, rows: [] },
  {
    name: SHEET_NAMES.CANCELLATION_REQUESTS,
    headers: CANCELLATION_REQUESTS_HEADERS,
    rows: [],
  },
  { name: SHEET_NAMES.INQUIRIES, headers: INQUIRIES_HEADERS, rows: [] },
  { name: SHEET_NAMES.EMAIL_LOG, headers: EMAIL_LOG_HEADERS, rows: [] },
  { name: SHEET_NAMES.ERROR_LOG, headers: ERROR_LOG_HEADERS, rows: [] },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/DemoSeed.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `getConfiguredSpreadsheet` re-export check and write `SetupDemoSheets.ts`**

No new test for this file — it calls `SpreadsheetApp` directly (same rationale as `Sheets.ts` in Task 2: thin GAS wrapper, manual-only verification).

```ts
import { getConfiguredSpreadsheet } from "./Sheets";
import { DEMO_SHEETS } from "./DemoSeed";

/**
 * Explicit, safe demo-data setup (Phase 3A §21). Never overwrites or
 * deletes an existing sheet — if a sheet with the target name already
 * exists, it is left completely untouched and reported as "skipped".
 * Must be run manually from the Apps Script editor (select
 * `setupDemoSheets` in the function dropdown and click Run); it is never
 * called from doGet/doPost.
 */
export function setupDemoSheets(): string[] {
  const spreadsheet = getConfiguredSpreadsheet();
  const results: string[] = [];

  for (const seed of DEMO_SHEETS) {
    const existing = spreadsheet.getSheetByName(seed.name);
    if (existing) {
      results.push(`skipped (already exists): ${seed.name}`);
      continue;
    }
    const sheet = spreadsheet.insertSheet(seed.name);
    sheet.getRange(1, 1, 1, seed.headers.length).setValues([[...seed.headers]]);
    if (seed.rows.length > 0) {
      sheet
        .getRange(2, 1, seed.rows.length, seed.headers.length)
        .setValues(seed.rows);
    }
    results.push(`created: ${seed.name} (${seed.rows.length} demo rows)`);
  }

  return results;
}
```

- [ ] **Step 6: Wire `setupDemoSheets` into `Code.ts` so esbuild bundles it and it is runnable from the Apps Script editor**

In `Code.ts`, add the import and a third `globalThis` attachment (the function is never invoked by `doGet`/`doPost` — only exposed for manual selection in the Apps Script IDE's function dropdown):

```ts
import { getHealthStatus } from "./Health";
import { handleApiRequest } from "./Api";
import { setupDemoSheets } from "./SetupDemoSheets";

// ... doGet/doPost unchanged ...

(
  globalThis as unknown as { setupDemoSheets: typeof setupDemoSheets }
).setupDemoSheets = setupDemoSheets;
```

- [ ] **Step 7: Typecheck and build**

Run: `cd apps/salon-portfolio/gas && npm run typecheck && npm run build`
Expected: PASS — `build/Code.js` contains `setupDemoSheets` (check with `grep -c setupDemoSheets build/Code.js`, expect ≥ 1).

- [ ] **Step 8: Run the full test suite**

Run: `cd apps/salon-portfolio/gas && npm test`
Expected: PASS — every suite from Tasks 1–10 green, no regression on `Health.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add apps/salon-portfolio/gas/src/DemoSeed.ts apps/salon-portfolio/gas/src/SetupDemoSheets.ts apps/salon-portfolio/gas/src/Code.ts apps/salon-portfolio/gas/tests/DemoSeed.test.ts
git commit -m "feat(gas): add safe demo-data seed and setupDemoSheets utility"
```

---

## Task 11: Documentation updates

**Files:**
- Modify: `docs/architecture-overview.md`
- Modify: `docs/folder-structure.md`
- Modify: `docs/api-documentation.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/changelog.md`
- Create: `docs/config-and-sheets-guide.md`

No test step (documentation-only task); verify with a read-through at the end.

- [ ] **Step 1: Replace `docs/architecture-overview.md` in full**

```markdown
# Architecture Overview

Status as of Phase 3A: CONFIG configuration system + Google Sheets data
layer implemented. The full target design (Calendar/Gmail adapters,
availability strategy, reservation/contact/cancellation workflows, API
contracts beyond `getConfig`) is specified in
[`phase0-specification.md`](phase0-specification.md) and is not repeated
here.

## High-level shape (target, per Phase 0)

```text
Browser → Next.js (apps/salon-portfolio/web)
            → HTTPS → GAS Web App (apps/salon-portfolio/gas)
                        → Google Sheets / Calendar / Gmail
```

## What exists after Phase 3A

- **`apps/salon-portfolio/web`** — unchanged since Phase 2C. Still on
  `config/demo-content.ts`; not yet connected to `getConfig` (Phase 3B).
- **`apps/salon-portfolio/gas`** — `Code.ts` now routes `doPost` through
  `Api.ts`'s action dispatcher (`doGet` is still the standalone Phase 1
  liveness check). Implemented this phase:
  - **Sheet layer:** `SheetNames.ts` (canonical tab names),
    `SheetSchemas.ts` (header/column definitions + row types for all nine
    Phase 0 §C tabs), `RowMapper.ts` (pure header-mapping and
    row↔object helpers), `Sheets.ts` (thin `SpreadsheetApp` adapter,
    reads the target spreadsheet from the `SPREADSHEET_ID` Script
    Property — see `config-and-sheets-guide.md`).
  - **CONFIG system:** `models/Config.ts` (`AppConfig`/`PublicConfig`
    types), `ConfigParser.ts` (pure type/shape parsing),
    `ConfigValidator.ts` (pure business-rule validation),
    `PublicConfig.ts` (strips `calendarId`/email settings before the
    frontend ever sees them), `ConfigStore.ts` (repository — reads
    CONFIG+HOLIDAYS via `Sheets.ts`, delegates to the parser/validator,
    throws `ConfigError` on bad data).
  - **API:** `models/ErrorCodes.ts` (Phase 0 §H's 10 codes +
    `CONFIG_INVALID`), `models/Api.ts` (`ApiRequest`/`ApiResponse`
    envelope), `Api.ts` (`getConfig` action handler + `handleApiRequest`
    dispatcher — the only action implemented in Phase 3A).
  - **IDs/timestamps:** `Utils.ts` (Asia/Tokyo timestamp helpers,
    fixed UTC+9 offset, no DST), `ids/ReservationId.ts`
    (`RES-YYYYMMDD-XXXXXX` generator — generator only, no reservation
    workflow uses it yet).
  - **Demo data:** `DemoSeed.ts` (pure demo rows for all nine sheets)
    + `SetupDemoSheets.ts` (`setupDemoSheets()` — manual-run only,
    never overwrites an existing sheet).
  - Still empty/unstarted: `availability/`, `Calendar.ts`, `Mail.ts`,
    `SlotEngine.ts`, `Validation.ts`, and every `models/*Request.ts`
    workflow DTO (`ReservationRequest`, `ContactRequest`,
    `CancellationRequest`) — all Phase 3B+.
- Jest covers every pure module above (parser, validator, public-config
  projection, row mapper, schema shape, ID generator, timestamp helper,
  API dispatch logic, demo-seed/schema consistency). `Sheets.ts` and
  `SetupDemoSheets.ts` are GAS-service wrappers and are intentionally not
  unit tested (Phase 0 §Q) — see `config-and-sheets-guide.md` for the
  manual verification steps.

## Why no shared `packages/` yet

Per Phase 0 §B, `packages/` is intentionally deferred until the reusable
core is *extracted* from a working Project 1, not designed up front — see
[`roadmap.md`](roadmap.md).

## Module boundaries (Phase 0 §D/§T/§U)

The seven GAS boundary modules (`Code`, `Api`, `Validation`, `Sheets`,
`Calendar`, `Mail`, `SlotEngine`) and the availability-strategy seam are
defined in [`phase0-specification.md`](phase0-specification.md) §D/§T/§U.
Phase 3A populates `Code.ts` (entrypoints + dispatch wiring only), `Api.ts`
(routing/orchestration for `getConfig` only), and `Sheets.ts` (thin data
adapter). `Validation.ts`, `Calendar.ts`, `Mail.ts`, `SlotEngine.ts`, and
the `availability/` strategies remain unpopulated — later phases implement
the behavior they own.
```

- [ ] **Step 2: Replace `docs/folder-structure.md` in full**

```markdown
# Folder Structure

This reflects what actually exists on disk after Phase 3A (not the full
Phase 0 target — see [`phase0-specification.md`](phase0-specification.md)
§B for what later phases still add). Generated/dependency directories
(`node_modules/`, `.next/`, `build/`, `.swc/`) are omitted.

```text
Coconala-Web-Services/
├── README.md
├── MASTER_PROMPT_INSTRUCTION_LP_AUTOMATION_SAAS.md
├── .gitignore
├── docs/
│   ├── phase0-specification.md
│   ├── phase2a-ui-ux-specification.md
│   ├── architecture-overview.md
│   ├── folder-structure.md          # this file
│   ├── api-documentation.md
│   ├── config-and-sheets-guide.md   # new in Phase 3A
│   ├── roadmap.md
│   └── changelog.md
│
└── apps/
    └── salon-portfolio/
        ├── web/                              # Next.js frontend — unchanged since Phase 2C
        │   └── ... (see git history; not touched in Phase 3A)
        │
        └── gas/                              # GAS backend, TypeScript
            ├── src/
            │   ├── Code.ts                    # doGet (liveness) / doPost (→ Api.ts dispatch)
            │   ├── Health.ts                  # pure health-check payload
            │   ├── Api.ts                     # getConfig action handler + doPost dispatcher
            │   ├── ConfigStore.ts             # CONFIG+HOLIDAYS repository (Sheets + parser + validator)
            │   ├── ConfigParser.ts            # pure CONFIG type/shape parsing
            │   ├── ConfigValidator.ts         # pure CONFIG business-rule validation
            │   ├── PublicConfig.ts            # AppConfig -> PublicConfig projection
            │   ├── Sheets.ts                  # thin SpreadsheetApp adapter
            │   ├── SheetNames.ts              # canonical sheet-name constants
            │   ├── SheetSchemas.ts            # per-sheet headers + row types (all 9 tabs)
            │   ├── RowMapper.ts               # pure header-map / row<->object helpers
            │   ├── DemoSeed.ts                # pure demo data for all 9 sheets
            │   ├── SetupDemoSheets.ts         # setupDemoSheets() — manual-run, non-destructive
            │   ├── Utils.ts                   # Asia/Tokyo timestamp helpers
            │   ├── availability/              # empty — scaffolded only (Phase 3B+)
            │   ├── models/
            │   │   ├── Config.ts              # AppConfig / PublicConfig / FeatureFlags / ...
            │   │   ├── ErrorCodes.ts          # ERROR_CODES + CONFIG_INVALID
            │   │   └── Api.ts                 # ApiRequest / ApiResponse envelope
            │   └── ids/
            │       └── ReservationId.ts       # RES-YYYYMMDD-XXXXXX generator
            ├── tests/
            │   ├── Health.test.ts
            │   ├── SheetSchemas.test.ts
            │   ├── RowMapper.test.ts
            │   ├── Utils.test.ts
            │   ├── ReservationId.test.ts
            │   ├── ConfigParser.test.ts
            │   ├── ConfigValidator.test.ts
            │   ├── PublicConfig.test.ts
            │   ├── ConfigStore.test.ts
            │   ├── Api.test.ts
            │   ├── DemoSeed.test.ts
            │   └── availability/              # empty — scaffolded only (Phase 3B+)
            ├── appsscript.json
            ├── .clasp.json.example            # template; real .clasp.json is gitignored
            ├── esbuild.config.js
            ├── jest.config.js
            ├── tsconfig.json
            └── package.json
```

Not yet created (deferred to later phases, per Phase 0 §B notes):
`packages/` and `.claude/` at the repo root — neither is needed until
there is working Project 1 code to extract a reusable core from, or
project-specific rules/skills to add. `Calendar.ts`, `Mail.ts`,
`SlotEngine.ts`, `Validation.ts`, the `availability/` strategies, and the
`ReservationRequest`/`ContactRequest`/`CancellationRequest` workflow DTOs
are Phase 3B+.
```

- [ ] **Step 3: Replace `docs/api-documentation.md` in full**

```markdown
# API Documentation

Status as of Phase 3A: one action (`getConfig`) is implemented. The full
action list, covered in [`phase0-specification.md`](phase0-specification.md)
§G/§H, is implemented incrementally in later phases.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `apps/salon-portfolio/web` → `/api/health` | `GET` | Next.js liveness check. Unchanged since Phase 1. |
| `apps/salon-portfolio/gas` Web App → `doGet` | `GET` | Apps Script liveness check. Unchanged since Phase 1 — returns `{ ok: true, data: { status, service, timestamp } }`. Not part of the action dispatch below. |
| `apps/salon-portfolio/gas` Web App → `doPost` | `POST` | Action dispatch, per Phase 0 §G. Body: `{ "action": string, "payload"?: object }`. |

## Envelope (Phase 0 §H)

```json
// success
{ "ok": true, "data": { } }

// failure
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "設定情報の読み込みに失敗しました。管理者にお問い合わせください。" } }
```

## Actions implemented in Phase 3A

### `getConfig`

Always available (no feature flag). Reads CONFIG + HOLIDAYS, parses and
validates them, and returns the public projection of `AppConfig`
(`calendarId`, `emailOwnerNotifyAddress`, `emailFromName` are never
included — Phase 3A §20).

```json
// request
{ "action": "getConfig" }

// success response data
{
  "business": { "name": "Demo Salon", "phone": "03-0000-0000", "email": "owner@example.com", "address": "東京都千代田区1-1-1" },
  "hours": { "monday": "10:00-19:00", "...": "...", "sunday": "closed" },
  "holidays": ["2026-01-01", "2026-01-02"],
  "features": { "contactForm": true, "reservation": true, "staffSelection": true, "calendar": true, "emailNotification": true },
  "staffAnyAvailableOption": true,
  "reservation": { "timezone": "Asia/Tokyo", "slotMinutes": 30, "minLeadHours": 1, "maxBookingDays": 60 }
}

// failure response (malformed/invalid CONFIG sheet data)
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "設定情報の読み込みに失敗しました。管理者にお問い合わせください。" } }
```

## Any other action name

Returns a `VALIDATION_ERROR` — no other action is implemented yet
(`getServices`, `getStaff`, `getAvailableSlots`, `checkAvailability`,
`createReservation`, `createInquiry`, `requestCancellation`, `healthCheck`
as an *action* — all Phase 3B+, per `phase0-specification.md` §G).

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Unsupported action: \"getServices\"." } }
```

## Error codes

The full Phase 0 §H list, plus one Phase 3A addition:

```text
VALIDATION_ERROR            (Layer A — used today for a malformed/unsupported request)
DUPLICATE_SUBMISSION        (Layer A — not yet triggered by any implemented action)
SLOT_UNAVAILABLE            (Layer B — not yet triggered)
FEATURE_DISABLED            (Layer B — not yet triggered)
INVALID_CANCELLATION_TOKEN  (Layer B — not yet triggered)
SYSTEM_BUSY                 (Layer C — not yet triggered)
CALENDAR_ERROR              (Layer C — not yet triggered)
SHEET_ERROR                 (Layer C — not yet triggered)
MAIL_ERROR                  (Layer C — not yet triggered)
INTERNAL_ERROR              (Layer C — unclassified `getConfig` failure)
CONFIG_INVALID              (Phase 3A addition — CONFIG/HOLIDAYS failed parsing or validation)
```

Neither `getConfig` nor `doGet` touches Calendar, Gmail, or writes to any
Sheet.
```

- [ ] **Step 4: In `docs/roadmap.md`, replace the "Phase 3" bullet**

Old:
```markdown
- [ ] **Phase 3 — CONFIG system.** `ConfigStore.ts`, the `CONFIG`/`HOLIDAYS`
      sheet reader, `getConfig` action, `AppConfig` type (Phase 0 §D);
      wires real business content into the Phase 2B UI.
```

New:
```markdown
- [x] **Phase 3A — GAS configuration + data layer.** `ConfigStore.ts`,
      `ConfigParser.ts`/`ConfigValidator.ts`, `Sheets.ts`/`RowMapper.ts`,
      `SheetSchemas.ts` for all nine Phase 0 §C tabs, `Api.ts`'s
      `getConfig` action + dispatcher, `Utils.ts`/`ids/ReservationId.ts`,
      and `DemoSeed.ts`/`SetupDemoSheets.ts`. Frontend is still on
      `config/demo-content.ts` — not wired to real GAS yet.
- [ ] **Phase 3B — Frontend CONFIG integration.** Replace
      `web/config/demo-content.ts` with a real `getConfig` fetch; no new
      GAS actions.
```

Also update the trailing note at the bottom of the file:

Old:
```markdown
Phase 2B is the newest code in the repo; Phase 3 (`ConfigStore`/`getConfig`)
is the next phase and has not been started.
```

New:
```markdown
Phase 3A is the newest code in the repo; Phase 3B (frontend `getConfig`
integration) is the next phase and has not been started.
```

- [ ] **Step 5: Prepend a new entry to `docs/changelog.md`'s `[Unreleased]` section, above the existing "Added — Phase 2B" entry**

```markdown
### Added — Phase 3A: GAS configuration + data layer

- `apps/salon-portfolio/gas/src/SheetNames.ts` + `SheetSchemas.ts`:
  canonical names and column/header definitions for all nine Phase 0 §C
  sheets (`CONFIG`, `HOLIDAYS`, `SERVICES`, `STAFF`, `RESERVATIONS`,
  `CANCELLATION_REQUESTS`, `INQUIRIES`, `EMAIL_LOG`, `ERROR_LOG`).
- `RowMapper.ts`: pure header-mapping and row↔object serialization,
  with explicit missing-header detection (`MissingHeadersError`).
- `Sheets.ts`: thin `SpreadsheetApp` adapter (`getSheet`, `getHeaderMap`,
  `readRawRows`, `appendRow`, `updateRow`), reading the target spreadsheet
  from the new `SPREADSHEET_ID` Script Property convention (documented in
  `docs/config-and-sheets-guide.md`) rather than a hard-coded ID.
- `models/Config.ts`, `ConfigParser.ts`, `ConfigValidator.ts`,
  `PublicConfig.ts`, `ConfigStore.ts`: the full CONFIG pipeline — strict
  boolean/number/string parsing (no "yes"/"no"/"1"/"0"), business-rule
  validation (timezone, ranges, business-hours format, holiday dates,
  the staff-selection/any-available-staff combination), and a
  public/private projection so `calendarId` and the owner-facing email
  settings never leave the server.
- `models/ErrorCodes.ts`, `models/Api.ts`, `Api.ts`: the shared
  `{ok,data}`/`{ok:false,error}` envelope, Phase 0 §H's 10 error codes
  plus a new `CONFIG_INVALID` code, and the `getConfig` action + `doPost`
  dispatcher (every other action name returns `VALIDATION_ERROR` — no
  other action exists yet).
- `Code.ts`: `doPost` now routes through `Api.ts`'s dispatcher; `doGet`
  is unchanged (still the Phase 1 liveness check).
- `Utils.ts` (Asia/Tokyo timestamp helpers, fixed UTC+9 offset — Japan has
  no DST) and `ids/ReservationId.ts` (`RES-YYYYMMDD-XXXXXX` generator,
  injectable date/random source) — generator only, no reservation
  workflow calls it yet.
- `DemoSeed.ts` + `SetupDemoSheets.ts`: safe, non-destructive demo data
  for all nine sheets and a manual-run `setupDemoSheets()` utility that
  never overwrites an existing sheet.
- `docs/config-and-sheets-guide.md`: new operator/developer guide for the
  CONFIG sheet and the sheet data layer.
- 60+ new Jest tests across the parser, validator, row mapper, schema
  definitions, ID generator, timestamp helper, API dispatch logic, and
  demo-seed/schema consistency. `Sheets.ts` and `SetupDemoSheets.ts` are
  GAS-service wrappers and are intentionally not unit tested (Phase 0 §Q)
  — see the new guide for manual verification steps.
- Not included (deliberately out of scope, per the Phase 3A task
  prompt): reservation/contact/cancellation workflows, Calendar, Gmail,
  authentication, Supabase, frontend `getConfig` integration,
  `getServices`/`getStaff`/`healthCheck` actions, `clasp push`.
```

- [ ] **Step 6: Write `docs/config-and-sheets-guide.md`**

```markdown
# CONFIG & Sheets Data Layer Guide

Covers the Phase 3A data foundation: the `CONFIG` sheet, the Google
Sheets schema, and how to set up a scratch spreadsheet for development.
This does **not** cover reservations, Calendar, or Gmail — those ship in
later phases (see `roadmap.md`).

## For the salon owner: editing CONFIG

`CONFIG` is a simple three-column sheet: **Key** (do not edit — code
reads this exact text), **Value** (edit this), **Description** (a short
Japanese note explaining what the row controls). Every key currently
supported:

| Key | 説明 | 値の例 |
|---|---|---|
| `business.name` | 店舗名 | `Demo Salon` |
| `business.phone` | 電話番号 | `03-0000-0000` |
| `business.email` | 店舗メール | `owner@example.com` |
| `business.address` | 住所 | `東京都千代田区1-1-1` |
| `hours.monday` 〜 `hours.sunday` | 曜日ごとの営業時間 | `10:00-19:00` または `closed`（定休日） |
| `reservation.timezone` | タイムゾーン（変更不可） | `Asia/Tokyo` |
| `reservation.slotMinutes` | 予約枠の単位（分） | `30` |
| `reservation.minLeadHours` | 予約締切（何時間前まで受付） | `1` |
| `reservation.maxBookingDays` | 予約可能期間（何日先まで） | `60` |
| `features.contactForm` | 問い合わせ受付 | `true` / `false` |
| `features.reservation` | 予約受付 | `true` / `false` |
| `features.staffSelection` | スタッフ指名の可否 | `true` / `false` |
| `features.calendar` | カレンダー連携 | `true` / `false` |
| `features.emailNotification` | メール通知 | `true` / `false` |
| `staff.anyAvailableOption` | 「指名なし（お任せ）」の表示 | `true` / `false`（`features.staffSelection` が `false` のときは `false` にすること） |
| `calendar.id` | 共有カレンダーID（開発者向け・非公開） | `primary` |
| `email.ownerNotifyAddress` | 通知メール宛先（非公開） | `owner@example.com` |
| `email.fromName` | 送信者表示名（非公開） | `Demo Salon` |

Only `true`/`false` (exact spelling) are accepted for yes/no values — a
checkbox cell typed as TRUE/FALSE in Sheets works automatically.

`HOLIDAYS` is a separate sheet: one row per closed date, `Date`
(`YYYY-MM-DD`) + `Label` (free text, e.g. `年末年始`).

## Which fields the website can see

`getConfig` returns `business`, `hours`, `holidays`, `features`,
`staffAnyAvailableOption`, and `reservation` — **never** `calendar.id`,
`email.ownerNotifyAddress`, or `email.fromName`. Those three stay
server-side only.

## For developers: sheet schema reference

All nine sheets, their canonical names, and required headers are defined
centrally in `apps/salon-portfolio/gas/src/SheetSchemas.ts` — never
duplicate a header list elsewhere. Summary:

| Sheet | Purpose |
|---|---|
| `CONFIG` | Business config, key/value/description (this guide, above). |
| `HOLIDAYS` | Closed dates. |
| `SERVICES` | Salon menu/service catalog. |
| `STAFF` | Stylist catalog + optional per-staff Calendar ID. |
| `RESERVATIONS` | Reservation records (schema only — no workflow yet). |
| `CANCELLATION_REQUESTS` | Cancellation requests (schema only). |
| `INQUIRIES` | Contact-form submissions (schema only). |
| `EMAIL_LOG` | Outgoing email audit trail (schema only). |
| `ERROR_LOG` | Server-side error audit trail (schema only). |

## Setting up a scratch spreadsheet for development

This is a **standalone** Apps Script project (not bound to one specific
Spreadsheet), so it needs to be told which Spreadsheet to use:

1. Create a new Google Sheet (developer-owned scratch/demo spreadsheet —
   never a customer's production sheet).
2. Copy its ID from the URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`).
3. In the Apps Script editor (Project Settings → Script Properties), add
   a property named `SPREADSHEET_ID` with that ID as the value.
4. In the Apps Script editor, select `setupDemoSheets` from the function
   dropdown and click Run. It creates all nine sheets with headers and
   safe demo data (transactional sheets get headers only) — it never
   touches a sheet that already exists.

## Manual verification (Sheets.ts / SetupDemoSheets.ts are not Jest-tested)

Per Phase 0 §Q, GAS-service-calling modules stay thin and are verified by
hand, not by Jest:

1. Run `setupDemoSheets` against a scratch spreadsheet (above) and
   confirm all nine tabs appear with the expected headers.
2. Run it a second time and confirm every sheet is reported "skipped
   (already exists)" — no data is duplicated or overwritten.
3. Deploy the Web App (or run `doPost` from the Apps Script editor with a
   test event object `{ postData: { contents: '{"action":"getConfig"}' } }`)
   and confirm the response matches the shape in `api-documentation.md`.
4. Edit one CONFIG value to something invalid (e.g. set
   `reservation.slotMinutes` to `abc`) and re-run `getConfig`; confirm the
   response is `{ ok: false, error: { code: "CONFIG_INVALID", ... } }`
   and that the execution transcript (View → Logs) shows the specific
   field issue — never shown to the client.

## Operations note (Phase 0 §S)

Production customer deployments use the customer's own Google
account/Workspace, Spreadsheet, and Apps Script project — the developer
is granted collaborator/editor access only. This guide's scratch-sheet
setup is for development and portfolio-demo use only.
```

- [ ] **Step 7: Commit**

```bash
git add docs/architecture-overview.md docs/folder-structure.md docs/api-documentation.md docs/roadmap.md docs/changelog.md docs/config-and-sheets-guide.md
git commit -m "docs: document Phase 3A CONFIG system and Sheets data layer"
```

---

## Task 12: Final verification and evidence capture

**Files:**
- Create: `.evidence/<yyyyMMdd-HHmm>-phase3a-gas-config-data-layer/{test.log,typecheck.log,gas-build.log,web-build.log,web-typecheck-lint.log,secret-scan.log,diff.patch,status.txt}`

No code changes in this task — verification only, per the evidence-reporting protocol and the Phase 3A prompt's §39/§40.

- [ ] **Step 1: Record the GAS test baseline delta**

Run: `cd apps/salon-portfolio/gas && npm test 2>&1 | tee ../../../.evidence/<dir>/test.log`
Expected: PASS. Baseline before this plan was 2 tests (`Health.test.ts` — confirmed via `.evidence/20260905-1620-phase1-foundation-scaffold/test.log`, still the last recorded GAS baseline since no GAS work happened between Phase 1 and Phase 3A). Confirm the new total equals 2 + every new `it(...)` added across Tasks 1–10.

- [ ] **Step 2: Typecheck the GAS package**

Run: `cd apps/salon-portfolio/gas && npm run typecheck 2>&1 | tee ../../../.evidence/<dir>/typecheck.log`
Expected: PASS, zero errors.

- [ ] **Step 3: Build the GAS bundle**

Run: `cd apps/salon-portfolio/gas && npm run build 2>&1 | tee ../../../.evidence/<dir>/gas-build.log`
Expected: PASS. Then confirm the bundle actually contains the new entrypoints:
`grep -c "doGet\|doPost\|setupDemoSheets\|handleApiRequest" build/Code.js` → expect each name to appear at least once.

- [ ] **Step 4: Confirm the untouched frontend still builds/typechecks/lints (no regression from this task)**

Run: `cd apps/salon-portfolio/web && npm run build 2>&1 | tee ../../../.evidence/<dir>/web-build.log`
Run: `cd apps/salon-portfolio/web && npm run lint 2>&1 | tee ../../../.evidence/<dir>/web-typecheck-lint.log`
Expected: both PASS, unchanged from before this task (no file under `apps/salon-portfolio/web` was modified in Tasks 1–11 — confirm with `git status -s apps/salon-portfolio/web` showing no output).

- [ ] **Step 5: Secret scan**

Run (from repo root):
```bash
git diff --name-only main -- apps/salon-portfolio/gas docs | xargs grep -InE "AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA )?PRIVATE KEY-----|[0-9]{20,}-[0-9a-z]{32}\.apps\.googleusercontent\.com" 2>&1 | tee .evidence/<dir>/secret-scan.log
```
Expected: no matches (empty file). Also manually confirm `SPREADSHEET_ID` never appears with a real value anywhere in `src/`, `tests/`, or `docs/` — only as the Script Property *name*, and that `docs/config-and-sheets-guide.md`'s calendar/email examples are the placeholder values from `DemoSeed.ts` (`primary`, `owner@example.com`), never a real production identifier.

- [ ] **Step 6: Capture diff and status**

Run:
```bash
git diff --stat > .evidence/<dir>/diffstat.txt
git diff > .evidence/<dir>/diff.patch
git status -s > .evidence/<dir>/status.txt
```

- [ ] **Step 7: Self-review against the Phase 3A scope rule (§2)**

Confirm, by reading the diff, that none of the following were touched:
`apps/salon-portfolio/web/**`, any `Calendar.ts`/`Mail.ts`/`SlotEngine.ts`/`Validation.ts`, any `availability/*`, any `ReservationRequest.ts`/`ContactRequest.ts`/`CancellationRequest.ts`, any `getServices`/`getStaff`/`healthCheck`-as-action/`createReservation`/`createInquiry`/`requestCancellation` handler, `.clasp.json`, or any `clasp push`/`clasp deploy` invocation.

- [ ] **Step 8: Report results to the user in the format the Phase 3A prompt's §41 specifies (sections A–Q)** and **stop** — do not proceed to Phase 3B, frontend integration, or any other follow-on work without explicit user approval (Phase 3A prompt §42).

---

## Self-Review Notes (writing-plans skill)

- **Spec coverage:** every phase0-specification.md §C sheet has a schema
  (Task 1); §D's `AppConfig` shape is implemented verbatim (Task 4); §G/§H's
  envelope and `getConfig` contract are implemented exactly, with the
  `calendarId`/email-settings exclusion from §H's example response
  enforced by `PublicConfig.ts` and tested (Task 6); §17's ID format and
  §18's timezone strategy are implemented and tested (Task 3); the Phase
  3A prompt's §25 testing checklist (parser, validator, schema, ID,
  public-config, serialization) is covered by Tasks 1, 3–8.
- **Placeholder scan:** no `TBD`/`implement later`/prose-only steps —
  every step above carries runnable code or an exact shell command.
- **Type consistency:** `ConfigRow`/`HolidayRow` (Task 1) are consumed
  identically in `ConfigStore.ts` (Task 7) and `DemoSeed.test.ts`
  (Task 10); `ConfigError` is defined once in `ConfigStore.ts` (Task 7)
  and imported by both `Api.ts` (Task 8) and its test; `AppConfig`/
  `PublicConfig` (Task 4) are the single types threaded through
  `ConfigParser`, `ConfigValidator`, `PublicConfig.ts`, `ConfigStore.ts`,
  and `Api.ts` without renaming.
