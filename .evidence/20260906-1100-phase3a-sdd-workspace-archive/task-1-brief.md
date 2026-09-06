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

