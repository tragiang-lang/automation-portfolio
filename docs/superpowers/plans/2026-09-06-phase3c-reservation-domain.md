# Phase 3C — Reservation Domain, Validation & Availability Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure, Google-service-free reservation domain (validation,
salon business rules, slot generation, availability abstraction) in
`apps/salon-portfolio/gas`, so a future phase can wire it to real
Sheets/Calendar/Gmail without redesigning any business logic.

**Architecture:** Reuse the exact contracts already approved in
`docs/phase0-specification.md` (§E `ReservationRequest`/`ANY_STAFF`, §J/§K
slot + availability algorithm, §D `AppConfig`) and already-implemented
Phase 3A types (`SheetSchemas.ts` `ServiceRow`/`StaffRow`, `Utils.ts` Tokyo
helpers, `ids/ReservationId.ts`). Add small, single-responsibility modules
— `Validation.ts` (common), `ReservationRules.ts` (salon-specific + the
composition entry point), `SlotEngine.ts`, `ReservationMapper.ts`, and an
`availability/` package with three cooperating files — instead of one
`ReservationService.ts`. Every new module is a plain function over plain
data: no `SpreadsheetApp`/`CalendarApp`/`GmailApp`/`LockService`/
`PropertiesService` call anywhere in this plan.

**Tech Stack:** TypeScript, Jest (`ts-jest`), esbuild, the existing
`apps/salon-portfolio/gas` package (Node/CommonJS, `ES2019` target,
`strict: true`).

**Spec:** This plan implements the "Phase 3C" brief given in the
conversation (reservation domain + validation + availability foundation),
constrained and disambiguated by the already-approved
`docs/phase0-specification.md` (§B, §D, §E, §J, §K, §Q, §T) and the current
repository state inspected below. Where the conversation's Phase 3C brief
and `phase0-specification.md` differ in a literal function signature (not
in intent), this plan follows `phase0-specification.md` as the
authoritative, previously-approved contract and documents the
interpretation inline.

## Global Constraints

- **Timezone:** Every date/time calculation is explicit Asia/Tokyo (fixed
  UTC+9, no DST) — never the host machine's local timezone, never a bare
  `new Date()`/`Date.now()` read inside a pure domain function. `now` is
  always an injected parameter.
- **Zero Google service calls:** No new module in this plan may reference
  `SpreadsheetApp`, `CalendarApp`, `GmailApp`, `PropertiesService`, or
  `LockService`. Verified in Task 14 via `grep`.
- **Reuse, don't duplicate:** `ReservationRequest`/`ANY_STAFF` follow
  `phase0-specification.md` §E exactly. `ServiceRow`/`StaffRow` from
  `SheetSchemas.ts`, `AppConfig`/`BusinessHours` from `models/Config.ts`,
  and `generateReservationId` from `ids/ReservationId.ts` are consumed
  as-is — never redefined.
- **Do not touch already-approved Phase 3A files:** `ConfigParser.ts`,
  `ConfigValidator.ts`, `ConfigStore.ts`, `models/Config.ts`,
  `SheetSchemas.ts`, `models/ErrorCodes.ts`, `models/Api.ts`, `Api.ts`,
  `Code.ts` are not modified by this plan. Phase 3C is purely additive
  (plus `Utils.ts`, which gains new exports but no changed behavior on
  existing ones).
- **No client-trusted business data:** duration, price, and staff identity
  in the resulting `NormalizedReservation` always come from the
  server-supplied `ServiceRow`/`StaffRow` arrays, never copied from the
  raw `ReservationRequest`.
- **Deterministic tests only:** every function that needs "now" or
  randomness takes it as a parameter (`now: Date`, `random: () => number`)
  — no test may depend on the wall-clock date.
- **Existing baseline must stay green:** 82/82 GAS tests
  (`.evidence/20260906-1301-phase3b-frontend-runtime-config/` era baseline,
  re-verified live in this plan's Task 0 below) and 67/67 web tests must
  still pass after every task.
- **Out of scope (hard stop if any task tempts this):** `createReservation`
  API action, Sheets/Calendar/Gmail writes, `LockService`, email sending,
  frontend reservation form/submission, admin/auth/payments — see the
  conversation's own §5 "Strictly Out of Scope" list, unchanged here.
- **Git:** Steps below say "stage" rather than "commit". Per this
  repository's standing rule, `git commit` is only ever run when the
  human's most recent message explicitly says to commit right now — a
  plan step is never itself that authorization. Whoever executes this
  plan (subagent or the main session) stages each task's changes and
  waits for that explicit go-ahead before committing.

---

## Task 0: Baseline verification (no code change)

**Files:** none — this task only runs commands.

- [ ] **Step 1: Confirm current baseline**

Run:
```bash
cd apps/salon-portfolio/gas && npm test -- --silent
cd apps/salon-portfolio/web && npm test -- --silent
```
Expected: `Tests: 82 passed, 82 total` (gas) and `Tests: 67 passed, 67
total` (web) — already re-verified live during planning; re-run once more
immediately before Task 1 so the evidence folder in Task 14 has a
timestamp adjacent to the actual implementation window.

- [ ] **Step 2: Save this output**

Copy the two command outputs into
`.evidence/<timestamp>-phase3c-reservation-domain/00-baseline-tests.txt`
(create the folder now; `<timestamp>` = `date +%Y%m%d-%H%M` at the moment
implementation actually starts).

---

## Task 1: Tokyo date/time primitives in `Utils.ts`

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Utils.ts`
- Test: `apps/salon-portfolio/gas/tests/Utils.test.ts`

**Interfaces:**
- Consumes: nothing new (uses the existing `TOKYO_OFFSET_MS` constant and
  `formatDateYYYYMMDDDashedInTokyo` already in this file).
- Produces (consumed by Tasks 3, 8, 11):
  - `getWeekdayForDateString(dateStr: string): keyof BusinessHours`
  - `timeToMinutes(time: string): number`
  - `minutesToTimeString(totalMinutes: number): string`
  - `tokyoDateTimeToInstant(dateStr: string, timeStr: string): number`
  - `addDaysToTokyoDateString(dateStr: string, days: number): string`
  - `isValidCalendarDateString(dateStr: string): boolean`
  - `toTokyoLocalDateTimeString(dateStr: string, timeStr: string): string`

- [ ] **Step 1: Write the failing tests**

Append to `apps/salon-portfolio/gas/tests/Utils.test.ts`:

```ts
import {
  getWeekdayForDateString,
  timeToMinutes,
  minutesToTimeString,
  tokyoDateTimeToInstant,
  addDaysToTokyoDateString,
  isValidCalendarDateString,
  toTokyoLocalDateTimeString,
} from "../src/Utils";

describe("getWeekdayForDateString", () => {
  it("maps known dates to the correct weekday", () => {
    expect(getWeekdayForDateString("2026-09-06")).toBe("sunday");
    expect(getWeekdayForDateString("2026-09-07")).toBe("monday");
    expect(getWeekdayForDateString("2026-09-09")).toBe("wednesday");
    expect(getWeekdayForDateString("2026-09-10")).toBe("thursday");
  });
});

describe("timeToMinutes / minutesToTimeString", () => {
  it("round-trips HH:mm through minutes", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(minutesToTimeString(0)).toBe("00:00");
    expect(minutesToTimeString(570)).toBe("09:30");
    expect(minutesToTimeString(1439)).toBe("23:59");
  });
});

describe("tokyoDateTimeToInstant", () => {
  it("treats the date/time as Asia/Tokyo local, not UTC", () => {
    // 2026-09-10T00:30 JST === 2026-09-09T15:30:00Z
    const instant = tokyoDateTimeToInstant("2026-09-10", "00:30");
    expect(new Date(instant).toISOString()).toBe("2026-09-09T15:30:00.000Z");
  });
});

describe("addDaysToTokyoDateString", () => {
  it("adds calendar days without drifting across a month boundary", () => {
    expect(addDaysToTokyoDateString("2026-09-28", 3)).toBe("2026-10-01");
  });
  it("supports zero days (same date)", () => {
    expect(addDaysToTokyoDateString("2026-09-10", 0)).toBe("2026-09-10");
  });
});

describe("isValidCalendarDateString", () => {
  it("accepts a real calendar date", () => {
    expect(isValidCalendarDateString("2026-09-10")).toBe(true);
  });
  it("rejects an impossible date", () => {
    expect(isValidCalendarDateString("2026-02-30")).toBe(false);
  });
  it("rejects an out-of-range month", () => {
    expect(isValidCalendarDateString("2026-13-01")).toBe(false);
  });
});

describe("toTokyoLocalDateTimeString", () => {
  it("combines date and time into one sortable local string", () => {
    expect(toTokyoLocalDateTimeString("2026-09-10", "10:00")).toBe(
      "2026-09-10T10:00",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts`
Expected: FAIL — the seven new names are not exported yet.

- [ ] **Step 3: Implement**

Append to `apps/salon-portfolio/gas/src/Utils.ts` (below the existing
`formatDateYYYYMMDDDashedInTokyo`):

```ts
import { BusinessHours } from "./models/Config";

/** Sunday-first order matching `Date.prototype.getUTCDay()`'s 0-6 index —
 *  used only to translate a weekday index into `BusinessHours`' key
 *  names, never to compute the index itself from a real instant (Phase
 *  3C §22: business-hours evaluation operates on an already-resolved
 *  calendar date string, not on "now"). */
const WEEKDAY_ORDER: readonly (keyof BusinessHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Weekday of a `YYYY-MM-DD` calendar date string. Pure calendar
 *  arithmetic — once the date components are already known (as they are
 *  for a reservation request's `date` field), no Asia/Tokyo offset
 *  conversion is needed to find its weekday; `Date.UTC` is used only as a
 *  proleptic-Gregorian calculator, never interpreted as an instant. */
export function getWeekdayForDateString(dateStr: string): keyof BusinessHours {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_ORDER[dayIndex];
}

/** Parses a strict `HH:mm` string into minutes since midnight. Callers
 *  (SlotEngine, ReservationRules) are responsible for validating the
 *  format first — this assumes well-formed input. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Inverse of `timeToMinutes` for a same-day value (0-1439). */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Converts an Asia/Tokyo local `YYYY-MM-DD` + `HH:mm` pair into the real
 *  UTC instant (epoch milliseconds) it represents — the one place this
 *  domain converts a Tokyo-local wall-clock reading into something
 *  comparable against a real `Date`/`now` (Phase 3C §12/§25). */
export function tokyoDateTimeToInstant(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - TOKYO_OFFSET_MS;
}

/** Adds `days` calendar days to a `YYYY-MM-DD` string, staying in pure
 *  date arithmetic (no time-of-day, no timezone offset — a calendar day
 *  is timezone-agnostic once you already have Y/M/D components). Used for
 *  the `reservation.maxBookingDays` booking-horizon check. */
export function addDaysToTokyoDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/** True only for a string that is both `YYYY-MM-DD`-shaped and a real
 *  calendar date (rejects 2026-02-30, 2026-13-01, etc.) — callers must
 *  still check the format pattern first if they want a distinct
 *  "malformed" vs "impossible date" error. */
export function isValidCalendarDateString(dateStr: string): boolean {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Combines a date + time into one Tokyo-local string in a format that
 *  sorts chronologically as a plain string (`YYYY-MM-DDTHH:mm`) — this is
 *  the representation `BusyInterval`/`SlotCandidate` overlap comparisons
 *  rely on (Phase 3C §38/§39: no `Date` parsing needed for the overlap
 *  check itself). */
export function toTokyoLocalDateTimeString(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts`
Expected: PASS, all new `describe` blocks green.

- [ ] **Step 5: Run the full GAS suite and typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 91 passed, 91 total` (82 + 9 new), typecheck clean.

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/Utils.ts apps/salon-portfolio/gas/tests/Utils.test.ts
```
Do not commit — see Global Constraints.

---

## Task 2: Reservation domain model types

**Files:**
- Create: `apps/salon-portfolio/gas/src/models/ReservationRequest.ts`
- Create: `apps/salon-portfolio/gas/src/models/ReservationDomain.ts`

**Interfaces:**
- Consumes: `StaffRow` from `../SheetSchemas`.
- Produces (consumed by every later task): `ReservationRequest`,
  `ANY_STAFF`, `ReservationStatus`, `ReservationRecord`, `ValidationIssue`,
  `ReservationIssueCode`, `StaffSelectionResolution`,
  `NormalizedReservation`.

This task is type-only (no runtime behavior), so it is verified by
typecheck rather than a Jest test — there is nothing to assert yet that
isn't already the type checker's job.

- [ ] **Step 1: Create `models/ReservationRequest.ts`**

```ts
/**
 * Reservation request/record contracts — Phase 0 spec §E, reused
 * verbatim. This is the client-facing shape a future `createReservation`
 * action will accept; Phase 3C only establishes the domain that decides
 * whether a request of this shape is valid and currently available.
 */

/** Sentinel staffId meaning "no specific staff — assign any available
 *  one" (Phase 0 §E, §K). */
export const ANY_STAFF = "ANY" as const;

export interface ReservationRequest {
  /** Client-generated idempotency key (Phase 0 §P). Carried through the
   *  domain so a future orchestration phase can use it — Phase 3C does
   *  not implement any idempotency/duplicate-detection logic itself. */
  submissionId: string;
  /** Decision 5: exactly one service per reservation — no multi-service
   *  booking. */
  serviceId: string;
  /** Omitted/ignored entirely when `features.staffSelection` is false
   *  (Phase 0 §K). */
  staffId?: string | typeof ANY_STAFF;
  /** `YYYY-MM-DD`, Asia/Tokyo. */
  date: string;
  /** `HH:mm`, 24h. */
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

/** Reservation state machine values (Phase 0 spec §I). Phase 3C never
 *  assigns a status — this exists only so `ReservationRecord` type-checks
 *  against the eventual Sheets row shape; no code path in this phase
 *  produces a `ReservationRecord`. */
export type ReservationStatus =
  | "処理中"
  | "受付済"
  | "要確認"
  | "キャンセル依頼あり"
  | "キャンセル済";

/** Persisted-row shape (Phase 0 §E) — distinct from the request DTO on
 *  purpose. Not produced anywhere in Phase 3C; declared here only so a
 *  future orchestration phase's type can be checked against this same
 *  source of truth instead of being redefined. */
export interface ReservationRecord extends ReservationRequest {
  reservationId: string;
  createdAt: string;
  updatedAt: string;
  status: ReservationStatus;
  calendarEventId?: string;
  emailStatus: "pending" | "sent" | "failed";
  cancellationToken: string;
}
```

- [ ] **Step 2: Create `models/ReservationDomain.ts`**

```ts
import { StaffRow } from "../SheetSchemas";

/**
 * Domain-internal types for reservation validation, business-rule
 * evaluation, and availability. Distinct from `models/ErrorCodes.ts`
 * (the public API's coarse `ErrorCode` union) on purpose (Phase 3C §69):
 * these are fine-grained, presentation-agnostic domain codes that a
 * future `Api.ts` action maps down onto the public envelope — they are
 * never returned to the client directly.
 */

export type ReservationIssueCode =
  | "REQUIRED_FIELD_MISSING"
  | "INVALID_FORMAT"
  | "INVALID_DATE"
  | "TOO_LONG"
  | "MENU_NOT_FOUND"
  | "MENU_NOT_BOOKABLE"
  | "STAFF_NOT_FOUND"
  | "STAFF_NOT_AVAILABLE"
  | "STAFF_SELECTION_NOT_SUPPORTED"
  | "OUTSIDE_BUSINESS_HOURS"
  | "HOLIDAY"
  | "PAST_DATE"
  | "OUTSIDE_BOOKING_WINDOW"
  | "CALENDAR_CONFLICT"
  | "NO_STAFF_AVAILABLE";

export interface ValidationIssue {
  field: string;
  code: ReservationIssueCode;
  message?: string;
}

/** Resolution of the request's staff choice against CONFIG + the STAFF
 *  catalog (Phase 3C §19-21). `"none"` is the `features.staffSelection =
 *  false` case — not an error, just "there is no staff dimension". */
export type StaffSelectionResolution =
  | { kind: "none" }
  | { kind: "specific"; staff: StaffRow }
  | { kind: "any"; eligibleStaff: StaffRow[] };

/** The fully-resolved, server-authoritative reservation, ready for a
 *  future orchestration phase to persist. `durationMinutes`/`price`/
 *  `serviceName` come from the resolved `ServiceRow`, never from the raw
 *  request (Phase 3C §17/§51). `assignedStaffId` is set once an
 *  `AvailabilityStrategy` has actually resolved a concrete staff member
 *  (including the "any available" -> first-free resolution, Phase 0
 *  §J/§K) — this is advisory at Phase 3C's evaluation time, not a
 *  reservation guarantee (see docs/reservation-domain-architecture.md
 *  "Concurrency" section, written in Task 13). */
export interface NormalizedReservation {
  reservationId: string;
  submissionId: string;
  customerName: string;
  email: string;
  phone?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  staffSelection: StaffSelectionResolution;
  assignedStaffId?: string;
  notes?: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS, no errors (nothing imports these files yet, so this only
confirms the files themselves compile standalone).

- [ ] **Step 4: Stage**

```bash
git add apps/salon-portfolio/gas/src/models/ReservationRequest.ts apps/salon-portfolio/gas/src/models/ReservationDomain.ts
```

---

## Task 3: `SlotEngine.ts` — pure slot generation

**Files:**
- Create: `apps/salon-portfolio/gas/src/SlotEngine.ts`
- Test: `apps/salon-portfolio/gas/tests/SlotEngine.test.ts`

**Interfaces:**
- Consumes: `timeToMinutes`, `minutesToTimeString` from `./Utils`.
- Produces (consumed by Task 12): `SlotCandidate`, `SlotEngineInput`,
  `generateCandidateSlots(input: SlotEngineInput): SlotCandidate[]`.

Interpretation note (documented per this plan's header): this function
takes one already-resolved day's business-hours interval and holiday flag
— not the full week's `BusinessHours` object or the raw `holidays: string[]`
list — so it stays a pure, single-responsibility function; the caller
(`ReservationRules.evaluateBusinessDay`, Task 11) does the
weekday/holiday lookup once and passes the result in. Its output is a
`SlotCandidate[]` (richer than `phase0-specification.md` §J's illustrative
`string[]` sketch) because the availability layer needs each candidate's
end time for overlap checks; projecting down to `string[]` for a future
`getAvailableSlots` response body is a one-line `.map()` at that call
site, not a competing model.

- [ ] **Step 1: Write the failing tests**

```ts
import { generateCandidateSlots } from "../src/SlotEngine";

describe("generateCandidateSlots", () => {
  it("generates 30-minute-interval starts for a 60-minute service inside 10:00-19:00", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-19:00",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    const starts = candidates.map((c) => c.startTime);
    expect(starts[0]).toBe("10:00");
    expect(starts).toContain("18:00");
    expect(starts).not.toContain("18:30"); // 18:30 + 60min = 19:30 > 19:00
    expect(candidates[0]).toEqual({ date: "2026-09-10", startTime: "10:00", endTime: "11:00" });
  });

  it("supports an interval coarser than the service duration", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-19:00",
      durationMinutes: 30,
      slotIntervalMinutes: 60,
      isHoliday: false,
    });
    const starts = candidates.map((c) => c.startTime);
    expect(starts).toContain("10:00");
    expect(starts).toContain("18:00");
    expect(starts).not.toContain("18:30");
  });

  it("includes the exact final slot that fits closing time", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-11:00",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    expect(candidates).toEqual([{ date: "2026-09-10", startTime: "10:00", endTime: "11:00" }]);
  });

  it("excludes a service that would cross closing time entirely", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-11:00",
      durationMinutes: 90,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    expect(candidates).toEqual([]);
  });

  it("returns no slots on a closed day", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "closed",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: false,
    });
    expect(candidates).toEqual([]);
  });

  it("returns no slots on a holiday even if business hours are configured", () => {
    const candidates = generateCandidateSlots({
      date: "2026-09-10",
      businessHours: "10:00-19:00",
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      isHoliday: true,
    });
    expect(candidates).toEqual([]);
  });

  it("returns no slots for a non-positive duration", () => {
    expect(
      generateCandidateSlots({
        date: "2026-09-10",
        businessHours: "10:00-19:00",
        durationMinutes: 0,
        slotIntervalMinutes: 30,
        isHoliday: false,
      }),
    ).toEqual([]);
  });

  it("returns no slots for a non-positive interval", () => {
    expect(
      generateCandidateSlots({
        date: "2026-09-10",
        businessHours: "10:00-19:00",
        durationMinutes: 60,
        slotIntervalMinutes: 0,
        isHoliday: false,
      }),
    ).toEqual([]);
  });
});
```

Note: a multi-interval business day (e.g. `10:00-14:00` + `15:00-19:00` in
one day) is intentionally not tested here — `models/Config.ts`'s
`BusinessHours` type allows exactly one `"HH:MM-HH:MM"` interval per
weekday today, so there is nothing for `SlotEngine` to receive that would
express a lunch break; this is recorded as a documented current
limitation in Task 13's docs, not implemented speculatively (Phase 3C
§33).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/SlotEngine.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { minutesToTimeString, timeToMinutes } from "./Utils";

const HOURS_INTERVAL_PATTERN = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

export interface SlotCandidate {
  date: string;
  startTime: string;
  endTime: string;
}

/** One already-resolved day's inputs — the caller (ReservationRules)
 *  looks up the weekday's `BusinessHours` entry and holiday membership
 *  once and passes the result in; this keeps SlotEngine a pure function
 *  over primitives with no CONFIG-shape knowledge of its own. */
export interface SlotEngineInput {
  date: string;
  businessHours: string | "closed";
  durationMinutes: number;
  slotIntervalMinutes: number;
  isHoliday: boolean;
}

/** Generates candidate reservation start times for one day (Phase 0 §J
 *  Stage 1; Phase 3C §29-34). Pure — no GAS globals, no I/O. A candidate
 *  is included only if `[start, start+durationMinutes)` fits entirely
 *  inside the open interval; the walk steps by `slotIntervalMinutes`. */
export function generateCandidateSlots(input: SlotEngineInput): SlotCandidate[] {
  if (input.isHoliday) {
    return [];
  }
  if (input.businessHours === "closed") {
    return [];
  }
  if (!HOURS_INTERVAL_PATTERN.test(input.businessHours)) {
    return [];
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return [];
  }
  if (!Number.isFinite(input.slotIntervalMinutes) || input.slotIntervalMinutes <= 0) {
    return [];
  }

  const [openStr, closeStr] = input.businessHours.split("-");
  const openMinutes = timeToMinutes(openStr);
  const closeMinutes = timeToMinutes(closeStr);

  const candidates: SlotCandidate[] = [];
  for (
    let start = openMinutes;
    start + input.durationMinutes <= closeMinutes;
    start += input.slotIntervalMinutes
  ) {
    candidates.push({
      date: input.date,
      startTime: minutesToTimeString(start),
      endTime: minutesToTimeString(start + input.durationMinutes),
    });
  }
  return candidates;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/SlotEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 99 passed, 99 total` (91 + 8 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/SlotEngine.ts apps/salon-portfolio/gas/tests/SlotEngine.test.ts
```

---

## Task 4: `availability/AvailabilityStrategy.ts` — interface + overlap primitive

**Files:**
- Create: `apps/salon-portfolio/gas/src/availability/AvailabilityStrategy.ts`
- Test: `apps/salon-portfolio/gas/tests/availability/AvailabilityStrategy.test.ts`
- Delete: `apps/salon-portfolio/gas/src/availability/.gitkeep`,
  `apps/salon-portfolio/gas/tests/availability/.gitkeep` (now superseded
  by real files)

**Interfaces:**
- Consumes: `ReservationIssueCode` from `../models/ReservationDomain`.
- Produces (consumed by Tasks 5, 6, 7, 12): `BusyInterval`,
  `AvailabilityFailureReason`, `AvailabilityInput`, `AvailabilityResult`,
  `AvailabilityStrategy`, `intervalsOverlap`.

- [ ] **Step 1: Write the failing tests**

```ts
import { intervalsOverlap } from "../../src/availability/AvailabilityStrategy";

describe("intervalsOverlap", () => {
  it("is available when the candidate starts exactly when the existing event ends", () => {
    expect(intervalsOverlap("2026-09-10T11:00", "2026-09-10T12:00", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(false);
  });

  it("is available when the candidate ends exactly when the existing event starts", () => {
    expect(intervalsOverlap("2026-09-10T09:00", "2026-09-10T10:00", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(false);
  });

  it("conflicts on an identical interval", () => {
    expect(intervalsOverlap("2026-09-10T10:00", "2026-09-10T11:00", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(true);
  });

  it("conflicts when the candidate starts inside an existing event", () => {
    expect(intervalsOverlap("2026-09-10T10:30", "2026-09-10T11:30", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(true);
  });

  it("conflicts when the existing event starts inside the candidate", () => {
    expect(intervalsOverlap("2026-09-10T10:00", "2026-09-10T11:00", "2026-09-10T10:30", "2026-09-10T10:45")).toBe(true);
  });

  it("conflicts when the existing event fully contains the candidate", () => {
    expect(intervalsOverlap("2026-09-10T10:00", "2026-09-10T11:00", "2026-09-10T09:00", "2026-09-10T12:00")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/AvailabilityStrategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```bash
rm apps/salon-portfolio/gas/src/availability/.gitkeep apps/salon-portfolio/gas/tests/availability/.gitkeep
```

```ts
import { ReservationIssueCode } from "../models/ReservationDomain";

/** A busy Tokyo-local interval, already normalized by whatever supplies
 *  it (a future Calendar adapter, or a test fixture) — this module never
 *  fetches events itself (Phase 3C §37/§53, hard rule: no `CalendarApp`
 *  call anywhere in this plan). `start`/`end` use the same
 *  `YYYY-MM-DDTHH:mm` Tokyo-local format as `Utils.toTokyoLocalDateTimeString`,
 *  which sorts correctly as a plain string. */
export interface BusyInterval {
  start: string;
  end: string;
  /** Present when this interval belongs to one staff member's calendar
   *  (Phase 3C §40/§77) rather than the single shared calendar. */
  staffId?: string;
}

export type AvailabilityFailureReason = Extract<
  ReservationIssueCode,
  "CALENDAR_CONFLICT" | "STAFF_NOT_AVAILABLE" | "NO_STAFF_AVAILABLE"
>;

export interface AvailabilityInput {
  candidateStart: string;
  candidateEnd: string;
}

export type AvailabilityResult =
  | { available: true; assignedStaffId?: string }
  | { available: false; reason: AvailabilityFailureReason };

/** Replaceable availability source (Phase 3C §35-36) — the production
 *  implementation is `CalendarOverlapAvailability`/
 *  `StaffAvailabilityStrategy`/`SharedAvailabilityStrategy` (Tasks 5-7);
 *  a test can supply any object satisfying this shape without touching
 *  Calendar at all. */
export interface AvailabilityStrategy {
  isAvailable(input: AvailabilityInput): AvailabilityResult;
}

/** Two half-open intervals `[start, end)` overlap iff each starts before
 *  the other ends (Phase 3C §39). Pure string comparison is correct here
 *  because both operands are `YYYY-MM-DDTHH:mm`, which sorts
 *  chronologically as plain text. */
export function intervalsOverlap(
  candidateStart: string,
  candidateEnd: string,
  existingStart: string,
  existingEnd: string,
): boolean {
  return candidateStart < existingEnd && candidateEnd > existingStart;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/AvailabilityStrategy.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 105 passed, 105 total` (99 + 6 new).

- [ ] **Step 6: Stage**

```bash
git add -A apps/salon-portfolio/gas/src/availability apps/salon-portfolio/gas/tests/availability
```

---

## Task 5: `availability/CalendarOverlapAvailability.ts`

**Files:**
- Create: `apps/salon-portfolio/gas/src/availability/CalendarOverlapAvailability.ts`
- Test: `apps/salon-portfolio/gas/tests/availability/CalendarOverlapAvailability.test.ts`

**Interfaces:**
- Consumes: `AvailabilityInput`, `AvailabilityResult`,
  `AvailabilityStrategy`, `BusyInterval`, `intervalsOverlap` from
  `./AvailabilityStrategy`.
- Produces (consumed by Tasks 6, 7): `isSlotFreeOfConflicts(candidate,
  existingEvents): boolean`, `createCalendarOverlapAvailability(existingEvents):
  AvailabilityStrategy`.

- [ ] **Step 1: Write the failing tests**

```ts
import {
  createCalendarOverlapAvailability,
  isSlotFreeOfConflicts,
} from "../../src/availability/CalendarOverlapAvailability";
import { BusyInterval } from "../../src/availability/AvailabilityStrategy";

const candidate = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };

describe("isSlotFreeOfConflicts", () => {
  const cases: [string, BusyInterval[], boolean][] = [
    ["no existing events", [], true],
    ["existing event ends before candidate starts", [{ start: "2026-09-10T09:00", end: "2026-09-10T10:00" }], true],
    ["existing event starts after candidate ends", [{ start: "2026-09-10T11:00", end: "2026-09-10T12:00" }], true],
    ["existing event identical to candidate", [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }], false],
    ["existing event overlaps the tail", [{ start: "2026-09-10T10:30", end: "2026-09-10T11:30" }], false],
    ["existing event overlaps the head", [{ start: "2026-09-10T09:30", end: "2026-09-10T10:30" }], false],
    ["existing event fully contains candidate", [{ start: "2026-09-10T09:00", end: "2026-09-10T12:00" }], false],
  ];

  it.each(cases)("%s -> free=%s", (_label, events, expectedFree) => {
    expect(isSlotFreeOfConflicts(candidate, events)).toBe(expectedFree);
  });
});

describe("createCalendarOverlapAvailability", () => {
  it("reports available when no busy interval conflicts", () => {
    const strategy = createCalendarOverlapAvailability([
      { start: "2026-09-10T09:00", end: "2026-09-10T10:00" },
    ]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: true });
  });

  it("reports CALENDAR_CONFLICT when a busy interval overlaps", () => {
    const strategy = createCalendarOverlapAvailability([
      { start: "2026-09-10T10:30", end: "2026-09-10T11:30" },
    ]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "CALENDAR_CONFLICT" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/CalendarOverlapAvailability.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import {
  AvailabilityInput,
  AvailabilityResult,
  AvailabilityStrategy,
  BusyInterval,
  intervalsOverlap,
} from "./AvailabilityStrategy";

/** True if none of `existingEvents` overlaps the candidate interval.
 *  Shared by every availability strategy in this package so the overlap
 *  rule (Phase 3C §39) is implemented exactly once. */
export function isSlotFreeOfConflicts(
  candidate: AvailabilityInput,
  existingEvents: BusyInterval[],
): boolean {
  return !existingEvents.some((event) =>
    intervalsOverlap(candidate.candidateStart, candidate.candidateEnd, event.start, event.end),
  );
}

/** Production availability strategy foundation for a single calendar's
 *  worth of already-normalized busy intervals (Phase 3C §37). Never calls
 *  `CalendarApp` — `existingEvents` is supplied by the caller, which in a
 *  future phase will be a thin `Calendar.ts` adapter's output. */
export function createCalendarOverlapAvailability(
  existingEvents: BusyInterval[],
): AvailabilityStrategy {
  return {
    isAvailable(input: AvailabilityInput): AvailabilityResult {
      return isSlotFreeOfConflicts(input, existingEvents)
        ? { available: true }
        : { available: false, reason: "CALENDAR_CONFLICT" };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/CalendarOverlapAvailability.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 114 passed, 114 total` (105 + 9 new — 7 `it.each` rows + 2 `it`s).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/availability/CalendarOverlapAvailability.ts apps/salon-portfolio/gas/tests/availability/CalendarOverlapAvailability.test.ts
```

---

## Task 6: `availability/SharedAvailabilityStrategy.ts`

**Files:**
- Create: `apps/salon-portfolio/gas/src/availability/SharedAvailabilityStrategy.ts`
- Test: `apps/salon-portfolio/gas/tests/availability/SharedAvailabilityStrategy.test.ts`

**Interfaces:**
- Consumes: `createCalendarOverlapAvailability` from
  `./CalendarOverlapAvailability`; `AvailabilityStrategy`, `BusyInterval`
  from `./AvailabilityStrategy`.
- Produces (consumed by Task 12 via the caller's `availabilityFor`
  callback, not directly by `ReservationRules.ts` itself):
  `createSharedAvailabilityStrategy(busyIntervals): AvailabilityStrategy`.

This is the `features.staffSelection = false` strategy named in
`phase0-specification.md` §B/§K — a thin, explicitly-named wrapper so both
strategies the spec calls for exist, without duplicating the overlap
logic implemented once in Task 5.

- [ ] **Step 1: Write the failing test**

```ts
import { createSharedAvailabilityStrategy } from "../../src/availability/SharedAvailabilityStrategy";

const candidate = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };

describe("createSharedAvailabilityStrategy", () => {
  it("is available with no staff dimension when the shared calendar is free", () => {
    const strategy = createSharedAvailabilityStrategy([]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: true });
  });

  it("reports CALENDAR_CONFLICT against the single shared calendar", () => {
    const strategy = createSharedAvailabilityStrategy([
      { start: "2026-09-10T10:00", end: "2026-09-10T11:00" },
    ]);
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "CALENDAR_CONFLICT" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/SharedAvailabilityStrategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { AvailabilityStrategy, BusyInterval } from "./AvailabilityStrategy";
import { createCalendarOverlapAvailability } from "./CalendarOverlapAvailability";

/** The no-staff-dimension availability strategy (Phase 0 spec §J/§K):
 *  used when `features.staffSelection` is false — every candidate is
 *  checked only against the single shared/fallback calendar's busy
 *  intervals. A thin naming wrapper over `CalendarOverlapAvailability` so
 *  both strategies named in Phase 0 §B exist distinctly, without
 *  duplicating the overlap logic itself. */
export function createSharedAvailabilityStrategy(
  busyIntervals: BusyInterval[],
): AvailabilityStrategy {
  return createCalendarOverlapAvailability(busyIntervals);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/SharedAvailabilityStrategy.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 116 passed, 116 total` (114 + 2 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/availability/SharedAvailabilityStrategy.ts apps/salon-portfolio/gas/tests/availability/SharedAvailabilityStrategy.test.ts
```

---

## Task 7: `availability/StaffAvailabilityStrategy.ts`

**Files:**
- Create: `apps/salon-portfolio/gas/src/availability/StaffAvailabilityStrategy.ts`
- Test: `apps/salon-portfolio/gas/tests/availability/StaffAvailabilityStrategy.test.ts`

**Interfaces:**
- Consumes: `ANY_STAFF` from `../models/ReservationRequest`;
  `AvailabilityInput`, `AvailabilityResult`, `AvailabilityStrategy`,
  `BusyInterval` from `./AvailabilityStrategy`; `isSlotFreeOfConflicts`
  from `./CalendarOverlapAvailability`.
- Produces (consumed by Task 12 via the caller's `availabilityFor`
  callback): `StaffAvailabilityInput`,
  `createStaffAvailabilityStrategy(input): AvailabilityStrategy`.

- [ ] **Step 1: Write the failing tests**

```ts
import { createStaffAvailabilityStrategy } from "../../src/availability/StaffAvailabilityStrategy";
import { ANY_STAFF } from "../../src/models/ReservationRequest";

const candidate = { candidateStart: "2026-09-10T10:00", candidateEnd: "2026-09-10T11:00" };
const busyAllDay = { start: "2026-09-10T00:00", end: "2026-09-10T23:59" };

describe("createStaffAvailabilityStrategy — specific staff", () => {
  it("is available when the named staff member has no conflict", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: "ST002",
      eligibleStaffIdsInOrder: ["ST001", "ST002"],
      busyIntervalsByStaffId: { ST001: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: true, assignedStaffId: "ST002" });
  });

  it("reports STAFF_NOT_AVAILABLE when the named staff member conflicts", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: "ST001",
      eligibleStaffIdsInOrder: ["ST001", "ST002"],
      busyIntervalsByStaffId: { ST001: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "STAFF_NOT_AVAILABLE" });
  });
});

describe("createStaffAvailabilityStrategy — ANY_STAFF", () => {
  it("succeeds and assigns the first free staff in DisplayOrder when one of several is free", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: ANY_STAFF,
      eligibleStaffIdsInOrder: ["ST001", "ST002", "ST003"],
      busyIntervalsByStaffId: { ST001: [busyAllDay], ST003: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: true, assignedStaffId: "ST002" });
  });

  it("reports NO_STAFF_AVAILABLE when every eligible staff member conflicts", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: ANY_STAFF,
      eligibleStaffIdsInOrder: ["ST001", "ST002"],
      busyIntervalsByStaffId: { ST001: [busyAllDay], ST002: [busyAllDay] },
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: false, reason: "NO_STAFF_AVAILABLE" });
  });

  it("treats a staff member with no recorded busy intervals as free", () => {
    const strategy = createStaffAvailabilityStrategy({
      staffSelection: ANY_STAFF,
      eligibleStaffIdsInOrder: ["ST001"],
      busyIntervalsByStaffId: {},
    });
    expect(strategy.isAvailable(candidate)).toEqual({ available: true, assignedStaffId: "ST001" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/StaffAvailabilityStrategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { ANY_STAFF } from "../models/ReservationRequest";
import {
  AvailabilityInput,
  AvailabilityResult,
  AvailabilityStrategy,
  BusyInterval,
} from "./AvailabilityStrategy";
import { isSlotFreeOfConflicts } from "./CalendarOverlapAvailability";

export interface StaffAvailabilityInput {
  staffSelection: string | typeof ANY_STAFF;
  /** Active, eligible staff ids already sorted in `DisplayOrder` — the
   *  order "any available" resolution walks (Phase 0 §J: "first free, in
   *  DisplayOrder"). Staff/service compatibility filtering is not applied
   *  here: the current STAFF sheet schema (Phase 3A) has no
   *  service-compatibility column, so every active staff member is
   *  eligible for every service (Phase 3C §41 — "only implement this if
   *  the existing data model defines it"). */
  eligibleStaffIdsInOrder: string[];
  /** Busy intervals grouped by staffId, already fetched/normalized by a
   *  future Calendar adapter — never fetched here (Phase 3C §37/§53). A
   *  staffId absent from this map is treated as having no busy intervals
   *  at all, not as an error. */
  busyIntervalsByStaffId: Record<string, BusyInterval[]>;
}

/** Staff-selection availability strategy (Phase 0 §J/§K, Phase 3C
 *  §40/§41): resolves both the specific-staff case and the "any available
 *  staff" case, returning the concretely assigned staffId either way —
 *  "ANY" is never itself persisted or returned as the assignment. */
export function createStaffAvailabilityStrategy(
  input: StaffAvailabilityInput,
): AvailabilityStrategy {
  return {
    isAvailable(candidate: AvailabilityInput): AvailabilityResult {
      if (input.staffSelection === ANY_STAFF) {
        for (const staffId of input.eligibleStaffIdsInOrder) {
          const busy = input.busyIntervalsByStaffId[staffId] ?? [];
          if (isSlotFreeOfConflicts(candidate, busy)) {
            return { available: true, assignedStaffId: staffId };
          }
        }
        return { available: false, reason: "NO_STAFF_AVAILABLE" };
      }

      const busy = input.busyIntervalsByStaffId[input.staffSelection] ?? [];
      return isSlotFreeOfConflicts(candidate, busy)
        ? { available: true, assignedStaffId: input.staffSelection }
        : { available: false, reason: "STAFF_NOT_AVAILABLE" };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/availability/StaffAvailabilityStrategy.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 121 passed, 121 total` (116 + 5 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/availability/StaffAvailabilityStrategy.ts apps/salon-portfolio/gas/tests/availability/StaffAvailabilityStrategy.test.ts
```

---

## Task 8: `Validation.ts` — common (Layer A) validation

**Files:**
- Create: `apps/salon-portfolio/gas/src/Validation.ts`
- Test: `apps/salon-portfolio/gas/tests/Validation.test.ts`

**Interfaces:**
- Consumes: `ReservationRequest` from `./models/ReservationRequest`;
  `ValidationIssue` from `./models/ReservationDomain`;
  `isValidCalendarDateString` from `./Utils`.
- Produces (consumed by Task 12): `normalizeReservationRequest(request):
  ReservationRequest`, `validateReservationRequestShape(request):
  ValidationIssue[]`.

- [ ] **Step 1: Write the failing tests**

```ts
import { normalizeReservationRequest, validateReservationRequestShape } from "../src/Validation";
import { ReservationRequest } from "../src/models/ReservationRequest";

const baseRequest: ReservationRequest = {
  submissionId: "sub-1",
  serviceId: "SV001",
  date: "2026-09-15",
  time: "10:00",
  name: "田中太郎",
  email: "customer@example.com",
};

describe("normalizeReservationRequest", () => {
  it("trims strings and lowercases the email", () => {
    const normalized = normalizeReservationRequest({
      ...baseRequest,
      name: "  田中太郎  ",
      email: "  Customer@Example.com ",
      notes: "  よろしくお願いします  ",
    });
    expect(normalized.name).toBe("田中太郎");
    expect(normalized.email).toBe("customer@example.com");
    expect(normalized.notes).toBe("よろしくお願いします");
  });

  it("collapses an empty-after-trim optional field to undefined", () => {
    const normalized = normalizeReservationRequest({ ...baseRequest, phone: "   " });
    expect(normalized.phone).toBeUndefined();
  });
});

describe("validateReservationRequestShape", () => {
  it("accepts a fully valid request with no issues", () => {
    expect(validateReservationRequestShape(baseRequest)).toEqual([]);
  });

  it("flags a missing name", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, name: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "name", code: "REQUIRED_FIELD_MISSING" }));
  });

  it("flags a name over the length limit", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, name: "あ".repeat(101) });
    expect(issues).toContainEqual(expect.objectContaining({ field: "name", code: "TOO_LONG" }));
  });

  it("flags a missing email", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, email: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "email", code: "REQUIRED_FIELD_MISSING" }));
  });

  it("flags a malformed email", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, email: "not-an-email" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "email", code: "INVALID_FORMAT" }));
  });

  it("accepts common Japanese phone formats", () => {
    for (const phone of ["090-1234-5678", "09012345678", "03-1234-5678"]) {
      expect(validateReservationRequestShape({ ...baseRequest, phone })).toEqual([]);
    }
  });

  it("flags an invalid phone", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, phone: "call-me-maybe" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "phone", code: "INVALID_FORMAT" }));
  });

  it("does not require phone at all", () => {
    expect(validateReservationRequestShape({ ...baseRequest, phone: undefined })).toEqual([]);
  });

  it("flags notes over the length limit", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, notes: "a".repeat(501) });
    expect(issues).toContainEqual(expect.objectContaining({ field: "notes", code: "TOO_LONG" }));
  });

  it("flags a malformed date", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, date: "not-a-date" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "date", code: "INVALID_FORMAT" }));
  });

  it("flags an impossible calendar date", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, date: "2026-02-30" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "date", code: "INVALID_DATE" }));
  });

  it("flags a malformed time", () => {
    for (const time of ["25:00", "10:65", "abc"]) {
      const issues = validateReservationRequestShape({ ...baseRequest, time });
      expect(issues).toContainEqual(expect.objectContaining({ field: "time", code: "INVALID_FORMAT" }));
    }
  });

  it("flags a missing submissionId", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, submissionId: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "submissionId", code: "REQUIRED_FIELD_MISSING" }));
  });

  it("flags a missing serviceId", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, serviceId: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "serviceId", code: "REQUIRED_FIELD_MISSING" }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Validation.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { ReservationRequest } from "./models/ReservationRequest";
import { ValidationIssue } from "./models/ReservationDomain";
import { isValidCalendarDateString } from "./Utils";

/**
 * Common (Layer A) reservation validation — required fields, formats,
 * length caps. Contains no salon-specific knowledge (menu/staff/business
 * hours) so a future non-salon vertical can reuse it unchanged (Phase 3C
 * §45/§79). Salon-specific rules live in `ReservationRules.ts`.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_FORMAT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_DIGITS_PATTERN = /^\d{9,11}$/;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 200;
const NOTES_MAX_LENGTH = 500;

/** Trims every string field and lowercases the email — never changes
 *  business semantics (Phase 3C §46). An empty-after-trim optional field
 *  collapses to `undefined` rather than `""` so downstream checks can use
 *  a single falsy test. */
export function normalizeReservationRequest(request: ReservationRequest): ReservationRequest {
  return {
    ...request,
    submissionId: request.submissionId?.trim() ?? "",
    serviceId: request.serviceId?.trim() ?? "",
    staffId: typeof request.staffId === "string" ? request.staffId.trim() : request.staffId,
    date: request.date?.trim() ?? "",
    time: request.time?.trim() ?? "",
    name: request.name?.trim() ?? "",
    email: request.email?.trim().toLowerCase() ?? "",
    phone: request.phone?.trim() || undefined,
    notes: request.notes?.trim() || undefined,
  };
}

/** Validates an already-normalized request's shape. Pure, never throws —
 *  an empty array means "no structural issues" (Phase 3C §44). Does not
 *  check menu/staff existence, business hours, or past-date/booking
 *  window — those need CONFIG/catalog data and live in
 *  `ReservationRules.ts`. */
export function validateReservationRequestShape(request: ReservationRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!request.submissionId) {
    issues.push({ field: "submissionId", code: "REQUIRED_FIELD_MISSING", message: "submissionId is required" });
  }
  if (!request.serviceId) {
    issues.push({ field: "serviceId", code: "REQUIRED_FIELD_MISSING", message: "serviceId is required" });
  }

  if (!request.name) {
    issues.push({ field: "name", code: "REQUIRED_FIELD_MISSING", message: "お名前を入力してください" });
  } else if (request.name.length > NAME_MAX_LENGTH) {
    issues.push({ field: "name", code: "TOO_LONG", message: `Name must be ${NAME_MAX_LENGTH} characters or fewer` });
  }

  if (!request.email) {
    issues.push({ field: "email", code: "REQUIRED_FIELD_MISSING", message: "メールアドレスを入力してください" });
  } else if (!EMAIL_PATTERN.test(request.email)) {
    issues.push({ field: "email", code: "INVALID_FORMAT", message: "メールアドレスの形式が正しくありません" });
  } else if (request.email.length > EMAIL_MAX_LENGTH) {
    issues.push({ field: "email", code: "TOO_LONG", message: `Email must be ${EMAIL_MAX_LENGTH} characters or fewer` });
  }

  if (request.phone && !PHONE_DIGITS_PATTERN.test(request.phone.replace(/[-\s()]/g, ""))) {
    issues.push({ field: "phone", code: "INVALID_FORMAT", message: "電話番号の形式が正しくありません" });
  }

  if (!request.date) {
    issues.push({ field: "date", code: "REQUIRED_FIELD_MISSING", message: "date is required" });
  } else if (!DATE_FORMAT_PATTERN.test(request.date)) {
    issues.push({ field: "date", code: "INVALID_FORMAT", message: "date must be YYYY-MM-DD" });
  } else if (!isValidCalendarDateString(request.date)) {
    issues.push({ field: "date", code: "INVALID_DATE", message: "date is not a real calendar date" });
  }

  if (!request.time) {
    issues.push({ field: "time", code: "REQUIRED_FIELD_MISSING", message: "time is required" });
  } else if (!TIME_FORMAT_PATTERN.test(request.time)) {
    issues.push({ field: "time", code: "INVALID_FORMAT", message: "time must be HH:mm (00:00-23:59)" });
  }

  if (request.notes && request.notes.length > NOTES_MAX_LENGTH) {
    issues.push({ field: "notes", code: "TOO_LONG", message: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer` });
  }

  return issues;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 137 passed, 137 total` (121 + 16 new — 2 normalize + 14 validate, counting the two `for` loops as single `it`s each).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/Validation.ts apps/salon-portfolio/gas/tests/Validation.test.ts
```

---

## Task 9: `ReservationMapper.ts`

**Files:**
- Create: `apps/salon-portfolio/gas/src/ReservationMapper.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationMapper.test.ts`

**Interfaces:**
- Consumes: `ReservationRequest` from `./models/ReservationRequest`;
  `NormalizedReservation`, `StaffSelectionResolution` from
  `./models/ReservationDomain`; `SlotCandidate` from `./SlotEngine`;
  `ServiceRow` from `./SheetSchemas`; `generateReservationId` from
  `./ids/ReservationId`.
- Produces (consumed by Task 12): `buildNormalizedReservation(input):
  NormalizedReservation`.

- [ ] **Step 1: Write the failing tests**

```ts
import { buildNormalizedReservation } from "../src/ReservationMapper";
import { ReservationRequest } from "../src/models/ReservationRequest";
import { ServiceRow } from "../src/SheetSchemas";

const request: ReservationRequest = {
  submissionId: "sub-1",
  serviceId: "SV001",
  date: "2026-09-15",
  time: "10:00",
  name: "田中太郎",
  email: "customer@example.com",
  notes: "初めてです",
};

const service: ServiceRow = {
  ServiceID: "SV001",
  Name: "ジェルネイル",
  DurationMinutes: 60,
  Price: 6000,
  Active: true,
  StaffRequired: false,
  DisplayOrder: 1,
};

const candidate = { date: "2026-09-15", startTime: "10:00", endTime: "11:00" };

describe("buildNormalizedReservation", () => {
  it("takes duration/price/name from the resolved service, never from the request", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "none" },
      now: new Date("2026-09-10T01:00:00.000Z"),
    });
    expect(reservation.durationMinutes).toBe(60);
    expect(reservation.price).toBe(6000);
    expect(reservation.serviceName).toBe("ジェルネイル");
  });

  it("generates a RES-YYYYMMDD-XXXXXX reservationId using the injected now/random", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "none" },
      now: new Date("2026-09-10T01:00:00.000Z"),
      random: () => 0.5,
    });
    expect(reservation.reservationId).toMatch(/^RES-20260910-[A-Z0-9]{6}$/);
  });

  it("carries the assigned staffId through when the availability strategy resolved one", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "any", eligibleStaff: [] },
      assignedStaffId: "ST002",
      now: new Date("2026-09-10T01:00:00.000Z"),
    });
    expect(reservation.assignedStaffId).toBe("ST002");
    expect(reservation.staffSelection).toEqual({ kind: "any", eligibleStaff: [] });
  });

  it("carries submissionId, contact fields, and notes through unchanged", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "none" },
      now: new Date("2026-09-10T01:00:00.000Z"),
    });
    expect(reservation.submissionId).toBe("sub-1");
    expect(reservation.customerName).toBe("田中太郎");
    expect(reservation.email).toBe("customer@example.com");
    expect(reservation.notes).toBe("初めてです");
    expect(reservation.date).toBe("2026-09-15");
    expect(reservation.startTime).toBe("10:00");
    expect(reservation.endTime).toBe("11:00");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationMapper.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { ReservationRequest } from "./models/ReservationRequest";
import { NormalizedReservation, StaffSelectionResolution } from "./models/ReservationDomain";
import { SlotCandidate } from "./SlotEngine";
import { ServiceRow } from "./SheetSchemas";
import { generateReservationId } from "./ids/ReservationId";

export interface BuildNormalizedReservationInput {
  /** Already normalized/validated (Validation.ts) request. */
  request: ReservationRequest;
  /** Server-resolved service — the sole source of `durationMinutes`,
   *  `price`, and `serviceName` (Phase 3C §17/§51: the client is never
   *  trusted for these). */
  service: ServiceRow;
  candidate: SlotCandidate;
  staffSelection: StaffSelectionResolution;
  /** Set only once an `AvailabilityStrategy` has resolved a concrete
   *  staff member (including "any available" -> first free). */
  assignedStaffId?: string;
  now: Date;
  random?: () => number;
}

/** Pure mapping from a validated request + resolved service/staff data
 *  into the domain's output shape (Phase 3C §50). Never fetches anything
 *  itself; every input is already resolved by the caller. */
export function buildNormalizedReservation(
  input: BuildNormalizedReservationInput,
): NormalizedReservation {
  return {
    reservationId: generateReservationId(input.now, input.random),
    submissionId: input.request.submissionId,
    customerName: input.request.name,
    email: input.request.email,
    phone: input.request.phone,
    date: input.candidate.date,
    startTime: input.candidate.startTime,
    endTime: input.candidate.endTime,
    serviceId: input.service.ServiceID,
    serviceName: input.service.Name,
    durationMinutes: input.service.DurationMinutes,
    price: input.service.Price,
    staffSelection: input.staffSelection,
    assignedStaffId: input.assignedStaffId,
    notes: input.request.notes,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationMapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 141 passed, 141 total` (137 + 4 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/ReservationMapper.ts apps/salon-portfolio/gas/tests/ReservationMapper.test.ts
```

---

## Task 10: `ReservationRules.ts` part 1 — service and staff resolution

**Files:**
- Create: `apps/salon-portfolio/gas/src/ReservationRules.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationRules.test.ts`

**Interfaces:**
- Consumes: `ServiceRow`, `StaffRow` from `./SheetSchemas`; `ANY_STAFF`
  from `./models/ReservationRequest`; `ValidationIssue`,
  `StaffSelectionResolution` from `./models/ReservationDomain`;
  `AppConfig` from `./models/Config`.
- Produces (consumed by Task 12): `resolveService(services, serviceId)`,
  `resolveStaffSelection(staff, staffId, config)`.

- [ ] **Step 1: Write the failing tests**

```ts
import { resolveService, resolveStaffSelection } from "../src/ReservationRules";
import { ServiceRow, StaffRow } from "../src/SheetSchemas";
import { ANY_STAFF } from "../src/models/ReservationRequest";
import { AppConfig } from "../src/models/Config";

const activeService: ServiceRow = {
  ServiceID: "SV001",
  Name: "ジェルネイル",
  DurationMinutes: 60,
  Price: 6000,
  Active: true,
  StaffRequired: false,
  DisplayOrder: 1,
};
const inactiveService: ServiceRow = { ...activeService, ServiceID: "SV002", Active: false };
const services = [activeService, inactiveService];

describe("resolveService", () => {
  it("resolves an active service by id", () => {
    const result = resolveService(services, "SV001");
    expect(result).toEqual({ ok: true, service: activeService });
  });

  it("rejects an unknown serviceId", () => {
    const result = resolveService(services, "SV999");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("MENU_NOT_FOUND");
  });

  it("rejects an inactive service", () => {
    const result = resolveService(services, "SV002");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("MENU_NOT_BOOKABLE");
  });

  it("rejects a service with a non-positive duration", () => {
    const badService: ServiceRow = { ...activeService, ServiceID: "SV003", DurationMinutes: 0 };
    const result = resolveService([badService], "SV003");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("MENU_NOT_BOOKABLE");
  });
});

const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, DisplayOrder: 1 };
const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, DisplayOrder: 2 };
const inactiveStaff: StaffRow = { StaffID: "ST003", Name: "佐藤", Active: false, DisplayOrder: 3 };
const staff = [staffA, staffB, inactiveStaff];

const configWithStaffSelection: Pick<AppConfig, "features" | "staffAnyAvailableOption"> = {
  features: {
    contactForm: true,
    reservation: true,
    staffSelection: true,
    calendar: true,
    emailNotification: true,
  },
  staffAnyAvailableOption: true,
};
const configWithoutStaffSelection: Pick<AppConfig, "features" | "staffAnyAvailableOption"> = {
  ...configWithStaffSelection,
  features: { ...configWithStaffSelection.features, staffSelection: false },
  staffAnyAvailableOption: false,
};
const configWithoutAnyOption: Pick<AppConfig, "features" | "staffAnyAvailableOption"> = {
  ...configWithStaffSelection,
  staffAnyAvailableOption: false,
};

describe("resolveStaffSelection", () => {
  it("resolves to 'none' when staffSelection is disabled, ignoring any staffId sent", () => {
    const result = resolveStaffSelection(staff, "ST001", configWithoutStaffSelection);
    expect(result).toEqual({ ok: true, selection: { kind: "none" } });
  });

  it("resolves a valid specific active staff member", () => {
    const result = resolveStaffSelection(staff, "ST001", configWithStaffSelection);
    expect(result).toEqual({ ok: true, selection: { kind: "specific", staff: staffA } });
  });

  it("rejects an unknown staffId", () => {
    const result = resolveStaffSelection(staff, "ST999", configWithStaffSelection);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("STAFF_NOT_FOUND");
  });

  it("rejects an inactive staffId", () => {
    const result = resolveStaffSelection(staff, "ST003", configWithStaffSelection);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("STAFF_NOT_FOUND");
  });

  it("resolves ANY_STAFF to the active-staff-in-DisplayOrder list when the option is enabled", () => {
    const result = resolveStaffSelection(staff, ANY_STAFF, configWithStaffSelection);
    expect(result).toEqual({ ok: true, selection: { kind: "any", eligibleStaff: [staffA, staffB] } });
  });

  it("rejects ANY_STAFF when staff.anyAvailableOption is disabled", () => {
    const result = resolveStaffSelection(staff, ANY_STAFF, configWithoutAnyOption);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("STAFF_SELECTION_NOT_SUPPORTED");
  });

  it("requires a staffId when staffSelection is enabled and none was sent", () => {
    const result = resolveStaffSelection(staff, undefined, configWithStaffSelection);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("REQUIRED_FIELD_MISSING");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationRules.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { ServiceRow, StaffRow } from "./SheetSchemas";
import { ANY_STAFF } from "./models/ReservationRequest";
import { AppConfig } from "./models/Config";
import { StaffSelectionResolution, ValidationIssue } from "./models/ReservationDomain";

/**
 * Salon-specific reservation rules — resolving the client's `serviceId`/
 * `staffId` against server-side catalog data, plus (Task 11) business
 * hours/holiday/date-window evaluation, plus (Task 12) the composed
 * end-to-end evaluation entry point. Common, vertical-agnostic validation
 * lives in `Validation.ts` (Phase 3C §45).
 *
 * Neither this file nor anything it calls ever reads `SpreadsheetApp` —
 * `services`/`staff`/`config` are always supplied by the caller (Phase 3C
 * §55/§56).
 */

export function resolveService(
  services: ServiceRow[],
  serviceId: string,
): { ok: true; service: ServiceRow } | { ok: false; issue: ValidationIssue } {
  const service = services.find((candidate) => candidate.ServiceID === serviceId);
  if (!service) {
    return {
      ok: false,
      issue: { field: "serviceId", code: "MENU_NOT_FOUND", message: `Unknown service "${serviceId}"` },
    };
  }
  if (!service.Active) {
    return {
      ok: false,
      issue: { field: "serviceId", code: "MENU_NOT_BOOKABLE", message: `Service "${serviceId}" is not currently bookable` },
    };
  }
  if (!Number.isFinite(service.DurationMinutes) || service.DurationMinutes <= 0) {
    return {
      ok: false,
      issue: { field: "serviceId", code: "MENU_NOT_BOOKABLE", message: `Service "${serviceId}" has an invalid duration` },
    };
  }
  return { ok: true, service };
}

export function resolveStaffSelection(
  staff: StaffRow[],
  staffId: string | typeof ANY_STAFF | undefined,
  config: Pick<AppConfig, "features" | "staffAnyAvailableOption">,
): { ok: true; selection: StaffSelectionResolution } | { ok: false; issue: ValidationIssue } {
  if (!config.features.staffSelection) {
    // Phase 0 §K: staffId is not accepted at all when the feature is off —
    // ignored if sent, never validated or surfaced as an error.
    return { ok: true, selection: { kind: "none" } };
  }

  const activeStaffInOrder = staff
    .filter((member) => member.Active)
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder);

  if (!staffId) {
    return {
      ok: false,
      issue: { field: "staffId", code: "REQUIRED_FIELD_MISSING", message: "Staff selection is required" },
    };
  }

  if (staffId === ANY_STAFF) {
    if (!config.staffAnyAvailableOption) {
      return {
        ok: false,
        issue: { field: "staffId", code: "STAFF_SELECTION_NOT_SUPPORTED", message: '"Any available staff" is not offered' },
      };
    }
    return { ok: true, selection: { kind: "any", eligibleStaff: activeStaffInOrder } };
  }

  const match = activeStaffInOrder.find((member) => member.StaffID === staffId);
  if (!match) {
    return {
      ok: false,
      issue: { field: "staffId", code: "STAFF_NOT_FOUND", message: `Unknown or inactive staff "${staffId}"` },
    };
  }
  return { ok: true, selection: { kind: "specific", staff: match } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationRules.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 152 passed, 152 total` (141 + 11 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/ReservationRules.ts apps/salon-portfolio/gas/tests/ReservationRules.test.ts
```

---

## Task 11: `ReservationRules.ts` part 2 — business hours, holiday, date window

**Files:**
- Modify: `apps/salon-portfolio/gas/src/ReservationRules.ts`
- Modify: `apps/salon-portfolio/gas/tests/ReservationRules.test.ts`

**Interfaces:**
- Consumes: `getWeekdayForDateString`, `tokyoDateTimeToInstant`,
  `addDaysToTokyoDateString`, `formatDateYYYYMMDDDashedInTokyo` from
  `./Utils`.
- Produces (consumed by Task 12): `evaluateBusinessDay(date, config)`,
  `checkDateWindow(date, time, reservationSettings, now)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/ReservationRules.test.ts`:

```ts
import { evaluateBusinessDay, checkDateWindow } from "../src/ReservationRules";

const hoursConfig: Pick<AppConfig, "hours" | "holidays"> = {
  hours: {
    monday: "10:00-19:00",
    tuesday: "10:00-19:00",
    wednesday: "10:00-19:00",
    thursday: "10:00-19:00",
    friday: "10:00-19:00",
    saturday: "10:00-18:00",
    sunday: "closed",
  },
  holidays: ["2026-09-21"],
};

describe("evaluateBusinessDay", () => {
  it("is open on a normal weekday", () => {
    // 2026-09-10 is a Thursday
    expect(evaluateBusinessDay("2026-09-10", hoursConfig)).toEqual({ open: true, interval: "10:00-19:00" });
  });

  it("is closed on the configured closed weekday", () => {
    // 2026-09-06 is a Sunday
    expect(evaluateBusinessDay("2026-09-06", hoursConfig)).toEqual({ open: false, reason: "OUTSIDE_BUSINESS_HOURS" });
  });

  it("is closed on a holiday even though that weekday is normally open", () => {
    // 2026-09-21 is a Monday, normally open per hoursConfig
    expect(evaluateBusinessDay("2026-09-21", hoursConfig)).toEqual({ open: false, reason: "HOLIDAY" });
  });
});

describe("checkDateWindow", () => {
  const reservationSettings: AppConfig["reservation"] = {
    timezone: "Asia/Tokyo",
    slotMinutes: 30,
    minLeadHours: 2,
    maxBookingDays: 30,
  };

  it("accepts a date/time far enough in the future", () => {
    const now = new Date("2026-09-10T01:00:00.000Z"); // 2026-09-10 10:00 JST
    expect(checkDateWindow("2026-09-15", "10:00", reservationSettings, now)).toBeNull();
  });

  it("rejects a date/time inside the minimum lead time", () => {
    const now = new Date("2026-09-10T01:00:00.000Z"); // 2026-09-10 10:00 JST
    const issue = checkDateWindow("2026-09-10", "10:30", reservationSettings, now); // only 30min lead, needs 2h
    expect(issue?.code).toBe("PAST_DATE");
  });

  it("rejects a date beyond maxBookingDays", () => {
    const now = new Date("2026-09-10T01:00:00.000Z");
    const issue = checkDateWindow("2026-11-01", "10:00", reservationSettings, now);
    expect(issue?.code).toBe("OUTSIDE_BOOKING_WINDOW");
  });

  it("uses the Asia/Tokyo calendar date for 'today', not the UTC date", () => {
    // now = 2026-09-09T15:30:00Z = 2026-09-10T00:30 JST: Tokyo's "today"
    // is the 10th even though UTC's date is still the 9th. With
    // maxBookingDays=0 (only today bookable), requesting Tokyo's actual
    // today must be accepted — a UTC-based bug would compute "today" as
    // the 9th and wrongly reject the 10th as beyond the window.
    const now = new Date("2026-09-09T15:30:00.000Z");
    const zeroHorizon: AppConfig["reservation"] = { ...reservationSettings, minLeadHours: 0, maxBookingDays: 0 };
    expect(checkDateWindow("2026-09-10", "01:00", zeroHorizon, now)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationRules.test.ts`
Expected: FAIL — `evaluateBusinessDay`/`checkDateWindow` are not exported yet.

- [ ] **Step 3: Implement**

Append to `src/ReservationRules.ts`:

```ts
import {
  addDaysToTokyoDateString,
  formatDateYYYYMMDDDashedInTokyo,
  getWeekdayForDateString,
  tokyoDateTimeToInstant,
} from "./Utils";

/** Business-hours + holiday evaluation for one calendar date (Phase 3C
 *  §22-24). A holiday always wins over that weekday's configured hours
 *  (Phase 3C §24). */
export function evaluateBusinessDay(
  date: string,
  config: Pick<AppConfig, "hours" | "holidays">,
): { open: true; interval: string } | { open: false; reason: "HOLIDAY" | "OUTSIDE_BUSINESS_HOURS" } {
  if (config.holidays.includes(date)) {
    return { open: false, reason: "HOLIDAY" };
  }
  const weekday = getWeekdayForDateString(date);
  const interval = config.hours[weekday];
  if (interval === "closed") {
    return { open: false, reason: "OUTSIDE_BUSINESS_HOURS" };
  }
  return { open: true, interval };
}

/** Past-date/lead-time and booking-horizon evaluation (Phase 3C §25-27),
 *  both explicitly Asia/Tokyo (§12). Uses the existing
 *  `reservation.minLeadHours`/`reservation.maxBookingDays` CONFIG fields
 *  (Phase 3A) rather than inventing new ones. Returns `null` when the
 *  date/time is acceptable. */
export function checkDateWindow(
  date: string,
  time: string,
  reservationSettings: AppConfig["reservation"],
  now: Date,
): ValidationIssue | null {
  const requestInstant = tokyoDateTimeToInstant(date, time);
  const earliestBookableInstant = now.getTime() + reservationSettings.minLeadHours * 60 * 60 * 1000;
  if (requestInstant < earliestBookableInstant) {
    return {
      field: "date",
      code: "PAST_DATE",
      message: "The requested date/time is in the past or inside the minimum lead time",
    };
  }

  const todayInTokyo = formatDateYYYYMMDDDashedInTokyo(now);
  const latestBookableDate = addDaysToTokyoDateString(todayInTokyo, reservationSettings.maxBookingDays);
  if (date > latestBookableDate) {
    return {
      field: "date",
      code: "OUTSIDE_BOOKING_WINDOW",
      message: "The requested date is beyond the booking horizon",
    };
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationRules.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 159 passed, 159 total` (152 + 7 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/ReservationRules.ts apps/salon-portfolio/gas/tests/ReservationRules.test.ts
```

---

## Task 12: `ReservationRules.ts` part 3 — `evaluateReservationRequest` composition

**Files:**
- Modify: `apps/salon-portfolio/gas/src/ReservationRules.ts`
- Modify: `apps/salon-portfolio/gas/tests/ReservationRules.test.ts`

**Interfaces:**
- Consumes: `normalizeReservationRequest`,
  `validateReservationRequestShape` from `./Validation`;
  `generateCandidateSlots` from `./SlotEngine`; `AvailabilityInput`,
  `AvailabilityStrategy` from `./availability/AvailabilityStrategy`;
  `buildNormalizedReservation` from `./ReservationMapper`;
  `toTokyoLocalDateTimeString` from `./Utils`; `resolveService`,
  `resolveStaffSelection`, `evaluateBusinessDay`, `checkDateWindow`
  (same file, Tasks 10-11).
- Produces (this is the domain's public entry point — the future
  orchestration phase calls this, nothing later in Phase 3C):
  `EvaluateReservationInput`, `ReservationEvaluationResult`,
  `evaluateReservationRequest(input): ReservationEvaluationResult`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/ReservationRules.test.ts`:

```ts
import { evaluateReservationRequest } from "../src/ReservationRules";
import { createSharedAvailabilityStrategy } from "../src/availability/SharedAvailabilityStrategy";
import { createStaffAvailabilityStrategy } from "../src/availability/StaffAvailabilityStrategy";
import { ReservationRequest } from "../src/models/ReservationRequest";
// ServiceRow is already imported by Task 10's block above in the same file.

const fullConfig: AppConfig = {
  business: { name: "Salon", phone: "03-0000-0000", email: "owner@example.com", address: "Tokyo" },
  hours: hoursConfig.hours,
  holidays: hoursConfig.holidays,
  features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
  staffAnyAvailableOption: false,
  reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 0, maxBookingDays: 60 },
  calendarId: "calendar-1",
  emailOwnerNotifyAddress: "owner@example.com",
  emailFromName: "Salon",
};

const now = new Date("2026-09-10T01:00:00.000Z"); // 2026-09-10 10:00 JST

function baseValidRequest(): ReservationRequest {
  return {
    submissionId: "sub-1",
    serviceId: "SV001",
    date: "2026-09-11", // a Friday, normally open
    time: "11:00",
    name: "田中太郎",
    email: "customer@example.com",
  };
}

describe("evaluateReservationRequest", () => {
  it("succeeds end to end with no staff dimension and a free calendar", () => {
    const result = evaluateReservationRequest({
      request: baseValidRequest(),
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reservation.serviceName).toBe("ジェルネイル");
      expect(result.reservation.startTime).toBe("11:00");
      expect(result.reservation.endTime).toBe("12:00");
      expect(result.reservation.reservationId).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
    }
  });

  it("rejects a request with a shape validation issue before touching any business rule", () => {
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), email: "not-an-email" },
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "INVALID_FORMAT")).toBe(true);
  });

  it("blocks a reservation on a holiday even though the weekday is normally open", () => {
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), date: "2026-09-21", time: "11:00" }, // configured holiday, a Monday
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "HOLIDAY")).toBe(true);
  });

  it("blocks a service whose duration would cross closing time", () => {
    const longService: ServiceRow = { ...activeService, ServiceID: "SV-LONG", DurationMinutes: 480 }; // 8 hours
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), serviceId: "SV-LONG", time: "18:00" },
      services: [longService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "OUTSIDE_BUSINESS_HOURS")).toBe(true);
  });

  it("blocks a reservation that conflicts with an existing Calendar event", () => {
    const result = evaluateReservationRequest({
      request: baseValidRequest(),
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () =>
        createSharedAvailabilityStrategy([{ start: "2026-09-11T11:00", end: "2026-09-11T12:00" }]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "CALENDAR_CONFLICT")).toBe(true);
  });

  it("succeeds for 'any available staff' when at least one eligible staff member is free", () => {
    const staffConfig: AppConfig = {
      ...fullConfig,
      features: { ...fullConfig.features, staffSelection: true },
      staffAnyAvailableOption: true,
    };
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), staffId: ANY_STAFF },
      services: [activeService],
      staff: [staffA, staffB],
      config: staffConfig,
      now,
      availabilityFor: (candidate, staffSelection) =>
        createStaffAvailabilityStrategy({
          staffSelection: ANY_STAFF,
          eligibleStaffIdsInOrder:
            staffSelection.kind === "any" ? staffSelection.eligibleStaff.map((member) => member.StaffID) : [],
          busyIntervalsByStaffId: {
            ST001: [{ start: "2026-09-11T11:00", end: "2026-09-11T12:00" }],
          },
        }),
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.reservation.assignedStaffId).toBe("ST002");
  });

  it("fails 'any available staff' when every eligible staff member is busy", () => {
    const staffConfig: AppConfig = {
      ...fullConfig,
      features: { ...fullConfig.features, staffSelection: true },
      staffAnyAvailableOption: true,
    };
    const busy = { start: "2026-09-11T11:00", end: "2026-09-11T12:00" };
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), staffId: ANY_STAFF },
      services: [activeService],
      staff: [staffA, staffB],
      config: staffConfig,
      now,
      availabilityFor: (candidate, staffSelection) =>
        createStaffAvailabilityStrategy({
          staffSelection: ANY_STAFF,
          eligibleStaffIdsInOrder:
            staffSelection.kind === "any" ? staffSelection.eligibleStaff.map((member) => member.StaffID) : [],
          busyIntervalsByStaffId: { ST001: [busy], ST002: [busy] },
        }),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "NO_STAFF_AVAILABLE")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationRules.test.ts`
Expected: FAIL — `evaluateReservationRequest` is not exported yet.

- [ ] **Step 3: Implement**

Append to `src/ReservationRules.ts`:

```ts
import { normalizeReservationRequest, validateReservationRequestShape } from "./Validation";
import { generateCandidateSlots, SlotCandidate } from "./SlotEngine";
import { AvailabilityStrategy } from "./availability/AvailabilityStrategy";
import { buildNormalizedReservation } from "./ReservationMapper";
import { toTokyoLocalDateTimeString } from "./Utils";
import { NormalizedReservation } from "./models/ReservationDomain";
import { ReservationRequest } from "./models/ReservationRequest";

export interface EvaluateReservationInput {
  request: ReservationRequest;
  /** Active + inactive services are both passed in — `resolveService`
   *  itself decides bookability (Phase 3C §56: the domain never fetches
   *  its own catalog data). */
  services: ServiceRow[];
  staff: StaffRow[];
  config: AppConfig;
  now: Date;
  /** Constructs the availability strategy for this specific candidate +
   *  resolved staff selection. The caller (a future orchestration phase)
   *  decides whether to hand back a `SharedAvailabilityStrategy` or a
   *  `StaffAvailabilityStrategy`, already fed with real busy intervals —
   *  `ReservationRules.ts` never constructs one itself and never touches
   *  `CalendarApp` (Phase 3C §53/§56, hard rule). */
  availabilityFor: (
    candidate: SlotCandidate,
    staffSelection: StaffSelectionResolution,
  ) => AvailabilityStrategy;
  random?: () => number;
}

export type ReservationEvaluationResult =
  | { ok: true; reservation: NormalizedReservation }
  | { ok: false; issues: ValidationIssue[] };

/** The domain's single composed entry point (Phase 3C §52): normalize ->
 *  validate shape -> resolve service -> resolve staff -> check date
 *  window -> check business day -> generate/match a slot candidate ->
 *  check availability -> map to a `NormalizedReservation`. Every step is
 *  delegated to a small function above/elsewhere in this file or a
 *  sibling module — this function itself only sequences them and decides
 *  which single-issue-array to return on the first failure.
 *
 *  IMPORTANT — this result is advisory, not a reservation guarantee
 *  (Phase 3C §75): a future submission workflow must re-check
 *  availability again while holding a reservation lock before actually
 *  persisting anything, since the busy-interval snapshot `availabilityFor`
 *  was built from can go stale between this evaluation and a real
 *  submission. */
export function evaluateReservationRequest(
  input: EvaluateReservationInput,
): ReservationEvaluationResult {
  const normalized = normalizeReservationRequest(input.request);

  const shapeIssues = validateReservationRequestShape(normalized);
  if (shapeIssues.length > 0) {
    return { ok: false, issues: shapeIssues };
  }

  const serviceResult = resolveService(input.services, normalized.serviceId);
  if (!serviceResult.ok) {
    return { ok: false, issues: [serviceResult.issue] };
  }

  const staffResult = resolveStaffSelection(input.staff, normalized.staffId, input.config);
  if (!staffResult.ok) {
    return { ok: false, issues: [staffResult.issue] };
  }

  const dateWindowIssue = checkDateWindow(normalized.date, normalized.time, input.config.reservation, input.now);
  if (dateWindowIssue) {
    return { ok: false, issues: [dateWindowIssue] };
  }

  const businessDay = evaluateBusinessDay(normalized.date, input.config);
  if (!businessDay.open) {
    return {
      ok: false,
      issues: [
        {
          field: "date",
          code: businessDay.reason,
          message: businessDay.reason === "HOLIDAY" ? "Selected date is a holiday" : "Selected date is outside business hours",
        },
      ],
    };
  }

  const candidates = generateCandidateSlots({
    date: normalized.date,
    businessHours: businessDay.interval,
    durationMinutes: serviceResult.service.DurationMinutes,
    slotIntervalMinutes: input.config.reservation.slotMinutes,
    isHoliday: false,
  });
  const candidate = candidates.find((slot) => slot.startTime === normalized.time);
  if (!candidate) {
    return {
      ok: false,
      issues: [
        {
          field: "time",
          code: "OUTSIDE_BUSINESS_HOURS",
          message: "Selected time does not fit within business hours for the requested service",
        },
      ],
    };
  }

  const availabilityStrategy = input.availabilityFor(candidate, staffResult.selection);
  const availability = availabilityStrategy.isAvailable({
    candidateStart: toTokyoLocalDateTimeString(candidate.date, candidate.startTime),
    candidateEnd: toTokyoLocalDateTimeString(candidate.date, candidate.endTime),
  });
  if (!availability.available) {
    return {
      ok: false,
      issues: [{ field: "date", code: availability.reason, message: "Selected time is no longer available" }],
    };
  }

  const reservation = buildNormalizedReservation({
    request: normalized,
    service: serviceResult.service,
    candidate,
    staffSelection: staffResult.selection,
    assignedStaffId: availability.assignedStaffId,
    now: input.now,
    random: input.random,
  });

  return { ok: true, reservation };
}
```

Housekeeping: `src/ReservationRules.ts` now has three separate `import`
groups accumulated from Tasks 10-12 (some from the same module, e.g. two
separate `models/ReservationDomain` imports). Before staging, merge each
module's imports into one statement at the top of the file — this is a
pure formatting cleanup with no behavior change, so it does not need its
own test cycle.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationRules.test.ts`
Expected: PASS, all 7 new `evaluateReservationRequest` scenarios green.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd apps/salon-portfolio/gas && npm test -- --silent && npm run typecheck`
Expected: `Tests: 166 passed, 166 total` (159 + 7 new).

- [ ] **Step 6: Stage**

```bash
git add apps/salon-portfolio/gas/src/ReservationRules.ts apps/salon-portfolio/gas/tests/ReservationRules.test.ts
```

---

## Task 13: Documentation

**Files:**
- Create: `docs/reservation-domain-architecture.md`
- Modify: `docs/architecture-overview.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Write `docs/reservation-domain-architecture.md`**

Content requirements (write in the project's established documentation
voice — see `architecture-overview.md`/`runtime-config-guide.md` for
tone):
1. A `text` flow diagram: Request -> Validation (common) -> salon-specific
   resolution (service/staff) -> business-hours/holiday/date-window ->
   SlotEngine -> AvailabilityStrategy -> NormalizedReservation, naming the
   exact function/file for each box (`Validation.ts`
   `validateReservationRequestShape`, `ReservationRules.ts`
   `resolveService`/`resolveStaffSelection`/`evaluateBusinessDay`/
   `checkDateWindow`/`evaluateReservationRequest`, `SlotEngine.ts`
   `generateCandidateSlots`, `availability/*.ts`, `ReservationMapper.ts`
   `buildNormalizedReservation`).
2. An "Availability architecture" section: `AvailabilityStrategy`
   interface -> `CalendarOverlapAvailability` (shared overlap primitive)
   -> `SharedAvailabilityStrategy` (no staff dimension) /
   `StaffAvailabilityStrategy` (specific + `ANY_STAFF`, first-free-in-
   DisplayOrder resolution) -> a documented future
   `Calendar.ts` adapter -> `BusyInterval[]`, stating explicitly that no
   module in this phase calls `CalendarApp`.
3. A **Concurrency** section, verbatim in spirit:
   > Availability evaluated by `evaluateReservationRequest` in this phase
   > is advisory only, not a reservation guarantee. The busy-interval
   > snapshot it is fed can go stale between evaluation and an actual
   > submission. The future submission workflow must re-check
   > availability again while holding a reservation lock
   > (`LockService`) before persisting anything — see
   > `phase0-specification.md` §U step 5.
4. A **Future orchestration contract** section reproducing (not
   implementing) the flow: `createReservation(request)` -> validate
   (reuses this phase's `evaluateReservationRequest`) -> append
   RESERVATIONS row as `処理中` -> acquire `LockService` -> re-check
   availability -> create Calendar event -> update Sheet row to `受付済` (or
   `要確認` on Calendar failure) -> release lock -> send email — citing
   `phase0-specification.md` §U as the authoritative version of this flow.
5. A **Current limitations / documented assumptions** section: (a)
   `models/Config.ts`'s `BusinessHours` supports exactly one interval per
   weekday — no lunch-break/split-hours support yet, not attempted here;
   (b) `SERVICES`/`STAFF` sheets have no staff/service compatibility
   column, so "any available staff" treats every active staff member as
   eligible for every service; (c) `ServiceRow.StaffRequired`'s intended
   behavior is not yet specified anywhere and is not interpreted by this
   phase's domain logic; (d) the reservation domain has no honeypot/
   minimum-fill-time field on `ReservationRequest` (Phase 0 §E) — that
   anti-spam mechanism (§P) applies at a future `Api.ts` raw-payload
   boundary, not inside the typed domain model, and is not implemented in
   this phase.
6. A **Frontend impact** section stating plainly: `web/app/reservation/
   page.tsx` is still the Phase 1 placeholder with no form and no
   `ReservationRequest`-shaped state; there is nothing to reconcile
   against this phase's types, so no frontend file was touched.

- [ ] **Step 2: Update `docs/architecture-overview.md`**

Add a new subsection after "What exists after Phase 3A" (renaming/keeping
that heading historical) describing what Phase 3C added:
`models/ReservationRequest.ts`, `models/ReservationDomain.ts`,
`Validation.ts`, `ReservationRules.ts`, `SlotEngine.ts`,
`ReservationMapper.ts`, `availability/{AvailabilityStrategy,
CalendarOverlapAvailability, SharedAvailabilityStrategy,
StaffAvailabilityStrategy}.ts` — all pure, zero Google-service calls,
covered by Jest — and a one-line pointer to
`reservation-domain-architecture.md` for the full flow. State explicitly
that `Api.ts`/`Code.ts` are unchanged: nothing routes to this domain yet.

- [ ] **Step 3: Update `docs/roadmap.md`**

Insert a new checked entry between Phase 3B and the existing Phase 4
entry:

```markdown
- [x] **Phase 3C — Reservation domain, validation & availability
      foundation.** `Validation.ts` (common field validation),
      `ReservationRules.ts` (salon-specific resolution + business-hours/
      holiday/date-window rules + the composed
      `evaluateReservationRequest` entry point), `SlotEngine.ts` (pure
      slot generation), `availability/` (`AvailabilityStrategy` interface,
      `CalendarOverlapAvailability`, `SharedAvailabilityStrategy`,
      `StaffAvailabilityStrategy`), `ReservationMapper.ts`,
      `models/ReservationRequest.ts`/`models/ReservationDomain.ts`. Zero
      Google service calls anywhere in this layer — see
      [`reservation-domain-architecture.md`](reservation-domain-architecture.md).
      No `createReservation` action, no Sheets/Calendar/Gmail writes, no
      `LockService`, no frontend change (the reservation page has no form
      yet to reconcile). Inserted ahead of the original Phase 4/5 split
      because this pure-domain layer has no dependency on the
      Sheets/Calendar adapters Phase 4 will add.
```

Then edit the existing Phase 5 bullet to remove what Phase 3C now covers,
leaving only what is genuinely still unimplemented:

```markdown
- [ ] **Phase 5 — Reservation submission workflow.** Wires Phase 3C's
      `evaluateReservationRequest` to real data: `getServices`/`getStaff`
      actions (Phase 4), a real `Calendar.ts`-backed `BusyInterval[]`
      supply for `availabilityFor`, the `createReservation` transaction
      flow (`phase0-specification.md` §U: `処理中` row -> `LockService` ->
      re-check availability -> Calendar event -> `受付済`/`要確認`),
      idempotency (§P).
```

- [ ] **Step 4: Stage**

```bash
git add docs/reservation-domain-architecture.md docs/architecture-overview.md docs/roadmap.md
```

---

## Task 14: Full verification, evidence, and self-review

**Files:** none (verification only), plus the evidence folder.

- [ ] **Step 1: Full GAS suite + typecheck**

```bash
cd apps/salon-portfolio/gas
npm test -- --logger "console;verbosity=detailed" 2>&1 | tee /tmp/gas-test.log
npm run typecheck 2>&1 | tee /tmp/gas-typecheck.log
npm run build 2>&1 | tee /tmp/gas-build.log
```
Expected: all tests pass (166/166 per the running count above — record
the actual number, do not assume), typecheck clean, `build/Code.js`
produced with no errors.

- [ ] **Step 2: Full web suite (must be unaffected)**

```bash
cd apps/salon-portfolio/web
npm test -- --silent 2>&1 | tee /tmp/web-test.log
npm run lint 2>&1 | tee /tmp/web-lint.log
npm run build 2>&1 | tee /tmp/web-build.log
```
Expected: `Tests: 67 passed, 67 total` (unchanged from Task 0's baseline —
no web file was touched by this plan), lint clean, production build
succeeds.

- [ ] **Step 3: Google-service-call check**

```bash
cd apps/salon-portfolio/gas
grep -rn "SpreadsheetApp\|CalendarApp\|GmailApp\|PropertiesService\|LockService" \
  src/Validation.ts src/ReservationRules.ts src/SlotEngine.ts src/ReservationMapper.ts \
  src/availability/ src/models/ReservationRequest.ts src/models/ReservationDomain.ts
```
Expected: no matches (exit code 1 from grep). Paste this exact command +
output into the evidence folder even though it's expected to be empty —
this is the Critical-review check for "accidental Google service calls".

- [ ] **Step 4: Diff scope check**

```bash
git status -s
git diff --stat
```
Expected: only the files listed in this plan's tasks appear modified/
added — no unrelated file touched (e.g. no change under
`ConfigParser.ts`, `Api.ts`, `Code.ts`, or anything in `web/`).

- [ ] **Step 5: Save evidence**

Create `.evidence/<timestamp>-phase3c-reservation-domain/` (same
`<timestamp>` as Task 0) containing:
- `00-baseline-tests.txt` (from Task 0)
- `01-gas-test.log`, `02-gas-typecheck.log`, `03-gas-build.log` (Step 1)
- `04-web-test.log`, `05-web-lint.log`, `06-web-build.log` (Step 2)
- `07-google-service-grep.txt` (Step 3)
- `08-git-status.txt`, `09-git-diff-stat.txt` (Step 4)
- `10-final-review.md` — a short written self-review against this plan's
  Global Constraints and the conversation's §88 Critical/Important/Minor
  checklist (timezone bugs, overlap logic, past-date bugs, holiday
  bypass, business-hours bypass, client-controlled duration/price/staff,
  accidental Google calls, accidental API/route implementation, secrets,
  duplicated validation/types, monolithic service, hard-coded
  hours/holidays, nondeterministic/brittle date tests, unclear "any
  available" behavior) — note each item's status and, for anything not
  fully clean, why.

- [ ] **Step 6: Final report to the user**

Produce the structured report the conversation's §92 asks for (Summary,
Files Added/Modified, Domain Architecture, Validation Rules, Slot Engine,
Availability, Google Services [not called], Frontend [no change needed
and why], Tests [baseline -> final with the exact numbers from the
evidence files], Typecheck, Lint, GAS Build, Frontend Build, Security
Review, Review Findings, Documentation, Remaining Work — pointing at
Phase 4/5 in the updated roadmap). State explicitly and honestly if any
task's actual test count differed from this plan's running totals (they
are planning-time estimates; the evidence log is the source of truth per
this repository's evidence-reporting rule).

- [ ] **Step 7: Stage evidence**

```bash
git add .evidence/<timestamp>-phase3c-reservation-domain/
```

Do not commit. Stop here — per the conversation's own §90 "Stop
Condition" and this repository's commit-authorization rule, wait for the
user's explicit next instruction before any `git commit` and before
starting Phase 4/5 work (`createReservation`, Calendar/Sheets/Gmail
wiring, `LockService`).
