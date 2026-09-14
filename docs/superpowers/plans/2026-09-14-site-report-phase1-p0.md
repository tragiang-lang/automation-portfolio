# Site Report Phase 1 (P0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two MUST-FIX 現場報告 issues: `現場名` becomes a real, changeable ACTIVE-only dropdown, and `作業種別` becomes a dropdown backed by a new `WORK_TYPES` master-data sheet — with GAS as the authoritative validator for both.

**Architecture:** Mirror the existing SITES stack exactly for WORK_TYPES (sheet → repository → pure `buildXResult` → thin action in `Api.ts`), filter `SitesRepository.buildSitesResult` to `ACTIVE` as the single change point for both `GET_SITES` and `SubmitReportService`'s internal site lookup, and append exactly one backward-compatible column (`workTypeName`) to `REPORTS` via a dedicated, additive `setupSiteReport()` backfill step (never a "required header").

**Tech Stack:** TypeScript, Jest, Google Apps Script (`gas/`), Next.js App Router + React Testing Library (`web/`).

**Spec:** `docs/superpowers/specs/2026-09-14-site-report-phase1-p0-design.md`

## Global Constraints

- Preserve the existing 12 `REPORTS` columns exactly in their current order; only append new columns (spec §4.4).
- Preserve backward compatibility with existing `REPORTS` rows — no destructive rewrite, no `MissingHeadersError` on an existing production sheet (spec §4.4, §6).
- `REQUIRED_HEADERS[SHEET_NAMES.REPORTS]` must stay the original 12-column list, never the 13-column `REPORTS_HEADERS` (spec §4.4 migration mechanism) — this is the one rule in this plan most likely to be silently violated by a well-intentioned "keep it consistent" edit; every task touching `SheetSchemas.ts` must re-check it.
- Keep the existing API/error-handling conventions: same `ApiResponse<T>` envelope, same "config-check-first, try/catch, map every branch to a fixed safe message" shape in every new `Api.ts` action, same `{ field, reason }` `ValidationIssue` shape (Global — applies to every GAS task).
- `GET_SITES` and `GET_WORK_TYPES` must each be independently callable/testable — no action may require the other to have run first.
- Never commit a real Google Sheets ID, Drive folder ID, or credential (existing rule, unaffected by this feature — no new secret is introduced).
- Baseline to beat, verified 2026-09-14 by running both suites directly: **199 passing (gas, 15 suites) + 190 passing (web, 19 suites) = 389 total.** Every task's test step must state the exact count after that task.
- No task in this plan touches Phase 2 scope (weather, work hours, progress, safety, issues, photo categories, confirmation step, screen restructuring) — spec §7.

---

## File Map

**GAS (`apps/site-report/gas/`) — create:**
- `src/models/WorkType.ts` — domain type
- `src/WorkTypesRepository.ts` — `getWorkTypeRows` + `buildWorkTypesResult`, mirrors `SitesRepository.ts`

**GAS — modify:**
- `src/SheetNames.ts` — add `WORK_TYPES`
- `src/SheetSchemas.ts` — add `WORK_TYPES_HEADERS`/`WorkTypeRow`; split `REPORTS_HEADERS` into a base (12) + full (13) list; add `ReportRow.workTypeName`
- `src/RowMapper.ts` — add `mapWorkTypeRow`; extend `mapReportRow` with `workTypeName`
- `src/Validation.ts` — add `validateWorkTypeRow`
- `src/SitesRepository.ts` — filter `buildSitesResult`'s output to `ACTIVE`
- `src/models/Report.ts` — add `SiteReport.workTypeName`
- `src/Api.ts` — `ERROR_CODES.WORK_TYPE_NOT_FOUND`, `GetWorkTypesResponseData`, `getWorkTypesAction`, `GET_WORK_TYPES` dispatch, two new outcome mappings
- `src/SubmitReportService.ts` — work-type existence check + `workTypeName` derivation, two new `SubmitReportOutcome` kinds
- `src/AdminNotification.ts` — show `workTypeName` (fallback to `workType`)
- `src/Setup.ts` — `WORK_TYPES` seed data + idempotent seeding, `REPORTS.workTypeName` backfill, provisioning summary line

**GAS — do NOT modify:** `src/index.ts` (dispatch already generic via `handleApiRequest`), `src/DriveStorage.ts`, `src/ReportsRepository.ts` (already generic via `objectToRow(REPORTS_HEADERS, row)` — automatically picks up the new column), `src/ConfigStore.ts`, `src/ConfigParser.ts`, `src/Config.ts`, `src/SheetStore.ts`, `src/Health.ts`, `src/Mail.ts`, `src/ids/ReportId.ts`, `src/models/Worker.ts`, `src/models/ReportPhoto.ts`, `src/models/SubmitReportInput.ts` (wire shape unchanged — spec §4.4).

**Web (`apps/site-report/web/`) — modify:**
- `types/api.ts` — `WorkType`, `GetWorkTypesResponseData`, `SITE_REPORT_ACTIONS.GET_WORK_TYPES`
- `lib/api/siteReportWorkflows.ts` — `getWorkTypes()`
- `components/site-report/SitePicker.tsx` + `.test.tsx` — real `<select>`
- `components/site-report/ReportForm.tsx` + `.test.tsx` — `作業種別` becomes a `<select>`, new `workTypes` prop
- `components/site-report/ReportEntryShell.tsx` + `.test.tsx` — forwards `workTypes`, new "現場を変更" button + confirmation
- `components/site-report/SiteReportScreen.tsx` + `.test.tsx` — parallel `GET_SITES`/`GET_WORK_TYPES` fetch, auto-advance-on-one-site, change-site wiring
- `components/site-report/site-report.module.css` — remove now-dead `.siteList`/`.siteItem` rules, reuse `.input` for the new `<select>`s (no new classes needed)

**Web — do NOT modify:** `lib/api/siteReportClient.ts`, `app/api/site-report/route.ts` (generic proxy — forwards any action name unchanged), `lib/liff.ts`, `components/site-report/reportDraft.ts`, `reportValidation.ts`, `submitReportMapper.ts`, `submission.ts`, `photoCompression.ts`, `photoPipeline.ts`, `photoValidation.ts`, `PhotoUploader.tsx`, `PhotoPreviewList.tsx` (no field they touch changes shape).

---

### Task 1: WORK_TYPES + REPORTS schema definitions

**Files:**
- Modify: `apps/site-report/gas/src/SheetNames.ts`
- Modify: `apps/site-report/gas/src/SheetSchemas.ts`
- Test: `apps/site-report/gas/tests/SheetSchemas.test.ts`

**Interfaces:**
- Produces: `SHEET_NAMES.WORK_TYPES` (string `"WORK_TYPES"`); `WORK_TYPES_HEADERS: readonly ["code","name","status","sortOrder"]`; `WorkTypeRow { code: string; name: string; status: string; sortOrder: number }`; `REPORTS_BASE_HEADERS` (12, not exported — internal); `REPORTS_HEADERS` (13, exported, unchanged export name); `ReportRow.workTypeName?: string`; `REQUIRED_HEADERS[SHEET_NAMES.REPORTS]` now points at the 12-column base, `REQUIRED_HEADERS[SHEET_NAMES.WORK_TYPES]` at the 4-column `WORK_TYPES_HEADERS`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/site-report/gas/tests/SheetSchemas.test.ts` (update the existing `"defines exactly the five site-report sheets"` test to six, update the existing `REPORTS_HEADERS` assertion to 13 columns, and add the new required-headers regression guard):

```typescript
it("defines exactly the six site-report sheets", () => {
  expect(Object.keys(SHEET_NAMES).sort()).toEqual(
    ["CONFIG", "REPORTS", "REPORT_PHOTOS", "SITES", "WORKERS", "WORK_TYPES"].sort(),
  );
});

it("SITES/WORKERS/REPORTS/REPORT_PHOTOS/WORK_TYPES match the expected column lists", () => {
  // ... keep the existing SITES_HEADERS/WORKERS_HEADERS/REPORT_PHOTOS_HEADERS
  // assertions unchanged, and replace the REPORTS_HEADERS assertion with:
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
    "workTypeName",
  ]);
  expect(WORK_TYPES_HEADERS).toEqual(["code", "name", "status", "sortOrder"]);
});

it("REQUIRED_HEADERS.REPORTS stays the original 12 columns, never the 13-column REPORTS_HEADERS", () => {
  // Regression guard for the Phase 1 migration hazard (spec §4.4/§6): making
  // workTypeName "required" would abort setupSiteReport() on every existing
  // production spreadsheet.
  expect(REQUIRED_HEADERS[SHEET_NAMES.REPORTS]).toEqual([
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
  expect(REQUIRED_HEADERS[SHEET_NAMES.REPORTS]).not.toEqual(REPORTS_HEADERS);
});
```

Add `WORK_TYPES_HEADERS` to the existing import line at the top of the file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/SheetSchemas.test.ts`
Expected: FAIL — `SHEET_NAMES.WORK_TYPES`/`WORK_TYPES_HEADERS` do not exist yet (TypeScript compile error surfaced as a Jest failure), and the six-sheet/13-column assertions fail against the current five-sheet/12-column values.

- [ ] **Step 3: Implement the schema changes**

In `apps/site-report/gas/src/SheetNames.ts`, add one entry:

```typescript
export const SHEET_NAMES = {
  CONFIG: "CONFIG",
  SITES: "SITES",
  WORKERS: "WORKERS",
  REPORTS: "REPORTS",
  REPORT_PHOTOS: "REPORT_PHOTOS",
  WORK_TYPES: "WORK_TYPES",
} as const;
```

In `apps/site-report/gas/src/SheetSchemas.ts`, replace the `REPORTS_HEADERS`/`ReportRow` block with:

```typescript
/** REPORTS: persisted site report records. The original 12 columns, in
 *  their original order — never reordered (Phase 1 P0 constraint). */
const REPORTS_BASE_HEADERS = [
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
] as const;

/** Full write-time column order, base + the Phase 1 P0 addition.
 *  `workTypeName` is resolved server-side (SubmitReportService) from the
 *  WORK_TYPES sheet, never trusted from client input. Deliberately NOT
 *  used as REQUIRED_HEADERS[REPORTS] below — see that constant's own
 *  comment for why. */
export const REPORTS_HEADERS = [...REPORTS_BASE_HEADERS, "workTypeName"] as const;

export interface ReportRow {
  reportId: string;
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photoCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  /** Phase 1 P0: Japanese label resolved from WORK_TYPES at submission
   *  time. Optional — absent on every report row written before this
   *  column existed. */
  workTypeName?: string;
}

/** WORK_TYPES: 作業種別 master data (Phase 1 P0). `status`/`sortOrder`
 *  mirror the SITES/WORKERS `status` convention and REPORT's `photoCount`
 *  non-negative-integer convention respectively — no new representational
 *  idea introduced. */
export const WORK_TYPES_HEADERS = ["code", "name", "status", "sortOrder"] as const;
export interface WorkTypeRow {
  code: string;
  name: string;
  status: string;
  sortOrder: number;
}
```

Update `REQUIRED_HEADERS`:

```typescript
export const REQUIRED_HEADERS: Record<SheetName, readonly string[]> = {
  [SHEET_NAMES.CONFIG]: CONFIG_HEADERS,
  [SHEET_NAMES.SITES]: SITES_HEADERS,
  [SHEET_NAMES.WORKERS]: WORKERS_HEADERS,
  // Deliberately the 12-column base, not the 13-column REPORTS_HEADERS —
  // Setup.ts's dedicated workTypeName backfill step (Task 8) handles the
  // 13th column additively so an existing production sheet never fails
  // this required-header check (spec §4.4/§6).
  [SHEET_NAMES.REPORTS]: REPORTS_BASE_HEADERS,
  [SHEET_NAMES.REPORT_PHOTOS]: REPORT_PHOTOS_HEADERS,
  [SHEET_NAMES.WORK_TYPES]: WORK_TYPES_HEADERS,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/SheetSchemas.test.ts`
Expected: PASS, 5 tests in this file now (was 4 — the two existing tests were modified in place, not replaced; one net-new regression guard test was added: 4 + 1 = 5).

Run the full GAS suite to confirm nothing else broke from the `SheetNames`/`SheetSchemas` export shape change:

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **200** (199 baseline + 1 net-new test from this task). No other file references `REPORTS_HEADERS`/`ReportRow`'s new shape yet at this point in the plan (`Setup.test.ts`'s `buildSampleSiteRow` serialization test is SITES-only, unaffected), so nothing else should fail.

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/SheetNames.ts apps/site-report/gas/src/SheetSchemas.ts apps/site-report/gas/tests/SheetSchemas.test.ts
git commit -m "feat(site-report): add WORK_TYPES schema and REPORTS.workTypeName column"
```

---

### Task 2: WorkType domain model, row mapping, validation

**Files:**
- Create: `apps/site-report/gas/src/models/WorkType.ts`
- Modify: `apps/site-report/gas/src/RowMapper.ts`
- Modify: `apps/site-report/gas/src/Validation.ts`
- Modify: `apps/site-report/gas/src/models/Report.ts`
- Test: `apps/site-report/gas/tests/RowMapper.test.ts`
- Test: `apps/site-report/gas/tests/Validation.test.ts`

**Interfaces:**
- Consumes: `WorkTypeRow` (Task 1).
- Produces: `WorkType { code: string; name: string; status: "ACTIVE"|"INACTIVE"; sortOrder: number }` (`models/WorkType.ts`); `mapWorkTypeRow(row: WorkTypeRow): WorkType` (`RowMapper.ts`); `validateWorkTypeRow(row: WorkTypeRow): ValidationIssue[]` (`Validation.ts`); `SiteReport.workTypeName?: string` (`models/Report.ts`); `mapReportRow` now also sets `workTypeName`.

- [ ] **Step 1: Write the failing tests**

`apps/site-report/gas/src/models/WorkType.ts` doesn't exist yet, so first add the import and tests to `apps/site-report/gas/tests/RowMapper.test.ts`:

```typescript
import { mapWorkTypeRow } from "../src/RowMapper";
import { WorkTypeRow } from "../src/SheetSchemas";

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
```

Extend the existing `describe("mapReportRow", ...)` block (or add one if none exists — check the file; `mapReportRow` is currently only exercised via `models.test.ts`/`Api.test.ts`/`SubmitReportService.test.ts` fixtures, so add a new block):

```typescript
describe("mapReportRow — workTypeName", () => {
  it("converts an empty workTypeName cell to undefined", () => {
    const row: ReportRow = {
      reportId: "RPT-1", siteId: "STE-1", lineUserId: "U1", workerName: "Taro",
      reportDate: "2026-09-12", workType: "EXTERIOR_WALL", photoCount: 0, status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z", workTypeName: "",
    };
    expect(mapReportRow(row).workTypeName).toBeUndefined();
  });

  it("passes through a present workTypeName", () => {
    const row: ReportRow = {
      reportId: "RPT-1", siteId: "STE-1", lineUserId: "U1", workerName: "Taro",
      reportDate: "2026-09-12", workType: "EXTERIOR_WALL", photoCount: 0, status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z", workTypeName: "外壁工事",
    };
    expect(mapReportRow(row).workTypeName).toBe("外壁工事");
  });
});
```

Add `MalformedRowValueError` to the existing `RowMapper.test.ts` import line if not already imported (it already is, per the file's current top).

In `apps/site-report/gas/tests/Validation.test.ts`, add:

```typescript
import { validateWorkTypeRow } from "../src/Validation";
import { WorkTypeRow } from "../src/SheetSchemas";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/RowMapper.test.ts tests/Validation.test.ts`
Expected: FAIL — `mapWorkTypeRow`/`validateWorkTypeRow` are not exported yet.

- [ ] **Step 3: Implement**

In `apps/site-report/gas/src/models/WorkType.ts` (new file):

```typescript
/** 作業種別 master-data record (Phase 1 P0). Independent from any salon
 *  domain type. */
export interface WorkType {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}
```

In `apps/site-report/gas/src/models/Report.ts`, add one field:

```typescript
export interface SiteReport {
  reportId: string;
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photoCount: number;
  status: "SUBMITTED";
  createdAt: string;
  updatedAt: string;
  /** Phase 1 P0: Japanese label resolved from WORK_TYPES at submission
   *  time — see SubmitReportService.submitReport. */
  workTypeName?: string;
}
```

In `apps/site-report/gas/src/RowMapper.ts`, add the import (`WorkTypeRow` from `./SheetSchemas`, `WorkType` from `./models/WorkType`) and the mapper function, next to `mapSiteRow`:

```typescript
/** Maps a WORK_TYPES data row to a WorkType. */
export function mapWorkTypeRow(row: WorkTypeRow): WorkType {
  return {
    code: toTrimmedString(row.code, "code"),
    name: toTrimmedString(row.name, "name"),
    status: toEnum(row.status, "status", ["ACTIVE", "INACTIVE"] as const),
    sortOrder: toNonNegativeInteger(row.sortOrder, "sortOrder"),
  };
}
```

And extend `mapReportRow`'s return object with:

```typescript
    workTypeName: toOptionalString(row.workTypeName, "workTypeName"),
```

(added as the last field, after `updatedAt`, matching `ReportRow`'s field order).

In `apps/site-report/gas/src/Validation.ts`, add next to `validateReportRow`:

```typescript
/** Validates a WORK_TYPES row. */
export function validateWorkTypeRow(row: WorkTypeRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requireNonEmptyString(row.code, "code", issues);
  requireNonEmptyString(row.name, "name", issues);
  requireStatus(row.status, "status", ["ACTIVE", "INACTIVE"] as const, issues);
  if (typeof row.sortOrder !== "number" || !Number.isInteger(row.sortOrder) || row.sortOrder < 0) {
    issues.push({ field: "sortOrder", reason: "must be a non-negative integer" });
  }
  return issues;
}
```

Add `WorkTypeRow` to `Validation.ts`'s existing import from `./SheetSchemas`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/RowMapper.test.ts tests/Validation.test.ts tests/models.test.ts`
Expected: PASS. `models.test.ts` should still pass unmodified (it does compile-time/shape checks against the existing types — `SiteReport.workTypeName` being optional cannot break an existing object literal that omits it).

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **210** (200 after Task 1 + 10 net-new: 3 `mapWorkTypeRow` + 2 `mapReportRow` + 5 `validateWorkTypeRow`).

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/models/WorkType.ts apps/site-report/gas/src/models/Report.ts apps/site-report/gas/src/RowMapper.ts apps/site-report/gas/src/Validation.ts apps/site-report/gas/tests/RowMapper.test.ts apps/site-report/gas/tests/Validation.test.ts
git commit -m "feat(site-report): add WorkType domain model, mapping, and validation"
```

---

### Task 3: WorkTypesRepository (getWorkTypeRows + buildWorkTypesResult)

**Files:**
- Create: `apps/site-report/gas/src/WorkTypesRepository.ts`
- Test: `apps/site-report/gas/tests/Api.test.ts` (co-located with the sibling `buildSitesResult` tests, matching this codebase's existing convention of testing repository pure-functions from `Api.test.ts` rather than a dedicated repository test file)

**Interfaces:**
- Consumes: `mapWorkTypeRow`, `validateWorkTypeRow` (Task 2); `getConfiguredSpreadsheet`, `getHeaderRow`, `getRequiredSheet`, `readRawRows`, `requireHeaders` (`SheetStore.ts`, unchanged); `rowsToObjects`, `MalformedRowValueError` (`RowMapper.ts`, unchanged).
- Produces: `getWorkTypeRows(): WorkTypeRow[]`; `WorkTypesResult = { ok: true; workTypes: WorkType[] } | { ok: false; kind: "malformed"; index: number; field: string; reason: string } | { ok: false; kind: "invalid"; index: number; issues: ValidationIssue[] }`; `buildWorkTypesResult(rows: WorkTypeRow[]): WorkTypesResult` — filters to `status === "ACTIVE"` and sorts by `sortOrder` ascending in its `ok: true` branch. Task 5 (`Api.ts`) and Task 6 (`SubmitReportService.ts`) both call `buildWorkTypesResult`/`getWorkTypeRows`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/site-report/gas/tests/Api.test.ts`, right after the existing `describe("buildSitesResult", ...)` block, importing `buildWorkTypesResult` from `"../src/WorkTypesRepository"` and `WorkTypeRow` from `"../src/SheetSchemas"`:

```typescript
function workTypeRow(overrides: Partial<WorkTypeRow> = {}): WorkTypeRow {
  return { code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10, ...overrides };
}

describe("buildWorkTypesResult", () => {
  it("maps every valid row to a WorkType", () => {
    const result = buildWorkTypesResult([workTypeRow()]);
    expect(result).toEqual({ ok: true, workTypes: [{ code: "EXTERIOR_WALL", name: "外壁工事", status: "ACTIVE", sortOrder: 10 }] });
  });

  it("returns an empty list for zero data rows", () => {
    expect(buildWorkTypesResult([])).toEqual({ ok: true, workTypes: [] });
  });

  it("filters out INACTIVE work types", () => {
    const result = buildWorkTypesResult([workTypeRow({ code: "A", sortOrder: 1 }), workTypeRow({ code: "B", sortOrder: 2, status: "INACTIVE" })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workTypes.map((w) => w.code)).toEqual(["A"]);
    }
  });

  it("sorts the result by sortOrder ascending regardless of sheet row order", () => {
    const result = buildWorkTypesResult([workTypeRow({ code: "B", sortOrder: 20 }), workTypeRow({ code: "A", sortOrder: 10 })]);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/Api.test.ts`
Expected: FAIL — `apps/site-report/gas/src/WorkTypesRepository.ts` does not exist yet.

- [ ] **Step 3: Implement**

Create `apps/site-report/gas/src/WorkTypesRepository.ts`:

```typescript
import { SHEET_NAMES } from "./SheetNames";
import { WORK_TYPES_HEADERS, WorkTypeRow } from "./SheetSchemas";
import { getConfiguredSpreadsheet, getHeaderRow, getRequiredSheet, readRawRows, requireHeaders } from "./SheetStore";
import { MalformedRowValueError, mapWorkTypeRow, rowsToObjects } from "./RowMapper";
import { validateWorkTypeRow, ValidationIssue } from "./Validation";
import { WorkType } from "./models/WorkType";

/**
 * Thin, internal-only WORK_TYPES repository (Phase 1 P0) — same role and
 * shape as SitesRepository.ts's getSiteRows/buildSitesResult. Not unit
 * tested by Jest for the Sheets-touching function (same convention as
 * every other real-Sheets-touching function in this project);
 * buildWorkTypesResult below carries all the tested logic.
 */
export function getWorkTypeRows(): WorkTypeRow[] {
  const spreadsheet = getConfiguredSpreadsheet();
  const sheet = getRequiredSheet(spreadsheet, SHEET_NAMES.WORK_TYPES);
  const headerMap = requireHeaders(SHEET_NAMES.WORK_TYPES, getHeaderRow(sheet));
  return rowsToObjects(headerMap, readRawRows(sheet), WORK_TYPES_HEADERS) as unknown as WorkTypeRow[];
}

export type WorkTypesResult =
  | { ok: true; workTypes: WorkType[] }
  | { ok: false; kind: "malformed"; index: number; field: string; reason: string }
  | { ok: false; kind: "invalid"; index: number; issues: ValidationIssue[] };

/** Pure core of GET_WORK_TYPES (and SUBMIT_REPORT's work-type lookup):
 *  maps+validates every row (never touches SpreadsheetApp), then the
 *  ok:true branch filters to ACTIVE and sorts by sortOrder ascending — the
 *  stable display order the dropdown renders in, independent of the raw
 *  sheet's physical row order (unlike buildSitesResult, which preserves
 *  sheet order — WORK_TYPES has an explicit sortOrder column precisely so
 *  an operator can reorder the dropdown without reordering sheet rows). */
export function buildWorkTypesResult(rows: WorkTypeRow[]): WorkTypesResult {
  const workTypes: WorkType[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    let workType: WorkType;
    try {
      workType = mapWorkTypeRow(row);
    } catch (error) {
      if (error instanceof MalformedRowValueError) {
        return { ok: false, kind: "malformed", index, field: error.field, reason: error.reason };
      }
      throw error;
    }
    const issues = validateWorkTypeRow(row);
    if (issues.length > 0) {
      return { ok: false, kind: "invalid", index, issues };
    }
    workTypes.push(workType);
  }
  const active = workTypes.filter((workType) => workType.status === "ACTIVE");
  active.sort((a, b) => a.sortOrder - b.sortOrder);
  return { ok: true, workTypes: active };
}
```

Add the two new imports (`buildWorkTypesResult` from `"../src/WorkTypesRepository"`, `WorkTypeRow` from `"../src/SheetSchemas"`) to `apps/site-report/gas/tests/Api.test.ts`'s existing import block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/Api.test.ts`
Expected: PASS, 6 new tests in the `buildWorkTypesResult` block.

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **216** (210 after Task 2 + 6 net-new).

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/WorkTypesRepository.ts apps/site-report/gas/tests/Api.test.ts
git commit -m "feat(site-report): add WorkTypesRepository (getWorkTypeRows, buildWorkTypesResult)"
```

---

### Task 4: SitesRepository — filter to ACTIVE

**Files:**
- Modify: `apps/site-report/gas/src/SitesRepository.ts`
- Test: `apps/site-report/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildSitesResult`'s `ok: true` branch now returns only `status === "ACTIVE"` sites, still in original sheet row order among themselves. Every caller (`getSitesAction` in Task 5, `SubmitReportService.submitReport`, already-existing) is unaffected in signature — only the returned data changes.

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe("buildSitesResult", ...)` block in `apps/site-report/gas/tests/Api.test.ts`:

```typescript
it("filters out INACTIVE sites from the result", () => {
  const result = buildSitesResult([siteRow({ siteId: "STE-1", status: "ACTIVE" }), siteRow({ siteId: "STE-2", status: "INACTIVE" })]);
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
```

Add a corresponding case to `describe("getSitesAction", ...)`:

```typescript
it("excludes INACTIVE sites from the GET_SITES response", () => {
  mockGetSiteRows.mockReturnValue([siteRow({ siteId: "STE-1", status: "ACTIVE" }), siteRow({ siteId: "STE-2", status: "INACTIVE" })]);
  const response = getSitesAction();
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.data.sites.map((site) => site.siteId)).toEqual(["STE-1"]);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/Api.test.ts`
Expected: FAIL — the three new tests see the INACTIVE site still present in the result.

- [ ] **Step 3: Implement**

In `apps/site-report/gas/src/SitesRepository.ts`, change `buildSitesResult`'s final line from:

```typescript
  return { ok: true, sites };
```

to:

```typescript
  // Phase 1 P0: only ACTIVE sites are ever surfaced to GET_SITES or
  // SUBMIT_REPORT's site lookup (both call this function) — every row is
  // still fully mapped+validated above regardless of status, so an
  // invalid INACTIVE row still fails the whole result rather than being
  // silently filtered away unnoticed.
  return { ok: true, sites: sites.filter((site) => site.status === "ACTIVE") };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/Api.test.ts`
Expected: PASS, 3 new tests.

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **219** (216 after Task 3 + 3 net-new).

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/SitesRepository.ts apps/site-report/gas/tests/Api.test.ts
git commit -m "fix(site-report): GET_SITES/SUBMIT_REPORT only ever see ACTIVE sites"
```

---

### Task 5: Api.ts — GET_WORK_TYPES action, WORK_TYPE_NOT_FOUND error code

**Files:**
- Modify: `apps/site-report/gas/src/Api.ts`
- Test: `apps/site-report/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: `getWorkTypeRows`, `buildWorkTypesResult` (Task 3); `SubmitReportOutcome` kinds `"work_type_not_found"`/`"work_types_unavailable"` (Task 6 — written in this task's `mapSubmitReportOutcomeToResponse` switch ahead of Task 6's own change, since TypeScript's discriminated union in `SubmitReportOutcome` doesn't exist until Task 6; **do this task's `mapSubmitReportOutcomeToResponse` edit together with Task 6**, not before — see Task 6's own Api.ts step).
- Produces: `ERROR_CODES.WORK_TYPE_NOT_FOUND`; `GetWorkTypesResponseData { workTypes: WorkType[] }`; `getWorkTypesAction(): ApiResponse<GetWorkTypesResponseData>`; `handleApiRequest` dispatches `"GET_WORK_TYPES"` to it.

- [ ] **Step 1: Write the failing tests**

Add to `apps/site-report/gas/tests/Api.test.ts`, mirroring the existing `describe("getSitesAction", ...)` tests (the file already mocks `SitesRepository`'s `getSiteRows` — add an equivalent mock for `WorkTypesRepository`'s `getWorkTypeRows` at the top of the file, next to the existing `jest.mock("../src/SitesRepository", ...)` call):

```typescript
jest.mock("../src/WorkTypesRepository", () => ({
  ...jest.requireActual("../src/WorkTypesRepository"),
  getWorkTypeRows: jest.fn(),
}));
// ... and in the imports:
import { getWorkTypeRows } from "../src/WorkTypesRepository";
const mockGetWorkTypeRows = getWorkTypeRows as jest.Mock;
```

```typescript
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
```

(`mockGetSiteReportConfig`/`SiteReportConfigError` already exist in this file's top-level test setup for `getSitesAction`'s own equivalent test — reuse them, do not redeclare.)

Add one dispatch test to the existing `describe("handleApiRequest", ...)` block:

```typescript
it("dispatches GET_WORK_TYPES to getWorkTypesAction", () => {
  mockGetWorkTypeRows.mockReturnValue([]);
  const response = handleApiRequest(JSON.stringify({ action: "GET_WORK_TYPES" }));
  expect(response).toEqual({ ok: true, data: { workTypes: [] } });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/Api.test.ts`
Expected: FAIL — `getWorkTypesAction`/`ERROR_CODES.WORK_TYPE_NOT_FOUND` are not exported from `Api.ts` yet.

- [ ] **Step 3: Implement**

In `apps/site-report/gas/src/Api.ts`, add the import:

```typescript
import { buildWorkTypesResult, getWorkTypeRows } from "./WorkTypesRepository";
import { WorkType } from "./models/WorkType";
```

Add to `ERROR_CODES`:

```typescript
  /** Phase 1 P0: SUBMIT_REPORT references a workType code that
   *  GET_WORK_TYPES-equivalent lookup could not find — same relationship
   *  to DATA_INVALID as SITE_NOT_FOUND has (this means the sheet is fine
   *  but the given code isn't in it). */
  WORK_TYPE_NOT_FOUND: "WORK_TYPE_NOT_FOUND",
```

Add, right after `getSitesAction`:

```typescript
export interface GetWorkTypesResponseData {
  workTypes: WorkType[];
}

function getWorkTypesActionInner(): ApiResponse<GetWorkTypesResponseData> {
  getSiteReportConfig();
  const rows = getWorkTypeRows();
  const result = buildWorkTypesResult(rows);
  if (!result.ok) {
    if (result.kind === "malformed") {
      console.error(
        `[GET_WORK_TYPES] malformed row at index ${result.index}, field "${result.field}": ${result.reason}`,
      );
    } else {
      console.error(`[GET_WORK_TYPES] invalid row at index ${result.index}:`, JSON.stringify(result.issues));
    }
    return buildErrorResponse(
      ERROR_CODES.DATA_INVALID,
      "Work type data failed validation. Please contact the administrator.",
    );
  }
  return buildSuccessResponse({ workTypes: result.workTypes });
}

/** `GET_WORK_TYPES` action handler (Phase 1 P0) — mirrors getSitesAction
 *  exactly. Independently callable from GET_SITES (no shared state, no
 *  ordering requirement between the two). */
export function getWorkTypesAction(): ApiResponse<GetWorkTypesResponseData> {
  try {
    return getWorkTypesActionInner();
  } catch (error) {
    if (error instanceof SiteReportConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[GET_WORK_TYPES] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected server error occurred.");
  }
}
```

Add the dispatch case in `handleApiRequest`:

```typescript
    case "GET_WORK_TYPES":
      return getWorkTypesAction();
```

Do **not** touch `mapSubmitReportOutcomeToResponse` in this task — that happens in Task 6, together with the `SubmitReportOutcome` type change it depends on.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/Api.test.ts`
Expected: PASS, 5 new tests (4 `getWorkTypesAction` + 1 dispatch).

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **224** (219 after Task 4 + 5 net-new).

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/Api.ts apps/site-report/gas/tests/Api.test.ts
git commit -m "feat(site-report): add GET_WORK_TYPES action"
```

---

### Task 6: SubmitReportService — resolve and validate work type

**Files:**
- Modify: `apps/site-report/gas/src/SubmitReportService.ts`
- Modify: `apps/site-report/gas/src/Api.ts` (the `mapSubmitReportOutcomeToResponse` cases deferred from Task 5)
- Test: `apps/site-report/gas/tests/SubmitReportService.test.ts`
- Test: `apps/site-report/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: `getWorkTypeRows`, `buildWorkTypesResult` (Task 3).
- Produces: `SubmitReportOutcome` gains `{ kind: "work_type_not_found" }` and `{ kind: "work_types_unavailable" }`; `submitReport`'s success path now sets `ReportRow.workTypeName`/`SiteReport.workTypeName` from the resolved `WorkType.name`; `Api.ts`'s `ERROR_CODES.WORK_TYPE_NOT_FOUND` (Task 5) is now actually reachable via `mapSubmitReportOutcomeToResponse`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/site-report/gas/tests/SubmitReportService.test.ts`. First, mock `WorkTypesRepository` next to the existing `SitesRepository` mock at the top of the file:

```typescript
jest.mock("../src/WorkTypesRepository", () => ({
  ...jest.requireActual("../src/WorkTypesRepository"),
  getWorkTypeRows: jest.fn(),
}));
// ... imports:
import { getWorkTypeRows } from "../src/WorkTypesRepository";
import { WorkTypeRow } from "../src/SheetSchemas";
const mockGetWorkTypeRows = getWorkTypeRows as jest.Mock;

function workTypeRow(overrides: Partial<WorkTypeRow> = {}): WorkTypeRow {
  return { code: "wiring", name: "電気工事", status: "ACTIVE", sortOrder: 1, ...overrides };
}
```

Add a default in the existing `beforeEach`, next to `mockGetSiteRows.mockReturnValue([siteRow()]);`:

```typescript
  mockGetWorkTypeRows.mockReturnValue([workTypeRow()]);
```

(`submitInput()`'s existing fixture already uses `workType: "wiring"`, matching this default `workTypeRow`'s `code` — no fixture change needed.)

Add a new describe block, next to `describe("site lookup", ...)`:

```typescript
describe("work type lookup", () => {
  it("proceeds and derives workTypeName for a valid, existing work type code", () => {
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("success");
    expect(mockAppendReportRow.mock.calls[0][0].workTypeName).toBe("電気工事");
    if (outcome.kind === "success") {
      expect(outcome.report.workTypeName).toBe("電気工事");
    }
  });

  it("returns work_type_not_found for an unknown code, without any writes", () => {
    const outcome = submitReport(submitInput({ workType: "unknown-code" }));
    expect(outcome.kind).toBe("work_type_not_found");
    expect(mockUploadReportPhoto).not.toHaveBeenCalled();
    expect(mockAppendReportRow).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it("returns work_type_not_found for an INACTIVE work type code", () => {
    mockGetWorkTypeRows.mockReturnValue([workTypeRow({ status: "INACTIVE" })]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("work_type_not_found");
  });

  it("returns work_types_unavailable when the WORK_TYPES sheet itself fails validation, without any writes", () => {
    mockGetWorkTypeRows.mockReturnValue([workTypeRow({ status: "PENDING" as unknown as "ACTIVE" })]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("work_types_unavailable");
    expect(mockAppendReportRow).not.toHaveBeenCalled();
  });
});
```

In `apps/site-report/gas/tests/Api.test.ts`, add two cases to the existing `describe("submitReportAction", ...)`-style outcome-mapping tests (find the existing tests that assert on `mapSubmitReportOutcomeToResponse`/`submitReportAction` for `site_not_found`/`sites_unavailable` and add matching ones):

```typescript
it("maps a work_type_not_found outcome to WORK_TYPE_NOT_FOUND", () => {
  mockSubmitReport.mockReturnValue({ kind: "work_type_not_found" });
  const response = submitReportAction(validSubmitPayload());
  expect(response).toEqual({
    ok: false,
    error: { code: ERROR_CODES.WORK_TYPE_NOT_FOUND, message: "The referenced work type could not be found." },
  });
});

it("maps a work_types_unavailable outcome to DATA_INVALID", () => {
  mockSubmitReport.mockReturnValue({ kind: "work_types_unavailable" });
  const response = submitReportAction(validSubmitPayload());
  expect(response.ok).toBe(false);
  if (!response.ok) {
    expect(response.error.code).toBe(ERROR_CODES.DATA_INVALID);
  }
});
```

(Use this file's existing helper name for a valid `SUBMIT_REPORT` payload/mock setup — inspect the existing `site_not_found`/`sites_unavailable` mapping tests immediately above this point in the file and match their exact mock/helper names rather than inventing `validSubmitPayload`/`mockSubmitReport` if the file already names them differently.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/SubmitReportService.test.ts tests/Api.test.ts`
Expected: FAIL — `work_type_not_found`/`work_types_unavailable` don't exist as outcomes yet, `workTypeName` is never set.

- [ ] **Step 3: Implement**

In `apps/site-report/gas/src/SubmitReportService.ts`, add the import:

```typescript
import { buildWorkTypesResult, getWorkTypeRows } from "./WorkTypesRepository";
```

Extend `SubmitReportOutcome`:

```typescript
export type SubmitReportOutcome =
  | { kind: "site_not_found" }
  | { kind: "sites_unavailable" }
  | { kind: "work_type_not_found" }
  | { kind: "work_types_unavailable" }
  | { kind: "drive_upload_failed"; reason: string }
  | { kind: "reports_write_failed"; reason: string }
  | { kind: "report_photos_write_failed"; reason: string }
  | { kind: "success"; report: SiteReport; photos: ReportPhoto[]; notificationSent: boolean };
```

In `submitReport`, right after the existing site-lookup block (after `const site: Site | undefined = ...` / `if (!site) { return { kind: "site_not_found" }; }`) and before `const now = new Date();`, add:

```typescript
  // Phase 1 P0: same existence-check pattern as the site lookup above,
  // reusing GET_WORK_TYPES's own infrastructure rather than a duplicate
  // lookup.
  const workTypesResult = buildWorkTypesResult(getWorkTypeRows());
  if (!workTypesResult.ok) {
    console.error(
      "[SUBMIT_REPORT] WORK_TYPES sheet failed validation while resolving work type:",
      JSON.stringify(workTypesResult),
    );
    return { kind: "work_types_unavailable" };
  }
  const workType = workTypesResult.workTypes.find((candidate) => candidate.code === input.workType);
  if (!workType) {
    return { kind: "work_type_not_found" };
  }
```

In the `reportRow` object literal, add the new field (after `updatedAt`, matching `ReportRow`'s field order):

```typescript
    updatedAt: nowIso,
    workTypeName: workType.name,
  };
```

In the `report: SiteReport` object literal further down, add the matching field:

```typescript
    updatedAt: reportRow.updatedAt,
    workTypeName: reportRow.workTypeName,
  };
```

In `apps/site-report/gas/src/Api.ts`'s `mapSubmitReportOutcomeToResponse`, add two cases (next to the existing `case "site_not_found":`/`case "sites_unavailable":`):

```typescript
    case "work_type_not_found":
      return buildErrorResponse(ERROR_CODES.WORK_TYPE_NOT_FOUND, "The referenced work type could not be found.");
    case "work_types_unavailable":
      console.error("[SUBMIT_REPORT] WORK_TYPES sheet unavailable while resolving work type.");
      return buildErrorResponse(
        ERROR_CODES.DATA_INVALID,
        "Work type data could not be validated. Please contact the administrator.",
      );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/SubmitReportService.test.ts tests/Api.test.ts`
Expected: PASS, 4 new `SubmitReportService.test.ts` tests + 2 new `Api.test.ts` tests.

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **230** (224 after Task 5 + 6 net-new: 4 in `SubmitReportService.test.ts` + 2 in `Api.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/SubmitReportService.ts apps/site-report/gas/src/Api.ts apps/site-report/gas/tests/SubmitReportService.test.ts apps/site-report/gas/tests/Api.test.ts
git commit -m "feat(site-report): SUBMIT_REPORT validates workType against WORK_TYPES"
```

---

### Task 7: AdminNotification — show workTypeName, not the raw code

**Files:**
- Modify: `apps/site-report/gas/src/AdminNotification.ts`
- Test: `apps/site-report/gas/tests/AdminNotification.test.ts`

**Interfaces:**
- Consumes: `SiteReport.workTypeName` (Task 2).
- Produces: `buildAdminNotificationEmail` unchanged signature; body's "Work type:" line now prefers `report.workTypeName`.

- [ ] **Step 1: Write the failing test**

Add to `apps/site-report/gas/tests/AdminNotification.test.ts`:

```typescript
it("shows workTypeName instead of the raw workType code when present", () => {
  const report = { ...baseReport, workType: "EXTERIOR_WALL", workTypeName: "外壁工事" };
  const email = buildAdminNotificationEmail(report, site);
  expect(email.body).toContain("Work type: 外壁工事");
  expect(email.body).not.toContain("EXTERIOR_WALL");
});

it("falls back to the raw workType code when workTypeName is absent", () => {
  const report = { ...baseReport, workType: "legacy free text", workTypeName: undefined };
  const email = buildAdminNotificationEmail(report, site);
  expect(email.body).toContain("Work type: legacy free text");
});
```

(Use this test file's existing `baseReport`/`site` fixture names — inspect the top of `AdminNotification.test.ts` for their exact identifiers before writing this, rather than assuming `baseReport`/`site`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/AdminNotification.test.ts`
Expected: FAIL — the body currently always shows `report.workType` verbatim.

- [ ] **Step 3: Implement**

In `apps/site-report/gas/src/AdminNotification.ts`, change:

```typescript
    `Work type: ${report.workType}`,
```

to:

```typescript
    `Work type: ${report.workTypeName ?? report.workType}`,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/gas && npx jest tests/AdminNotification.test.ts`
Expected: PASS, 2 new tests.

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **232** (230 after Task 6 + 2 net-new).

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/gas/src/AdminNotification.ts apps/site-report/gas/tests/AdminNotification.test.ts
git commit -m "fix(site-report): admin notification shows work type label, not its code"
```

---

### Task 8: Setup.ts — seed WORK_TYPES, backfill REPORTS.workTypeName

**Files:**
- Modify: `apps/site-report/gas/src/Setup.ts`
- Test: `apps/site-report/gas/tests/Setup.test.ts`

**Interfaces:**
- Consumes: `SHEET_NAMES.WORK_TYPES`, `WORK_TYPES_HEADERS` (Task 1); `buildHeaderMap`, `findRowIndexByColumnValue`, `objectToRow` (`RowMapper.ts`, unchanged).
- Produces: `WORK_TYPE_SEED_ROWS: readonly { code: string; name: string; sortOrder: number }[]` (exported, pure data); `buildWorkTypeRowsToInsert(existingCodes: Set<string>): WorkTypeRow[]` (pure, idempotency logic); `needsWorkTypeNameColumn(existingHeaderRow: unknown[]): boolean` (pure); `setupSiteReport()` seeds WORK_TYPES and backfills the `REPORTS.workTypeName` header.

- [ ] **Step 1: Write the failing tests**

Add to `apps/site-report/gas/tests/Setup.test.ts`:

```typescript
import {
  WORK_TYPE_SEED_ROWS,
  buildWorkTypeRowsToInsert,
  needsWorkTypeNameColumn,
} from "../src/Setup";
import { validateWorkTypeRow } from "../src/Validation";
import { mapWorkTypeRow } from "../src/RowMapper";
import { WORK_TYPES_HEADERS } from "../src/SheetSchemas";

describe("WORK_TYPE_SEED_ROWS", () => {
  it("has exactly 22 rows with unique codes and contiguous sortOrder starting at 1", () => {
    expect(WORK_TYPE_SEED_ROWS).toHaveLength(22);
    const codes = WORK_TYPE_SEED_ROWS.map((row) => row.code);
    expect(new Set(codes).size).toBe(22);
    expect(WORK_TYPE_SEED_ROWS.map((row) => row.sortOrder)).toEqual(
      Array.from({ length: 22 }, (_, i) => i + 1),
    );
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
    expect(needsWorkTypeNameColumn([
      "reportId", "siteId", "workerId", "lineUserId", "workerName", "reportDate",
      "workType", "comment", "photoCount", "status", "createdAt", "updatedAt",
    ])).toBe(true);
  });

  it("returns false once workTypeName is present, regardless of position", () => {
    expect(needsWorkTypeNameColumn(["reportId", "workTypeName", "siteId"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/gas && npx jest tests/Setup.test.ts`
Expected: FAIL — `WORK_TYPE_SEED_ROWS`/`buildWorkTypeRowsToInsert`/`needsWorkTypeNameColumn` are not exported yet.

- [ ] **Step 3: Implement**

In `apps/site-report/gas/src/Setup.ts`, add the import (`WORK_TYPES_HEADERS`, `WorkTypeRow` to the existing `SheetSchemas` import line), then add, near `buildSampleSiteRow`:

```typescript
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
```

In `setupSiteReport()`, right after the existing "6. Ensure exactly one demo ACTIVE site exists" block and before "7. Log the final summary", add:

```typescript
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
```

Update the summary call at the bottom to include the two new facts:

```typescript
  console.log(
    buildProvisioningSummary({
      spreadsheet: { name: spreadsheet.getName(), id: spreadsheet.getId(), url: spreadsheet.getUrl() },
      driveFolder: { name: folder.getName(), id: driveRootFolderId, url: folder.getUrl() },
      configSampleInserted: configRowsToInsert.length > 0,
      demoSiteInserted: !demoAlreadyExists,
      workTypesInserted: workTypeRowsToInsert.length,
      reportsWorkTypeNameColumnAdded: workTypeNameColumnAdded,
    }),
  );
```

Update `ProvisioningSummaryInput` and `buildProvisioningSummary`:

```typescript
export interface ProvisioningSummaryInput {
  spreadsheet: { name: string; id: string; url: string };
  driveFolder: { name: string; id: string; url: string };
  configSampleInserted: boolean;
  demoSiteInserted: boolean;
  workTypesInserted: number;
  reportsWorkTypeNameColumnAdded: boolean;
}
```

Add two lines to `buildProvisioningSummary`'s "Sample data:" section:

```typescript
    "Sample data:",
    `  CONFIG: ${input.configSampleInserted ? "configured" : "already present"}`,
    `  ACTIVE site: ${input.demoSiteInserted ? "configured" : "already present"}`,
    `  WORK_TYPES: ${input.workTypesInserted > 0 ? `${input.workTypesInserted} inserted` : "already present"}`,
    `  REPORTS.workTypeName column: ${input.reportsWorkTypeNameColumnAdded ? "added" : "already present"}`,
    "",
```

Add `getHeaderRow` to the existing `SheetStore` import line in `Setup.ts` if not already imported (it already is, per the current file's import list).

- [ ] **Step 4: Run tests to verify they pass**

First update the existing `buildProvisioningSummary` tests in `Setup.test.ts` — `baseInput` needs the two new required fields:

```typescript
  const baseInput = {
    spreadsheet: { name: "Site Report", id: "SPREADSHEET_ID_PLACEHOLDER", url: "https://example.com/spreadsheet" },
    driveFolder: { name: "Site Report Photos", id: "FOLDER_ID_PLACEHOLDER", url: "https://example.com/folder" },
    configSampleInserted: true,
    demoSiteInserted: true,
    workTypesInserted: 22,
    reportsWorkTypeNameColumnAdded: true,
  };
```

And its two "already present"/"configured" assertions each gain one more line:

```typescript
  it("reports 'configured' for freshly-inserted sample data", () => {
    const summary = buildProvisioningSummary(baseInput);
    expect(summary).toContain("CONFIG: configured");
    expect(summary).toContain("ACTIVE site: configured");
    expect(summary).toContain("WORK_TYPES: 22 inserted");
    expect(summary).toContain("REPORTS.workTypeName column: added");
  });

  it("reports 'already present' on a rerun that inserted nothing new", () => {
    const summary = buildProvisioningSummary({
      ...baseInput,
      configSampleInserted: false,
      demoSiteInserted: false,
      workTypesInserted: 0,
      reportsWorkTypeNameColumnAdded: false,
    });
    expect(summary).toContain("CONFIG: already present");
    expect(summary).toContain("ACTIVE site: already present");
    expect(summary).toContain("WORK_TYPES: already present");
    expect(summary).toContain("REPORTS.workTypeName column: already present");
  });
```

Run: `cd apps/site-report/gas && npx jest tests/Setup.test.ts`
Expected: PASS — 9 net-new tests (3 `WORK_TYPE_SEED_ROWS` + 4 `buildWorkTypeRowsToInsert` + 2 `needsWorkTypeNameColumn`; the 2 existing `buildProvisioningSummary` tests gained assertions in place and are not new `it` blocks, so they add 0 to the count).

Run: `cd apps/site-report/gas && npm test`
Expected: PASS, **241** (232 after Task 7 + 9 net-new).

- [ ] **Step 5: Manual verification against a real (throwaway) spreadsheet**

This step touches real Google APIs and cannot be Jest-tested — verify by hand before committing:

1. In the Apps Script editor (or a scratch project), run `setupSiteReport()` against a **fresh, empty** Script Properties state (no `SPREADSHEET_ID` set). Confirm the log ends with `WORK_TYPES: 22 inserted` and `REPORTS.workTypeName column: added`, and that the `WORK_TYPES` sheet has 22 rows plus a header.
2. Run `setupSiteReport()` a second time with the same `SPREADSHEET_ID`. Confirm the log now shows `WORK_TYPES: already present` and `REPORTS.workTypeName column: already present`, and that no row was duplicated (still 22 data rows in `WORK_TYPES`).
3. Manually delete the `workTypeName` header cell from a test spreadsheet's `REPORTS` sheet (simulating a pre-existing production sheet) and rerun `setupSiteReport()`. Confirm it does not throw, the header cell reappears in the correct next column, and no existing `REPORTS` data row is altered.

- [ ] **Step 6: Commit**

```bash
git add apps/site-report/gas/src/Setup.ts apps/site-report/gas/tests/Setup.test.ts
git commit -m "feat(site-report): seed WORK_TYPES and backfill REPORTS.workTypeName in setupSiteReport()"
```

---

**GAS backend complete at this point: 241 passing (was 199, +42 net-new: 1+10+6+3+5+6+2+9 across Tasks 1–8), all new behavior additive, `REQUIRED_HEADERS.REPORTS` still the original 12 columns.**

---

### Task 9: types/api.ts — WorkType contract mirror

**Files:**
- Modify: `apps/site-report/web/types/api.ts`
- Test: none (this file has no dedicated test — it is a pure type-mirror module, consistent with the existing file having no `.test.ts` of its own; its correctness is exercised indirectly by every component test that imports these types).

**Interfaces:**
- Produces: `WorkType { code: string; name: string; status: "ACTIVE"|"INACTIVE"; sortOrder: number }`; `GetWorkTypesResponseData { workTypes: WorkType[] }`; `SITE_REPORT_ACTIONS.GET_WORK_TYPES: "GET_WORK_TYPES"`.

- [ ] **Step 1: Implement**

In `apps/site-report/web/types/api.ts`, add to `SITE_REPORT_ACTIONS`:

```typescript
export const SITE_REPORT_ACTIONS = {
  GET_SITES: "GET_SITES",
  GET_WORK_TYPES: "GET_WORK_TYPES",
  SUBMIT_REPORT: "SUBMIT_REPORT",
} as const;
```

Add, next to `Site`/`GetSitesResponseData`:

```typescript
/** Mirrors GAS `models/WorkType.ts`'s `WorkType` exactly. */
export interface WorkType {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}

/** Mirrors GAS `Api.ts`'s `GetWorkTypesResponseData` — the `GET_WORK_TYPES`
 *  success payload. */
export interface GetWorkTypesResponseData {
  workTypes: WorkType[];
}
```

- [ ] **Step 2: Verify the whole web package still typechecks**

Run: `cd apps/site-report/web && npx tsc --noEmit`
Expected: PASS (no consumer references these new exports yet, so this is a pure addition — cannot break existing typechecks).

- [ ] **Step 3: Commit**

```bash
git add apps/site-report/web/types/api.ts
git commit -m "feat(site-report): add WorkType/GetWorkTypesResponseData to the API type mirror"
```

---

### Task 10: siteReportWorkflows.ts — getWorkTypes()

**Files:**
- Modify: `apps/site-report/web/lib/api/siteReportWorkflows.ts`
- Test: `apps/site-report/web/lib/api/siteReportWorkflows.test.ts`

**Interfaces:**
- Consumes: `WorkType`, `GetWorkTypesResponseData`, `SITE_REPORT_ACTIONS.GET_WORK_TYPES` (Task 9).
- Produces: `getWorkTypes(): Promise<SiteReportClientResult<GetWorkTypesResponseData>>`.

- [ ] **Step 1: Write the failing test**

Check `apps/site-report/web/lib/api/siteReportWorkflows.test.ts`'s existing `getSites()` test for its exact fetch-mocking convention, then add an analogous block:

```typescript
describe("getWorkTypes", () => {
  it("calls GET_WORK_TYPES with an empty payload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { workTypes: [] } }),
    });

    const result = await getWorkTypes();

    expect(result).toEqual({ ok: true, data: { workTypes: [] } });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/site-report",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "GET_WORK_TYPES", payload: {} }),
      }),
    );
  });
});
```

(Match the existing file's exact `mockFetch`/`global.fetch` mocking setup rather than inventing a new one — copy the pattern from the existing `describe("getSites", ...)` block.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/site-report/web && npx jest lib/api/siteReportWorkflows.test.ts`
Expected: FAIL — `getWorkTypes` is not exported yet.

- [ ] **Step 3: Implement**

In `apps/site-report/web/lib/api/siteReportWorkflows.ts`, add `GetWorkTypesResponseData` to the existing `import type { ... } from "@/types/api"` line, then add, next to `getSites`:

```typescript
/**
 * Calls `GET_WORK_TYPES`. Same shape as `getSites()` above — the GAS
 * handler takes no payload.
 */
export function getWorkTypes(): Promise<SiteReportClientResult<GetWorkTypesResponseData>> {
  return callSiteReportRoute<GetWorkTypesResponseData>(SITE_REPORT_ACTIONS.GET_WORK_TYPES, {});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/site-report/web && npx jest lib/api/siteReportWorkflows.test.ts`
Expected: PASS, 1 new test.

Run: `cd apps/site-report/web && npm test`
Expected: PASS, 190 + 1 = 191 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/web/lib/api/siteReportWorkflows.ts apps/site-report/web/lib/api/siteReportWorkflows.test.ts
git commit -m "feat(site-report): add getWorkTypes() workflow function"
```

---

### Task 11: SitePicker.tsx — real dropdown

**Files:**
- Modify: `apps/site-report/web/components/site-report/SitePicker.tsx`
- Modify: `apps/site-report/web/components/site-report/site-report.module.css` (remove now-dead `.siteList`/`.siteItem` rules)
- Test: `apps/site-report/web/components/site-report/SitePicker.test.tsx`

**Interfaces:**
- Consumes: `Site` (unchanged, `types/api.ts`).
- Produces: `SitePicker({ sites, onSelect }: { sites: Site[]; onSelect: (site: Site) => void })` — same external contract as before; internals become a native `<select>` with a leading disabled placeholder option and `onSelect(site)` firing from the `<select>`'s `onChange`.

- [ ] **Step 1: Write the failing tests**

Replace `apps/site-report/web/components/site-report/SitePicker.test.tsx`'s contents:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { SitePicker } from "./SitePicker";
import type { Site } from "@/types/api";

const SITE_A: Site = {
  siteId: "SITE-1",
  siteCode: "S001",
  name: "Shibuya Tower",
  address: "Shibuya, Tokyo",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SITE_B: Site = {
  siteId: "SITE-2",
  siteCode: "S002",
  name: "Shinjuku Plaza",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SitePicker", () => {
  it("renders a labeled dropdown with a placeholder plus one option per site", () => {
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={() => {}} />);

    const select = screen.getByRole("combobox", { name: "現場名" });
    expect(select).toBeInTheDocument();
    expect(screen.getByText("現場を選択してください")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shibuya Tower" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shinjuku Plaza" })).toBeInTheDocument();
  });

  it("starts with no site selected (the placeholder option)", () => {
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={() => {}} />);

    expect(screen.getByRole("combobox", { name: "現場名" })).toHaveValue("");
  });

  it("calls onSelect with the full Site object when a site is chosen", () => {
    const onSelect = jest.fn();
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("combobox", { name: "現場名" }), { target: { value: SITE_B.siteId } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SITE_B);
  });

  it("never calls onSelect for the placeholder option itself", () => {
    const onSelect = jest.fn();
    render(<SitePicker sites={[SITE_A]} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("combobox", { name: "現場名" }), { target: { value: SITE_A.siteId } });
    fireEvent.change(screen.getByRole("combobox", { name: "現場名" }), { target: { value: "" } });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/web && npx jest components/site-report/SitePicker.test.tsx`
Expected: FAIL — there is no `combobox` role in the current button-list markup.

- [ ] **Step 3: Implement**

Replace `apps/site-report/web/components/site-report/SitePicker.tsx`:

```typescript
import type { Site } from "@/types/api";
import styles from "./site-report.module.css";

/**
 * Mobile-friendly site dropdown (Phase 1 P0 — replaces the Task 8
 * button-list). A native `<select>`: one tap to open, one tap to choose,
 * standard mobile OS picker UI — no custom listbox to maintain. A leading
 * disabled placeholder option means no site is ever silently selected
 * without the user acting; `onSelect(site)` fires once, from `onChange`,
 * only for a real site option (never for the placeholder, whose `value`
 * is the empty string and is filtered out below).
 */
export function SitePicker({
  sites,
  onSelect,
}: {
  sites: Site[];
  onSelect: (site: Site) => void;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const site = sites.find((candidate) => candidate.siteId === event.target.value);
    if (site) {
      onSelect(site);
    }
  };

  return (
    <div className={styles.field}>
      <label htmlFor="site-picker" className={styles.label}>
        現場名
      </label>
      <select id="site-picker" className={styles.input} defaultValue="" onChange={handleChange}>
        <option value="" disabled>
          現場を選択してください
        </option>
        {sites.map((site) => (
          <option key={site.siteId} value={site.siteId}>
            {site.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

In `apps/site-report/web/components/site-report/site-report.module.css`, delete the `.siteList`/`.siteItem` rule blocks (including their responsive/media-query variants) — they are now dead, nothing references them.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/web && npx jest components/site-report/SitePicker.test.tsx`
Expected: PASS, 4 tests (was 2 — net +2).

Run: `cd apps/site-report/web && npm test`
Expected: FAIL at this point — `SiteReportScreen.test.tsx` still queries for the old button-list markup this component no longer renders (expected; fixed in Task 14). Confirm the failures are confined to `SiteReportScreen.test.tsx` and `SitePicker.test.tsx` itself is green.

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/web/components/site-report/SitePicker.tsx apps/site-report/web/components/site-report/SitePicker.test.tsx apps/site-report/web/components/site-report/site-report.module.css
git commit -m "feat(site-report): SitePicker becomes a real dropdown"
```

---

### Task 12: ReportForm.tsx — 作業種別 dropdown

**Files:**
- Modify: `apps/site-report/web/components/site-report/ReportForm.tsx`
- Test: `apps/site-report/web/components/site-report/ReportForm.test.tsx`

**Interfaces:**
- Consumes: `WorkType` (Task 9).
- Produces: `ReportForm({ draft, onChange, workTypes, showAllErrors }: { draft: ReportDraft; onChange: (draft: ReportDraft) => void; workTypes: WorkType[]; showAllErrors?: boolean })` — new required `workTypes` prop; `作業種別` is now a `<select>` bound to `draft.workType` (still the work type **code** as the `<option value>`, matching the existing `ReportDraft.workType: string` field — no `ReportDraft` shape change needed).

- [ ] **Step 1: Write the failing tests**

Replace `apps/site-report/web/components/site-report/ReportForm.test.tsx`'s contents — the `VALID_DRAFT` fixture's `workType` becomes a code, and every test gets a `WORK_TYPES` fixture passed as the new prop:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportForm } from "./ReportForm";
import type { ReportDraft } from "./reportDraft";
import type { WorkType } from "@/types/api";

const WORK_TYPES: WorkType[] = [
  { code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 },
  { code: "CLEANING", name: "清掃", status: "ACTIVE", sortOrder: 20 },
];

const VALID_DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "INSPECTION",
  reportDate: "2026-09-12",
  comment: "All clear.",
  photos: [],
};

describe("ReportForm", () => {
  it("renders a labeled control for every editable report field", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.getByLabelText("作業者名")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "作業種別" })).toBeInTheDocument();
    expect(screen.getByLabelText("報告日")).toBeInTheDocument();
    expect(screen.getByLabelText("コメント")).toBeInTheDocument();
  });

  it("shows the given draft's values in each control", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.getByLabelText("作業者名")).toHaveValue("Taro Yamada");
    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue("INSPECTION");
    expect(screen.getByLabelText("報告日")).toHaveValue("2026-09-12");
    expect(screen.getByLabelText("コメント")).toHaveValue("All clear.");
  });

  it("shows every work type option in Japanese", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.getByRole("option", { name: "検査" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "清掃" })).toBeInTheDocument();
  });

  it("calls onChange with the updated draft when work type is changed", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByRole("combobox", { name: "作業種別" }), { target: { value: "CLEANING" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, workType: "CLEANING" });
  });

  it("calls onChange with the updated draft when the report date is edited", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByLabelText("報告日"), { target: { value: "2026-09-13" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, reportDate: "2026-09-13" });
  });

  it("calls onChange with the updated draft when the comment is edited", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Updated comment" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, comment: "Updated comment" });
  });

  it("calls onChange with the updated draft when worker name is edited", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Jiro Suzuki" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, workerName: "Jiro Suzuki" });
  });

  it("does not show an error for an empty required field before it has been touched", () => {
    render(<ReportForm draft={{ ...VALID_DRAFT, workType: "" }} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a validation error for an empty required field once it has been blurred", () => {
    render(<ReportForm draft={{ ...VALID_DRAFT, workType: "" }} onChange={() => {}} workTypes={WORK_TYPES} />);

    fireEvent.blur(screen.getByRole("combobox", { name: "作業種別" }));

    const workTypeField = screen.getByRole("combobox", { name: "作業種別" });
    expect(workTypeField).toHaveAccessibleDescription(expect.any(String));
    expect(workTypeField).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows no validation errors for a fully valid, touched draft", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    fireEvent.blur(screen.getByLabelText("作業者名"));
    fireEvent.blur(screen.getByRole("combobox", { name: "作業種別" }));
    fireEvent.blur(screen.getByLabelText("報告日"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("showAllErrors", () => {
    it("does not show errors when false (default) and no field has been touched", () => {
      render(
        <ReportForm draft={{ ...VALID_DRAFT, workType: "" }} onChange={() => {}} workTypes={WORK_TYPES} showAllErrors={false} />,
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows every invalid field's error when true, even with no field touched", () => {
      render(
        <ReportForm
          draft={{ ...VALID_DRAFT, workerName: "", workType: "", reportDate: "" }}
          onChange={() => {}}
          workTypes={WORK_TYPES}
          showAllErrors
        />,
      );

      expect(screen.getAllByRole("alert")).toHaveLength(3);
      expect(screen.getByLabelText("作業者名")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("報告日")).toHaveAttribute("aria-invalid", "true");
    });

    it("shows no errors when true but the draft is fully valid", () => {
      render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} showAllErrors />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/web && npx jest components/site-report/ReportForm.test.tsx`
Expected: FAIL — `ReportForm` doesn't accept a `workTypes` prop yet and still renders a text `<input>` for 作業種別.

- [ ] **Step 3: Implement**

In `apps/site-report/web/components/site-report/ReportForm.tsx`, add the import (`WorkType` from `@/types/api`), add `workTypes` to the props destructure/type, and replace the `作業種別` field block:

```typescript
export function ReportForm({
  draft,
  onChange,
  workTypes,
  showAllErrors = false,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
  workTypes: WorkType[];
  showAllErrors?: boolean;
}) {
```

Replace the existing `作業種別` `<input type="text">` block with:

```typescript
      <div className={styles.field}>
        <label htmlFor="report-work-type" className={styles.label}>
          作業種別
        </label>
        <select
          id="report-work-type"
          className={styles.input}
          value={draft.workType}
          onChange={(event) => onChange({ ...draft, workType: event.target.value })}
          onBlur={() => markTouched("workType")}
          aria-invalid={Boolean(isShown("workType") && errors.workType)}
          aria-describedby={isShown("workType") && errors.workType ? "report-work-type-error" : undefined}
        >
          <option value="" disabled>
            選択してください
          </option>
          {workTypes.map((workType) => (
            <option key={workType.code} value={workType.code}>
              {workType.name}
            </option>
          ))}
        </select>
        {isShown("workType") && errors.workType ? (
          <p id="report-work-type-error" className={styles.fieldError} role="alert">
            {errors.workType}
          </p>
        ) : null}
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/web && npx jest components/site-report/ReportForm.test.tsx`
Expected: PASS, **13** tests (was 12 — every original assertion is preserved, adapted from `<input>` to `<select>` queries where needed, plus one net-new "shows every work type option in Japanese" test).

Run: `cd apps/site-report/web && npm test`
Expected: still FAIL only in `SiteReportScreen.test.tsx` (fixed in Task 14) — everything else, including `ReportForm.test.tsx` and `SitePicker.test.tsx`, green.

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/web/components/site-report/ReportForm.tsx apps/site-report/web/components/site-report/ReportForm.test.tsx
git commit -m "feat(site-report): 作業種別 becomes a dropdown backed by WorkType master data"
```

---

### Task 13: ReportEntryShell.tsx — forward workTypes, add 現場を変更

**Files:**
- Modify: `apps/site-report/web/components/site-report/ReportEntryShell.tsx`
- Test: `apps/site-report/web/components/site-report/ReportEntryShell.test.tsx`

**Interfaces:**
- Consumes: `WorkType` (Task 9); `ReportForm`'s new `workTypes` prop (Task 12).
- Produces: `ReportEntryShell` gains two new required props: `workTypes: WorkType[]` (forwarded to `ReportForm`) and `onChangeSite: () => void`. Renders a "現場を変更" button in the `現場` section (hidden once `submission.status === "success"`, matching that section's existing post-success simplification). If any draft field differs from `createInitialReportDraft`'s fresh-draft shape for the same site, clicking it shows a confirmation (`window.confirm`-free — an inline confirm state, consistent with the project's rule against browser-native dialogs in favor of testable UI) before calling `onChangeSite`; otherwise it calls `onChangeSite` immediately.

- [ ] **Step 1: Write the failing tests**

First, read `apps/site-report/web/components/site-report/ReportEntryShell.test.tsx` in full and record its current `it(` count — this plan was written without assuming that number, and the executor must state the real before/after count from actual runs, not an estimate, per this plan's evidence rules.

Check that file's existing fixtures (it renders `ReportEntryShell` directly with hand-built `draft`/`submission` props) and add `workTypes={[]}` (or a small fixture) to every existing render call so they keep compiling, plus these new tests (4 net-new `it` blocks):

```typescript
const WORK_TYPES: WorkType[] = [{ code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 }];

describe("ReportEntryShell — change site (Phase 1 P0)", () => {
  it("renders a 現場を変更 button while the form is editable", () => {
    render(
      <ReportEntryShell
        selectedSite={SITE}
        draft={EMPTY_DRAFT}
        onDraftChange={() => {}}
        workTypes={WORK_TYPES}
        submission={IDLE_SUBMISSION_STATE}
        submitAttempted={false}
        onSubmit={() => {}}
        onCreateAnother={() => {}}
        onChangeSite={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "現場を変更" })).toBeInTheDocument();
  });

  it("calls onChangeSite immediately when the draft is still untouched", () => {
    const onChangeSite = jest.fn();
    render(
      <ReportEntryShell
        selectedSite={SITE}
        draft={EMPTY_DRAFT}
        onDraftChange={() => {}}
        workTypes={WORK_TYPES}
        submission={IDLE_SUBMISSION_STATE}
        submitAttempted={false}
        onSubmit={() => {}}
        onCreateAnother={() => {}}
        onChangeSite={onChangeSite}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "現場を変更" }));

    expect(onChangeSite).toHaveBeenCalledTimes(1);
  });

  it("shows a confirmation instead of navigating immediately once a field has been edited", () => {
    const onChangeSite = jest.fn();
    render(
      <ReportEntryShell
        selectedSite={SITE}
        draft={{ ...EMPTY_DRAFT, comment: "some notes" }}
        onDraftChange={() => {}}
        workTypes={WORK_TYPES}
        submission={IDLE_SUBMISSION_STATE}
        submitAttempted={false}
        onSubmit={() => {}}
        onCreateAnother={() => {}}
        onChangeSite={onChangeSite}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "現場を変更" }));

    expect(onChangeSite).not.toHaveBeenCalled();
    expect(screen.getByText(/現在入力中の内容は失われます/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "現場を変更する" }));
    expect(onChangeSite).toHaveBeenCalledTimes(1);
  });

  it("does not show the 現場を変更 button after a successful submission", () => {
    render(
      <ReportEntryShell
        selectedSite={SITE}
        draft={EMPTY_DRAFT}
        onDraftChange={() => {}}
        workTypes={WORK_TYPES}
        submission={{ status: "success", result: { reportId: "RPT-1", photoCount: 0, notificationSent: true } }}
        submitAttempted={false}
        onSubmit={() => {}}
        onCreateAnother={() => {}}
        onChangeSite={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "現場を変更" })).not.toBeInTheDocument();
  });
});
```

(Inspect the existing file's exact `SITE`/`EMPTY_DRAFT`/import names before writing — reuse them rather than re-declaring; add `WorkType` to the `@/types/api` import.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/web && npx jest components/site-report/ReportEntryShell.test.tsx`
Expected: FAIL — every existing test now fails to compile without a `workTypes`/`onChangeSite` prop, and the new tests fail outright (no such button exists).

- [ ] **Step 3: Implement**

In `apps/site-report/web/components/site-report/ReportEntryShell.tsx`, add `useState` to the React import, add `WorkType` to the `@/types/api` import, and change the props signature:

```typescript
export function ReportEntryShell({
  selectedSite,
  draft,
  onDraftChange,
  workTypes,
  submission,
  submitAttempted,
  onSubmit,
  onCreateAnother,
  onChangeSite,
}: {
  selectedSite: Site;
  draft: ReportDraft;
  onDraftChange: (draft: ReportDraft) => void;
  workTypes: WorkType[];
  submission: SubmissionState;
  submitAttempted: boolean;
  onSubmit: () => void;
  onCreateAnother: () => void;
  onChangeSite: () => void;
}) {
  const [confirmingChangeSite, setConfirmingChangeSite] = useState(false);

  const draftIsUntouched =
    draft.workerName === selectedSite.name || true; // placeholder removed below — see note
```

(The line above is intentionally not the final form — replace it with the real check in the same step, shown next; it is called out only because "draft is untouched" needs a real fresh-draft comparison, not a name coincidence.)

Replace that placeholder line with an explicit, field-by-field comparison against what a fresh draft for this site looks like — `ReportEntryShell` does not have access to the LIFF profile needed to call `createInitialReportDraft` itself, so compare against the empty/default shape directly instead:

```typescript
  const draftIsUntouched = draft.workType === "" && draft.comment === "" && draft.photos.length === 0;

  const handleChangeSiteClick = () => {
    if (draftIsUntouched) {
      onChangeSite();
    } else {
      setConfirmingChangeSite(true);
    }
  };
```

In the success-state early return's `現場` section, leave it unchanged (no button there — confirmed by the new test). In the main (non-success) return's `現場` section, add the button and confirmation:

```typescript
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>現場</h2>
        <p className={styles.message}>{selectedSite.name}</p>
        <p className={styles.hint}>{selectedSite.siteCode}</p>
        <button type="button" className={styles.buttonSecondary} onClick={handleChangeSiteClick}>
          現場を変更
        </button>
        {confirmingChangeSite ? (
          <div className={styles.errorBox} role="alertdialog">
            <p className={styles.message}>現在入力中の内容は失われます。現場を変更しますか？</p>
            <button type="button" className={styles.buttonSecondary} onClick={() => setConfirmingChangeSite(false)}>
              キャンセル
            </button>
            <button type="button" className={styles.button} onClick={onChangeSite}>
              現場を変更する
            </button>
          </div>
        ) : null}
      </div>
```

And pass `workTypes` through to `ReportForm`:

```typescript
      <ReportForm draft={draft} onChange={onDraftChange} workTypes={workTypes} showAllErrors={submitAttempted} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/web && npx jest components/site-report/ReportEntryShell.test.tsx`
Expected: PASS — all pre-existing tests (now updated with the two new props) plus 4 new ones.

Run: `cd apps/site-report/web && npm test`
Expected: still FAIL only in `SiteReportScreen.test.tsx` (Task 14 fixes it) — confirm every other suite, including `ReportEntryShell.test.tsx`, is green.

- [ ] **Step 5: Commit**

```bash
git add apps/site-report/web/components/site-report/ReportEntryShell.tsx apps/site-report/web/components/site-report/ReportEntryShell.test.tsx
git commit -m "feat(site-report): ReportEntryShell forwards work types and adds 現場を変更"
```

---

### Task 14: SiteReportScreen.tsx — parallel fetch, auto-advance, wiring

**Files:**
- Modify: `apps/site-report/web/components/site-report/SiteReportScreen.tsx`
- Test: `apps/site-report/web/components/site-report/SiteReportScreen.test.tsx`

**Interfaces:**
- Consumes: `getWorkTypes` (Task 10); `SitePicker`'s dropdown contract (Task 11, unchanged props); `ReportEntryShell`'s new `workTypes`/`onChangeSite` props (Task 13).
- Produces: `ScreenState`'s `sites-loading`/`sites-error`/`sites-empty`/`site-selection`/`report-entry` variants each also carry `workTypes: WorkType[]` once loaded; loading `GET_SITES` and `GET_WORK_TYPES` happens via `Promise.all`; exactly one ACTIVE site auto-advances straight to `report-entry`; `handleChangeSite` returns from `report-entry` to `site-selection` without refetching.

This is the largest test rewrite in the plan (spec §6 flagged this) — the existing file has ~5 local `selectSiteAndReachReportEntry()` helpers, one per `describe` block, that click a site button against a single-site fixture. With the new dropdown + auto-advance, a single-site fixture reaches `report-entry` with **no interaction at all** once `GET_SITES`/`GET_WORK_TYPES` resolve — so every one of these helpers loses its "find and click" step, and the multi-site "site selection" tests switch from `fireEvent.click(button)` to `fireEvent.change(select)`. This task's Step 1 rewrites the whole file's fixtures/helpers in place, not just appends to it.

Before Step 1, run `cd apps/site-report/web && npx jest components/site-report/SiteReportScreen.test.tsx --listTests --verbose 2>&1 | grep -c "✓\|✗"` (or simply count the `it(`/`it.each(` occurrences in the current file) and record the exact current count — the plan below gives the full replacement content, and this task's "expected passing count" must be computed from that real baseline, not assumed, per this plan's own evidence rules.

- [ ] **Step 1: Rewrite the test file**

Replace `apps/site-report/web/components/site-report/SiteReportScreen.test.tsx` in full:

```typescript
/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SiteReportScreen } from "./SiteReportScreen";
import type { Site, WorkType } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";

jest.mock("../../lib/liff", () => ({
  initializeSiteReportLiff: jest.fn(),
  loginToSiteReport: jest.fn(),
}));
jest.mock("../../lib/api/siteReportWorkflows", () => ({
  getSites: jest.fn(),
  getWorkTypes: jest.fn(),
  submitReport: jest.fn(),
}));
jest.mock("./photoCompression", () => ({
  ...jest.requireActual("./photoCompression"),
  compressPhotoFile: jest
    .fn()
    .mockResolvedValue({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1, width: 1, height: 1 }),
}));

const { initializeSiteReportLiff, loginToSiteReport } = jest.requireMock("../../lib/liff") as {
  initializeSiteReportLiff: jest.Mock;
  loginToSiteReport: jest.Mock;
};
const { getSites, getWorkTypes, submitReport } = jest.requireMock("../../lib/api/siteReportWorkflows") as {
  getSites: jest.Mock;
  getWorkTypes: jest.Mock;
  submitReport: jest.Mock;
};

const PROFILE: SiteReportLiffUser = { userId: "U1234567890", displayName: "Taro Yamada" };

const SITE_A: Site = {
  siteId: "SITE-1",
  siteCode: "S001",
  name: "Shibuya Tower",
  address: "Shibuya, Tokyo",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SITE_B: Site = {
  siteId: "SITE-2",
  siteCode: "S002",
  name: "Shinjuku Plaza",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const WORK_TYPE_A: WorkType = { code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 };

function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

function mockOneSiteOneWorkType() {
  getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });
  getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
}

function mockTwoSitesOneWorkType() {
  getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A, SITE_B] } });
  getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
}

beforeEach(() => {
  initializeSiteReportLiff.mockReset();
  loginToSiteReport.mockReset().mockResolvedValue(undefined);
  getSites.mockReset();
  getWorkTypes.mockReset();
  submitReport.mockReset();
});

describe("SiteReportScreen — LIFF orchestration", () => {
  it("calls initializeSiteReportLiff and shows a loading state on mount", () => {
    initializeSiteReportLiff.mockReturnValue(neverResolves());

    render(<SiteReportScreen />);

    expect(initializeSiteReportLiff).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/読み込んでいます/)).toBeInTheDocument();
  });

  it("shows a login-required state and never calls loginToSiteReport automatically", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "login-required" });

    render(<SiteReportScreen />);

    expect(await screen.findByRole("button", { name: /ログイン/ })).toBeInTheDocument();
    expect(loginToSiteReport).not.toHaveBeenCalled();
  });

  it("calls loginToSiteReport when the user activates the login action", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "login-required" });

    render(<SiteReportScreen />);
    const loginButton = await screen.findByRole("button", { name: /ログイン/ });
    fireEvent.click(loginButton);

    expect(loginToSiteReport).toHaveBeenCalledTimes(1);
  });

  it("shows a LIFF error state", async () => {
    initializeSiteReportLiff.mockResolvedValue({
      status: "error",
      error: { code: "LIFF_INIT_FAILED", message: "Failed to initialize the LINE app." },
    });

    render(<SiteReportScreen />);

    expect(await screen.findByText("Failed to initialize the LINE app.")).toBeInTheDocument();
  });
});

describe("SiteReportScreen — GET_SITES/GET_WORK_TYPES orchestration", () => {
  it("calls getSites and getWorkTypes in parallel, both with no arguments, once LIFF is ready", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockReturnValue(neverResolves());
    getWorkTypes.mockReturnValue(neverResolves());

    render(<SiteReportScreen />);

    await waitFor(() => {
      expect(getSites).toHaveBeenCalledTimes(1);
      expect(getWorkTypes).toHaveBeenCalledTimes(1);
    });
    expect(getSites.mock.calls[0]).toEqual([]);
    expect(getWorkTypes.mock.calls[0]).toEqual([]);
  });

  it("renders the site dropdown with every ACTIVE site once both loads succeed", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);

    expect(await screen.findByRole("option", { name: "Shibuya Tower" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shinjuku Plaza" })).toBeInTheDocument();
  });

  it("shows an empty state when the site list is empty", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [] } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText(/現在、利用できる現場がありません/)).toBeInTheDocument();
  });

  it("shows an error state when getSites resolves ok:false", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: false, error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText("The Sites sheet could not be read.")).toBeInTheDocument();
  });

  it("shows an error state when getWorkTypes resolves ok:false", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });
    getWorkTypes.mockResolvedValue({ ok: false, error: { code: "DATA_INVALID", message: "Work type data failed validation." } });

    render(<SiteReportScreen />);

    expect(await screen.findByText("Work type data failed validation.")).toBeInTheDocument();
  });

  it("shows an error state when either call rejects", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockRejectedValue(new Error("network down"));
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText(/現場一覧の取得に失敗しました/)).toBeInTheDocument();
  });

  it("retries both getSites and getWorkTypes when retry is activated after a failure", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValueOnce({ ok: false, error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });

    render(<SiteReportScreen />);
    const retryButton = await screen.findByRole("button", { name: /再試行/ });

    getSites.mockResolvedValueOnce({ ok: true, data: { sites: [SITE_A, SITE_B] } });
    fireEvent.click(retryButton);

    expect(await screen.findByRole("option", { name: "Shibuya Tower" })).toBeInTheDocument();
    expect(getSites).toHaveBeenCalledTimes(2);
    expect(getWorkTypes).toHaveBeenCalledTimes(2);
  });
});

describe("SiteReportScreen — site selection", () => {
  it("shows the dropdown and waits for a choice when more than one ACTIVE site exists", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);
    await screen.findByRole("option", { name: "Shibuya Tower" });

    expect(screen.queryByRole("heading", { name: "現場報告" })).not.toBeInTheDocument();
  });

  it("transitions to the report-entry shell showing the chosen site after a dropdown selection", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);
    const select = await screen.findByRole("combobox", { name: "現場名" });
    fireEvent.change(select, { target: { value: SITE_A.siteId } });

    expect(await screen.findByRole("heading", { name: "現場報告" })).toBeInTheDocument();
    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
  });

  it("auto-advances straight to report-entry when exactly one ACTIVE site exists", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();

    render(<SiteReportScreen />);

    expect(await screen.findByRole("heading", { name: "現場報告" })).toBeInTheDocument();
    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
  });

  it("returns to the dropdown, without refetching, when 現場を変更 is activated", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);
    fireEvent.change(await screen.findByRole("combobox", { name: "現場名" }), { target: { value: SITE_A.siteId } });
    await screen.findByRole("heading", { name: "現場報告" });

    fireEvent.click(screen.getByRole("button", { name: "現場を変更" }));

    expect(await screen.findByRole("combobox", { name: "現場名" })).toBeInTheDocument();
    expect(getSites).toHaveBeenCalledTimes(1);
    expect(getWorkTypes).toHaveBeenCalledTimes(1);
  });

  it("never calls submitReport just from selecting a site", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();

    render(<SiteReportScreen />);

    await screen.findByRole("heading", { name: "現場報告" });
    expect(submitReport).not.toHaveBeenCalled();
  });
});

describe("SiteReportScreen — report entry form (Task 9/Phase 1 P0)", () => {
  async function reachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();
    render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  it("shows the real report form fields after reaching report entry", async () => {
    await reachReportEntry();

    expect(screen.getByRole("combobox", { name: "作業種別" })).toBeInTheDocument();
    expect(screen.getByLabelText("報告日")).toBeInTheDocument();
    expect(screen.getByLabelText("コメント")).toBeInTheDocument();
  });

  it("pre-fills the worker name field from the authenticated LIFF profile", async () => {
    await reachReportEntry();

    expect(screen.getByLabelText("作業者名")).toHaveValue(PROFILE.displayName);
  });

  it("reflects a user edit to a field in the rendered input", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByRole("combobox", { name: "作業種別" }), { target: { value: WORK_TYPE_A.code } });

    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue(WORK_TYPE_A.code);
  });

  it("never calls submitReport while editing report fields", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });

    expect(submitReport).not.toHaveBeenCalled();
  });

  it("renders exactly one real file input for adding photos on the report-entry screen", async () => {
    const { container } = render(<SiteReportScreen />);
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    await reachReportEntry();

    expect(container.querySelectorAll('input[type="file"]').length).toBe(1);
  });
});

describe("SiteReportScreen — photo pipeline (Task 10)", () => {
  async function reachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();
    render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  it("adds a selected photo to the draft without resetting other report fields", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByRole("combobox", { name: "作業種別" }), { target: { value: WORK_TYPE_A.code } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue(WORK_TYPE_A.code);
  });

  it("keeps an added photo when an unrelated report field is edited afterward", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Updated notes" } });

    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("removes a photo without resetting report fields", async () => {
    await reachReportEntry();
    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Custom Name" } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByLabelText("作業者名")).toHaveValue("Custom Name");
  });

  it("never calls submitReport while adding or removing photos", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));

    expect(submitReport).not.toHaveBeenCalled();
  });
});

describe("SiteReportScreen — submission (Task 11)", () => {
  async function reachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();
    render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  function fillValidDraft() {
    fireEvent.change(screen.getByRole("combobox", { name: "作業種別" }), { target: { value: WORK_TYPE_A.code } });
  }

  const SUCCESS_RESULT = { ok: true, data: { reportId: "RPT-1", photoCount: 0, notificationSent: true } } as const;

  it("builds the payload from site/profile/draft and calls submitReport when the submit control is activated", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    expect(submitReport).toHaveBeenCalledWith({
      siteId: SITE_A.siteId,
      lineUserId: PROFILE.userId,
      workerName: PROFILE.displayName,
      reportDate: expect.any(String),
      workType: WORK_TYPE_A.code,
      comment: "",
      photos: [],
    });
  });

  it("submits successfully with an empty photos array", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(submitReport.mock.calls[0][0].photos).toEqual([]);
  });

  it("does not call submitReport and shows validation errors for an invalid draft", async () => {
    await reachReportEntry();

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(submitReport).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("disables the submit control while submission is pending", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockReturnValue(neverResolves());

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /送信/ })).toBeDisabled());
  });

  it("calls submitReport only once for two rapid submit clicks", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockReturnValue(neverResolves());

    const submitButton = screen.getByRole("button", { name: /送信/ });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(submitReport).toHaveBeenCalledTimes(1);
  });

  it("shows the server error message and keeps the draft when submitReport resolves ok:false", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue({ ok: false, error: { code: "VALIDATION_ERROR", message: "The submitted report failed validation." } });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText("The submitted report failed validation.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue(WORK_TYPE_A.code);
    expect(screen.getByRole("button", { name: /送信/ })).not.toBeDisabled();
  });

  it("recovers to an error state and allows a successful retry when submitReport rejects unexpectedly", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockRejectedValueOnce(new Error("network down"));

    const submitButton = screen.getByRole("button", { name: /送信/ });
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    expect(screen.getByRole("alert")).toBeInTheDocument();

    submitReport.mockResolvedValueOnce(SUCCESS_RESULT);
    fireEvent.click(submitButton);

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(submitReport).toHaveBeenCalledTimes(2);
  });

  it("shows a success state and does not call submitReport again automatically", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(submitReport).toHaveBeenCalledTimes(1);
  });

  it("preserves report fields after a submission error", async () => {
    await reachReportEntry();
    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Custom Name" } });
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });
    submitReport.mockResolvedValue({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await screen.findByRole("alert");
    expect(screen.getByLabelText("作業者名")).toHaveValue("Custom Name");
    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue(WORK_TYPE_A.code);
    expect(screen.getByLabelText("コメント")).toHaveValue("Some notes");
  });

  it("submits the current photos, not stale state, after a photo is removed", async () => {
    await reachReportEntry();
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: {
        files: [
          new File(["x"], "a.jpg", { type: "image/jpeg" }),
          new File(["x"], "b.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    submitReport.mockResolvedValue({ ok: true, data: { reportId: "RPT-1", photoCount: 1, notificationSent: true } });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    const payload = submitReport.mock.calls[0][0];
    expect(payload.photos).toHaveLength(1);
    expect(payload.photos[0].fileName).toBe("b.jpg");
  });

  it("submits the latest field value after an edit made just before submit", async () => {
    await reachReportEntry();
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Final notes" } });
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    expect(submitReport.mock.calls[0][0].comment).toBe("Final notes");
  });

  it("resets to a fresh draft and idle submission when creating another report after success", async () => {
    await reachReportEntry();
    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Custom Name" } });
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    submitReport.mockResolvedValue(SUCCESS_RESULT);
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    await screen.findByRole("button", { name: /別のレポートを作成/ });

    fireEvent.click(screen.getByRole("button", { name: /別のレポートを作成/ }));

    expect(screen.getByLabelText("作業者名")).toHaveValue(PROFILE.displayName);
    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue("");
    expect(screen.getByLabelText("コメント")).toHaveValue("");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.queryByText(/送信しました/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^レポートを送信$/ })).not.toBeDisabled();
  });

  it("does not call submitReport again just from creating another report", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    await screen.findByRole("button", { name: /別のレポートを作成/ });

    fireEvent.click(screen.getByRole("button", { name: /別のレポートを作成/ }));

    expect(submitReport).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/site-report/web && npx jest components/site-report/SiteReportScreen.test.tsx`
Expected: FAIL — `getWorkTypes` mock doesn't exist on the real module yet, screen never auto-advances, `ReportEntryShell`/`ReportForm` don't accept the props this test exercises.

- [ ] **Step 3: Implement**

Replace `apps/site-report/web/components/site-report/SiteReportScreen.tsx` in full:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { initializeSiteReportLiff, loginToSiteReport } from "@/lib/liff";
import { getSites, getWorkTypes } from "@/lib/api/siteReportWorkflows";
import type { LiffError, SiteReportLiffUser } from "@/types/liff";
import type { Site, WorkType } from "@/types/api";
import { SitePicker } from "./SitePicker";
import { ReportEntryShell } from "./ReportEntryShell";
import { createInitialReportDraft, type ReportDraft } from "./reportDraft";
import { validateReportDraft } from "./reportValidation";
import { IDLE_SUBMISSION_STATE, submitReportDraft, type SubmissionState } from "./submission";
import styles from "./site-report.module.css";

type FormOptionsError = { code: string; message: string };

type ScreenState =
  | { status: "liff-loading" }
  | { status: "login-required" }
  | { status: "liff-error"; error: LiffError }
  | { status: "options-loading"; profile: SiteReportLiffUser }
  | { status: "options-error"; profile: SiteReportLiffUser; error: FormOptionsError }
  | { status: "sites-empty"; profile: SiteReportLiffUser }
  | { status: "site-selection"; profile: SiteReportLiffUser; sites: Site[]; workTypes: WorkType[] }
  | {
      status: "report-entry";
      profile: SiteReportLiffUser;
      sites: Site[];
      workTypes: WorkType[];
      selectedSite: Site;
      draft: ReportDraft;
      submission: SubmissionState;
      submitAttempted: boolean;
    };

const GENERIC_OPTIONS_ERROR: FormOptionsError = {
  code: "LOAD_FORM_OPTIONS_FAILED",
  message: "現場一覧の取得に失敗しました。もう一度お試しください。",
};

export function SiteReportScreen() {
  const [state, setState] = useState<ScreenState>({ status: "liff-loading" });

  // Phase 1 P0: GET_SITES and GET_WORK_TYPES load in parallel — neither
  // depends on the other's result, and this app is a mobile/LIFF workflow
  // where a serial round-trip pair would double the wait on a slow job-site
  // connection. Either failing shows the same error/retry UI; the two are
  // both re-requested together on retry, matching how loadFormOptions is
  // the single entry point for "ready" -> here.
  const loadFormOptions = useCallback((profile: SiteReportLiffUser) => {
    setState({ status: "options-loading", profile });
    Promise.all([getSites(), getWorkTypes()])
      .then(([sitesResult, workTypesResult]) => {
        if (!sitesResult.ok) {
          setState({ status: "options-error", profile, error: sitesResult.error });
          return;
        }
        if (!workTypesResult.ok) {
          setState({ status: "options-error", profile, error: workTypesResult.error });
          return;
        }
        const { sites } = sitesResult.data;
        const { workTypes } = workTypesResult.data;
        if (sites.length === 0) {
          setState({ status: "sites-empty", profile });
        } else if (sites.length === 1) {
          // Phase 1 P0 §4.6: exactly one ACTIVE site auto-advances — the
          // user can still change it via ReportEntryShell's 現場を変更,
          // which returns to "site-selection" without refetching.
          setState({
            status: "report-entry",
            profile,
            sites,
            workTypes,
            selectedSite: sites[0],
            draft: createInitialReportDraft(profile),
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
          });
        } else {
          setState({ status: "site-selection", profile, sites, workTypes });
        }
      })
      .catch(() => {
        setState({ status: "options-error", profile, error: GENERIC_OPTIONS_ERROR });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    initializeSiteReportLiff().then((liffState) => {
      if (cancelled) {
        return;
      }
      if (liffState.status === "login-required") {
        setState({ status: "login-required" });
      } else if (liffState.status === "error") {
        setState({ status: "liff-error", error: liffState.error });
      } else if (liffState.status === "ready") {
        loadFormOptions(liffState.profile);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadFormOptions]);

  const handleLogin = useCallback(() => {
    loginToSiteReport().catch(() => {});
  }, []);

  const handleSelectSite = useCallback((site: Site) => {
    setState((prev) =>
      prev.status === "site-selection"
        ? {
            status: "report-entry",
            profile: prev.profile,
            sites: prev.sites,
            workTypes: prev.workTypes,
            selectedSite: site,
            draft: createInitialReportDraft(prev.profile),
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
          }
        : prev,
    );
  }, []);

  // Phase 1 P0: returns to the dropdown without refetching GET_SITES/
  // GET_WORK_TYPES — sites/workTypes are already in memory from the
  // report-entry state being left.
  const handleChangeSite = useCallback(() => {
    setState((prev) =>
      prev.status === "report-entry"
        ? { status: "site-selection", profile: prev.profile, sites: prev.sites, workTypes: prev.workTypes }
        : prev,
    );
  }, []);

  const handleDraftChange = useCallback((draft: ReportDraft) => {
    setState((prev) => (prev.status === "report-entry" ? { ...prev, draft } : prev));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (state.status !== "report-entry" || state.submission.status === "submitting") {
      return;
    }
    const { profile, selectedSite, draft } = state;

    setState((prev) => (prev.status === "report-entry" ? { ...prev, submitAttempted: true } : prev));

    const validation = validateReportDraft(draft);
    if (!validation.valid) {
      return;
    }

    setState((prev) => (prev.status === "report-entry" ? { ...prev, submission: { status: "submitting" } } : prev));

    const result = await submitReportDraft({ site: selectedSite, profile, draft });

    setState((prev) => (prev.status === "report-entry" ? { ...prev, submission: result } : prev));
  }, [state]);

  const handleCreateAnother = useCallback(() => {
    setState((prev) =>
      prev.status === "report-entry"
        ? {
            ...prev,
            draft: createInitialReportDraft(prev.profile),
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
          }
        : prev,
    );
  }, []);

  return (
    <div className={styles.screen}>
      {renderBody(
        state,
        handleLogin,
        loadFormOptions,
        handleSelectSite,
        handleChangeSite,
        handleDraftChange,
        handleSubmit,
        handleCreateAnother,
      )}
    </div>
  );
}

function renderBody(
  state: ScreenState,
  handleLogin: () => void,
  loadFormOptions: (profile: SiteReportLiffUser) => void,
  handleSelectSite: (site: Site) => void,
  handleChangeSite: () => void,
  handleDraftChange: (draft: ReportDraft) => void,
  handleSubmit: () => void,
  handleCreateAnother: () => void,
) {
  switch (state.status) {
    case "liff-loading":
      return (
        <p role="status" className={styles.message}>
          読み込んでいます...
        </p>
      );

    case "login-required":
      return (
        <>
          <h1 className={styles.heading}>ログインが必要です</h1>
          <p className={styles.message}>現場報告を利用するには、LINEでログインしてください。</p>
          <button type="button" className={styles.button} onClick={handleLogin}>
            LINEでログイン
          </button>
        </>
      );

    case "liff-error":
      return (
        <div className={styles.errorBox} role="alert">
          <p className={styles.message}>アプリの初期化に失敗しました。</p>
          <p className={styles.hint}>{state.error.message}</p>
        </div>
      );

    case "options-loading":
      return (
        <p role="status" className={styles.message}>
          現場一覧を読み込んでいます...
        </p>
      );

    case "options-error":
      return (
        <div className={styles.errorBox} role="alert">
          <p className={styles.message}>{state.error.message}</p>
          <button type="button" className={styles.buttonSecondary} onClick={() => loadFormOptions(state.profile)}>
            再試行
          </button>
        </div>
      );

    case "sites-empty":
      return (
        <>
          <h1 className={styles.heading}>現場を選択</h1>
          <p className={styles.message}>現在、利用できる現場がありません。</p>
          <p className={styles.hint}>担当者にお問い合わせいただくか、後でもう一度お試しください。</p>
          <button type="button" className={styles.buttonSecondary} onClick={() => loadFormOptions(state.profile)}>
            再試行
          </button>
        </>
      );

    case "site-selection":
      return (
        <>
          <h1 className={styles.heading}>現場を選択</h1>
          <p className={styles.hint}>報告する現場を選んでください。</p>
          <SitePicker sites={state.sites} onSelect={handleSelectSite} />
        </>
      );

    case "report-entry":
      return (
        <ReportEntryShell
          selectedSite={state.selectedSite}
          draft={state.draft}
          onDraftChange={handleDraftChange}
          workTypes={state.workTypes}
          submission={state.submission}
          submitAttempted={state.submitAttempted}
          onSubmit={handleSubmit}
          onCreateAnother={handleCreateAnother}
          onChangeSite={handleChangeSite}
        />
      );

    default:
      return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/site-report/web && npx jest components/site-report/SiteReportScreen.test.tsx`
Expected: PASS.

Run: `cd apps/site-report/web && npm test`
Expected: PASS, every suite green.

- [ ] **Step 5: Final combined verification**

Run: `cd apps/site-report/gas && npm test` — Expected: **241** passing.
Run: `cd apps/site-report/web && npm test` — Expected: the running total carried forward from Task 13's actual passing count (191 after Task 10, +2 from Task 11, +1 from Task 12, +4 net-new from Task 13, plus whatever Task 13's real pre-existing `ReportEntryShell.test.tsx` count turned out to be) plus this task's own net delta in the rewritten `SiteReportScreen.test.tsx` — count `it(` blocks in the final file directly rather than estimating, since several were renamed/merged rather than 1:1 added. State the exact number from the actual `npm test` output, not a projection.
Run: `cd apps/site-report/web && npx tsc --noEmit` — Expected: no errors.
Run: `cd apps/site-report/web && npm run build` — Expected: build succeeds; confirm the build output contains no literal `GAS_WEBAPP_URL` value (grep `.next/` for the real env value if it is set locally, expecting zero matches — same P0 security check the project already relies on).
Run: `cd apps/site-report/gas && npm run build` (or the project's equivalent esbuild script) — Expected: `build/Code.js` compiles with no errors; grep it for `WORK_TYPES`/`getWorkTypesAction` to confirm the new code was actually bundled (esbuild only includes reachable imports — since `Api.ts` imports `WorkTypesRepository.ts`, it is reachable from `index.ts`'s entry point automatically, but confirm rather than assume).

- [ ] **Step 6: Commit**

```bash
git add apps/site-report/web/components/site-report/SiteReportScreen.tsx apps/site-report/web/components/site-report/SiteReportScreen.test.tsx
git commit -m "feat(site-report): parallel GET_SITES/GET_WORK_TYPES load, auto-advance, change-site flow"
```

---

## Deployment / Setup Steps (operator sequence, after all 14 tasks are merged)

1. `cd apps/site-report/gas && npm run build` (produces `build/Code.js`).
2. `cd apps/site-report/gas && npx clasp push` (or the project's existing push command per `SETUP.md`) to the Apps Script project.
3. In the Apps Script editor, run `setupSiteReport()` once. Confirm the execution log shows `WORK_TYPES: 22 inserted` (first run) or `WORK_TYPES: already present` (rerun), and `REPORTS.workTypeName column: added` or `already present`.
4. Open the Spreadsheet and spot-check: `WORK_TYPES` sheet has a header row (`code, name, status, sortOrder`) and 22 data rows; `REPORTS` sheet's header row now has a 13th column, `workTypeName`, with every pre-existing row's cell in that column blank.
5. No new Web App deployment is strictly required for `GET_SITES`'s ACTIVE filter or `GET_WORK_TYPES` to work if the existing deployment already points at `HEAD`/a versioned deployment that picks up the latest code automatically; if the existing deployment is pinned to a fixed version, create a new deployment version and confirm the `/exec` URL is unchanged (same `GAS_WEBAPP_URL` value — no Vercel env change needed for the GAS side).
6. No `GAS_WEBAPP_URL`, `NEXT_PUBLIC_LIFF_ID`, or any other Vercel environment variable changes for this phase — no new server-only config was introduced.
7. `cd apps/site-report/web && npm run build` locally to confirm a clean production build, then deploy via the project's existing Vercel flow (push to the branch Vercel tracks, or `vercel --prod` per the project's own convention — check `START_HERE.md` for the exact command already documented there).
8. Open the LIFF app on a phone (or LIFF's browser preview) and walk the manual test checklist below.

## Manual Test Checklist

```text
[ ] Open LIFF, log in
[ ] With 2+ ACTIVE sites seeded: 現場名 renders as a real dropdown, not buttons
[ ] Selecting a site in the dropdown advances to 現場報告
[ ] With exactly 1 ACTIVE site: app advances straight to 現場報告, no extra tap
[ ] An INACTIVE site (mark one INACTIVE in the sheet) never appears in the dropdown
[ ] 現場を変更 button is visible in the 現場 section of 現場報告
[ ] Tapping 現場を変更 with an untouched form returns to the dropdown immediately
[ ] Tapping 現場を変更 after editing a field shows a confirmation before navigating away
[ ] 作業種別 renders as a dropdown with the 22 seeded Japanese labels
[ ] Selecting a 作業種別 and submitting succeeds; the new REPORTS row's workType column holds the code (e.g. EXTERIOR_WALL) and workTypeName holds the Japanese label
[ ] Submitting without selecting 作業種別 shows a validation error and does not call SUBMIT_REPORT
[ ] The admin notification email shows the Japanese work type label, not the code
[ ] A pre-existing REPORTS row (from before this change) still opens/reads correctly in the Spreadsheet — no shifted columns, no lost data
[ ] Re-running setupSiteReport() a second time inserts no duplicate WORK_TYPES rows and does not re-add the workTypeName header
[ ] Double-tapping 送信 still submits only once
[ ] Photos still upload to Drive and appear in REPORT_PHOTOS as before
```

## Risks and Rollback

- **Risk:** `setupSiteReport()`'s new REPORTS backfill step runs against a real production spreadsheet for the first time only when an operator actually executes it — Task 8's Jest tests cover the pure logic (`needsWorkTypeNameColumn`, `buildWorkTypeRowsToInsert`) but not the real `SpreadsheetApp` call, consistent with this project's existing convention of not Jest-testing Sheets-touching code. Mitigation: Task 8 Step 5's manual verification against a throwaway spreadsheet before this ships, and the deployment step above spot-checks the real header row before trusting it in production.
- **Risk:** Any LINE Official Account or external tool that still calls `SUBMIT_REPORT` with free-text `workType` (bypassing the new dropdown) starts receiving `WORK_TYPE_NOT_FOUND` instead of succeeding. Mitigation: this is a single first-party LIFF app with one known client (`apps/site-report/web`), redeployed as part of the same change — there is no third-party integration to coordinate with, per the codebase's own architecture notes.
- **Risk:** `SitesRepository.buildSitesResult`'s new ACTIVE filter changes `SUBMIT_REPORT`'s behavior for any client that still references a site that gets deactivated mid-session (cached `sites` list) — it now fails with `SITE_NOT_FOUND` instead of succeeding. This is the intended tightening (spec §4.1), not a defect, but note it plainly: a worker mid-form when an admin deactivates their site sees a failed submission with a generic message, and must reload to pick a different site. Acceptable for Phase 1; no special UX is added for this narrow race in this phase.
- **Rollback:** Every GAS change in this plan is additive (new sheet, new action, new outcome kinds, one new column) except the ACTIVE filter (Task 4) and the free-text-to-code meaning change of `workType` (Task 6). Reverting the git commits for Tasks 4–6 and 8, and redeploying the prior `build/Code.js`, restores the exact prior behavior — no data migration is needed to roll back, since no existing row is ever altered and the new `WORK_TYPES` sheet/`workTypeName` column simply go unused again. The web-side commits (Tasks 9–14) revert cleanly together since they were built as one integrated unit against the new actions.

---

## Self-Review

**Spec coverage:** §4.1 (Task 4), §4.2 (Task 8), §4.3 (Task 3 + Task 5), §4.4 (Tasks 1, 6, 8), §4.5 (Task 7), §4.6 (Tasks 9–14), §5 backward compatibility (Tasks 1, 8 explicitly test/verify it), §6 hidden dependencies (Task 8's migration mechanism, Task 11/12/14's test rewrites) — every numbered spec section has a task. §7 non-goals: correctly untouched by every task above.

**Placeholder scan:** no TBD/TODO; every step carries real code or a concrete manual-verification procedure (Task 8 Step 5, Task 14 Step 5) rather than a vague "test this".

**Type consistency:** `WorkType`/`WorkTypeRow`/`GetWorkTypesResponseData`/`SubmitReportOutcome`'s two new kinds/`ProvisioningSummaryInput`'s two new fields are named identically everywhere they cross a task boundary (Task 1 → Task 2 → Task 3 → Task 5/6; Task 9 → Task 10 → Task 12/13/14). `needsWorkTypeNameColumn`/`buildWorkTypeRowsToInsert`/`WORK_TYPE_SEED_ROWS` (Task 8) are used with the same names in Task 8's own tests and nowhere else. `ReportEntryShell`'s new `onChangeSite`/`workTypes` props (Task 13) match exactly what Task 14's `SiteReportScreen` passes.
