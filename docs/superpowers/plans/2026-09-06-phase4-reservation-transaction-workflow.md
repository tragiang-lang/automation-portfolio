# Phase 4 — Reservation API & Transaction Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the real `createReservation` transaction — validated request → Sheet `処理中` row → `LockService`-protected availability re-check → Calendar event → `受付済`/`要確認` → post-lock email — wired into the existing GAS `Api.ts` dispatch and reachable from the frontend through the existing `/api/gas` proxy, with idempotent retries and no double-booking.

**Architecture:** Thin orchestration in `Api.ts` composes already-existing Phase 3C pure domain logic (`ReservationRules.evaluateReservationRequest`, `SlotEngine`, `availability/*Strategy`) with brand-new thin Google-service adapters (`Calendar.ts`, `Mail.ts`) and a brand-new Sheets-backed reservation repository/idempotency layer, following the exact module boundaries and layering already established in Phases 3A–3C. No new Sheets schema, no new error envelope, no second Calendar/email/idempotency system.

**Tech Stack:** TypeScript + Jest/ts-jest (`apps/salon-portfolio/gas`), Google Apps Script V8 runtime (`SpreadsheetApp`/`CalendarApp`/`GmailApp`/`LockService`/`CacheService`/`PropertiesService`), Next.js App Router + Jest (`apps/salon-portfolio/web`).

**Spec:** `docs/phase0-specification.md` §C/§E/§G/§H/§I/§J/§K/§M/§N/§O/§P/§T/§U (master authority for schema, API contracts, state machine, and the `createReservation` transaction flow) and the Phase 4 task brief pasted into this conversation (authoritative for this phase's scope boundary — see Global Constraints §0 below for how a naming conflict between the two was resolved). Also read alongside: `docs/reservation-domain-architecture.md` (Phase 3C domain), `docs/architecture-overview.md`, `docs/roadmap.md`.

## Global Constraints

- **§0 — Scope-naming reconciliation (resolved, not a placeholder):** `docs/roadmap.md` currently defines a narrower "Phase 4" (Sheets/Calendar/Mail adapters + `getServices`/`getStaff` actions only) and defers `createReservation`/`LockService`/idempotency to a separate "Phase 5". The task brief for this work is titled "Phase 4 — Reservation API & Transaction Workflow" and explicitly requires the full transactional `createReservation` workflow under that name. This plan treats the task brief as authoritative and, as part of Task 14 (Documentation), rewrites `docs/roadmap.md`'s phase split so "Phase 4" in the docs matches what was actually built — it does not ask the user to resolve this; the docs are brought into line with reality.
- **Timezone:** Every date/time computation is Asia/Tokyo, fixed UTC+9, via `Utils.ts` helpers only — never `new Date()`'s local timezone, never `Intl`.
- **Reservation ID format:** `RES-YYYYMMDD-XXXXXX` via the existing `ids/ReservationId.ts::generateReservationId` — do not introduce a second ID format or generator.
- **No new Sheets schema:** All nine tabs and their headers already exist in `SheetSchemas.ts` (`SHEET_NAMES`/`REQUIRED_HEADERS`) — this phase starts writing to `RESERVATIONS`/`ERROR_LOG`/`EMAIL_LOG` using the existing header lists, never inventing a new column or tab.
- **No new error envelope:** Every response is `ApiResponse<T>` (`models/Api.ts`) built via `buildSuccessResponse`/`buildErrorResponse`, using only the existing `ErrorCode` values from `models/ErrorCodes.ts` (`VALIDATION_ERROR`, `SLOT_UNAVAILABLE`, `FEATURE_DISABLED`, `SYSTEM_BUSY`, `CALENDAR_ERROR`, `SHEET_ERROR`, `MAIL_ERROR`, `INTERNAL_ERROR`, `CONFIG_INVALID`). No infrastructure exception, stack trace, Script Property value, or GAS URL is ever put into a client-facing `message`.
- **Do not duplicate Phase 3C validation/resolution:** `ReservationRules.evaluateReservationRequest` (unchanged) remains the single place that resolves service/staff/business-hours/date-window/availability. Nothing in this plan re-implements "first free staff in DisplayOrder" or any other Phase 3C rule a second time (see Task 10's explicit design note on the ANY_STAFF re-check trade-off this constraint forces).
- **`getServices`/`getStaff` public actions are explicitly OUT of this phase's scope.** The task brief's Definition of Done never requires them, the frontend stays a placeholder (no picker UI to feed), and adding two more public actions this phase doesn't need would be scope creep the brief explicitly forbids ("Do not expand Phase 4 into a general SaaS backend"). Internal, non-`Api.ts`-exposed catalog-reading functions (`Catalog.ts`, Task 3) are built instead, used only by `createReservation`'s own orchestration. This is called out again in Task 14's roadmap update.
- **GAS-global mocking convention (extension, documented, not silent):** the existing convention (`docs/phase0-specification.md` §Q, zero precedent for mocking `SpreadsheetApp`/`CalendarApp`/`GmailApp`/`LockService` in this repo) is preserved for every *thin adapter* file (`Sheets.ts`, `Calendar.ts`, `Mail.ts`, `Catalog.ts`, the Sheets-touching half of `ReservationRepository.ts`/`Idempotency.ts`/`Logging.ts`) — none of those are unit tested directly, exactly like `Sheets.ts` today. The task brief, however, explicitly requires tests for the full transaction flow (lock failure, Calendar failure, Sheet-update failure, email failure) — those necessarily exercise `Api.ts`'s orchestration, which calls the adapter *modules*. Task 12 tests that orchestration by `jest.mock()`-ing the adapter modules (`./Calendar`, `./ReservationRepository`, `./Idempotency`, `./Catalog`, `./Mail`, `./Logging`, `./ConfigStore`) — exactly the same technique `tests/Api.test.ts` already uses today for `ConfigStore.getConfig` — plus a plain object stub assigned to the global `LockService` for that one test file only. This is not a manufactured DI interface (no constructor injection, no new abstraction); it is Jest's standard ES-module mock applied to module boundaries that already exist. This decision is documented here and in Task 14's new architecture doc rather than raised as a question, because it is the direct, minimal-footprint consequence of an explicit, unambiguous test requirement in the task brief.
- **要確認 outcome nuance (load-bearing, read before implementing Task 10/12):** per `docs/phase0-specification.md` §H/§U there are **two different `要確認` causes with two different caller-facing responses**:
  - *Lost the availability race under the lock* (someone else booked the exact slot between the pre-lock advisory check and lock acquisition) → row becomes `要確認`, but the caller receives an **error envelope**, `ok:false` / `SLOT_UNAVAILABLE` — the slot genuinely is not available, so the honest response is "pick another time", even though the row is kept (not deleted) for audit purposes with an ERROR_LOG note.
  - *Calendar event creation itself throws* (a Google-side/technical failure; the slot **is** still reserved for the customer) → row becomes `要確認`, and the caller receives a **success envelope**, `ok:true, data:{reservationId, needsConfirmation:true}` — per §H's own example response body. The reservation is real; it just isn't auto-confirmed in Calendar yet.

  Do not collapse these into one behavior.
- **Atomicity limitation (must be documented, not "solved"):** Google Sheets and Google Calendar have no shared transaction. If the Calendar event is created successfully but the subsequent Sheet update (marking `受付済` + `CalendarEventID`) itself throws, the implementation must never create a second Calendar event on any retry, must never silently lose the already-created event's id, and must return a controlled error. Task 10/12 implement this as a distinct `CriticalSectionResult` outcome (`sheetUpdateFailedAfterCalendar`) that logs the orphaned `CalendarEventID` to `ERROR_LOG` for manual reconciliation and returns `SHEET_ERROR` — this is the one gap in this system that stays a documented manual-recovery path (Task 14), not something silently retried.
- **Concurrency strengthening beyond the master spec's literal step order (documented, not silent):** `docs/phase0-specification.md` §U orders "append row" (step 3) before "acquire lock" (step 4), which leaves a narrow race for two truly simultaneous requests carrying the *same* `submissionId` to both pass the idempotency check before either appends a row. The task brief explicitly requires "concurrent duplicate submission does not create two reservations" as a tested behavior (§8/§23). This plan closes that race with a **second, short** `LockService` acquisition wrapped tightly around "check Sheet backstop for an existing `SubmissionID` row, then append the pending row if none exists" (Task 11's `claimSubmissionOrGetExisting`), separate from the main critical-section lock (re-check availability → Calendar → Sheet update) the task brief's §6 describes. Using `LockService.getScriptLock()` twice, sequentially, within one execution is valid GAS usage (it is a plain mutex, not a single-use token). This strengthening is documented in Task 14's new architecture doc.
- **Email content is generic-module / vertical-specific-content split, matching Phase 3C's own precedent:** `Mail.ts` (Task 9) is a 3-line `GmailApp.sendEmail` wrapper with zero salon knowledge (reusable across verticals, per `docs/phase0-specification.md` §"Explicit Classification"); all Japanese subject/body copy lives in the separately-tested, pure `ReservationEmailTemplates.ts` (Task 9).
- **Run after every task:** `cd apps/salon-portfolio/gas && npm run typecheck && npm test` for every GAS task; `cd apps/salon-portfolio/web && npm run typecheck && npm test` for the frontend task. Do not move to the next task with a red suite.
- **Evidence:** capture logs into `.evidence/<yyyyMMdd-HHmm>-phase4-reservation-transaction/` per the user's global evidence-reporting protocol — full `build`/`test`/`typecheck` logs, `git status -s`, `git diff --stat`, per-task before/after test counts sourced from a real log file, not estimated.
- **Do not commit** — this repository's authorization rule requires an explicit, separate "commit this" instruction; this plan's tasks stop at "verified, uncommitted" every time.

---

### Task 1: Utils — Tokyo instant/day-range helpers

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Utils.ts`
- Test: `apps/salon-portfolio/gas/tests/Utils.test.ts`

**Interfaces:**
- Produces: `formatInstantAsTokyoLocalDateTimeString(date: Date): string` (Tokyo-local `YYYY-MM-DDTHH:mm` from a real instant — the inverse direction of the existing `tokyoDateTimeToInstant`), `tokyoCalendarDayRange(dateStr: string): { start: Date; end: Date }` (the `[00:00, 24:00)` Tokyo-local instant range for a `YYYY-MM-DD` string). Both consumed by Task 8 (`ReservationAvailabilityFactory`) and Task 9 (`Calendar.ts`).

- [ ] **Step 1: Write the failing tests**

Add to the end of `apps/salon-portfolio/gas/tests/Utils.test.ts`:

```ts
describe("formatInstantAsTokyoLocalDateTimeString", () => {
  it("formats a UTC instant as its Asia/Tokyo local YYYY-MM-DDTHH:mm", () => {
    // 2026-09-10T01:30:00Z = 2026-09-10T10:30 in Tokyo (UTC+9)
    expect(formatInstantAsTokyoLocalDateTimeString(new Date("2026-09-10T01:30:00.000Z"))).toBe(
      "2026-09-10T10:30",
    );
  });

  it("rolls the calendar date over across midnight Tokyo time", () => {
    // 2026-09-09T15:05:00Z = 2026-09-10T00:05 in Tokyo
    expect(formatInstantAsTokyoLocalDateTimeString(new Date("2026-09-09T15:05:00.000Z"))).toBe(
      "2026-09-10T00:05",
    );
  });

  it("is the exact inverse of tokyoDateTimeToInstant for a same-day case", () => {
    const instant = tokyoDateTimeToInstant("2026-09-10", "10:30");
    expect(formatInstantAsTokyoLocalDateTimeString(new Date(instant))).toBe("2026-09-10T10:30");
  });
});

describe("tokyoCalendarDayRange", () => {
  it("returns the [00:00, 24:00) Tokyo-local instant range for a date", () => {
    const { start, end } = tokyoCalendarDayRange("2026-09-10");
    expect(formatInstantAsTokyoLocalDateTimeString(start)).toBe("2026-09-10T00:00");
    expect(formatInstantAsTokyoLocalDateTimeString(end)).toBe("2026-09-11T00:00");
  });
});
```

Also update the file's top `import` line to include the two new names alongside the existing imports from `../src/Utils`.

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Utils.test.ts`
Expected: FAIL — `formatInstantAsTokyoLocalDateTimeString is not defined` / `tokyoCalendarDayRange is not defined`.

- [ ] **Step 3: Implement**

Add to `apps/salon-portfolio/gas/src/Utils.ts`, after `toTokyoLocalDateTimeString`:

```ts
/** Inverse direction of `tokyoDateTimeToInstant`: formats a real instant
 *  (e.g. a Calendar event's `getStartTime()`) as the Asia/Tokyo-local
 *  `YYYY-MM-DDTHH:mm` string the `BusyInterval`/`SlotCandidate` overlap
 *  comparisons rely on (Task 1, Phase 4). */
export function formatInstantAsTokyoLocalDateTimeString(date: Date): string {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoTime.getUTCFullYear();
  const month = String(tokyoTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tokyoTime.getUTCDate()).padStart(2, "0");
  const hours = String(tokyoTime.getUTCHours()).padStart(2, "0");
  const minutes = String(tokyoTime.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** The `[00:00, 24:00)` Asia/Tokyo-local instant range for one calendar
 *  date — the query window `Calendar.ts::getBusyEvents` (Task 9) uses,
 *  matching `docs/phase0-specification.md` §J Stage 2's "[date 00:00,
 *  date 24:00)" wording exactly. */
export function tokyoCalendarDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(tokyoDateTimeToInstant(dateStr, "00:00")),
    end: new Date(tokyoDateTimeToInstant(addDaysToTokyoDateString(dateStr, 1), "00:00")),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Utils.test.ts`
Expected: PASS, all tests including the 4 new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/Utils.ts apps/salon-portfolio/gas/tests/Utils.test.ts
git commit -m "feat(gas): add Tokyo instant formatting and day-range helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 2: RowMapper — generic row finder by column value

**Files:**
- Modify: `apps/salon-portfolio/gas/src/RowMapper.ts`
- Test: `apps/salon-portfolio/gas/tests/RowMapper.test.ts`

**Interfaces:**
- Produces: `findRowIndexByColumnValue(headerMap: Record<string, number>, dataRows: unknown[][], columnName: string, value: string): number | null` (0-based index into `dataRows`; sheet row number = index + 2, since row 1 is the header). Consumed by Task 6 (`ReservationRepository`) and Task 11 (`Idempotency`).

- [ ] **Step 1: Write the failing tests**

Add to `apps/salon-portfolio/gas/tests/RowMapper.test.ts`:

```ts
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
```

Update the file's top import to add `findRowIndexByColumnValue` to the existing `from "../src/RowMapper"` import.

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest RowMapper.test.ts`
Expected: FAIL — `findRowIndexByColumnValue is not defined`.

- [ ] **Step 3: Implement**

Add to `apps/salon-portfolio/gas/src/RowMapper.ts`, after `objectToRow`:

```ts
/** Returns the 0-based index into `dataRows` of the first row whose
 *  `columnName` cell equals `value` (both sides compared as strings), or
 *  `null` if the column is absent from `headerMap` or no row matches.
 *  Pure — the shared seam behind both the idempotency Sheet backstop
 *  (Task 11) and locating a reservation row to update in place (Task 6),
 *  Phase 0 §P/§U. */
export function findRowIndexByColumnValue(
  headerMap: Record<string, number>,
  dataRows: unknown[][],
  columnName: string,
  value: string,
): number | null {
  const columnIndex = headerMap[columnName];
  if (columnIndex === undefined) {
    return null;
  }
  const index = dataRows.findIndex((row) => String(row[columnIndex] ?? "") === value);
  return index === -1 ? null : index;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest RowMapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/RowMapper.ts apps/salon-portfolio/gas/tests/RowMapper.test.ts
git commit -m "feat(gas): add findRowIndexByColumnValue row-finder helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 3: Catalog — SERVICES/STAFF coercion + repository

**Files:**
- Create: `apps/salon-portfolio/gas/src/CatalogParser.ts`
- Create: `apps/salon-portfolio/gas/src/Catalog.ts`
- Test: `apps/salon-portfolio/gas/tests/CatalogParser.test.ts`

**Interfaces:**
- Consumes: `ServiceRow`/`StaffRow`/`SERVICES_HEADERS`/`STAFF_HEADERS` (`./SheetSchemas`), `getHeaderMap`/`getSheet`/`readRawRows` (`./Sheets`), `rowsToObjects` (`./RowMapper`), `SHEET_NAMES` (`./SheetNames`).
- Produces: `parseServiceRow(raw: Record<string, unknown>): ServiceRow`, `parseStaffRow(raw: Record<string, unknown>): StaffRow` (pure, tested); `getServiceRows(): ServiceRow[]`, `getStaffRows(): StaffRow[]` (thin, untested — consumed by Task 12's `Api.ts`).

- [ ] **Step 1: Write the failing tests**

Create `apps/salon-portfolio/gas/tests/CatalogParser.test.ts`:

```ts
import { parseServiceRow, parseStaffRow } from "../src/CatalogParser";

describe("parseServiceRow", () => {
  it("coerces already-typed values (Sheets auto-typing) unchanged", () => {
    expect(
      parseServiceRow({
        ServiceID: "SV001",
        Name: "ジェルネイル",
        DurationMinutes: 60,
        Price: 6000,
        Active: true,
        StaffRequired: true,
        DisplayOrder: 1,
      }),
    ).toEqual({
      ServiceID: "SV001",
      Name: "ジェルネイル",
      DurationMinutes: 60,
      Price: 6000,
      Active: true,
      StaffRequired: true,
      DisplayOrder: 1,
    });
  });

  it("coerces text-formatted cell values", () => {
    expect(
      parseServiceRow({
        ServiceID: "SV002",
        Name: "まつげエクステ",
        DurationMinutes: "90",
        Price: "8000",
        Active: "TRUE",
        StaffRequired: "FALSE",
        DisplayOrder: "2",
      }),
    ).toEqual({
      ServiceID: "SV002",
      Name: "まつげエクステ",
      DurationMinutes: 90,
      Price: 8000,
      Active: true,
      StaffRequired: false,
      DisplayOrder: 2,
    });
  });

  it("trims string fields and defaults missing numeric fields to NaN, not a thrown error", () => {
    const result = parseServiceRow({ ServiceID: " SV003 ", Name: " ネイルオフ " });
    expect(result.ServiceID).toBe("SV003");
    expect(result.Name).toBe("ネイルオフ");
    expect(Number.isNaN(result.DurationMinutes)).toBe(true);
  });
});

describe("parseStaffRow", () => {
  it("coerces a fully-populated staff row", () => {
    expect(
      parseStaffRow({
        StaffID: "ST001",
        Name: "田中",
        Active: true,
        CalendarID: "staff-tanaka@group.calendar.google.com",
        DisplayOrder: 1,
      }),
    ).toEqual({
      StaffID: "ST001",
      Name: "田中",
      Active: true,
      CalendarID: "staff-tanaka@group.calendar.google.com",
      DisplayOrder: 1,
    });
  });

  it("leaves CalendarID undefined when the cell is blank (fallback to the shared calendar happens elsewhere)", () => {
    const result = parseStaffRow({ StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: "", DisplayOrder: 2 });
    expect(result.CalendarID).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest CatalogParser.test.ts`
Expected: FAIL — cannot find module `../src/CatalogParser`.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/CatalogParser.ts`:

```ts
import { ServiceRow, StaffRow } from "./SheetSchemas";

/**
 * Pure coercion of one raw SERVICES/STAFF row (Google Sheets may hand back
 * an already-typed boolean/number for a checkbox/number-formatted column,
 * or a string for a text-formatted one) into the strictly-typed row shape
 * — mirrors the `ConfigParser`/`ConfigStore` split (Phase 3A) so
 * `Catalog.ts` (thin) stays a near-literal Sheets wrapper.
 */

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TRUE" || normalized === "1" || normalized === "YES";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  return Number(String(value ?? "").trim());
}

function toTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseServiceRow(raw: Record<string, unknown>): ServiceRow {
  return {
    ServiceID: toTrimmedString(raw.ServiceID),
    Name: toTrimmedString(raw.Name),
    DurationMinutes: toNumber(raw.DurationMinutes),
    Price: toNumber(raw.Price),
    Active: toBoolean(raw.Active),
    StaffRequired: toBoolean(raw.StaffRequired),
    DisplayOrder: toNumber(raw.DisplayOrder),
  };
}

export function parseStaffRow(raw: Record<string, unknown>): StaffRow {
  return {
    StaffID: toTrimmedString(raw.StaffID),
    Name: toTrimmedString(raw.Name),
    Active: toBoolean(raw.Active),
    CalendarID: toTrimmedString(raw.CalendarID) || undefined,
    DisplayOrder: toNumber(raw.DisplayOrder),
  };
}
```

Create `apps/salon-portfolio/gas/src/Catalog.ts`:

```ts
import { SHEET_NAMES } from "./SheetNames";
import { SERVICES_HEADERS, STAFF_HEADERS, ServiceRow, StaffRow } from "./SheetSchemas";
import { getHeaderMap, getSheet, readRawRows } from "./Sheets";
import { rowsToObjects } from "./RowMapper";
import { parseServiceRow, parseStaffRow } from "./CatalogParser";

/**
 * Thin, internal-only SERVICES/STAFF repository (Phase 4 Task 3) — not
 * exposed as its own `Api.ts` action this phase (see Global Constraints:
 * `getServices`/`getStaff` public actions are out of scope). Reads every
 * row (active and inactive); `ReservationRules.resolveService`/
 * `resolveStaffSelection` already decide bookability/eligibility. Not
 * unit tested by Jest (Phase 0 §Q) — `CatalogParser.ts`'s coercion
 * functions carry the tested logic.
 */

export function getServiceRows(): ServiceRow[] {
  const sheet = getSheet(SHEET_NAMES.SERVICES);
  const headerMap = getHeaderMap(sheet);
  const rawRows = rowsToObjects<Record<string, unknown>>(
    headerMap,
    readRawRows(sheet),
    SERVICES_HEADERS,
  );
  return rawRows.map(parseServiceRow);
}

export function getStaffRows(): StaffRow[] {
  const sheet = getSheet(SHEET_NAMES.STAFF);
  const headerMap = getHeaderMap(sheet);
  const rawRows = rowsToObjects<Record<string, unknown>>(
    headerMap,
    readRawRows(sheet),
    STAFF_HEADERS,
  );
  return rawRows.map(parseStaffRow);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest CatalogParser.test.ts && npm run typecheck`
Expected: PASS; typecheck clean (note `Catalog.ts` itself has no dedicated test file, matching `Sheets.ts`'s convention).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/CatalogParser.ts apps/salon-portfolio/gas/src/Catalog.ts apps/salon-portfolio/gas/tests/CatalogParser.test.ts
git commit -m "feat(gas): add SERVICES/STAFF catalog repository and row coercion

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 4: ReservationErrorMapping — domain issue → public error code

**Files:**
- Create: `apps/salon-portfolio/gas/src/ReservationErrorMapping.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationErrorMapping.test.ts`

**Interfaces:**
- Consumes: `ReservationIssueCode`/`ValidationIssue` (`./models/ReservationDomain`), `ERROR_CODES`/`ErrorCode` (`./models/ErrorCodes`).
- Produces: `mapReservationIssueToErrorResponse(issue: ValidationIssue): { code: ErrorCode; message: string }`. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing tests**

Create `apps/salon-portfolio/gas/tests/ReservationErrorMapping.test.ts`:

```ts
import { mapReservationIssueToErrorResponse } from "../src/ReservationErrorMapping";
import { ERROR_CODES } from "../src/models/ErrorCodes";

describe("mapReservationIssueToErrorResponse", () => {
  it("maps availability-failure domain codes to SLOT_UNAVAILABLE", () => {
    for (const code of ["CALENDAR_CONFLICT", "STAFF_NOT_AVAILABLE", "NO_STAFF_AVAILABLE"] as const) {
      const result = mapReservationIssueToErrorResponse({ field: "date", code });
      expect(result.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("maps every other domain code to VALIDATION_ERROR", () => {
    const otherCodes = [
      "REQUIRED_FIELD_MISSING",
      "INVALID_FORMAT",
      "INVALID_DATE",
      "TOO_LONG",
      "MENU_NOT_FOUND",
      "MENU_NOT_BOOKABLE",
      "STAFF_NOT_FOUND",
      "STAFF_SELECTION_NOT_SUPPORTED",
      "OUTSIDE_BUSINESS_HOURS",
      "HOLIDAY",
      "PAST_DATE",
      "OUTSIDE_BOOKING_WINDOW",
    ] as const;
    for (const code of otherCodes) {
      const result = mapReservationIssueToErrorResponse({ field: "x", code });
      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("never forwards the issue's own internal message/field to the mapped result", () => {
    const result = mapReservationIssueToErrorResponse({
      field: "email",
      code: "INVALID_FORMAT",
      message: "raw internal diagnostic detail",
    });
    expect(result.message).not.toContain("raw internal diagnostic detail");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationErrorMapping.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/ReservationErrorMapping.ts`:

```ts
import { ReservationIssueCode, ValidationIssue } from "./models/ReservationDomain";
import { ERROR_CODES, ErrorCode } from "./models/ErrorCodes";

/**
 * Maps one fine-grained domain `ValidationIssue` (`models/ReservationDomain.ts`)
 * onto the coarse public `ErrorCode` envelope (`models/ErrorCodes.ts`) —
 * the two are intentionally separate unions (Phase 3C), this is the one
 * place they meet. Never forwards the issue's own `message`/`field` —
 * always a fixed, safe Japanese string per code (Phase 0 §H/§N).
 */

const SLOT_UNAVAILABLE_CODES: ReadonlySet<ReservationIssueCode> = new Set([
  "CALENDAR_CONFLICT",
  "STAFF_NOT_AVAILABLE",
  "NO_STAFF_AVAILABLE",
]);

const SAFE_MESSAGES: Record<ReservationIssueCode, string> = {
  REQUIRED_FIELD_MISSING: "入力内容に不備があります。必須項目をご確認ください。",
  INVALID_FORMAT: "入力内容の形式が正しくありません。",
  INVALID_DATE: "日付が正しくありません。",
  TOO_LONG: "入力内容が長すぎます。",
  MENU_NOT_FOUND: "選択されたメニューが見つかりません。",
  MENU_NOT_BOOKABLE: "選択されたメニューは現在ご予約いただけません。",
  STAFF_NOT_FOUND: "選択されたスタッフが見つかりません。",
  STAFF_NOT_AVAILABLE: "選択された時間帯はご利用いただけません。",
  STAFF_SELECTION_NOT_SUPPORTED: "スタッフのご指定は現在承っておりません。",
  OUTSIDE_BUSINESS_HOURS: "選択された時間は営業時間外です。",
  HOLIDAY: "選択された日は休業日です。",
  PAST_DATE: "選択された日時は既に過ぎているか、受付可能な時間帯ではありません。",
  OUTSIDE_BOOKING_WINDOW: "選択された日付はご予約可能な期間を超えています。",
  CALENDAR_CONFLICT: "選択された時間帯はご利用いただけません。",
  NO_STAFF_AVAILABLE: "選択された時間帯にご案内できるスタッフがおりません。",
};

export function mapReservationIssueToErrorResponse(
  issue: ValidationIssue,
): { code: ErrorCode; message: string } {
  const code: ErrorCode = SLOT_UNAVAILABLE_CODES.has(issue.code)
    ? ERROR_CODES.SLOT_UNAVAILABLE
    : ERROR_CODES.VALIDATION_ERROR;
  return { code, message: SAFE_MESSAGES[issue.code] };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationErrorMapping.test.ts`
Expected: PASS. (TypeScript's exhaustiveness check on `Record<ReservationIssueCode, string>` guarantees every domain code has an entry at compile time — `npm run typecheck` failing here means a code was missed.)

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/ReservationErrorMapping.ts apps/salon-portfolio/gas/tests/ReservationErrorMapping.test.ts
git commit -m "feat(gas): map reservation domain issues to public error codes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 5: Cancellation token generator

**Files:**
- Create: `apps/salon-portfolio/gas/src/ids/CancellationToken.ts`
- Test: `apps/salon-portfolio/gas/tests/ids/CancellationToken.test.ts`

**Interfaces:**
- Produces: `generateCancellationToken(random?: () => number): string`. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/ids/CancellationToken.test.ts`:

```ts
import { generateCancellationToken } from "../../src/ids/CancellationToken";

describe("generateCancellationToken", () => {
  it("generates a 32-character alphanumeric token", () => {
    const token = generateCancellationToken();
    expect(token).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it("is deterministic given an injected random source", () => {
    const random = () => 0;
    expect(generateCancellationToken(random)).toBe(generateCancellationToken(random));
  });

  it("produces different tokens across default (Math.random) calls with overwhelming probability", () => {
    expect(generateCancellationToken()).not.toBe(generateCancellationToken());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest CancellationToken.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/ids/CancellationToken.ts`:

```ts
/** Unguessable cancellation-request bearer token (Phase 0 §L) — carried
 *  in the confirmation email's cancellation link, not a display id, so it
 *  is long; an injectable `random` source keeps this deterministic in
 *  tests, matching `ids/ReservationId.ts`'s own convention. */

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 32;

export function generateCancellationToken(random: () => number = Math.random): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_ALPHABET[Math.floor(random() * TOKEN_ALPHABET.length)];
  }
  return token;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest CancellationToken.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/ids/CancellationToken.ts apps/salon-portfolio/gas/tests/ids/CancellationToken.test.ts
git commit -m "feat(gas): add cancellation token generator

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 6: ReservationRepository — RESERVATIONS row builder + Sheets read/write

**Files:**
- Create: `apps/salon-portfolio/gas/src/ReservationRepository.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationRepository.test.ts`

**Interfaces:**
- Consumes: `NormalizedReservation` (`./models/ReservationDomain`), `ReservationRow`/`RESERVATIONS_HEADERS` (`./SheetSchemas`), `SHEET_NAMES` (`./SheetNames`), `getSheet`/`getHeaderMap`/`readRawRows`/`appendRow`/`updateRow` (`./Sheets`), `findRowIndexByColumnValue`/`objectToRow`/`rowsToObjects` (`./RowMapper`, Task 2).
- Produces (pure, tested): `buildPendingReservationRow(reservation: NormalizedReservation, now: Date, cancellationToken: string): ReservationRow`. Produces (thin, untested): `appendReservationRow(row: ReservationRow): void`, `findReservationBySubmissionId(submissionId: string): ReservationRow | null`, `findReservationByReservationId(reservationId: string): ReservationRow | null`, `markReservationConfirmed(reservationId: string, calendarEventId: string, now: Date): void`, `markReservationNeedsConfirmation(reservationId: string, now: Date): void`, `updateReservationEmailStatus(reservationId: string, emailStatus: "sent" | "failed", now: Date): void`. All consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/ReservationRepository.test.ts`:

```ts
import { buildPendingReservationRow } from "../src/ReservationRepository";
import { NormalizedReservation } from "../src/models/ReservationDomain";

const baseReservation: NormalizedReservation = {
  reservationId: "RES-20260910-X8K2MP",
  submissionId: "sub-123",
  customerName: "山田太郎",
  email: "yamada@example.com",
  phone: "09012345678",
  date: "2026-09-10",
  startTime: "10:00",
  endTime: "11:00",
  serviceId: "SV001",
  serviceName: "ジェルネイル",
  durationMinutes: 60,
  price: 6000,
  staffSelection: { kind: "none" },
  assignedStaffId: undefined,
  notes: "初めて利用します",
};

describe("buildPendingReservationRow", () => {
  it("builds a 処理中 row with matching CreatedAt/UpdatedAt and pending email status", () => {
    const now = new Date("2026-09-06T00:00:00.000Z");
    const row = buildPendingReservationRow(baseReservation, now, "token-abc");
    expect(row).toEqual({
      ReservationID: "RES-20260910-X8K2MP",
      SubmissionID: "sub-123",
      CreatedAt: now.toISOString(),
      UpdatedAt: now.toISOString(),
      Name: "山田太郎",
      Email: "yamada@example.com",
      Phone: "09012345678",
      Date: "2026-09-10",
      Time: "10:00",
      ServiceID: "SV001",
      StaffID: undefined,
      Notes: "初めて利用します",
      Status: "処理中",
      CalendarEventID: undefined,
      EmailStatus: "pending",
      CancellationToken: "token-abc",
    });
  });

  it("persists the assigned staff id when one was resolved", () => {
    const row = buildPendingReservationRow(
      { ...baseReservation, assignedStaffId: "ST001" },
      new Date(),
      "token-abc",
    );
    expect(row.StaffID).toBe("ST001");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationRepository.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/ReservationRepository.ts`:

```ts
import { NormalizedReservation } from "./models/ReservationDomain";
import { ReservationRow, RESERVATIONS_HEADERS } from "./SheetSchemas";
import { SHEET_NAMES } from "./SheetNames";
import { getHeaderMap, getSheet, readRawRows, appendRow, updateRow } from "./Sheets";
import { findRowIndexByColumnValue, objectToRow, rowsToObjects } from "./RowMapper";

/** Pure: builds the RESERVATIONS row for a brand-new reservation, always
 *  `Status = 処理中` (Phase 0 §U step 3). "ANY" staff selection is never
 *  itself persisted (Phase 3C) — by the time this is called the caller
 *  has already resolved a concrete staff id, or none. */
export function buildPendingReservationRow(
  reservation: NormalizedReservation,
  now: Date,
  cancellationToken: string,
): ReservationRow {
  const createdAt = now.toISOString();
  return {
    ReservationID: reservation.reservationId,
    SubmissionID: reservation.submissionId,
    CreatedAt: createdAt,
    UpdatedAt: createdAt,
    Name: reservation.customerName,
    Email: reservation.email,
    Phone: reservation.phone,
    Date: reservation.date,
    Time: reservation.startTime,
    ServiceID: reservation.serviceId,
    StaffID: reservation.assignedStaffId,
    Notes: reservation.notes,
    Status: "処理中",
    CalendarEventID: undefined,
    EmailStatus: "pending",
    CancellationToken: cancellationToken,
  };
}

/** Thin: appends one RESERVATIONS row. Not unit tested (Google global) —
 *  `buildPendingReservationRow` above carries the tested logic. */
export function appendReservationRow(row: ReservationRow): void {
  appendRow(getSheet(SHEET_NAMES.RESERVATIONS), objectToRow(RESERVATIONS_HEADERS, row));
}

interface FoundReservationRow {
  sheet: GoogleAppsScript.Spreadsheet.Sheet;
  rowNumber: number;
  row: ReservationRow;
}

function findReservationRow(columnName: string, value: string): FoundReservationRow | null {
  const sheet = getSheet(SHEET_NAMES.RESERVATIONS);
  const headerMap = getHeaderMap(sheet);
  const dataRows = readRawRows(sheet);
  const index = findRowIndexByColumnValue(headerMap, dataRows, columnName, value);
  if (index === null) {
    return null;
  }
  const [row] = rowsToObjects<Record<string, unknown>>(headerMap, [dataRows[index]], RESERVATIONS_HEADERS);
  return { sheet, rowNumber: index + 2, row: row as unknown as ReservationRow };
}

export function findReservationBySubmissionId(submissionId: string): ReservationRow | null {
  return findReservationRow("SubmissionID", submissionId)?.row ?? null;
}

export function findReservationByReservationId(reservationId: string): ReservationRow | null {
  return findReservationRow("ReservationID", reservationId)?.row ?? null;
}

export function markReservationConfirmed(reservationId: string, calendarEventId: string, now: Date): void {
  const found = findReservationRow("ReservationID", reservationId);
  if (!found) {
    throw new Error(`Reservation "${reservationId}" was not found while marking it confirmed.`);
  }
  const updated: ReservationRow = {
    ...found.row,
    Status: "受付済",
    CalendarEventID: calendarEventId,
    UpdatedAt: now.toISOString(),
  };
  updateRow(found.sheet, found.rowNumber, objectToRow(RESERVATIONS_HEADERS, updated));
}

export function markReservationNeedsConfirmation(reservationId: string, now: Date): void {
  const found = findReservationRow("ReservationID", reservationId);
  if (!found) {
    throw new Error(`Reservation "${reservationId}" was not found while marking it for confirmation.`);
  }
  const updated: ReservationRow = { ...found.row, Status: "要確認", UpdatedAt: now.toISOString() };
  updateRow(found.sheet, found.rowNumber, objectToRow(RESERVATIONS_HEADERS, updated));
}

/** Best-effort footnote update — never throws over an EmailStatus write
 *  failure, since the reservation itself is already final by the time
 *  this is called (Phase 0 §M: an email-log concern, not a transaction
 *  state one). */
export function updateReservationEmailStatus(
  reservationId: string,
  emailStatus: "sent" | "failed",
  now: Date,
): void {
  const found = findReservationRow("ReservationID", reservationId);
  if (!found) {
    return;
  }
  const updated: ReservationRow = { ...found.row, EmailStatus: emailStatus, UpdatedAt: now.toISOString() };
  updateRow(found.sheet, found.rowNumber, objectToRow(RESERVATIONS_HEADERS, updated));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationRepository.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/ReservationRepository.ts apps/salon-portfolio/gas/tests/ReservationRepository.test.ts
git commit -m "feat(gas): add RESERVATIONS row builder and repository

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 7: Logging — ERROR_LOG / EMAIL_LOG row builders + writers

**Files:**
- Create: `apps/salon-portfolio/gas/src/Logging.ts`
- Test: `apps/salon-portfolio/gas/tests/Logging.test.ts`

**Interfaces:**
- Consumes: `ERROR_LOG_HEADERS`/`EMAIL_LOG_HEADERS`/`ErrorLogRow`/`EmailLogRow` (`./SheetSchemas`), `SHEET_NAMES` (`./SheetNames`), `getSheet`/`appendRow` (`./Sheets`), `objectToRow` (`./RowMapper`).
- Produces (pure, tested): `buildErrorLogRow(input: LogErrorInput, errorId: string, now: Date): ErrorLogRow`, `buildEmailLogRow(input: LogEmailInput, emailLogId: string, now: Date): EmailLogRow`. Produces (thin, untested): `logError(input: LogErrorInput, now?: Date): void`, `logEmail(input: LogEmailInput, now?: Date): void`. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/Logging.test.ts`:

```ts
import { buildErrorLogRow, buildEmailLogRow } from "../src/Logging";

describe("buildErrorLogRow", () => {
  it("serializes context to JSON and never includes a stack unless provided", () => {
    const now = new Date("2026-09-06T00:00:00.000Z");
    const row = buildErrorLogRow(
      { action: "createReservation", message: "Calendar event creation failed", context: { reservationId: "RES-1" }, severity: "error" },
      "err-1",
      now,
    );
    expect(row).toEqual({
      ErrorID: "err-1",
      CreatedAt: now.toISOString(),
      Action: "createReservation",
      Message: "Calendar event creation failed",
      Stack: undefined,
      ContextJSON: JSON.stringify({ reservationId: "RES-1" }),
      Severity: "error",
    });
  });

  it("omits ContextJSON entirely (undefined, not \"{}\") when no context is given", () => {
    const row = buildErrorLogRow({ action: "createReservation", message: "x", severity: "warning" }, "err-2", new Date());
    expect(row.ContextJSON).toBeUndefined();
  });
});

describe("buildEmailLogRow", () => {
  it("builds a sent-status row", () => {
    const now = new Date("2026-09-06T00:00:00.000Z");
    const row = buildEmailLogRow(
      {
        relatedType: "Reservation",
        relatedId: "RES-1",
        recipientType: "customer",
        recipientEmail: "a@example.com",
        subject: "ご予約を受け付けました",
        status: "sent",
      },
      "email-1",
      now,
    );
    expect(row).toEqual({
      EmailLogID: "email-1",
      CreatedAt: now.toISOString(),
      RelatedType: "Reservation",
      RelatedID: "RES-1",
      RecipientType: "customer",
      RecipientEmail: "a@example.com",
      Subject: "ご予約を受け付けました",
      Status: "sent",
      ErrorMessage: undefined,
    });
  });

  it("carries an ErrorMessage on a failed-status row", () => {
    const row = buildEmailLogRow(
      {
        relatedType: "Reservation",
        relatedId: "RES-1",
        recipientType: "owner",
        recipientEmail: "owner@example.com",
        subject: "x",
        status: "failed",
        errorMessage: "quota exceeded",
      },
      "email-2",
      new Date(),
    );
    expect(row.ErrorMessage).toBe("quota exceeded");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Logging.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/Logging.ts`:

```ts
import { SHEET_NAMES } from "./SheetNames";
import { ERROR_LOG_HEADERS, EMAIL_LOG_HEADERS, ErrorLogRow, EmailLogRow } from "./SheetSchemas";
import { getSheet, appendRow } from "./Sheets";
import { objectToRow } from "./RowMapper";

/**
 * ERROR_LOG / EMAIL_LOG writers (Phase 0 §N/§O) — the durable, human-
 * visible-enough audit trail `Api.ts`'s orchestration writes to for every
 * Layer C failure and every email send attempt. `context`/`ContextJSON`
 * may reference ids (reservationId, calendarEventId) but must never carry
 * email/phone/notes content (Phase 0 §O).
 */

export interface LogErrorInput {
  action: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity: "warning" | "error" | "critical";
}

export function buildErrorLogRow(input: LogErrorInput, errorId: string, now: Date): ErrorLogRow {
  return {
    ErrorID: errorId,
    CreatedAt: now.toISOString(),
    Action: input.action,
    Message: input.message,
    Stack: input.stack,
    ContextJSON: input.context ? JSON.stringify(input.context) : undefined,
    Severity: input.severity,
  };
}

export interface LogEmailInput {
  relatedType: "Reservation" | "Inquiry" | "CancellationRequest";
  relatedId: string;
  recipientType: "customer" | "owner";
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed";
  errorMessage?: string;
}

export function buildEmailLogRow(input: LogEmailInput, emailLogId: string, now: Date): EmailLogRow {
  return {
    EmailLogID: emailLogId,
    CreatedAt: now.toISOString(),
    RelatedType: input.relatedType,
    RelatedID: input.relatedId,
    RecipientType: input.recipientType,
    RecipientEmail: input.recipientEmail,
    Subject: input.subject,
    Status: input.status,
    ErrorMessage: input.errorMessage,
  };
}

/** Thin: appends one ERROR_LOG row. Swallows its own failure to
 *  `console.error` — a logging failure must never crash the caller's own
 *  error handling. Not unit tested (Google globals: `Utilities`,
 *  `SpreadsheetApp` via `Sheets.ts`). */
export function logError(input: LogErrorInput, now: Date = new Date()): void {
  try {
    const errorId = Utilities.getUuid();
    appendRow(getSheet(SHEET_NAMES.ERROR_LOG), objectToRow(ERROR_LOG_HEADERS, buildErrorLogRow(input, errorId, now)));
  } catch (loggingError) {
    console.error("[Logging] failed to write ERROR_LOG row:", input.action, input.message, loggingError);
  }
}

export function logEmail(input: LogEmailInput, now: Date = new Date()): void {
  try {
    const emailLogId = Utilities.getUuid();
    appendRow(getSheet(SHEET_NAMES.EMAIL_LOG), objectToRow(EMAIL_LOG_HEADERS, buildEmailLogRow(input, emailLogId, now)));
  } catch (loggingError) {
    console.error("[Logging] failed to write EMAIL_LOG row:", input.relatedId, loggingError);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Logging.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/Logging.ts apps/salon-portfolio/gas/tests/Logging.test.ts
git commit -m "feat(gas): add ERROR_LOG/EMAIL_LOG row builders and writers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 8: ReservationAvailabilityFactory — calendar-id resolution + strategy wiring

**Files:**
- Create: `apps/salon-portfolio/gas/src/availability/ReservationAvailabilityFactory.ts`
- Test: `apps/salon-portfolio/gas/tests/availability/ReservationAvailabilityFactory.test.ts`

**Interfaces:**
- Consumes: `StaffSelectionResolution` (`../models/ReservationDomain`), `ANY_STAFF` (`../models/ReservationRequest`), `BusyInterval`/`AvailabilityStrategy` (`./AvailabilityStrategy`), `createSharedAvailabilityStrategy` (`./SharedAvailabilityStrategy`), `createStaffAvailabilityStrategy` (`./StaffAvailabilityStrategy`), `StaffRow` (`../SheetSchemas`).
- Produces: `resolveCalendarIdForStaff(staff: StaffRow, fallbackCalendarId: string): string`, `resolveCalendarIdsForSelection(staffSelection: StaffSelectionResolution, fallbackCalendarId: string): string[]`, `buildAvailabilityStrategyFromBusyByCalendarId(staffSelection: StaffSelectionResolution, fallbackCalendarId: string, busyByCalendarId: Record<string, BusyInterval[]>): AvailabilityStrategy`. All pure. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/availability/ReservationAvailabilityFactory.test.ts`:

```ts
import {
  resolveCalendarIdForStaff,
  resolveCalendarIdsForSelection,
  buildAvailabilityStrategyFromBusyByCalendarId,
} from "../../src/availability/ReservationAvailabilityFactory";
import { StaffRow } from "../../src/SheetSchemas";

const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, CalendarID: "cal-a", DisplayOrder: 1 };
const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: undefined, DisplayOrder: 2 };
const FALLBACK = "shared-cal";

describe("resolveCalendarIdForStaff", () => {
  it("uses the staff's own CalendarID when present", () => {
    expect(resolveCalendarIdForStaff(staffA, FALLBACK)).toBe("cal-a");
  });

  it("falls back to the shared calendar when the staff has none", () => {
    expect(resolveCalendarIdForStaff(staffB, FALLBACK)).toBe(FALLBACK);
  });
});

describe("resolveCalendarIdsForSelection", () => {
  it("returns just the fallback calendar for 'none'", () => {
    expect(resolveCalendarIdsForSelection({ kind: "none" }, FALLBACK)).toEqual([FALLBACK]);
  });

  it("returns just that staff's calendar for 'specific'", () => {
    expect(resolveCalendarIdsForSelection({ kind: "specific", staff: staffA }, FALLBACK)).toEqual(["cal-a"]);
  });

  it("returns every eligible staff's calendar (with fallback applied per-staff) for 'any'", () => {
    expect(
      resolveCalendarIdsForSelection({ kind: "any", eligibleStaff: [staffA, staffB] }, FALLBACK),
    ).toEqual(["cal-a", FALLBACK]);
  });
});

describe("buildAvailabilityStrategyFromBusyByCalendarId", () => {
  const candidateInput = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };

  it("'none': available when the shared calendar has no conflicting event", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId({ kind: "none" }, FALLBACK, { [FALLBACK]: [] });
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: true });
  });

  it("'none': unavailable when the shared calendar has a conflicting event", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId({ kind: "none" }, FALLBACK, {
      [FALLBACK]: [{ start: "2026-09-10T10:30", end: "2026-09-10T11:30" }],
    });
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: false, reason: "CALENDAR_CONFLICT" });
  });

  it("'specific': resolves against that one staff's busy intervals and assigns that staff id", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId(
      { kind: "specific", staff: staffA },
      FALLBACK,
      { "cal-a": [] },
    );
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: true, assignedStaffId: "ST001" });
  });

  it("'any': assigns the first free staff in DisplayOrder", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId(
      { kind: "any", eligibleStaff: [staffA, staffB] },
      FALLBACK,
      { "cal-a": [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }], [FALLBACK]: [] },
    );
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: true, assignedStaffId: "ST002" });
  });

  it("'any': NO_STAFF_AVAILABLE when every eligible staff is busy", () => {
    const strategy = buildAvailabilityStrategyFromBusyByCalendarId(
      { kind: "any", eligibleStaff: [staffA] },
      FALLBACK,
      { "cal-a": [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }] },
    );
    expect(strategy.isAvailable(candidateInput)).toEqual({ available: false, reason: "NO_STAFF_AVAILABLE" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationAvailabilityFactory.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/availability/ReservationAvailabilityFactory.ts`:

```ts
import { ANY_STAFF } from "../models/ReservationRequest";
import { StaffSelectionResolution } from "../models/ReservationDomain";
import { StaffRow } from "../SheetSchemas";
import { AvailabilityStrategy, BusyInterval } from "./AvailabilityStrategy";
import { createSharedAvailabilityStrategy } from "./SharedAvailabilityStrategy";
import { createStaffAvailabilityStrategy } from "./StaffAvailabilityStrategy";

/**
 * Pure wiring between a resolved `StaffSelectionResolution` (Phase 3C) and
 * the two existing availability strategy constructors — the seam
 * `createReservation`'s orchestration (Task 12) uses both before the lock
 * (advisory) and, narrowed to one already-resolved staff/none, again
 * under the lock (Phase 0 §J/§K/§U). Never calls `CalendarApp` itself;
 * `busyByCalendarId` is always supplied by the caller (Task 9's
 * `Calendar.ts`, or a test fixture).
 */

export function resolveCalendarIdForStaff(staff: StaffRow, fallbackCalendarId: string): string {
  return staff.CalendarID && staff.CalendarID.trim().length > 0 ? staff.CalendarID : fallbackCalendarId;
}

export function resolveCalendarIdsForSelection(
  staffSelection: StaffSelectionResolution,
  fallbackCalendarId: string,
): string[] {
  switch (staffSelection.kind) {
    case "none":
      return [fallbackCalendarId];
    case "specific":
      return [resolveCalendarIdForStaff(staffSelection.staff, fallbackCalendarId)];
    case "any":
      return staffSelection.eligibleStaff.map((staff) => resolveCalendarIdForStaff(staff, fallbackCalendarId));
  }
}

export function buildAvailabilityStrategyFromBusyByCalendarId(
  staffSelection: StaffSelectionResolution,
  fallbackCalendarId: string,
  busyByCalendarId: Record<string, BusyInterval[]>,
): AvailabilityStrategy {
  if (staffSelection.kind === "none") {
    return createSharedAvailabilityStrategy(busyByCalendarId[fallbackCalendarId] ?? []);
  }

  if (staffSelection.kind === "specific") {
    const calendarId = resolveCalendarIdForStaff(staffSelection.staff, fallbackCalendarId);
    return createStaffAvailabilityStrategy({
      staffSelection: staffSelection.staff.StaffID,
      eligibleStaffIdsInOrder: [staffSelection.staff.StaffID],
      busyIntervalsByStaffId: { [staffSelection.staff.StaffID]: busyByCalendarId[calendarId] ?? [] },
    });
  }

  const eligibleStaffIdsInOrder = staffSelection.eligibleStaff.map((staff) => staff.StaffID);
  const busyIntervalsByStaffId: Record<string, BusyInterval[]> = {};
  for (const staff of staffSelection.eligibleStaff) {
    const calendarId = resolveCalendarIdForStaff(staff, fallbackCalendarId);
    busyIntervalsByStaffId[staff.StaffID] = busyByCalendarId[calendarId] ?? [];
  }
  return createStaffAvailabilityStrategy({ staffSelection: ANY_STAFF, eligibleStaffIdsInOrder, busyIntervalsByStaffId });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationAvailabilityFactory.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/availability/ReservationAvailabilityFactory.ts apps/salon-portfolio/gas/tests/availability/ReservationAvailabilityFactory.test.ts
git commit -m "feat(gas): add reservation availability strategy factory

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 9: Calendar.ts and Mail.ts — thin Google-service adapters

**Files:**
- Create: `apps/salon-portfolio/gas/src/Calendar.ts`
- Create: `apps/salon-portfolio/gas/src/Mail.ts`
- Test: `apps/salon-portfolio/gas/tests/Calendar.test.ts`

**Interfaces:**
- Consumes: `BusyInterval` (`./availability/AvailabilityStrategy`), `formatInstantAsTokyoLocalDateTimeString`/`tokyoDateTimeToInstant` (`./Utils`, Task 1).
- Produces (pure, tested): `toBusyInterval(start: Date, end: Date, staffId?: string): BusyInterval`. Produces (thin, untested): `getBusyEvents(calendarId: string, rangeStart: Date, rangeEnd: Date, staffId?: string): BusyInterval[]`, `createReservationEvent(input: CreateReservationEventInput): string`, and `Mail.ts`'s `sendEmail(to: string, subject: string, body: string): void`. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/Calendar.test.ts`:

```ts
import { toBusyInterval } from "../src/Calendar";

describe("toBusyInterval", () => {
  it("formats start/end as Tokyo-local strings", () => {
    expect(toBusyInterval(new Date("2026-09-10T01:00:00.000Z"), new Date("2026-09-10T02:00:00.000Z"))).toEqual({
      start: "2026-09-10T10:00",
      end: "2026-09-10T11:00",
      staffId: undefined,
    });
  });

  it("carries an optional staffId through unchanged", () => {
    expect(toBusyInterval(new Date("2026-09-10T01:00:00.000Z"), new Date("2026-09-10T02:00:00.000Z"), "ST001").staffId).toBe(
      "ST001",
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Calendar.test.ts`
Expected: FAIL — cannot find module `../src/Calendar`.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/Calendar.ts`:

```ts
import { BusyInterval } from "./availability/AvailabilityStrategy";
import { formatInstantAsTokyoLocalDateTimeString, tokyoDateTimeToInstant } from "./Utils";

/**
 * Thin Calendar adapter (Phase 0 §T: "query/create only — does not decide
 * availability, that's the availability strategies"). The only place
 * `CalendarApp` is called anywhere in this project.
 */

/** Pure: maps one already-fetched event's real start/end instants into a
 *  `BusyInterval` (the exact seam `availability/*Strategy.ts` expects).
 *  Exported and Jest-covered even though its only caller, `getBusyEvents`
 *  below, is not itself unit tested (Phase 0 §Q). */
export function toBusyInterval(start: Date, end: Date, staffId?: string): BusyInterval {
  return {
    start: formatInstantAsTokyoLocalDateTimeString(start),
    end: formatInstantAsTokyoLocalDateTimeString(end),
    staffId,
  };
}

export function getBusyEvents(
  calendarId: string,
  rangeStart: Date,
  rangeEnd: Date,
  staffId?: string,
): BusyInterval[] {
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throw new Error(`Calendar "${calendarId}" was not found or is not accessible.`);
  }
  return calendar
    .getEvents(rangeStart, rangeEnd)
    .map((event) => toBusyInterval(event.getStartTime(), event.getEndTime(), staffId));
}

export interface CreateReservationEventInput {
  calendarId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Creates the real Calendar event for a confirmed reservation (Phase 0
 *  §U step 6) and returns its event id. `date`/`startTime`/`endTime` are
 *  Asia/Tokyo-local strings — `CalendarApp.createEvent` always interprets
 *  its `Date` arguments as absolute instants, never as a server-local
 *  wall-clock reading, so the Tokyo conversion is required regardless of
 *  the Apps Script project's own timezone setting. */
export function createReservationEvent(input: CreateReservationEventInput): string {
  const calendar = CalendarApp.getCalendarById(input.calendarId);
  if (!calendar) {
    throw new Error(`Calendar "${input.calendarId}" was not found or is not accessible.`);
  }
  const start = new Date(tokyoDateTimeToInstant(input.date, input.startTime));
  const end = new Date(tokyoDateTimeToInstant(input.date, input.endTime));
  const event = calendar.createEvent(input.title, start, end, { description: input.description });
  return event.getId();
}
```

Create `apps/salon-portfolio/gas/src/Mail.ts`:

```ts
/** Thin Gmail adapter (Phase 0 §T: "wraps GmailApp.sendEmail; does not
 *  decide whether to send or what template beyond simple string
 *  templating passed in"). Not unit tested — a near-literal wrapper over
 *  a Google global; `ReservationEmailTemplates.ts` (Task 10) carries the
 *  tested content logic. */
export function sendEmail(to: string, subject: string, body: string): void {
  GmailApp.sendEmail(to, subject, body);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Calendar.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/Calendar.ts apps/salon-portfolio/gas/src/Mail.ts apps/salon-portfolio/gas/tests/Calendar.test.ts
git commit -m "feat(gas): add Calendar and Mail thin Google-service adapters

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 10: ReservationEmailTemplates — pure Japanese email copy

**Files:**
- Create: `apps/salon-portfolio/gas/src/ReservationEmailTemplates.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationEmailTemplates.test.ts`

**Interfaces:**
- Consumes: `NormalizedReservation` (`./models/ReservationDomain`).
- Produces: `EmailContent { subject: string; body: string }`, `ReservationEmailContext { reservationId: string; reservation: NormalizedReservation; cancellationUrl: string; businessName: string }`, `buildCustomerConfirmationEmail(ctx): EmailContent`, `buildOwnerConfirmedNotificationEmail(ctx): EmailContent`, `buildOwnerNeedsAttentionEmail(ctx, reasonSummary: string): EmailContent`. All pure. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/ReservationEmailTemplates.test.ts`:

```ts
import {
  buildCustomerConfirmationEmail,
  buildOwnerConfirmedNotificationEmail,
  buildOwnerNeedsAttentionEmail,
  ReservationEmailContext,
} from "../src/ReservationEmailTemplates";
import { NormalizedReservation } from "../src/models/ReservationDomain";

const reservation: NormalizedReservation = {
  reservationId: "RES-20260910-X8K2MP",
  submissionId: "sub-1",
  customerName: "山田太郎",
  email: "yamada@example.com",
  phone: "09012345678",
  date: "2026-09-10",
  startTime: "10:00",
  endTime: "11:00",
  serviceId: "SV001",
  serviceName: "ジェルネイル",
  durationMinutes: 60,
  price: 6000,
  staffSelection: { kind: "none" },
  assignedStaffId: undefined,
  notes: undefined,
};

const ctx: ReservationEmailContext = {
  reservationId: reservation.reservationId,
  reservation,
  cancellationUrl: "https://example.com/reservation/cancel?reservationId=RES-20260910-X8K2MP&token=abc",
  businessName: "サロン花",
};

describe("buildCustomerConfirmationEmail", () => {
  it("includes the reservation id, service, date/time, and cancellation link", () => {
    const email = buildCustomerConfirmationEmail(ctx);
    expect(email.subject).toContain("RES-20260910-X8K2MP");
    expect(email.body).toContain("山田太郎");
    expect(email.body).toContain("ジェルネイル");
    expect(email.body).toContain("2026-09-10");
    expect(email.body).toContain("10:00");
    expect(email.body).toContain(ctx.cancellationUrl);
  });

  it("never includes the customer's raw phone number or submissionId (Phase 0 §M)", () => {
    const email = buildCustomerConfirmationEmail(ctx);
    expect(email.body).not.toContain(reservation.phone!);
    expect(email.body).not.toContain(reservation.submissionId);
  });
});

describe("buildOwnerConfirmedNotificationEmail", () => {
  it("includes the customer name and assigned staff id when present", () => {
    const email = buildOwnerConfirmedNotificationEmail({
      ...ctx,
      reservation: { ...reservation, assignedStaffId: "ST001" },
    });
    expect(email.body).toContain("山田太郎");
    expect(email.body).toContain("ST001");
  });
});

describe("buildOwnerNeedsAttentionEmail", () => {
  it("includes the reservation id and the given reason", () => {
    const email = buildOwnerNeedsAttentionEmail(ctx, "カレンダーへの登録に失敗しました。");
    expect(email.subject).toContain("要確認");
    expect(email.body).toContain("カレンダーへの登録に失敗しました。");
    expect(email.body).toContain("RES-20260910-X8K2MP");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationEmailTemplates.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/ReservationEmailTemplates.ts`:

```ts
import { NormalizedReservation } from "./models/ReservationDomain";

/**
 * Pure Japanese email copy for the reservation workflow (Phase 0 §M) —
 * `Mail.ts` (Task 9) only sends whatever `{subject, body}` this module
 * builds; it never composes copy itself. Never includes `submissionId` or
 * the customer's raw phone number (Phase 0 §M: "emails never include
 * internal identifiers beyond what the customer needs").
 */

export interface EmailContent {
  subject: string;
  body: string;
}

export interface ReservationEmailContext {
  reservationId: string;
  reservation: NormalizedReservation;
  cancellationUrl: string;
  businessName: string;
}

export function buildCustomerConfirmationEmail(ctx: ReservationEmailContext): EmailContent {
  return {
    subject: `【${ctx.businessName}】ご予約を受け付けました（${ctx.reservationId}）`,
    body: [
      `${ctx.reservation.customerName} 様`,
      "",
      `${ctx.businessName}をご予約いただき、誠にありがとうございます。以下の内容でご予約を承りました。`,
      "",
      `予約番号: ${ctx.reservationId}`,
      `メニュー: ${ctx.reservation.serviceName}`,
      `日時: ${ctx.reservation.date} ${ctx.reservation.startTime}〜${ctx.reservation.endTime}`,
      "",
      "ご予約のキャンセルは以下のリンクから承ります。",
      ctx.cancellationUrl,
      "",
      ctx.businessName,
    ].join("\n"),
  };
}

export function buildOwnerConfirmedNotificationEmail(ctx: ReservationEmailContext): EmailContent {
  return {
    subject: `[予約通知] ${ctx.reservation.date} ${ctx.reservation.startTime} ${ctx.reservation.serviceName}`,
    body: [
      "新しいご予約が確定しました。",
      "",
      `予約番号: ${ctx.reservationId}`,
      `お客様名: ${ctx.reservation.customerName}`,
      `メニュー: ${ctx.reservation.serviceName}`,
      `日時: ${ctx.reservation.date} ${ctx.reservation.startTime}〜${ctx.reservation.endTime}`,
      ctx.reservation.assignedStaffId ? `担当スタッフID: ${ctx.reservation.assignedStaffId}` : "",
    ]
      .filter((line) => line.length > 0)
      .join("\n"),
  };
}

export function buildOwnerNeedsAttentionEmail(ctx: ReservationEmailContext, reasonSummary: string): EmailContent {
  return {
    subject: `[要確認] ご予約の自動確定に失敗しました（${ctx.reservationId}）`,
    body: [
      "以下のご予約はシステムで自動確定できませんでした。内容をご確認のうえ、手動でのカレンダー登録・対応をお願いします。",
      "",
      `予約番号: ${ctx.reservationId}`,
      `お客様名: ${ctx.reservation.customerName}`,
      `メニュー: ${ctx.reservation.serviceName}`,
      `日時: ${ctx.reservation.date} ${ctx.reservation.startTime}〜${ctx.reservation.endTime}`,
      `理由: ${reasonSummary}`,
      "",
      "詳細はERROR_LOGシートをご確認ください。",
    ].join("\n"),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationEmailTemplates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/ReservationEmailTemplates.ts apps/salon-portfolio/gas/tests/ReservationEmailTemplates.test.ts
git commit -m "feat(gas): add reservation email copy templates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 11: Idempotency — cache key + Sheet-backstop result mapping

**Files:**
- Create: `apps/salon-portfolio/gas/src/Idempotency.ts`
- Create: `apps/salon-portfolio/gas/src/RuntimeProperties.ts`
- Test: `apps/salon-portfolio/gas/tests/Idempotency.test.ts`

**Interfaces:**
- Consumes: `ReservationRow` (`./SheetSchemas`).
- Produces (pure, tested): `IdempotencyResult { reservationId: string; needsConfirmation?: boolean }`, `buildIdempotencyCacheKey(submissionId: string): string`, `mapReservationRowToResult(row: ReservationRow): IdempotencyResult`. Produces (thin, untested): `getCachedReservationResult(submissionId: string): IdempotencyResult | null`, `setCachedReservationResult(submissionId: string, result: IdempotencyResult): void`, and `RuntimeProperties.ts`'s `getSiteBaseUrl(): string`. Consumed by Task 12's `Api.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/gas/tests/Idempotency.test.ts`:

```ts
import { buildIdempotencyCacheKey, mapReservationRowToResult } from "../src/Idempotency";
import { ReservationRow } from "../src/SheetSchemas";

const baseRow: ReservationRow = {
  ReservationID: "RES-20260910-X8K2MP",
  SubmissionID: "sub-1",
  CreatedAt: "2026-09-06T00:00:00.000Z",
  UpdatedAt: "2026-09-06T00:00:00.000Z",
  Name: "山田太郎",
  Email: "yamada@example.com",
  Date: "2026-09-10",
  Time: "10:00",
  ServiceID: "SV001",
  Status: "受付済",
  EmailStatus: "sent",
  CancellationToken: "token",
};

describe("buildIdempotencyCacheKey", () => {
  it("namespaces the submissionId", () => {
    expect(buildIdempotencyCacheKey("sub-1")).toBe("reservation-submission:sub-1");
  });

  it("produces distinct keys for distinct submissionIds", () => {
    expect(buildIdempotencyCacheKey("sub-1")).not.toBe(buildIdempotencyCacheKey("sub-2"));
  });
});

describe("mapReservationRowToResult", () => {
  it("maps a 受付済 row without needsConfirmation", () => {
    expect(mapReservationRowToResult(baseRow)).toEqual({ reservationId: "RES-20260910-X8K2MP", needsConfirmation: undefined });
  });

  it("maps a 要確認 row with needsConfirmation: true", () => {
    expect(mapReservationRowToResult({ ...baseRow, Status: "要確認" })).toEqual({
      reservationId: "RES-20260910-X8K2MP",
      needsConfirmation: true,
    });
  });

  it("maps a still-処理中 row the same as 受付済 (no needsConfirmation) — a retry mid-flight replays as a plain pending success", () => {
    expect(mapReservationRowToResult({ ...baseRow, Status: "処理中" }).needsConfirmation).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Idempotency.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/gas/src/Idempotency.ts`:

```ts
import { ReservationRow } from "./SheetSchemas";

/**
 * Idempotency (Phase 0 §P): a `CacheService` fast path plus the
 * RESERVATIONS sheet itself as the durable backstop (`ReservationRepository`'s
 * `findReservationBySubmissionId`, Task 6, does the actual sheet lookup —
 * this module only builds the cache key and reconstructs the result shape
 * from an already-found row).
 */

export interface IdempotencyResult {
  reservationId: string;
  needsConfirmation?: boolean;
}

const CACHE_PREFIX = "reservation-submission:";
const CACHE_TTL_SECONDS = 600;

export function buildIdempotencyCacheKey(submissionId: string): string {
  return `${CACHE_PREFIX}${submissionId}`;
}

/** Pure: reconstructs the same result shape `createReservation` originally
 *  returned, from an already-found RESERVATIONS row — the Sheet-backstop
 *  idempotency path (Phase 0 §P). */
export function mapReservationRowToResult(row: ReservationRow): IdempotencyResult {
  return {
    reservationId: row.ReservationID,
    needsConfirmation: row.Status === "要確認" ? true : undefined,
  };
}

/** Thin: fast-path idempotency check via CacheService. Not unit tested —
 *  a Google global. */
export function getCachedReservationResult(submissionId: string): IdempotencyResult | null {
  const raw = CacheService.getScriptCache().get(buildIdempotencyCacheKey(submissionId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as IdempotencyResult;
  } catch {
    return null;
  }
}

export function setCachedReservationResult(submissionId: string, result: IdempotencyResult): void {
  CacheService.getScriptCache().put(buildIdempotencyCacheKey(submissionId), JSON.stringify(result), CACHE_TTL_SECONDS);
}
```

Create `apps/salon-portfolio/gas/src/RuntimeProperties.ts`:

```ts
/** Thin Script Properties reader for deployment-environment values that
 *  are not business rules — same rationale as `Sheets.ts`'s
 *  `SPREADSHEET_ID`: `SITE_BASE_URL` varies per Vercel/GAS deployment
 *  (dev/staging/prod), not something a business owner edits via CONFIG
 *  (Phase 0 §R). Not unit tested — a Google global. */
export function getSiteBaseUrl(): string {
  const url = PropertiesService.getScriptProperties().getProperty("SITE_BASE_URL");
  if (!url) {
    throw new Error('Script Property "SITE_BASE_URL" is not set.');
  }
  return url.replace(/\/$/, "");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Idempotency.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/Idempotency.ts apps/salon-portfolio/gas/src/RuntimeProperties.ts apps/salon-portfolio/gas/tests/Idempotency.test.ts
git commit -m "feat(gas): add idempotency cache key/result mapping and site base URL property

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 12: `createReservation` orchestration in Api.ts

This is the integration task — everything from Tasks 1–11 is wired together here. Read the Global Constraints' "要確認 outcome nuance", "Atomicity limitation", and "Concurrency strengthening" sections again before writing this task's code.

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Api.ts`
- Test: `apps/salon-portfolio/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes everything produced by Tasks 1–11, plus existing `evaluateReservationRequest` (`./ReservationRules`), `getConfig`/`ConfigError` (`./ConfigStore`), `MissingHeadersError` (`./RowMapper`), `ReservationRequest` (`./models/ReservationRequest`), `AppConfig` (`./models/Config`), `NormalizedReservation`/`StaffSelectionResolution` (`./models/ReservationDomain`), `StaffRow` (`./SheetSchemas`), `SlotCandidate` (`./SlotEngine`), `AvailabilityResult` (`./availability/AvailabilityStrategy`).
- Produces: `createReservationAction(rawPayload: unknown): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }>`, exported alongside internal-but-exported-for-testing `SystemBusyError`, `SheetUpdateAfterCalendarCreateError`, `runReservationCriticalSection`, `resolveCreateReservationResponse` — plus `handleApiRequest`'s switch gains a `"createReservation"` case.

- [ ] **Step 1: Write the failing tests**

Add to the top of `apps/salon-portfolio/gas/tests/Api.test.ts`, alongside the existing `jest.mock("../src/ConfigStore", ...)`:

```ts
jest.mock("../src/Catalog");
jest.mock("../src/ReservationRepository");
jest.mock("../src/Idempotency");
jest.mock("../src/Calendar");
jest.mock("../src/Mail");
jest.mock("../src/Logging");
jest.mock("../src/RuntimeProperties", () => ({ getSiteBaseUrl: () => "https://example.com" }));
```

Add these imports near the top (alongside the existing ones):

```ts
import { createReservationAction } from "../src/Api";
import * as Catalog from "../src/Catalog";
import * as ReservationRepository from "../src/ReservationRepository";
import * as Idempotency from "../src/Idempotency";
import * as Calendar from "../src/Calendar";
import * as Mail from "../src/Mail";
import * as Logging from "../src/Logging";
import { ServiceRow, StaffRow } from "../src/SheetSchemas";
import { AppConfig } from "../src/models/Config";
import { ReservationRequest } from "../src/models/ReservationRequest";
```

Add this new `describe` block at the end of the file:

```ts
describe("createReservationAction", () => {
  const service: ServiceRow = {
    ServiceID: "SV001",
    Name: "ジェルネイル",
    DurationMinutes: 60,
    Price: 6000,
    Active: true,
    StaffRequired: false,
    DisplayOrder: 1,
  };
  const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, CalendarID: "cal-a", DisplayOrder: 1 };
  const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: "cal-b", DisplayOrder: 2 };

  function buildConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
      business: { name: "サロン花", phone: "0300000000", email: "info@example.com", address: "東京都" },
      hours: {
        monday: "09:00-18:00",
        tuesday: "09:00-18:00",
        wednesday: "09:00-18:00",
        thursday: "09:00-18:00",
        friday: "09:00-18:00",
        saturday: "09:00-18:00",
        sunday: "closed",
      },
      holidays: [],
      features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
      staffAnyAvailableOption: true,
      reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
      calendarId: "shared-cal",
      emailOwnerNotifyAddress: "owner@example.com",
      emailFromName: "サロン花",
      ...overrides,
    };
  }

  function buildRequest(overrides: Partial<ReservationRequest> = {}): ReservationRequest {
    return {
      submissionId: "sub-1",
      serviceId: "SV001",
      date: "2026-09-10",
      time: "10:00",
      name: "山田太郎",
      email: "yamada@example.com",
      ...overrides,
    };
  }

  const { getConfig } = jest.requireMock("../src/ConfigStore") as { getConfig: jest.Mock };

  let lockState: { tryLockResults: boolean[]; releaseCount: number };

  beforeEach(() => {
    jest.clearAllMocks();
    lockState = { tryLockResults: [true, true], releaseCount: 0 };
    (global as unknown as { LockService: unknown }).LockService = {
      getScriptLock: () => ({
        tryLock: () => lockState.tryLockResults.shift() ?? false,
        releaseLock: () => {
          lockState.releaseCount += 1;
        },
      }),
    };
    (Catalog.getServiceRows as jest.Mock).mockReturnValue([service]);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([staffA, staffB]);
    (Idempotency.getCachedReservationResult as jest.Mock).mockReturnValue(null);
    (ReservationRepository.findReservationBySubmissionId as jest.Mock).mockReturnValue(null);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);
    (Calendar.createReservationEvent as jest.Mock).mockReturnValue("event-1");
    getConfig.mockReturnValue(buildConfig());
  });

  it("returns FEATURE_DISABLED when the reservation feature is off", () => {
    getConfig.mockReturnValue(buildConfig({ features: { ...buildConfig().features, reservation: false } }));
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "FEATURE_DISABLED", message: expect.any(String) } });
  });

  it("returns the cached result without touching the repository or Calendar (idempotency fast path)", () => {
    (Idempotency.getCachedReservationResult as jest.Mock).mockReturnValue({ reservationId: "RES-CACHED" });
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: true, data: { reservationId: "RES-CACHED" } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
    expect(Calendar.createReservationEvent).not.toHaveBeenCalled();
  });

  it("returns the Sheet-backstop result and re-populates the cache (idempotency retry after cache expiry)", () => {
    (ReservationRepository.findReservationBySubmissionId as jest.Mock).mockReturnValue({
      ReservationID: "RES-EXISTING",
      Status: "受付済",
    });
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: true, data: { reservationId: "RES-EXISTING", needsConfirmation: undefined } });
    expect(Idempotency.setCachedReservationResult).toHaveBeenCalledWith("sub-1", { reservationId: "RES-EXISTING", needsConfirmation: undefined });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("returns SYSTEM_BUSY when the idempotency-claim lock cannot be acquired", () => {
    lockState.tryLockResults = [false];
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SYSTEM_BUSY", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("returns SYSTEM_BUSY when the critical-section lock cannot be acquired, leaving the pending row untouched", () => {
    lockState.tryLockResults = [true, false];
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SYSTEM_BUSY", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).toHaveBeenCalledTimes(1);
    expect(ReservationRepository.markReservationNeedsConfirmation).not.toHaveBeenCalled();
    expect(ReservationRepository.markReservationConfirmed).not.toHaveBeenCalled();
  });

  it("normal successful booking: confirms the row, creates the Calendar event, sends both emails", () => {
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.reservationId).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
      expect(response.data.needsConfirmation).toBeUndefined();
    }
    expect(ReservationRepository.markReservationConfirmed).toHaveBeenCalledWith(
      expect.any(String),
      "event-1",
      expect.any(Date),
    );
    expect(Mail.sendEmail).toHaveBeenCalledTimes(2);
    expect(ReservationRepository.updateReservationEmailStatus).toHaveBeenCalledWith(expect.any(String), "sent", expect.any(Date));
    expect(lockState.releaseCount).toBe(2);
  });

  it("slot becomes unavailable during the lock-protected re-check: SLOT_UNAVAILABLE error, row marked 要確認, no customer email", () => {
    (Calendar.getBusyEvents as jest.Mock)
      .mockReturnValueOnce([]) // pre-lock advisory check
      .mockReturnValueOnce([{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }]); // lock-protected re-check
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: expect.any(String) } });
    expect(ReservationRepository.markReservationNeedsConfirmation).toHaveBeenCalled();
    expect(Calendar.createReservationEvent).not.toHaveBeenCalled();
    expect(Mail.sendEmail).toHaveBeenCalledTimes(1); // owner needs-attention only
  });

  it("Calendar event creation fails: still ok:true with needsConfirmation, row marked 要確認, owner-only email", () => {
    (Calendar.createReservationEvent as jest.Mock).mockImplementation(() => {
      throw new Error("Calendar API quota exceeded");
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.needsConfirmation).toBe(true);
    }
    expect(ReservationRepository.markReservationNeedsConfirmation).toHaveBeenCalled();
    expect(ReservationRepository.markReservationConfirmed).not.toHaveBeenCalled();
    expect(Mail.sendEmail).toHaveBeenCalledTimes(1);
    expect(Logging.logError).toHaveBeenCalled();
  });

  it("Sheet update fails after Calendar succeeds: SHEET_ERROR, CalendarEventID preserved in the ERROR_LOG context, no emails sent", () => {
    (ReservationRepository.markReservationConfirmed as jest.Mock).mockImplementation(() => {
      throw new Error("Sheets API rate limit");
    });
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SHEET_ERROR", message: expect.any(String) } });
    expect(Logging.logError).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "critical", context: expect.objectContaining({ calendarEventId: "event-1" }) }),
    );
    expect(Mail.sendEmail).not.toHaveBeenCalled();
  });

  it("email send failure after a successful reservation does not change the success response or roll back the reservation", () => {
    (Mail.sendEmail as jest.Mock).mockImplementation(() => {
      throw new Error("Gmail quota exceeded");
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    expect(ReservationRepository.updateReservationEmailStatus).toHaveBeenCalledWith(expect.any(String), "failed", expect.any(Date));
    expect(Logging.logEmail).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }), );
  });

  it("specific staff selection: assigns the requested staff and creates the event on that staff's calendar", () => {
    getConfig.mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    createReservationAction(buildRequest({ staffId: "ST002" }));
    expect(Calendar.createReservationEvent).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "cal-b" }));
  });

  it("ANY_STAFF selection: assigns the first free staff in DisplayOrder", () => {
    getConfig.mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    (Calendar.getBusyEvents as jest.Mock).mockImplementation((calendarId: string) =>
      calendarId === "cal-a" ? [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }] : [],
    );
    createReservationAction(buildRequest({ staffId: "ANY" }));
    expect(Calendar.createReservationEvent).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "cal-b" }));
  });

  it("unavailable specific staff: SLOT_UNAVAILABLE before any row is written", () => {
    getConfig.mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }]);
    const response = createReservationAction(buildRequest({ staffId: "ST001" }));
    expect(response).toEqual({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("unauthorized/unknown staff id is rejected as VALIDATION_ERROR before any row is written", () => {
    getConfig.mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    const response = createReservationAction(buildRequest({ staffId: "ST999" }));
    expect(response).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied price/duration and uses the server-resolved service data for the created row", () => {
    createReservationAction({ ...buildRequest(), price: 1, durationMinutes: 1 } as unknown as ReservationRequest);
    const [[pendingRow]] = (ReservationRepository.appendReservationRow as jest.Mock).mock.calls;
    // appendReservationRow itself takes the already-built ReservationRow —
    // buildPendingReservationRow (Task 6) only ever reads price/duration
    // from the server-resolved NormalizedReservation, which has no
    // pass-through field for a client-supplied price/duration at all.
    expect(pendingRow.ServiceID).toBe("SV001");
  });

  it("sanitizes a ConfigError from getConfig into CONFIG_INVALID without leaking issues", () => {
    const { ConfigError } = jest.requireActual("../src/ConfigStore");
    getConfig.mockImplementation(() => {
      throw new ConfigError([{ field: "calendar.id", reason: "missing" }]);
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      expect(JSON.stringify(response)).not.toContain("calendar.id");
    }
  });

  it("never includes GAS_WEBAPP_URL or a raw exception message in any response", () => {
    (Calendar.createReservationEvent as jest.Mock).mockImplementation(() => {
      throw new Error("https://script.google.com/macros/s/SUPER-SECRET-DEPLOYMENT-ID/exec failed");
    });
    const response = createReservationAction(buildRequest());
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("script.google.com");
    expect(serialized).not.toContain("SUPER-SECRET-DEPLOYMENT-ID");
  });
});
```

Also add, in `describe("handleApiRequest dispatch", ...)`:

```ts
  it("routes createReservation to createReservationAction instead of rejecting it as unsupported", () => {
    // With ConfigStore mocked, getConfig() returns undefined by default
    // here (no mockReturnValue set in this describe block), so
    // createReservationActionInner throws reading `config.features` —
    // createReservationAction's own top-level catch (Step 3) turns that
    // into INTERNAL_ERROR rather than letting it escape handleApiRequest.
    // This test only asserts that dispatch actually reached
    // createReservationAction (i.e. it is NOT the "Unsupported action"
    // VALIDATION_ERROR the default switch case would produce) — the
    // createReservationAction `describe` block above covers its real
    // behavior in full.
    const response = handleApiRequest('{"action":"createReservation","payload":{}}');
    expect(response).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: expect.any(String) },
    });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Api.test.ts`
Expected: FAIL — `createReservationAction is not exported` / module resolution errors for the not-yet-imported mocks resolving to empty objects.

- [ ] **Step 3: Implement**

Add these imports to the top of `apps/salon-portfolio/gas/src/Api.ts` (alongside the existing ones):

```ts
import { AppConfig } from "./models/Config";
import { NormalizedReservation, StaffSelectionResolution } from "./models/ReservationDomain";
import { ReservationRequest } from "./models/ReservationRequest";
import { StaffRow } from "./SheetSchemas";
import { SlotCandidate } from "./SlotEngine";
import { AvailabilityResult, AvailabilityStrategy, BusyInterval } from "./availability/AvailabilityStrategy";
import { resolveCalendarIdsForSelection, buildAvailabilityStrategyFromBusyByCalendarId } from "./availability/ReservationAvailabilityFactory";
import { evaluateReservationRequest } from "./ReservationRules";
import { getServiceRows, getStaffRows } from "./Catalog";
import { mapReservationIssueToErrorResponse } from "./ReservationErrorMapping";
import {
  appendReservationRow,
  buildPendingReservationRow,
  findReservationBySubmissionId,
  markReservationConfirmed,
  markReservationNeedsConfirmation,
  updateReservationEmailStatus,
} from "./ReservationRepository";
import { generateCancellationToken } from "./ids/CancellationToken";
import {
  getCachedReservationResult,
  setCachedReservationResult,
  mapReservationRowToResult,
  IdempotencyResult,
} from "./Idempotency";
import { getBusyEvents, createReservationEvent } from "./Calendar";
import { sendEmail } from "./Mail";
import { getSiteBaseUrl } from "./RuntimeProperties";
import { logError, logEmail } from "./Logging";
import {
  buildCustomerConfirmationEmail,
  buildOwnerConfirmedNotificationEmail,
  buildOwnerNeedsAttentionEmail,
  ReservationEmailContext,
} from "./ReservationEmailTemplates";
import { tokyoCalendarDayRange, toTokyoLocalDateTimeString } from "./Utils";
```

Append the rest of `createReservation`'s implementation to the end of `apps/salon-portfolio/gas/src/Api.ts`:

```ts
const CRITICAL_SECTION_LOCK_TIMEOUT_MS = 10_000;
const IDEMPOTENCY_CLAIM_LOCK_TIMEOUT_MS = 5_000;

export class SystemBusyError extends Error {
  constructor() {
    super("Lock acquisition timed out.");
    this.name = "SystemBusyError";
  }
}

/** Thrown when the Calendar event was created successfully but the
 *  follow-up Sheet update itself failed — the one Sheet+Calendar
 *  atomicity gap this system cannot close (see
 *  docs/reservation-transaction-architecture.md). Carries the orphaned
 *  `calendarEventId` so the resulting ERROR_LOG entry preserves it for
 *  manual reconciliation. */
export class SheetUpdateAfterCalendarCreateError extends Error {
  constructor(public readonly reservationId: string, public readonly calendarEventId: string, cause: unknown) {
    super(`Sheet update failed after Calendar event ${calendarEventId} was created for ${reservationId}: ${String(cause)}`);
    this.name = "SheetUpdateAfterCalendarCreateError";
  }
}

function buildAvailabilityFor(fallbackCalendarId: string) {
  return (candidate: SlotCandidate, staffSelection: StaffSelectionResolution): AvailabilityStrategy => {
    const calendarIds = [...new Set(resolveCalendarIdsForSelection(staffSelection, fallbackCalendarId))];
    const { start, end } = tokyoCalendarDayRange(candidate.date);
    const busyByCalendarId: Record<string, BusyInterval[]> = {};
    for (const calendarId of calendarIds) {
      busyByCalendarId[calendarId] = getBusyEvents(calendarId, start, end);
    }
    return buildAvailabilityStrategyFromBusyByCalendarId(staffSelection, fallbackCalendarId, busyByCalendarId);
  };
}

export type CriticalSectionResult =
  | { kind: "confirmed"; calendarEventId: string }
  | { kind: "needsConfirmationLostRace" }
  | { kind: "needsConfirmationCalendarFailure"; reason: string }
  | { kind: "sheetUpdateFailedAfterCalendar"; calendarEventId: string; cause: unknown }
  | { kind: "unexpectedError"; cause: unknown };

/** Everything inside the main lock (Phase 0 §U steps 5-7, task brief §6):
 *  re-check availability -> create Calendar event -> update the Sheet row
 *  to its final state. Narrows the re-check to the single staff already
 *  advisory-picked by the pre-lock `evaluateReservationRequest` call
 *  (`reservation.assignedStaffId`) rather than re-running the full
 *  ANY_STAFF "first free" search a second time here — re-implementing
 *  that search outside `ReservationRules.ts` would duplicate Phase 3C
 *  logic (an explicit Global Constraint). Trade-off: if that one
 *  advisory-picked staff became busy in the brief pre-lock-to-lock gap
 *  while a *different* eligible staff is still free, this rejects as
 *  SLOT_UNAVAILABLE rather than reassigning — documented in
 *  docs/reservation-transaction-architecture.md's Known Limitations. */
export function runReservationCriticalSection(
  reservation: NormalizedReservation,
  config: AppConfig,
  staff: StaffRow[],
): CriticalSectionResult {
  const assignedStaff = reservation.assignedStaffId
    ? staff.find((member) => member.StaffID === reservation.assignedStaffId)
    : undefined;
  if (reservation.assignedStaffId && !assignedStaff) {
    return {
      kind: "unexpectedError",
      cause: new Error(`Assigned staff "${reservation.assignedStaffId}" vanished from the catalog before the lock re-check.`),
    };
  }
  const staffSelection: StaffSelectionResolution = assignedStaff ? { kind: "specific", staff: assignedStaff } : { kind: "none" };

  let recheck: AvailabilityResult;
  try {
    const strategy = buildAvailabilityFor(config.calendarId)(
      { date: reservation.date, startTime: reservation.startTime, endTime: reservation.endTime },
      staffSelection,
    );
    recheck = strategy.isAvailable({
      candidateStart: toTokyoLocalDateTimeString(reservation.date, reservation.startTime),
      candidateEnd: toTokyoLocalDateTimeString(reservation.date, reservation.endTime),
    });
  } catch (cause) {
    return { kind: "unexpectedError", cause };
  }

  if (!recheck.available) {
    try {
      markReservationNeedsConfirmation(reservation.reservationId, new Date());
    } catch (cause) {
      return { kind: "unexpectedError", cause };
    }
    return { kind: "needsConfirmationLostRace" };
  }

  const calendarId = assignedStaff ? assignedStaff.CalendarID || config.calendarId : config.calendarId;

  let calendarEventId: string;
  try {
    calendarEventId = createReservationEvent({
      calendarId,
      title: `${reservation.serviceName} - ${reservation.customerName}`,
      description: `予約番号: ${reservation.reservationId}`,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });
  } catch (cause) {
    try {
      markReservationNeedsConfirmation(reservation.reservationId, new Date());
    } catch (markCause) {
      return { kind: "unexpectedError", cause: markCause };
    }
    return { kind: "needsConfirmationCalendarFailure", reason: cause instanceof Error ? cause.message : String(cause) };
  }

  try {
    markReservationConfirmed(reservation.reservationId, calendarEventId, new Date());
  } catch (cause) {
    return { kind: "sheetUpdateFailedAfterCalendar", calendarEventId, cause };
  }

  return { kind: "confirmed", calendarEventId };
}

export function resolveCreateReservationResponse(
  result: CriticalSectionResult,
  reservation: NormalizedReservation,
): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }> {
  switch (result.kind) {
    case "confirmed":
      return buildSuccessResponse({ reservationId: reservation.reservationId });
    case "needsConfirmationCalendarFailure":
      logError(
        { action: "createReservation", message: "Calendar event creation failed", context: { reservationId: reservation.reservationId }, severity: "error" },
      );
      return buildSuccessResponse({ reservationId: reservation.reservationId, needsConfirmation: true });
    case "needsConfirmationLostRace":
      logError(
        { action: "createReservation", message: "Lost race: slot no longer available at lock time", context: { reservationId: reservation.reservationId }, severity: "warning" },
      );
      return buildErrorResponse(
        ERROR_CODES.SLOT_UNAVAILABLE,
        "選択された時間帯は直前に埋まってしまいました。お手数ですが、別の時間帯をお選びください。",
      );
    case "sheetUpdateFailedAfterCalendar":
      logError({
        action: "createReservation",
        message: "Sheet update failed after Calendar event creation",
        context: { reservationId: reservation.reservationId, calendarEventId: result.calendarEventId },
        severity: "critical",
      });
      return buildErrorResponse(ERROR_CODES.SHEET_ERROR, "予約の確定処理に失敗しました。管理者にお問い合わせください。");
    case "unexpectedError":
      console.error("[createReservation] unexpected error in critical section:", reservation.reservationId, result.cause);
      logError({ action: "createReservation", message: "Unexpected error in createReservation critical section", context: { reservationId: reservation.reservationId }, severity: "critical" });
      return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

function buildCancellationUrl(reservation: NormalizedReservation, token: string): string {
  const base = getSiteBaseUrl();
  const query = [
    `reservationId=${encodeURIComponent(reservation.reservationId)}`,
    `token=${encodeURIComponent(token)}`,
    `date=${encodeURIComponent(reservation.date)}`,
    `time=${encodeURIComponent(reservation.startTime)}`,
    `service=${encodeURIComponent(reservation.serviceName)}`,
  ].join("&");
  return `${base}/reservation/cancel?${query}`;
}

function trySendAndLog(
  recipientType: "customer" | "owner",
  recipientEmail: string,
  content: { subject: string; body: string },
  reservationId: string,
): boolean {
  try {
    sendEmail(recipientEmail, content.subject, content.body);
    logEmail({ relatedType: "Reservation", relatedId: reservationId, recipientType, recipientEmail, subject: content.subject, status: "sent" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[createReservation] email send failed:", reservationId, recipientType, message);
    logEmail({ relatedType: "Reservation", relatedId: reservationId, recipientType, recipientEmail, subject: content.subject, status: "failed", errorMessage: message });
    logError({ action: "createReservation", message: "Email send failed", context: { reservationId, recipientType }, severity: "warning" });
    return false;
  }
}

/** Step 9 (Phase 0 §U/§M): strictly outside the lock. Never runs at all
 *  for `sheetUpdateFailedAfterCalendar`/`unexpectedError` — the row's
 *  final state is not reliably known in those cases (master §12: never a
 *  false confirmation), and the owner already has a CRITICAL ERROR_LOG
 *  entry, the correct channel for that case. */
function sendReservationEmailsForOutcome(
  result: CriticalSectionResult,
  reservation: NormalizedReservation,
  config: AppConfig,
  cancellationToken: string,
): void {
  if (result.kind !== "confirmed" && result.kind !== "needsConfirmationCalendarFailure" && result.kind !== "needsConfirmationLostRace") {
    return;
  }

  const ctx: ReservationEmailContext = {
    reservationId: reservation.reservationId,
    reservation,
    cancellationUrl: buildCancellationUrl(reservation, cancellationToken),
    businessName: config.business.name,
  };

  let allSucceeded: boolean;
  if (result.kind === "confirmed") {
    const customerOk = trySendAndLog("customer", reservation.email, buildCustomerConfirmationEmail(ctx), reservation.reservationId);
    const ownerOk = trySendAndLog("owner", config.emailOwnerNotifyAddress, buildOwnerConfirmedNotificationEmail(ctx), reservation.reservationId);
    allSucceeded = customerOk && ownerOk;
  } else {
    const reason =
      result.kind === "needsConfirmationCalendarFailure"
        ? result.reason
        : "予約枠の重複が検知されました（直前に埋まった可能性があります）。";
    allSucceeded = trySendAndLog("owner", config.emailOwnerNotifyAddress, buildOwnerNeedsAttentionEmail(ctx, reason), reservation.reservationId);
  }

  try {
    updateReservationEmailStatus(reservation.reservationId, allSucceeded ? "sent" : "failed", new Date());
  } catch (error) {
    console.error("[createReservation] failed to persist EmailStatus:", reservation.reservationId, error);
  }
}

/** Closes the race two truly-simultaneous requests carrying the same
 *  `submissionId` would otherwise have (see Global Constraints:
 *  "Concurrency strengthening"). A short, separate lock acquisition from
 *  the main critical-section lock below. */
function claimSubmissionOrGetExisting(
  submissionId: string,
  appendPendingRow: () => void,
): { kind: "existing"; result: IdempotencyResult } | { kind: "claimed" } {
  const cached = getCachedReservationResult(submissionId);
  if (cached) {
    return { kind: "existing", result: cached };
  }

  const lock = LockService.getScriptLock();
  let acquired = false;
  try {
    acquired = lock.tryLock(IDEMPOTENCY_CLAIM_LOCK_TIMEOUT_MS);
  } catch {
    acquired = false;
  }
  if (!acquired) {
    throw new SystemBusyError();
  }
  try {
    const existingRow = findReservationBySubmissionId(submissionId);
    if (existingRow) {
      const result = mapReservationRowToResult(existingRow);
      setCachedReservationResult(submissionId, result);
      return { kind: "existing", result };
    }
    appendPendingRow();
    return { kind: "claimed" };
  } finally {
    lock.releaseLock();
  }
}

function createReservationActionInner(rawPayload: unknown): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  if (!rawPayload || typeof rawPayload !== "object") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }

  const now = new Date();
  const services = getServiceRows();
  const staff = config.features.staffSelection ? getStaffRows() : [];

  const evaluation = evaluateReservationRequest({
    request: rawPayload as ReservationRequest,
    services,
    staff,
    config,
    now,
    availabilityFor: buildAvailabilityFor(config.calendarId),
  });
  if (!evaluation.ok) {
    const { code, message } = mapReservationIssueToErrorResponse(evaluation.issues[0]);
    return buildErrorResponse(code, message);
  }

  const reservation = evaluation.reservation;
  const cancellationToken = generateCancellationToken();

  let claim: { kind: "existing"; result: IdempotencyResult } | { kind: "claimed" };
  try {
    claim = claimSubmissionOrGetExisting(reservation.submissionId, () =>
      appendReservationRow(buildPendingReservationRow(reservation, now, cancellationToken)),
    );
  } catch (error) {
    if (error instanceof SystemBusyError) {
      return buildErrorResponse(ERROR_CODES.SYSTEM_BUSY, "只今混み合っております。少々時間をおいて再度お試しください。");
    }
    logError({ action: "createReservation", message: "Failed while claiming submissionId", context: { submissionId: reservation.submissionId }, severity: "error" }, now);
    return buildErrorResponse(ERROR_CODES.SHEET_ERROR, "予約の受付処理に失敗しました。時間をおいて再度お試しください。");
  }

  if (claim.kind === "existing") {
    return buildSuccessResponse(claim.result);
  }

  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(CRITICAL_SECTION_LOCK_TIMEOUT_MS);
  } catch {
    lockAcquired = false;
  }
  if (!lockAcquired) {
    logError({ action: "createReservation", message: "Lock acquisition timed out", context: { reservationId: reservation.reservationId }, severity: "warning" }, now);
    return buildErrorResponse(ERROR_CODES.SYSTEM_BUSY, "只今混み合っております。少々時間をおいて再度お試しください。");
  }

  let result: CriticalSectionResult;
  try {
    result = runReservationCriticalSection(reservation, config, staff);
  } finally {
    lock.releaseLock();
  }

  const response = resolveCreateReservationResponse(result, reservation);
  if (response.ok) {
    setCachedReservationResult(reservation.submissionId, response.data);
  }
  sendReservationEmailsForOutcome(result, reservation, config, cancellationToken);
  return response;
}

/** `createReservation` action handler (task brief §1-32; master spec §U).
 *  Thin outer wrapper: maps `ConfigStore`/`RowMapper` infrastructure
 *  errors the same way `getConfigAction` does, so a CONFIG/catalog sheet
 *  problem never crashes past `Api.ts`'s boundary. */
export function createReservationAction(
  rawPayload: unknown,
): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }> {
  try {
    return createReservationActionInner(rawPayload);
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[createReservation] unexpected top-level error:", error);
    logError({ action: "createReservation", message: "Unexpected top-level error", severity: "critical" });
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}
```

Finally, add the dispatch case to the existing `handleApiRequest` switch:

```ts
    case "getConfig":
      return getConfigAction();
    case "createReservation":
      return createReservationAction(parsed.request.payload);
    default:
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Api.test.ts && npm run typecheck`
Expected: PASS — all existing `Api.test.ts` tests plus every new `createReservationAction` test. Fix any TypeScript narrowing issues that come up (e.g. `AppConfig["features"]` spreads) before moving on — do not silence them with `any`.

- [ ] **Step 5: Run the full GAS suite and record evidence**

Run: `cd apps/salon-portfolio/gas && npm run typecheck > ../../../.evidence/<timestamp>-phase4-reservation-transaction/gas-typecheck.log 2>&1 && npm test -- --verbose > ../../../.evidence/<timestamp>-phase4-reservation-transaction/gas-test.log 2>&1`
Expected: both PASS. Count total tests before (from Phase 3C's own final evidence log, cited by path) vs. after (from this log) for the Tier-1 report.

- [ ] **Step 6: Commit**

```bash
git add apps/salon-portfolio/gas/src/Api.ts apps/salon-portfolio/gas/tests/Api.test.ts
git commit -m "feat(gas): implement createReservation transaction orchestration

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 13: Frontend — minimal `createReservation` client wiring

Per the task brief §21/§3 and Global Constraints: no reservation-page UI/UX work happens here. `app/reservation/page.tsx` stays the existing placeholder untouched. This task only proves "frontend can reach it through `/api/gas`" via a tested, typed client function a later dedicated frontend phase will call from an actual form.

**Files:**
- Create: `apps/salon-portfolio/web/types/reservation.ts`
- Create: `apps/salon-portfolio/web/lib/api/reservationClient.ts`
- Test: `apps/salon-portfolio/web/lib/api/reservationClient.test.ts`

**Interfaces:**
- Produces: `ReservationSubmission`, `ReservationSubmissionSuccess`, `ReservationSubmissionFailure`, `ReservationSubmissionResult` (types), `submitReservation(submission: ReservationSubmission): Promise<ReservationSubmissionResult>`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/web/types/reservation.ts`:

```ts
/**
 * Client-facing reservation submission contract — mirrors the GAS
 * backend's `ReservationRequest` (`gas/src/models/ReservationRequest.ts`)
 * field-for-field. Kept as a separate frontend type (not imported across
 * the gas/web package boundary) matching this repo's existing convention
 * (`types/runtime-config.ts` mirrors `gas/src/models/Config.ts` the same
 * way).
 */

export const ANY_STAFF = "ANY" as const;

export interface ReservationSubmission {
  submissionId: string;
  serviceId: string;
  staffId?: string | typeof ANY_STAFF;
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface ReservationSubmissionSuccess {
  reservationId: string;
  needsConfirmation?: boolean;
}

export interface ReservationSubmissionFailure {
  code: string;
  message: string;
}

export type ReservationSubmissionResult =
  | { ok: true; data: ReservationSubmissionSuccess }
  | { ok: false; error: ReservationSubmissionFailure };
```

Create `apps/salon-portfolio/web/lib/api/reservationClient.test.ts`:

```ts
import { submitReservation } from "./reservationClient";
import { ReservationSubmission } from "@/types/reservation";

const submission: ReservationSubmission = {
  submissionId: "sub-1",
  serviceId: "SV001",
  date: "2026-09-10",
  time: "10:00",
  name: "山田太郎",
  email: "yamada@example.com",
};

describe("submitReservation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs to /api/gas with the createReservation action and the submission as payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await submitReservation(submission);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "createReservation", payload: submission }),
      }),
    );
    expect(result).toEqual({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } });
  });

  it("returns a controlled NETWORK_ERROR when fetch itself throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const result = await submitReservation(submission);
    expect(result).toEqual({ ok: false, error: { code: "NETWORK_ERROR", message: expect.any(String) } });
  });

  it("returns a controlled INVALID_RESPONSE when the body is not valid JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    const result = await submitReservation(submission);
    expect(result).toEqual({ ok: false, error: { code: "INVALID_RESPONSE", message: expect.any(String) } });
  });

  it("forwards a GAS-originated failure envelope unchanged", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" } }),
    }) as unknown as typeof fetch;
    const result = await submitReservation(submission);
    expect(result).toEqual({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" } });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest reservationClient.test.ts`
Expected: FAIL — cannot find module `./reservationClient`.

- [ ] **Step 3: Implement**

Create `apps/salon-portfolio/web/lib/api/reservationClient.ts`:

```ts
import { ReservationSubmission, ReservationSubmissionResult } from "@/types/reservation";

/**
 * Client-safe wrapper for submitting a reservation through the existing
 * `/api/gas` proxy (Phase 3B `app/api/gas/route.ts`) — this file may be
 * imported from a Client Component; it never touches `GAS_WEBAPP_URL`
 * directly (that stays inside the server-only `lib/api/gasClient.ts`,
 * reached only via the Next.js route handler). Building an actual
 * reservation form/wizard UI around this function is out of scope for
 * Phase 4 (see docs/reservation-transaction-architecture.md) — this
 * establishes the wiring only.
 */
export async function submitReservation(
  submission: ReservationSubmission,
): Promise<ReservationSubmissionResult> {
  let response: Response;
  try {
    response = await fetch("/api/gas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createReservation", payload: submission }),
    });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "サーバーに接続できませんでした。" } };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { ok: false, error: { code: "INVALID_RESPONSE", message: "サーバーからの応答を処理できませんでした。" } };
  }

  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { ok?: unknown }).ok !== "boolean") {
    return { ok: false, error: { code: "INVALID_RESPONSE", message: "サーバーからの応答を処理できませんでした。" } };
  }

  return parsed as ReservationSubmissionResult;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest reservationClient.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/web/types/reservation.ts apps/salon-portfolio/web/lib/api/reservationClient.ts apps/salon-portfolio/web/lib/api/reservationClient.test.ts
git commit -m "feat(web): add typed createReservation client wiring through /api/gas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 14: Documentation

**Files:**
- Modify: `docs/architecture-overview.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/reservation-domain-architecture.md`
- Create: `docs/reservation-transaction-architecture.md`

- [ ] **Step 1: Update `docs/roadmap.md`**

Find the existing "Phase 4" and "Phase 5" entries (per the research: Phase 4 = "Sheets/Calendar/Mail adapters... plus the SERVICES/STAFF catalog actions"; Phase 5 = "Reservation submission workflow... createReservation transaction flow... idempotency"). Replace both with a single reconciled entry reflecting what was actually built:

```markdown
### Phase 4 — Reservation API & Transaction Workflow (done)

Implements the full `createReservation` transaction: `Calendar.ts`/`Mail.ts`
thin adapters, an internal (non-public-action) SERVICES/STAFF catalog
repository (`Catalog.ts`), Sheet-backed idempotency, `LockService`-protected
availability re-check, Calendar event creation, RESERVATIONS state
transitions (処理中 → 受付済/要確認), and post-lock email notifications. See
`docs/reservation-transaction-architecture.md` for the full design.

Note: an earlier draft of this roadmap split this work into a narrower
"Phase 4" (adapters + `getServices`/`getStaff` actions only) and a separate
"Phase 5" (the transaction workflow). Both were implemented together under
"Phase 4" per the task brief that drove this work; `getServices`/`getStaff`
as standalone public API actions remain unbuilt (deliberately out of scope —
there is no picker UI yet to consume them) and are deferred to whichever
future phase builds the reservation form UI.
```

- [ ] **Step 2: Update `docs/architecture-overview.md`**

Find the module-boundary table / "still empty/unstarted" note that lists `Calendar.ts`/`Mail.ts`/`SlotEngine.ts`/`Validation.ts` as unpopulated (this note is stale even pre-Phase-4, since `SlotEngine.ts`/`Validation.ts` shipped in Phase 3C). Replace it with a table row update marking `Calendar.ts` and `Mail.ts` as implemented (Phase 4), each with a one-line description matching their actual responsibility (adapter query/create only; adapter send only), plus a line noting `Api.ts` now also owns the `createReservation` action and the `LockService` lifecycle, linking to `docs/reservation-transaction-architecture.md`.

- [ ] **Step 3: Update `docs/reservation-domain-architecture.md`**

At the top of the file (or in its "Status" section if one exists), add:

```markdown
> **Update (Phase 4):** the orchestration this document's Task 13 note
> described as "a future submission workflow" is now implemented — see
> `docs/reservation-transaction-architecture.md` for the transaction
> sequence, lock scope, idempotency, and Calendar/email integration that
> consume `evaluateReservationRequest` exactly as designed here. Nothing
> in this document's domain layer (`Validation.ts`, `ReservationRules.ts`,
> `SlotEngine.ts`, `ReservationMapper.ts`, `availability/*.ts`) changed.
```

Also locate this document's existing "Concurrency" section (referenced in `ReservationDomain.ts`'s own doc comment) and append one sentence confirming it is now resolved by the LockService-protected re-check described in the new document, with a link.

- [ ] **Step 4: Create `docs/reservation-transaction-architecture.md`**

```markdown
# Reservation Transaction Architecture (Phase 4)

This document describes how `createReservation` turns a validated
`ReservationRequest` into a persisted, safely-confirmed reservation. It
assumes familiarity with `docs/reservation-domain-architecture.md` (the
pure domain layer this orchestration calls) and
`docs/phase0-specification.md` §U (the master transaction-flow spec).

## Sequence

```text
1. getConfig() + features.reservation check         (FEATURE_DISABLED if off)
2. getServiceRows()/getStaffRows()                    (Catalog.ts)
3. evaluateReservationRequest(...)                    (ReservationRules.ts, unchanged)
     -> fail: mapReservationIssueToErrorResponse -> VALIDATION_ERROR / SLOT_UNAVAILABLE
     -> ok: NormalizedReservation (advisory assignedStaffId already resolved)
4. claimSubmissionOrGetExisting(submissionId, appendPendingRow)
     - short LockService acquisition (5s timeout)
     - CacheService hit, or RESERVATIONS SubmissionID-column scan hit
       -> return that same result, no new row (idempotent replay)
     - otherwise: append the row, Status = 処理中, inside this same short lock
     -> lock timeout: SYSTEM_BUSY, no row written
5. Acquire the main critical-section lock (10s timeout)
     -> timeout: SYSTEM_BUSY; the 処理中 row from step 4 is left as-is
6. runReservationCriticalSection (inside the lock):
     a. Re-check availability, narrowed to the single staff (or none)
        already advisory-picked in step 3 — a *fresh* Calendar read.
        -> unavailable: row -> 要確認, ERROR_LOG "lost race", release lock,
           return ok:false SLOT_UNAVAILABLE (see "要確認 has two distinct
           outcomes" below)
     b. Create the Calendar event.
        -> throws: row -> 要確認, ERROR_LOG with the exception message,
           release lock, return ok:true {reservationId, needsConfirmation:true}
     c. Mark the row 受付済 + CalendarEventID.
        -> throws: return sheetUpdateFailedAfterCalendar (see "Atomicity
           limitation" below); release lock; return ok:false SHEET_ERROR
7. Release the critical-section lock (finally — always runs)
8. Cache the response (if success) so an idempotent retry replays it
9. Send emails OUTSIDE both locks (Mail.ts + ReservationEmailTemplates.ts)
     - confirmed: customer confirmation + owner notification
     - either 要確認 branch: owner "needs attention" only, never a customer
       confirmation
     - sheetUpdateFailedAfterCalendar / unexpectedError: no email at all
       (state is not reliably known; the CRITICAL ERROR_LOG entry is the
       correct channel)
     - a send failure here never touches the reservation's Sheet status
       again — only RESERVATIONS.EmailStatus (sent/failed) is updated
```

## State machine

`処理中 → 受付済` (normal success) and `処理中 → 要確認` (either failure
branch inside the lock) are the only transitions this phase implements,
exactly the values already defined in `gas/src/models/ReservationRequest.ts`'s
`ReservationStatus` union — no new status value was introduced.
`キャンセル依頼あり`/`キャンセル済` remain unused, as before (a later phase's
concern).

## 要確認 has two distinct outcomes — do not conflate them

| Cause | Row status | Caller-facing response |
|---|---|---|
| Lost the availability race under the lock | `要確認` | `ok:false`, `SLOT_UNAVAILABLE` — the slot is genuinely gone; tell the customer to pick another time |
| Calendar event creation throws | `要確認` | `ok:true`, `{reservationId, needsConfirmation:true}` — the reservation is real, just not yet confirmed in Calendar |

Both still get an owner "needs attention" email and an ERROR_LOG entry;
they differ only in what the *customer's own request* is told.

## Lock scope

Two separate `LockService.getScriptLock()` acquisitions occur per request,
sequentially, never nested:

1. **Idempotency claim lock** (`claimSubmissionOrGetExisting`, 5s timeout) —
   wraps only "check the Sheet backstop for an existing SubmissionID row,
   then append the pending row if none exists". This is a deliberate
   strengthening beyond `docs/phase0-specification.md` §U's literal step
   order (which places the append before any lock) — closing the race
   where two truly-simultaneous requests carrying the same `submissionId`
   could otherwise both pass the idempotency check and both append a row.
2. **Critical-section lock** (`runReservationCriticalSection`, 10s timeout) —
   wraps the availability re-check, Calendar event creation, and the final
   Sheet status update, exactly matching the task brief's own definition of
   "the critical section".

Email sending happens after both locks are released.

## Idempotency

- Fast path: `CacheService.getScriptCache()`, keyed by
  `reservation-submission:<submissionId>`, 10-minute TTL
  (`Idempotency.ts::buildIdempotencyCacheKey`/`getCachedReservationResult`/
  `setCachedReservationResult`).
- Durable backstop: a `SubmissionID`-column scan of the RESERVATIONS sheet
  (`ReservationRepository.ts::findReservationBySubmissionId`, built on
  `RowMapper.ts::findRowIndexByColumnValue`), covering an expired cache
  entry or an execution that never finished.
- Concurrent-duplicate safety: see "Lock scope" above — the backstop check
  and the row append happen inside the same short lock, so two
  simultaneous identical submissions cannot both append a row.

## Calendar interaction

`Calendar.ts` is the only file that calls `CalendarApp`. It is queried
twice per successful request: once pre-lock (advisory, inside
`evaluateReservationRequest`'s `availabilityFor` callback) and once again
under the critical-section lock (the authoritative re-check) — both go
through the same `ReservationAvailabilityFactory.ts` pure wiring, so a
specific staff's own `CalendarID` (falling back to the shared
`AppConfig.calendarId` when blank) is used consistently in both places and
in the final event creation.

**Known limitation (ANY_STAFF re-check):** the critical-section re-check
narrows to the single staff already advisory-picked before the lock,
rather than re-running the full "first free staff in DisplayOrder" search
a second time under the lock. Re-implementing that search outside
`ReservationRules.ts` would duplicate Phase 3C logic, which the task brief
explicitly forbids. Consequence: if that one advisory-picked staff became
busy in the (typically sub-second) gap between the advisory check and lock
acquisition, while a *different* eligible staff is still genuinely free
for the same slot, this implementation rejects the request as
`SLOT_UNAVAILABLE` (`要確認`, audit row kept) rather than reassigning to
that other staff. The customer can simply retry, which picks a fresh
advisory candidate. This is a conservative, documented trade-off — it
never double-books and never silently drops a reservation — not a
correctness bug.

## Atomicity limitation (Sheets + Calendar have no shared transaction)

If the Calendar event is created successfully but the immediately-following
Sheet update (marking `受付済` + `CalendarEventID`) itself throws, the
implementation:

- does **not** retry the Sheet update within the same request (a second
  write attempt after a Sheets-layer failure is unlikely to succeed
  differently and risks a different partial state),
- does **not** create a second Calendar event on any later retry — the
  `submissionId` idempotency backstop only matches once a RESERVATIONS row
  exists with that `SubmissionID`; the `処理中` row created back in step 4
  *is* that anchor, so a client retry with the same `submissionId` after
  this failure finds that pre-existing row (still `処理中`, since the final
  update never landed) and replays it via `mapReservationRowToResult`
  rather than re-running the whole transaction,
- logs a `critical`-severity `ERROR_LOG` entry containing both the
  `reservationId` and the orphaned `calendarEventId`, and
- returns `ok:false SHEET_ERROR` to the caller.

**This is the one gap this system does not fully close automatically** —
recovery is manual: an operator finds the `ERROR_LOG` row, locates the
Calendar event by the logged `calendarEventId`, and manually sets the
RESERVATIONS row's `Status`/`CalendarEventID` to match. This is
deliberately left as a documented manual-recovery path rather than an
automated retry, per the task brief's own instruction to "document any
unavoidable atomicity limitation" rather than pretend one doesn't exist.

## Security boundaries

- Price, duration, and service name are always read from the
  server-resolved `ServiceRow` (`Catalog.ts`/`ReservationRules.resolveService`)
  — never from the raw request payload, which has no field for them to
  begin with (`gas/src/models/ReservationRequest.ts::ReservationRequest`).
- Staff eligibility/assignment is always resolved from the server-side
  STAFF catalog (`ReservationRules.resolveStaffSelection`); an unknown or
  inactive `staffId` is rejected before any row is written.
- The reservation id is always server-generated
  (`ids/ReservationId.ts::generateReservationId`), never accepted from the
  client.
- `submissionId` is required and used only as an idempotency key — it is
  never itself trusted as an authorization token or exposed in any
  customer-facing email.
- No Script Property, GAS deployment URL, or raw exception message is ever
  placed in a client-facing response — every failure path funnels through
  `buildErrorResponse` with one of the existing fixed `ErrorCode`/Japanese
  message pairs.
- The frontend never calls `CalendarApp`/`GmailApp`/`SpreadsheetApp`
  directly and never learns `GAS_WEBAPP_URL` — `lib/api/reservationClient.ts`
  only ever talks to this Next.js app's own `/api/gas` route.
```

- [ ] **Step 5: Verify no other doc contradicts this**

Run: `cd apps/salon-portfolio && grep -rn "Calendar.ts and Mail.ts remain unpopulated\|createReservation.*not implemented\|Phase 3B+\|Phase 4/5\|Phase 5" ../../docs apps/salon-portfolio/web/app/reservation/page.tsx 2>/dev/null` (adjust the path/grep to whatever the actual stale phrasing turns out to be once Tasks 1-13 are done) and update any remaining stale reference to "createReservation is not implemented" or "Phase 3B+"/"Phase 5" wording this task didn't already catch. Leave `app/reservation/page.tsx`'s own placeholder copy alone — it is still accurate (there is still no reservation *form*).

- [ ] **Step 6: Commit**

```bash
git add docs/architecture-overview.md docs/roadmap.md docs/reservation-domain-architecture.md docs/reservation-transaction-architecture.md
git commit -m "docs: document the Phase 4 reservation transaction architecture

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VzBtzUL4gs734j4ikgcCTk"
```

---

### Task 15: Evidence, whole-branch review, and final report

Not a code task — this closes out the phase per the user's global evidence-reporting and verification-before-completion rules, and the task brief's own §27/§29.14/§30-32.

- [ ] **Step 1: Collect full evidence**

Create `.evidence/<yyyyMMdd-HHmm>-phase4-reservation-transaction/` containing:
- `gas-build.log` (`cd apps/salon-portfolio/gas && npm run build`)
- `gas-typecheck.log`, `gas-test.log` (already produced in Task 12 Step 5 — copy/confirm present)
- `web-typecheck.log`, `web-test.log`, `web-lint.log`, `web-build.log` (`cd apps/salon-portfolio/web && npm run typecheck`, `npm test`, `npm run lint`, `npm run build`)
- `status.txt` (`git status -s` from repo root)
- `diff.patch` (`git diff` from repo root, or against the branch point if a feature branch was used)
- `test-count-baseline.md` — the pre-Phase-4 total test count, cited from the exact prior evidence log file path (e.g. `.evidence/20260906-1912-phase3c-reservation-domain/full-suite.txt` or equivalent — locate and name the real file, do not estimate) alongside the new post-Phase-4 total from `gas-test.log`/`web-test.log`.

- [ ] **Step 2: Run superpowers:requesting-code-review**

Invoke the `superpowers:requesting-code-review` skill against the full set of changes from Tasks 1-14 (whole-branch review per task brief §29.14/§30). Address every Critical/Important finding before considering the phase done; anything Minor/deferred must be stated explicitly in the final report, not silently dropped.

- [ ] **Step 3: Verify the Definition of Done checklist**

Go through the task brief's §30 checklist item by item against the actual evidence gathered (test names, diff hunks, doc sections) — do not mark an item done without naming the specific test/file that proves it.

- [ ] **Step 4: Final report**

Produce the Tier-1 report (per the user's evidence-reporting protocol) plus the task brief's own §32 structure (A-R), explicitly stating: nothing was committed beyond what each task's own `git commit` step already did (or, if the user asked for uncommitted work only, that no commits were made at all and everything sits staged/unstaged), the final `git status`, and confirmation that no staged file falls outside Phase 4's scope (contact form, auth, admin dashboard, Supabase, payments, CAPTCHA, cancellation automation, multi-service booking, customer accounts, staff-management UI, CMS, deployment, production credentials — none of these were touched by Tasks 1-14).
