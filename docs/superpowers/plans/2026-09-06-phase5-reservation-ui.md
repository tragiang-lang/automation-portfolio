# Phase 5 — Reservation UI & E2E Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note for this run:** this plan is being executed inline, in the
> same session that wrote it, by the same agent — not handed to a fresh
> engineer. Task boundaries and interface contracts below are still binding
> (they are what keeps 21 tasks consistent with each other), but per-task
> steps are written at the granularity needed to stay correct and testable,
> not padded into artificial 2-minute increments purely for handoff safety.

**Goal:** Build a complete, Japanese, mobile-responsive reservation wizard on
`apps/salon-portfolio/web` that lets a customer pick a menu, staff
preference, date/time (via a new public availability action), and submit
through the existing Phase 4 `createReservation` transaction — without
touching Phase 4's transaction/idempotency/lock logic.

**Architecture:** Two new thin, side-effect-free GAS public actions
(`getServices`, `getStaff`, `getAvailability`) reuse existing Phase 3C/4
building blocks (`Catalog.ts`, `ReservationRules.ts`, `availability/`) with
zero changes to `createReservation`'s critical section. The frontend adds a
`ReservationWizard` client component tree under `components/reservation/`,
driven by one `useReservationWizard` state hook, calling three new
functions added to the existing `lib/api/reservationClient.ts` (no second
API client). `app/reservation/page.tsx` becomes a Server Component that
gates on `features.reservation` and passes runtime config down.

**Tech Stack:** TypeScript, Jest/ts-jest (GAS), Next.js 16 App Router +
React 19 + Jest 30/RTL (web). No new dependencies on either side.

**Spec:** the full Phase 5 task brief in this conversation (sections 1-40);
this plan implements it narrowly per section 3 (IN SCOPE) / section 4 (OUT
OF SCOPE).

## Global Constraints

- Never touch `runReservationCriticalSection`, `createReservationActionInner`,
  `Idempotency.ts`'s cache key format, or any Sheets/Calendar/Mail adapter —
  Phase 4 is a closed contract for this phase (spec §1, §26).
- Every new GAS public action follows the exact `getConfigAction`/
  `createReservationAction` pattern: thin exported action function, inner
  function doing the work, outer try/catch mapping `ConfigError`/
  `MissingHeadersError` the same way (`Api.ts:128-145`, `Api.ts:437-554`).
- No new npm dependency on either `gas` or `web` (spec §23) — no
  redux/zustand/react-query/swr/date-picker library. Plain React state,
  native `<input type="date">`.
- One reservation API client only — extend
  `web/lib/api/reservationClient.ts`, never create a second file (spec §6
  Principle 3, §E).
- `/api/gas` stays the only browser→GAS boundary; `GAS_WEBAPP_URL` never
  reaches a Client Component (spec §6 Principle 4).
- All customer-facing text is Japanese, natural salon copy, no technical
  terms (spec §J). Every backend-sourced error message is already sanitized
  server-side (GAS `ReservationErrorMapping.ts` + `/api/gas/route.ts`) — the
  frontend renders `error.message` verbatim, it does not re-map codes to
  new copy (verified by reading both files; see Task 9 notes).
- Public catalog/availability projections never include `Active`,
  `CalendarID`, `StaffRequired`, or any internal id beyond `ServiceID`/
  `StaffID` themselves (spec §8, §9, §25).
- Preserve the existing design system exactly: `Container`, `SectionHeading`,
  `Button`, `FormField`, `cn()` — no new color/spacing values (spec §21).
- `docs/roadmap.md` numbers this work as **Phase 6** ("Reservation form
  UI"); its own "Phase 5" is contact/cancellation (explicitly out of scope
  here, spec §4). This plan's deliverable is called "Phase 5" throughout
  per the task brief's own framing; Task 20 reconciles the roadmap doc
  wording without renumbering already-shipped phases.

---

## Part A — GAS backend (`apps/salon-portfolio/gas`)

### Task 1: Public catalog projection types + mapping

**Files:**
- Create: `apps/salon-portfolio/gas/src/models/Catalog.ts`
- Create: `apps/salon-portfolio/gas/src/PublicCatalog.ts`
- Test: `apps/salon-portfolio/gas/tests/PublicCatalog.test.ts`

**Interfaces:**
- Produces: `PublicService { serviceId: string; name: string; durationMinutes: number; price: number; displayOrder: number }`, `PublicStaff { staffId: string; name: string; displayOrder: number }`, `buildPublicServices(services: ServiceRow[]): PublicService[]`, `buildPublicStaff(staff: StaffRow[]): PublicStaff[]`.
- Consumes: `ServiceRow`/`StaffRow` from `./SheetSchemas` (existing).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/salon-portfolio/gas/tests/PublicCatalog.test.ts
import { buildPublicServices, buildPublicStaff } from "../src/PublicCatalog";
import { ServiceRow, StaffRow } from "../src/SheetSchemas";

const services: ServiceRow[] = [
  { ServiceID: "SV002", Name: "ジェルネイル", DurationMinutes: 90, Price: 8800, Active: true, StaffRequired: false, DisplayOrder: 2 },
  { ServiceID: "SV001", Name: "まつげパーマ", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  { ServiceID: "SV003", Name: "廃止メニュー", DurationMinutes: 30, Price: 3300, Active: false, StaffRequired: false, DisplayOrder: 3 },
];

const staff: StaffRow[] = [
  { StaffID: "ST002", Name: "佐藤", Active: true, CalendarID: "cal-2@example.com", DisplayOrder: 2 },
  { StaffID: "ST001", Name: "鈴木", Active: true, DisplayOrder: 1 },
  { StaffID: "ST003", Name: "退職済み", Active: false, DisplayOrder: 3 },
];

describe("buildPublicServices", () => {
  it("excludes inactive services and sorts by DisplayOrder", () => {
    expect(buildPublicServices(services)).toEqual([
      { serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 },
      { serviceId: "SV002", name: "ジェルネイル", durationMinutes: 90, price: 8800, displayOrder: 2 },
    ]);
  });

  it("never includes Active/StaffRequired fields", () => {
    const result = buildPublicServices(services);
    for (const service of result) {
      expect(service).not.toHaveProperty("Active");
      expect(service).not.toHaveProperty("StaffRequired");
    }
  });

  it("returns an empty array when given no services", () => {
    expect(buildPublicServices([])).toEqual([]);
  });
});

describe("buildPublicStaff", () => {
  it("excludes inactive staff and sorts by DisplayOrder", () => {
    expect(buildPublicStaff(staff)).toEqual([
      { staffId: "ST001", name: "鈴木", displayOrder: 1 },
      { staffId: "ST002", name: "佐藤", displayOrder: 2 },
    ]);
  });

  it("never includes CalendarID/Active fields", () => {
    const result = buildPublicStaff(staff);
    for (const member of result) {
      expect(member).not.toHaveProperty("CalendarID");
      expect(member).not.toHaveProperty("Active");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest PublicCatalog -v`
Expected: FAIL — `Cannot find module '../src/PublicCatalog'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/salon-portfolio/gas/src/models/Catalog.ts
/**
 * Public-safe SERVICES/STAFF projections (Phase 5) — the fields a
 * customer-facing reservation UI may see. Mirrors the `PublicConfig`
 * pattern (`models/Config.ts`): excludes `Active` (only active rows are
 * ever included in the first place), `CalendarID` (internal routing,
 * never exposed), and `StaffRequired` (unused by any business rule yet —
 * not invented behavior for this phase to introduce).
 */
export interface PublicService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
}
```

```typescript
// apps/salon-portfolio/gas/src/PublicCatalog.ts
import { ServiceRow, StaffRow } from "./SheetSchemas";
import { PublicService, PublicStaff } from "./models/Catalog";

/** Strips internal-only fields and orders by DisplayOrder before a
 *  catalog is ever sent to the frontend (Phase 5, mirrors
 *  `PublicConfig.ts::buildPublicConfig`). Only active rows are included —
 *  an inactive service/staff member is not currently bookable and must
 *  never appear in a customer-facing picker. */
export function buildPublicServices(services: ServiceRow[]): PublicService[] {
  return services
    .filter((service) => service.Active)
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map((service) => ({
      serviceId: service.ServiceID,
      name: service.Name,
      durationMinutes: service.DurationMinutes,
      price: service.Price,
      displayOrder: service.DisplayOrder,
    }));
}

export function buildPublicStaff(staff: StaffRow[]): PublicStaff[] {
  return staff
    .filter((member) => member.Active)
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map((member) => ({
      staffId: member.StaffID,
      name: member.Name,
      displayOrder: member.DisplayOrder,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest PublicCatalog -v`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit** (only if the user has authorized committing — see
  Global Constraints in the project's evidence-reporting rules; otherwise
  leave staged/unstaged for the final review).

---

### Task 2: `getServices`/`getStaff` public actions

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Api.ts`
- Test: `apps/salon-portfolio/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: `buildPublicServices`/`buildPublicStaff` (Task 1), existing `getServiceRows`/`getStaffRows` (`./Catalog`), existing `getConfig`/`ConfigError` (`./ConfigStore`), existing `ERROR_CODES`.
- Produces: `export function getServicesAction(): ApiResponse<PublicService[]>`, `export function getStaffAction(): ApiResponse<PublicStaff[]>`; both routed in `handleApiRequest`'s switch under `"getServices"`/`"getStaff"`.

- [ ] **Step 1: Write the failing tests** — append to `apps/salon-portfolio/gas/tests/Api.test.ts` (add `import { buildPublicServices, buildPublicStaff } from "../src/PublicCatalog";` is not needed in the test; import the new actions from `../src/Api` in the existing top import list instead):

```typescript
// add to the existing `import { ... } from "../src/Api";` block:
//   getServicesAction, getStaffAction, getAvailabilityAction

describe("getServicesAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getServiceRows as jest.Mock).mockReset();
  });

  it("returns the public projection of active services, sorted", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue([
      { ServiceID: "SV002", Name: "ジェルネイル", DurationMinutes: 90, Price: 8800, Active: true, StaffRequired: false, DisplayOrder: 2 },
      { ServiceID: "SV001", Name: "まつげパーマ", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
    ] as ServiceRow[]);

    const response = getServicesAction();

    expect(response).toEqual({
      ok: true,
      data: [
        { serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 },
        { serviceId: "SV002", name: "ジェルネイル", durationMinutes: 90, price: 8800, displayOrder: 2 },
      ],
    });
  });

  it("returns FEATURE_DISABLED when features.reservation is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: false, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);

    const response = getServicesAction();

    expect(response).toEqual({
      ok: false,
      error: { code: "FEATURE_DISABLED", message: "現在ご予約の受付を停止しています。" },
    });
    expect(Catalog.getServiceRows).not.toHaveBeenCalled();
  });

  it("maps a MissingHeadersError from getServiceRows to SHEET_ERROR", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getServiceRows as jest.Mock).mockImplementation(() => {
      throw new MissingHeadersError(["ServiceID"]);
    });

    const response = getServicesAction();

    expect(response).toEqual({
      ok: false,
      error: { code: "SHEET_ERROR", message: "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。" },
    });
  });
});

describe("getStaffAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getStaffRows as jest.Mock).mockReset();
  });

  it("returns the public projection of active staff, sorted", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([
      { StaffID: "ST001", Name: "鈴木", Active: true, DisplayOrder: 1 },
    ] as StaffRow[]);

    const response = getStaffAction();

    expect(response).toEqual({ ok: true, data: [{ staffId: "ST001", name: "鈴木", displayOrder: 1 }] });
  });

  it("returns an empty list without reading the STAFF sheet when staffSelection is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: false, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);

    const response = getStaffAction();

    expect(response).toEqual({ ok: true, data: [] });
    expect(Catalog.getStaffRows).not.toHaveBeenCalled();
  });

  it("returns FEATURE_DISABLED when features.reservation is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: false, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);

    const response = getStaffAction();

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("FEATURE_DISABLED");
  });
});

describe("handleApiRequest routing for getServices/getStaff", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
  });

  it("routes getServices to getServicesAction", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue([]);
    const response = handleApiRequest('{"action":"getServices"}');
    expect(response).toEqual({ ok: true, data: [] });
  });

  it("routes getStaff to getStaffAction", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: false, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    const response = handleApiRequest('{"action":"getStaff"}');
    expect(response).toEqual({ ok: true, data: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Api.test.ts -v`
Expected: FAIL — `getServicesAction`/`getStaffAction` are not exported.

- [ ] **Step 3: Write minimal implementation** — in `apps/salon-portfolio/gas/src/Api.ts`:

Add to the import block:
```typescript
import { PublicService, PublicStaff } from "./models/Catalog";
import { buildPublicServices, buildPublicStaff } from "./PublicCatalog";
```

Add after `getConfigAction` (before `handleApiRequest`):
```typescript
function getServicesActionInner(): ApiResponse<PublicService[]> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  return buildSuccessResponse(buildPublicServices(getServiceRows()));
}

/** `getServices` action handler (Phase 5). Thin, same
 *  ConfigError/MissingHeadersError mapping as `getConfigAction` —
 *  read-only, never writes anything. */
export function getServicesAction(): ApiResponse<PublicService[]> {
  try {
    return getServicesActionInner();
  } catch (error) {
    if (error instanceof ConfigError) return mapConfigErrorToResponse(error);
    if (error instanceof MissingHeadersError) return mapMissingHeadersErrorToResponse(error);
    console.error("[getServices] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

function getStaffActionInner(): ApiResponse<PublicStaff[]> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  // Phase 0 §K: no staff dimension at all when the feature is off — an
  // empty list, not an error, matches ReservationRules.resolveStaffSelection's
  // own "none" (not-an-error) treatment of this same flag.
  if (!config.features.staffSelection) {
    return buildSuccessResponse([]);
  }
  return buildSuccessResponse(buildPublicStaff(getStaffRows()));
}

/** `getStaff` action handler (Phase 5). See `getServicesAction` above. */
export function getStaffAction(): ApiResponse<PublicStaff[]> {
  try {
    return getStaffActionInner();
  } catch (error) {
    if (error instanceof ConfigError) return mapConfigErrorToResponse(error);
    if (error instanceof MissingHeadersError) return mapMissingHeadersErrorToResponse(error);
    console.error("[getStaff] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}
```

Modify `handleApiRequest`'s switch:
```typescript
  switch (parsed.request.action) {
    case "getConfig":
      return getConfigAction();
    case "getServices":
      return getServicesAction();
    case "getStaff":
      return getStaffAction();
    case "createReservation":
      return createReservationAction(parsed.request.payload);
    case "getAvailability":
      return getAvailabilityAction(parsed.request.payload);
    default:
      return buildErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported action: "${parsed.request.action}".`,
      );
  }
```
(the `getAvailability` case is added now so Task 4 only needs to add the
function itself — leaving it unrouted between Task 2 and Task 4 would fail
`tsc` on a forward reference to an undefined function, so instead: add this
case in Task 4, not here. Revert this one line in this task to keep Task 2
self-contained — see Step 3 correction below.)

**Correction — keep Task 2 self-contained:** add only the `getServices`/
`getStaff` cases in this task; add the `getAvailability` case in Task 4
once `getAvailabilityAction` exists, otherwise `tsc --noEmit` fails between
tasks.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Api.test.ts -v && npx tsc --noEmit`
Expected: PASS, all Api.test.ts tests including the new ones; typecheck clean.

- [ ] **Step 5: Commit**

---

### Task 3: `evaluateAvailableSlots` composed availability query

**Files:**
- Modify: `apps/salon-portfolio/gas/src/ReservationRules.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationRules.test.ts`

**Interfaces:**
- Consumes: existing `resolveService`, `resolveStaffSelection`, `evaluateBusinessDay`, `checkDateWindow`, `generateCandidateSlots` (all in this file/`SlotEngine.ts` already), `AvailabilityStrategy` (`./availability/AvailabilityStrategy`), `StaffSelectionResolution` (`./models/ReservationDomain`).
- Produces: `export interface EvaluateAvailabilityInput { serviceId: string; staffId?: string | typeof ANY_STAFF; date: string; services: ServiceRow[]; staff: StaffRow[]; config: AppConfig; now: Date; buildStrategy: (staffSelection: StaffSelectionResolution) => AvailabilityStrategy }`, `export type EvaluateAvailabilityResult = { ok: true; slots: { time: string }[] } | { ok: false; issue: ValidationIssue }`, `export function evaluateAvailableSlots(input: EvaluateAvailabilityInput): EvaluateAvailabilityResult`.
- Note the injected `buildStrategy` takes **only** `staffSelection` (not a
  per-candidate `SlotCandidate` like `evaluateReservationRequest`'s
  `availabilityFor`) — the caller builds one strategy for the whole day
  from one busy-events fetch, since `AvailabilityStrategy.isAvailable`
  already takes `candidateStart`/`candidateEnd` at call time. This avoids
  Api.ts refetching Calendar busy events once per candidate slot.

- [ ] **Step 1: Write the failing test** — append to `apps/salon-portfolio/gas/tests/ReservationRules.test.ts` (reuse whatever `AppConfig`/`ServiceRow`/`StaffRow` fixtures the existing `evaluateReservationRequest` tests in that file already define; construct a fake `AvailabilityStrategy` inline):

```typescript
import { evaluateAvailableSlots } from "../src/ReservationRules";
import { AvailabilityStrategy } from "../src/availability/AvailabilityStrategy";

function fakeStrategy(unavailableTimes: string[] = []): AvailabilityStrategy {
  return {
    isAvailable(input) {
      const time = input.candidateStart.slice(11, 16);
      return unavailableTimes.includes(time)
        ? { available: false, reason: "CALENDAR_CONFLICT" }
        : { available: true };
    },
  };
}

describe("evaluateAvailableSlots", () => {
  const baseConfig: AppConfig = {
    business: { name: "Demo", phone: "", email: "", address: "" },
    hours: { monday: "10:00-19:00", tuesday: "10:00-19:00", wednesday: "closed", thursday: "10:00-19:00", friday: "10:00-19:00", saturday: "10:00-19:00", sunday: "closed" },
    holidays: ["2026-09-15"],
    features: { contactForm: true, reservation: true, staffSelection: true, calendar: true, emailNotification: true },
    staffAnyAvailableOption: true,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    calendarId: "shared@example.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo",
  };
  const services: ServiceRow[] = [
    { ServiceID: "SV001", Name: "まつげパーマ", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  ];
  const staff: StaffRow[] = [
    { StaffID: "ST001", Name: "鈴木", Active: true, DisplayOrder: 1 },
  ];
  const now = new Date("2026-09-01T00:00:00+09:00");

  it("returns every open, available slot for a bookable weekday", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001", staffId: undefined, date: "2026-09-10", // Thursday
      services, staff, config: baseConfig, now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots[0]).toEqual({ time: "10:00" });
    }
  });

  it("excludes slots the strategy reports as unavailable", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001", staffId: undefined, date: "2026-09-10",
      services, staff, config: baseConfig, now,
      buildStrategy: () => fakeStrategy(["10:00", "10:30"]),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots.map((s) => s.time)).not.toContain("10:00");
      expect(result.slots.map((s) => s.time)).not.toContain("10:30");
    }
  });

  it("returns an empty slot list (not an error) for a holiday", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001", staffId: undefined, date: "2026-09-15",
      services, staff, config: baseConfig, now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result).toEqual({ ok: true, slots: [] });
  });

  it("returns an empty slot list (not an error) for a day the salon is closed", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001", staffId: undefined, date: "2026-09-09", // Wednesday
      services, staff, config: baseConfig, now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result).toEqual({ ok: true, slots: [] });
  });

  it("returns MENU_NOT_FOUND when the service does not exist", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV999", staffId: undefined, date: "2026-09-10",
      services, staff, config: baseConfig, now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe("MENU_NOT_FOUND");
  });

  it("returns STAFF_NOT_FOUND for an unknown staffId", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001", staffId: "ST999", date: "2026-09-10",
      services, staff, config: baseConfig, now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe("STAFF_NOT_FOUND");
  });

  it("excludes slots inside the minimum lead time", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001", staffId: undefined, date: "2026-09-01", // same day as `now`, Tuesday
      services, staff, config: baseConfig, now: new Date("2026-09-01T18:45:00+09:00"),
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slots).toEqual([]); // 19:00 close, 1h lead time from 18:45 -> nothing left
  });

  it("passes the resolved staff selection to buildStrategy", () => {
    const buildStrategy = jest.fn().mockReturnValue(fakeStrategy());
    evaluateAvailableSlots({
      serviceId: "SV001", staffId: "ST001", date: "2026-09-10",
      services, staff, config: baseConfig, now,
      buildStrategy,
    });
    expect(buildStrategy).toHaveBeenCalledTimes(1);
    expect(buildStrategy).toHaveBeenCalledWith({ kind: "specific", staff: staff[0] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationRules.test.ts -v`
Expected: FAIL — `evaluateAvailableSlots` is not exported.

- [ ] **Step 3: Write minimal implementation** — append to `apps/salon-portfolio/gas/src/ReservationRules.ts`:

```typescript
export interface EvaluateAvailabilityInput {
  serviceId: string;
  staffId?: string | typeof ANY_STAFF;
  date: string;
  services: ServiceRow[];
  staff: StaffRow[];
  config: AppConfig;
  now: Date;
  /** Builds one `AvailabilityStrategy` for the whole requested date, given
   *  the already-resolved staff selection — called once per
   *  `evaluateAvailableSlots` call, not once per candidate slot (Phase 5:
   *  a day's busy-interval snapshot is fetched once and reused for every
   *  candidate's `.isAvailable()` check). */
  buildStrategy: (staffSelection: StaffSelectionResolution) => AvailabilityStrategy;
}

export type EvaluateAvailabilityResult =
  | { ok: true; slots: { time: string }[] }
  | { ok: false; issue: ValidationIssue };

/** Phase 5's read-only counterpart to `evaluateReservationRequest`: for a
 *  given service/staff/date, returns every candidate start time that is
 *  currently open + within the booking window + available — never a
 *  reservation guarantee (same advisory caveat as
 *  `evaluateReservationRequest`; `createReservation`'s own re-check under
 *  the lock remains authoritative). A closed business day/holiday is
 *  `{ ok: true, slots: [] }`, not an error — it is a normal "nothing to
 *  offer that day" outcome, distinct from a genuine client-input error
 *  (unknown service/staff). */
export function evaluateAvailableSlots(
  input: EvaluateAvailabilityInput,
): EvaluateAvailabilityResult {
  const serviceResult = resolveService(input.services, input.serviceId);
  if (!serviceResult.ok) {
    return { ok: false, issue: serviceResult.issue };
  }

  const staffResult = resolveStaffSelection(input.staff, input.staffId, input.config);
  if (!staffResult.ok) {
    return { ok: false, issue: staffResult.issue };
  }

  const businessDay = evaluateBusinessDay(input.date, input.config);
  if (!businessDay.open) {
    return { ok: true, slots: [] };
  }

  const candidates = generateCandidateSlots({
    date: input.date,
    businessHours: businessDay.interval,
    durationMinutes: serviceResult.service.DurationMinutes,
    slotIntervalMinutes: input.config.reservation.slotMinutes,
    isHoliday: false,
  });

  const strategy = input.buildStrategy(staffResult.selection);
  const slots: { time: string }[] = [];
  for (const candidate of candidates) {
    const dateWindowIssue = checkDateWindow(candidate.date, candidate.startTime, input.config.reservation, input.now);
    if (dateWindowIssue) {
      continue;
    }
    const availability = strategy.isAvailable({
      candidateStart: toTokyoLocalDateTimeString(candidate.date, candidate.startTime),
      candidateEnd: toTokyoLocalDateTimeString(candidate.date, candidate.endTime),
    });
    if (availability.available) {
      slots.push({ time: candidate.startTime });
    }
  }

  return { ok: true, slots };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest ReservationRules.test.ts -v`
Expected: PASS, all tests including the new `evaluateAvailableSlots` describe block.

- [ ] **Step 5: Commit**

---

### Task 4: `getAvailability` public action

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Api.ts`
- Test: `apps/salon-portfolio/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: `evaluateAvailableSlots` (Task 3), `resolveCalendarIdsForSelection`/`buildAvailabilityStrategyFromBusyByCalendarId` (already imported in `Api.ts`), `getBusyEvents` (already imported), `ANY_STAFF` (needs adding to the import from `./models/ReservationRequest`).
- Produces: `export interface GetAvailabilityResponseData { date: string; slots: { time: string }[] }`, `export function getAvailabilityAction(rawPayload: unknown): ApiResponse<GetAvailabilityResponseData>`; routed as `"getAvailability"` in `handleApiRequest`.

- [ ] **Step 1: Write the failing tests** — append to `apps/salon-portfolio/gas/tests/Api.test.ts`:

```typescript
describe("getAvailabilityAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getServiceRows as jest.Mock).mockReset();
    (Calendar.getBusyEvents as jest.Mock).mockReset();
  });

  const config: AppConfig = {
    business: { name: "Demo", phone: "", email: "", address: "" },
    hours: { monday: "10:00-19:00", tuesday: "10:00-19:00", wednesday: "10:00-19:00", thursday: "10:00-19:00", friday: "10:00-19:00", saturday: "10:00-19:00", sunday: "closed" },
    holidays: [],
    features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
    staffAnyAvailableOption: false,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    calendarId: "shared@example.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo",
  };
  const services: ServiceRow[] = [
    { ServiceID: "SV001", Name: "まつげパーマ", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  ];

  it("returns available slots for a valid request, fetching busy events once", () => {
    (getConfig as jest.Mock).mockReturnValue(config);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(services);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);

    const response = getAvailabilityAction({ serviceId: "SV001", date: "2026-09-10" });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.date).toBe("2026-09-10");
      expect(response.data.slots.length).toBeGreaterThan(0);
    }
    expect(Calendar.getBusyEvents).toHaveBeenCalledTimes(1);
  });

  it("returns FEATURE_DISABLED when reservation is off", () => {
    (getConfig as jest.Mock).mockReturnValue({ ...config, features: { ...config.features, reservation: false } });

    const response = getAvailabilityAction({ serviceId: "SV001", date: "2026-09-10" });

    expect(response).toEqual({ ok: false, error: { code: "FEATURE_DISABLED", message: "現在ご予約の受付を停止しています。" } });
  });

  it("returns VALIDATION_ERROR for a malformed payload", () => {
    (getConfig as jest.Mock).mockReturnValue(config);

    expect(getAvailabilityAction(null).ok).toBe(false);
    expect(getAvailabilityAction({ serviceId: 123, date: "2026-09-10" }).ok).toBe(false);
    expect(getAvailabilityAction({ serviceId: "SV001" }).ok).toBe(false);
  });

  it("maps an unknown serviceId to a VALIDATION_ERROR-coded response", () => {
    (getConfig as jest.Mock).mockReturnValue(config);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(services);

    const response = getAvailabilityAction({ serviceId: "SV999", date: "2026-09-10" });

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("VALIDATION_ERROR");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest Api.test.ts -v`
Expected: FAIL — `getAvailabilityAction` is not exported.

- [ ] **Step 3: Write minimal implementation** — in `apps/salon-portfolio/gas/src/Api.ts`:

Add to imports: `import { evaluateAvailableSlots } from "./ReservationRules";` alongside the existing `evaluateReservationRequest` import (same line), and `import { ANY_STAFF } from "./models/ReservationRequest";` (new import — `ReservationRequest.ts` already exports it).

Add after `buildAvailabilityFor` (existing private helper), a new private helper — separate from `buildAvailabilityFor` because this one is keyed by date only (no per-candidate call), so it fetches busy events exactly once per request instead of once per candidate slot:

```typescript
function buildAvailabilityForDate(fallbackCalendarId: string, date: string) {
  return (staffSelection: StaffSelectionResolution): AvailabilityStrategy => {
    const calendarIds = [...new Set(resolveCalendarIdsForSelection(staffSelection, fallbackCalendarId))];
    const { start, end } = tokyoCalendarDayRange(date);
    const busyByCalendarId: Record<string, BusyInterval[]> = {};
    for (const calendarId of calendarIds) {
      busyByCalendarId[calendarId] = getBusyEvents(calendarId, start, end);
    }
    return buildAvailabilityStrategyFromBusyByCalendarId(staffSelection, fallbackCalendarId, busyByCalendarId);
  };
}

export interface GetAvailabilityResponseData {
  date: string;
  slots: { time: string }[];
}

function getAvailabilityActionInner(rawPayload: unknown): ApiResponse<GetAvailabilityResponseData> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  if (!rawPayload || typeof rawPayload !== "object") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }
  const payload = rawPayload as { serviceId?: unknown; staffId?: unknown; date?: unknown };
  if (typeof payload.serviceId !== "string" || typeof payload.date !== "string") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }
  const staffId = typeof payload.staffId === "string" ? (payload.staffId as string | typeof ANY_STAFF) : undefined;

  const services = getServiceRows();
  const staff = config.features.staffSelection ? getStaffRows() : [];

  const evaluation = evaluateAvailableSlots({
    serviceId: payload.serviceId,
    staffId,
    date: payload.date,
    services,
    staff,
    config,
    now: new Date(),
    buildStrategy: buildAvailabilityForDate(config.calendarId, payload.date),
  });
  if (!evaluation.ok) {
    const { code, message } = mapReservationIssueToErrorResponse(evaluation.issue);
    return buildErrorResponse(code, message);
  }

  return buildSuccessResponse({ date: payload.date, slots: evaluation.slots });
}

/** `getAvailability` action handler (Phase 5) — read-only, advisory
 *  (spec Principle 2: never a reservation guarantee). Reuses
 *  `evaluateAvailableSlots` (ReservationRules.ts) and the same
 *  `availability/` factory `createReservation` uses; touches Calendar
 *  exactly once per request (one `getBusyEvents` call per distinct
 *  calendar id needed for the resolved staff selection), not once per
 *  candidate slot. */
export function getAvailabilityAction(rawPayload: unknown): ApiResponse<GetAvailabilityResponseData> {
  try {
    return getAvailabilityActionInner(rawPayload);
  } catch (error) {
    if (error instanceof ConfigError) return mapConfigErrorToResponse(error);
    if (error instanceof MissingHeadersError) return mapMissingHeadersErrorToResponse(error);
    console.error("[getAvailability] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}
```

Now add the dispatcher case (deferred from Task 2):
```typescript
    case "getAvailability":
      return getAvailabilityAction(parsed.request.payload);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest Api.test.ts -v && npx tsc --noEmit`
Expected: PASS, all Api.test.ts tests; typecheck clean.

- [ ] **Step 5: Run the full GAS suite**

Run: `cd apps/salon-portfolio/gas && npm test`
Expected: PASS, 231 + (new tests from Tasks 1-4) = 231 + ~24, all green,
zero regressions in existing suites (especially `Api.test.ts`'s
`createReservationAction` describe blocks — untouched).

- [ ] **Step 6: Commit**

---

## Part B — Web frontend (`apps/salon-portfolio/web`)

### Task 5: Extend `types/reservation.ts`

**Files:**
- Modify: `apps/salon-portfolio/web/types/reservation.ts`

**Interfaces:**
- Produces: `ApiFailure { code: string; message: string }`, `ApiActionResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure }`, `PublicService { serviceId: string; name: string; durationMinutes: number; price: number; displayOrder: number }`, `PublicStaff { staffId: string; name: string; displayOrder: number }`, `AvailableTimeSlot { time: string }`, `GetAvailabilityResult { date: string; slots: AvailableTimeSlot[] }`, `AvailabilityRequest { serviceId: string; staffId?: string | typeof ANY_STAFF; date: string }`.
- No test file — this is a pure type-only addition (no runtime logic);
  correctness is enforced by `tsc --noEmit` and by Task 6/9's tests
  importing these types.

- [ ] **Step 1: Add types** — append to `apps/salon-portfolio/web/types/reservation.ts`:

```typescript
/**
 * Phase 5 additions — public catalog/availability projections, mirroring
 * `gas/src/models/Catalog.ts` (`PublicService`/`PublicStaff`) and the
 * `GetAvailabilityResponseData` shape `Api.ts::getAvailabilityAction`
 * returns. Same "separate frontend mirror" convention as
 * `ReservationSubmission` above.
 */

export interface ApiFailure {
  code: string;
  message: string;
}

export type ApiActionResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export interface PublicService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
}

export interface AvailableTimeSlot {
  time: string;
}

export interface GetAvailabilityResult {
  date: string;
  slots: AvailableTimeSlot[];
}

export interface AvailabilityRequest {
  serviceId: string;
  staffId?: string | typeof ANY_STAFF;
  date: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/salon-portfolio/web && npm run typecheck`
Expected: PASS (no consumers yet, purely additive).

- [ ] **Step 3: Commit**

---

### Task 6: Extend `reservationClient.ts` with `getServices`/`getStaff`/`getAvailability`

**Files:**
- Modify: `apps/salon-portfolio/web/lib/api/reservationClient.ts`
- Modify: `apps/salon-portfolio/web/lib/api/reservationClient.test.ts`

**Interfaces:**
- Consumes: `ApiActionResult`, `PublicService`, `PublicStaff`, `AvailabilityRequest`, `GetAvailabilityResult` (Task 5), existing `ReservationSubmission`/`ReservationSubmissionResult`.
- Produces: `export async function getServices(): Promise<ApiActionResult<PublicService[]>>`, `export async function getStaff(): Promise<ApiActionResult<PublicStaff[]>>`, `export async function getAvailability(request: AvailabilityRequest): Promise<ApiActionResult<GetAvailabilityResult>>`; `submitReservation`'s existing exported signature and behavior are unchanged (internal-only refactor to share fetch/parse logic via a new private `callAction` helper).

- [ ] **Step 1: Write the failing tests** — append to `apps/salon-portfolio/web/lib/api/reservationClient.test.ts`:

```typescript
import { getServices, getStaff, getAvailability } from "./reservationClient";

describe("getServices", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the getServices action with no payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [{ serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getServices();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "getServices" }) }),
    );
    expect(result).toEqual({ ok: true, data: [{ serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 }] });
  });

  it("returns a controlled NETWORK_ERROR when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const result = await getServices();
    expect(result).toEqual({ ok: false, error: { code: "NETWORK_ERROR", message: expect.any(String) } });
  });
});

describe("getStaff", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the getStaff action", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getStaff();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "getStaff" }) }),
    );
    expect(result).toEqual({ ok: true, data: [] });
  });
});

describe("getAvailability", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the getAvailability action with the request as payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }] } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = { serviceId: "SV001", date: "2026-09-10" };
    const result = await getAvailability(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "getAvailability", payload: request }) }),
    );
    expect(result).toEqual({ ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }] } });
  });

  it("forwards a GAS-originated failure envelope unchanged", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "VALIDATION_ERROR", message: "選択されたメニューが見つかりません。" } }),
    }) as unknown as typeof fetch;
    const result = await getAvailability({ serviceId: "SV999", date: "2026-09-10" });
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: "選択されたメニューが見つかりません。" } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest reservationClient -v`
Expected: FAIL — `getServices`/`getStaff`/`getAvailability` not exported.

- [ ] **Step 3: Write minimal implementation** — replace the body of `apps/salon-portfolio/web/lib/api/reservationClient.ts` with:

```typescript
import {
  ApiActionResult,
  AvailabilityRequest,
  GetAvailabilityResult,
  PublicService,
  PublicStaff,
  ReservationSubmission,
  ReservationSubmissionResult,
} from "@/types/reservation";

/**
 * Client-safe wrapper for every browser-initiated GAS action this
 * reservation flow needs, through the existing `/api/gas` proxy — this
 * file may be imported from a Client Component; it never touches
 * `GAS_WEBAPP_URL` directly (that stays inside the server-only
 * `lib/api/gasClient.ts`, reached only via the Next.js route handler).
 * `callAction` is the one shared "POST an action, parse the envelope"
 * primitive every exported function below builds on — added in Phase 5
 * alongside `getServices`/`getStaff`/`getAvailability`; `submitReservation`
 * (Phase 4) is reimplemented on top of it with an unchanged external
 * signature and JSON body.
 */
async function callAction<T>(action: string, payload?: unknown): Promise<ApiActionResult<T>> {
  let response: Response;
  try {
    response = await fetch("/api/gas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload === undefined ? JSON.stringify({ action }) : JSON.stringify({ action, payload }),
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

  return parsed as ApiActionResult<T>;
}

/** Building an actual reservation form/wizard UI around this function was
 *  out of scope for Phase 4 — Phase 5 is exactly that UI. */
export async function submitReservation(
  submission: ReservationSubmission,
): Promise<ReservationSubmissionResult> {
  return callAction<ReservationSubmissionResult extends { ok: true; data: infer D } ? D : never>(
    "createReservation",
    submission,
  ) as Promise<ReservationSubmissionResult>;
}

/** Public menu/service catalog for the reservation picker (Phase 5) — only
 *  active services, no price/duration override accepted from the browser
 *  on submit (Api.ts's `createReservation` always re-resolves these
 *  server-side regardless of what this call returned). */
export async function getServices(): Promise<ApiActionResult<PublicService[]>> {
  return callAction<PublicService[]>("getServices");
}

/** Public staff catalog for the reservation picker (Phase 5). Empty when
 *  `features.staffSelection` is off — not an error. */
export async function getStaff(): Promise<ApiActionResult<PublicStaff[]>> {
  return callAction<PublicStaff[]>("getStaff");
}

/** Advisory availability for one service/staff/date (Phase 5) — UX only.
 *  `createReservation`'s own re-check under `LockService` remains the only
 *  authoritative check; a slot listed here can still be lost to a race. */
export async function getAvailability(
  request: AvailabilityRequest,
): Promise<ApiActionResult<GetAvailabilityResult>> {
  return callAction<GetAvailabilityResult>("getAvailability", request);
}
```

(The `ReservationSubmissionResult extends { ok: true; data: infer D } ? D : never`
conditional type keeps `submitReservation`'s call to `callAction<T>` typed
without duplicating `ReservationSubmissionSuccess`'s name inline — if this
reads awkwardly during implementation, inline `ReservationSubmissionSuccess`
directly instead; either compiles identically since the two types are
structurally identical, verified in Task 5.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest reservationClient -v`
Expected: PASS — the 4 pre-existing `submitReservation` tests (unchanged
assertions) plus the new `getServices`/`getStaff`/`getAvailability` tests,
all green. This is the regression check that the `callAction` refactor
produced byte-identical request bodies for `submitReservation`.

- [ ] **Step 5: Typecheck**

Run: `cd apps/salon-portfolio/web && npm run typecheck`

- [ ] **Step 6: Commit**

---

### Task 7: `generateSubmissionId` utility

**Files:**
- Create: `apps/salon-portfolio/web/lib/utils/id.ts`
- Create: `apps/salon-portfolio/web/lib/utils/id.test.ts`

**Interfaces:**
- Produces: `export function generateSubmissionId(): string`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/salon-portfolio/web/lib/utils/id.test.ts
import { generateSubmissionId } from "./id";

describe("generateSubmissionId", () => {
  it("returns a non-empty string", () => {
    expect(generateSubmissionId().length).toBeGreaterThan(0);
  });

  it("returns a different value on each call", () => {
    const a = generateSubmissionId();
    const b = generateSubmissionId();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/utils/id -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/salon-portfolio/web/lib/utils/id.ts
/**
 * Client-generated idempotency key for `ReservationSubmission.submissionId`
 * (Phase 4 contract — any non-empty string, reused across retries of the
 * same submission; `gas/src/Validation.ts` does not enforce a UUID format).
 * Prefers `crypto.randomUUID()`; falls back to a timestamp+random string
 * where it's unavailable (older browsers, some test environments) so this
 * never throws.
 */
export function generateSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/utils/id -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 8: `useReservationWizard` state hook

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/useReservationWizard.ts`
- Create: `apps/salon-portfolio/web/components/reservation/useReservationWizard.test.ts`

**Interfaces:**
- Consumes: `getServices`, `getStaff`, `getAvailability`, `submitReservation` (Task 6), `generateSubmissionId` (Task 7), `PublicService`, `PublicStaff`, `AvailableTimeSlot`, `ReservationSubmissionSuccess`, `ANY_STAFF` (`@/types/reservation`).
- Produces the hook's return shape (this is the contract every step
  component in Tasks 9-15 and `ReservationWizard.tsx` in Task 16 is written
  against — do not rename any of these fields):

```typescript
export type WizardStep = "service" | "staff" | "datetime" | "customer" | "review";

export interface CustomerFields {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface ReservationWizardState {
  // catalog
  catalogStatus: "loading" | "ready" | "error";
  catalogError: string | null;
  services: PublicService[];
  staff: PublicStaff[];
  staffSelectionEnabled: boolean;
  anyStaffOptionEnabled: boolean;

  // step/navigation
  steps: WizardStep[]; // computed once catalog loads, depends on staffSelectionEnabled
  currentStep: WizardStep;

  // selections
  selectedServiceId: string | null;
  selectedStaffId: string | typeof ANY_STAFF | null;
  selectedDate: string | null; // "YYYY-MM-DD"
  selectedTime: string | null; // "HH:mm"
  customer: CustomerFields;

  // availability
  availabilityStatus: "idle" | "loading" | "ready" | "error";
  availabilityError: string | null;
  availableSlots: AvailableTimeSlot[];

  // submission
  submitStatus: "idle" | "submitting" | "success" | "error";
  submitError: string | null;
  submitResult: ReservationSubmissionSuccess | null;

  // actions
  retryCatalog: () => void;
  selectService: (serviceId: string) => void;
  selectStaff: (staffId: string | typeof ANY_STAFF) => void;
  selectDate: (date: string) => void;
  selectTime: (time: string) => void;
  retryAvailability: () => void;
  setCustomerField: (field: keyof CustomerFields, value: string) => void;
  goToStep: (step: WizardStep) => void; // only allows navigating to a step whose prerequisites are already filled, or backward
  goBack: () => void;
  goNext: () => void; // validates the current step's required fields before advancing
  submit: () => Promise<void>;
  resetAfterError: () => void; // clears submitStatus/submitError back to idle without losing selections, for "choose another time" style retries
}

export function useReservationWizard(config: {
  minDate: string; // "YYYY-MM-DD", derived by the caller from config.reservation.minLeadHours
  maxDate: string; // "YYYY-MM-DD", derived by the caller from config.reservation.maxBookingDays
}): ReservationWizardState;
```

- [ ] **Step 1: Write the failing tests** — this is the highest-value test
  file in the whole plan; it covers most of spec §30's "Reservation form" /
  "Dependency reset" / "Submission" scenarios without needing a rendered
  DOM. Use `renderHook`/`act`/`waitFor` from `@testing-library/react`
  (already a devDependency), and `jest.mock("@/lib/api/reservationClient")`.

```typescript
// apps/salon-portfolio/web/components/reservation/useReservationWizard.test.ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReservationWizard } from "./useReservationWizard";
import * as reservationClient from "@/lib/api/reservationClient";
import { ANY_STAFF } from "@/types/reservation";

jest.mock("@/lib/api/reservationClient");

const services = [{ serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 }];
const staff = [{ staffId: "ST001", name: "鈴木", displayOrder: 1 }];

function mockCatalog(overrides: Partial<{ servicesOk: boolean; staffOk: boolean; staffList: typeof staff }> = {}) {
  (reservationClient.getServices as jest.Mock).mockResolvedValue(
    overrides.servicesOk === false
      ? { ok: false, error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" } }
      : { ok: true, data: services },
  );
  (reservationClient.getStaff as jest.Mock).mockResolvedValue(
    overrides.staffOk === false
      ? { ok: false, error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" } }
      : { ok: true, data: overrides.staffList ?? staff },
  );
}

const wizardConfig = { minDate: "2026-09-02", maxDate: "2026-11-01" };

describe("useReservationWizard — catalog loading", () => {
  afterEach(() => jest.restoreAllMocks());

  it("starts in a loading state and resolves to ready with services+staff", async () => {
    mockCatalog();
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    expect(result.current.catalogStatus).toBe("loading");
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    expect(result.current.services).toEqual(services);
    expect(result.current.staff).toEqual(staff);
    expect(result.current.staffSelectionEnabled).toBe(true);
    expect(result.current.steps).toEqual(["service", "staff", "datetime", "customer", "review"]);
  });

  it("omits the staff step when getStaff returns an empty list", async () => {
    mockCatalog({ staffList: [] });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    expect(result.current.staffSelectionEnabled).toBe(false);
    expect(result.current.steps).toEqual(["service", "datetime", "customer", "review"]);
  });

  it("enters an error state when getServices fails, and retryCatalog re-fetches", async () => {
    mockCatalog({ servicesOk: false });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("error"));
    expect(result.current.catalogError).toBe("サーバーエラーが発生しました。");

    mockCatalog();
    act(() => result.current.retryCatalog());
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
  });

  it("enters an error state when getStaff fails", async () => {
    mockCatalog({ staffOk: false });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("error"));
  });
});

describe("useReservationWizard — selection and dependency resets", () => {
  beforeEach(() => {
    mockCatalog();
    (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
      ok: true,
      data: { date: "2026-09-10", slots: [{ time: "10:00" }, { time: "10:30" }] },
    });
  });
  afterEach(() => jest.restoreAllMocks());

  async function readyHook() {
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    return result;
  }

  it("selecting a service sets selectedServiceId and clears any selected time", async () => {
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    expect(result.current.selectedServiceId).toBe("SV001");
    expect(result.current.selectedTime).toBeNull();
  });

  it("selecting staff sets selectedStaffId (including ANY_STAFF) and clears selected time", async () => {
    const result = await readyHook();
    act(() => {
      result.current.selectService("SV001");
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));
    expect(result.current.selectedTime).toBe("10:00");

    act(() => result.current.selectStaff(ANY_STAFF));
    expect(result.current.selectedStaffId).toBe(ANY_STAFF);
    expect(result.current.selectedTime).toBeNull();
  });

  it("selecting a date clears selected time and loads availability", async () => {
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    act(() => result.current.selectDate("2026-09-10"));
    expect(result.current.availabilityStatus).toBe("loading");
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    expect(result.current.availableSlots).toEqual([{ time: "10:00" }, { time: "10:30" }]);
  });

  it("changing the date after a time was already selected clears that time and reloads", async () => {
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    act(() => result.current.selectDate("2026-09-10"));
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));

    act(() => result.current.selectDate("2026-09-11"));
    expect(result.current.selectedTime).toBeNull();
    expect(result.current.availabilityStatus).toBe("loading");
  });

  it("shows an availability error and supports retry", async () => {
    (reservationClient.getAvailability as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" },
    });
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    act(() => result.current.selectDate("2026-09-10"));
    await waitFor(() => expect(result.current.availabilityStatus).toBe("error"));

    act(() => result.current.retryAvailability());
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
  });
});

describe("useReservationWizard — submission", () => {
  beforeEach(() => {
    mockCatalog();
    (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
      ok: true,
      data: { date: "2026-09-10", slots: [{ time: "10:00" }] },
    });
  });
  afterEach(() => jest.restoreAllMocks());

  async function filledHook() {
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    act(() => {
      result.current.selectService("SV001");
      result.current.selectStaff(ANY_STAFF);
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => {
      result.current.selectTime("10:00");
      result.current.setCustomerField("name", "山田太郎");
      result.current.setCustomerField("email", "yamada@example.com");
    });
    return result;
  }

  it("submits with a generated submissionId and reflects success", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-20260910-X8K2MP" },
    });
    const result = await filledHook();

    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
    const call = (reservationClient.submitReservation as jest.Mock).mock.calls[0][0];
    expect(typeof call.submissionId).toBe("string");
    expect(call.submissionId.length).toBeGreaterThan(0);
    expect(call).toMatchObject({ serviceId: "SV001", staffId: ANY_STAFF, date: "2026-09-10", time: "10:00", name: "山田太郎", email: "yamada@example.com" });
    expect(result.current.submitStatus).toBe("success");
    expect(result.current.submitResult).toEqual({ reservationId: "RES-20260910-X8K2MP" });
  });

  it("reuses the same submissionId across a retried submit after a transient failure", async () => {
    (reservationClient.submitReservation as jest.Mock)
      .mockResolvedValueOnce({ ok: false, error: { code: "SYSTEM_BUSY", message: "只今混み合っております。少々時間をおいて再度お試しください。" } })
      .mockResolvedValueOnce({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } });
    const result = await filledHook();

    await act(async () => result.current.submit());
    expect(result.current.submitStatus).toBe("error");
    const firstId = (reservationClient.submitReservation as jest.Mock).mock.calls[0][0].submissionId;

    await act(async () => result.current.submit());
    const secondId = (reservationClient.submitReservation as jest.Mock).mock.calls[1][0].submissionId;
    expect(secondId).toBe(firstId);
    expect(result.current.submitStatus).toBe("success");
  });

  it("generates a new submissionId once the customer changes the selected time after a failure", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    const result = await filledHook();
    await act(async () => result.current.submit());
    const firstId = (reservationClient.submitReservation as jest.Mock).mock.calls[0][0].submissionId;

    act(() => result.current.selectTime("10:00")); // re-select (simulates picking a different, still-mocked-available time)
    (reservationClient.submitReservation as jest.Mock).mockResolvedValueOnce({ ok: true, data: { reservationId: "RES-X" } });
    await act(async () => result.current.submit());
    const secondId = (reservationClient.submitReservation as jest.Mock).mock.calls[1][0].submissionId;
    expect(secondId).not.toBe(firstId);
  });

  it("ignores a second concurrent submit call while one is already in flight", async () => {
    let resolveSubmit!: (value: unknown) => void;
    (reservationClient.submitReservation as jest.Mock).mockReturnValue(
      new Promise((resolve) => { resolveSubmit = resolve; }),
    );
    const result = await filledHook();

    let firstCall: Promise<void>;
    act(() => {
      firstCall = result.current.submit();
      result.current.submit(); // second call while first is still pending
    });
    expect(result.current.submitStatus).toBe("submitting");
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ ok: true, data: { reservationId: "RES-X" } });
      await firstCall!;
    });
  });

  it("surfaces the backend's own sanitized error message verbatim on failure", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    const result = await filledHook();
    await act(async () => result.current.submit());
    expect(result.current.submitError).toBe("選択された時間帯はご利用いただけません。");
  });

  it("resetAfterError returns submitStatus to idle without clearing selections", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    const result = await filledHook();
    await act(async () => result.current.submit());
    act(() => result.current.resetAfterError());
    expect(result.current.submitStatus).toBe("idle");
    expect(result.current.selectedServiceId).toBe("SV001");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest useReservationWizard -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/salon-portfolio/web/components/reservation/useReservationWizard.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvailability, getServices, getStaff, submitReservation } from "@/lib/api/reservationClient";
import { generateSubmissionId } from "@/lib/utils/id";
import { ANY_STAFF, AvailableTimeSlot, PublicService, PublicStaff, ReservationSubmissionSuccess } from "@/types/reservation";

export type WizardStep = "service" | "staff" | "datetime" | "customer" | "review";

export interface CustomerFields {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const EMPTY_CUSTOMER: CustomerFields = { name: "", email: "", phone: "", notes: "" };

export interface ReservationWizardState {
  catalogStatus: "loading" | "ready" | "error";
  catalogError: string | null;
  services: PublicService[];
  staff: PublicStaff[];
  staffSelectionEnabled: boolean;
  anyStaffOptionEnabled: boolean;

  steps: WizardStep[];
  currentStep: WizardStep;

  selectedServiceId: string | null;
  selectedStaffId: string | typeof ANY_STAFF | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customer: CustomerFields;

  availabilityStatus: "idle" | "loading" | "ready" | "error";
  availabilityError: string | null;
  availableSlots: AvailableTimeSlot[];

  submitStatus: "idle" | "submitting" | "success" | "error";
  submitError: string | null;
  submitResult: ReservationSubmissionSuccess | null;

  retryCatalog: () => void;
  selectService: (serviceId: string) => void;
  selectStaff: (staffId: string | typeof ANY_STAFF) => void;
  selectDate: (date: string) => void;
  selectTime: (time: string) => void;
  retryAvailability: () => void;
  setCustomerField: (field: keyof CustomerFields, value: string) => void;
  goToStep: (step: WizardStep) => void;
  goBack: () => void;
  goNext: () => void;
  submit: () => Promise<void>;
  resetAfterError: () => void;
}

export interface UseReservationWizardConfig {
  /** "YYYY-MM-DD" — earliest selectable date, already derived by the
   *  caller from `reservation.minLeadHours` (advisory only; the backend
   *  re-validates on both `getAvailability` and `createReservation`). */
  minDate: string;
  /** "YYYY-MM-DD" — latest selectable date, derived from
   *  `reservation.maxBookingDays`. */
  maxDate: string;
}

/**
 * All reservation wizard state in one hook (Phase 5) — plain React state,
 * no external state library (spec §23). Every network call goes through
 * `lib/api/reservationClient.ts`; this hook never talks to `/api/gas`
 * directly and never re-implements business-hours/holiday/availability
 * rules — it only orchestrates calls to the existing public actions and
 * tracks UI state around them.
 */
export function useReservationWizard(config: UseReservationWizardConfig): ReservationWizardState {
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | typeof ANY_STAFF | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerFields>(EMPTY_CUSTOMER);
  const [currentStep, setCurrentStep] = useState<WizardStep>("service");

  const [availabilityStatus, setAvailabilityStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([]);
  const [availabilityReloadToken, setAvailabilityReloadToken] = useState(0);

  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ReservationSubmissionSuccess | null>(null);

  const submissionIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const staffSelectionEnabled = staff.length > 0;
  const anyStaffOptionEnabled = staffSelectionEnabled; // getStaff already returns [] when the feature is off; ANY_STAFF is offered whenever any real staff exists (config.staffAnyAvailableOption is enforced server-side by resolveStaffSelection/getAvailabilityAction/createReservation — this UI only shows the option when there is anyone to be "any" of).

  const steps = useMemo<WizardStep[]>(
    () => (staffSelectionEnabled ? ["service", "staff", "datetime", "customer", "review"] : ["service", "datetime", "customer", "review"]),
    [staffSelectionEnabled],
  );

  // Catalog load (+ retry).
  useEffect(() => {
    let cancelled = false;
    setCatalogStatus("loading");
    setCatalogError(null);
    (async () => {
      const [servicesResult, staffResult] = await Promise.all([getServices(), getStaff()]);
      if (cancelled) return;
      if (!servicesResult.ok) {
        setCatalogStatus("error");
        setCatalogError(servicesResult.error.message);
        return;
      }
      if (!staffResult.ok) {
        setCatalogStatus("error");
        setCatalogError(staffResult.error.message);
        return;
      }
      setServices(servicesResult.data);
      setStaff(staffResult.data);
      setCatalogStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken]);

  // Availability load whenever service/staff/date are all chosen (or date
  // changes) — cleared and reloaded per spec §12, never left stale.
  useEffect(() => {
    if (!selectedServiceId || !selectedDate) {
      setAvailabilityStatus("idle");
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    setAvailabilityStatus("loading");
    setAvailabilityError(null);
    (async () => {
      const result = await getAvailability({
        serviceId: selectedServiceId,
        staffId: selectedStaffId ?? undefined,
        date: selectedDate,
      });
      if (cancelled) return;
      if (!result.ok) {
        setAvailabilityStatus("error");
        setAvailabilityError(result.error.message);
        return;
      }
      setAvailableSlots(result.data.slots);
      setAvailabilityStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- availabilityReloadToken is a deliberate manual-retry trigger, not a data dependency
  }, [selectedServiceId, selectedStaffId, selectedDate, availabilityReloadToken]);

  const retryCatalog = useCallback(() => setCatalogReloadToken((n) => n + 1), []);
  const retryAvailability = useCallback(() => setAvailabilityReloadToken((n) => n + 1), []);

  const clearSelectedTimeAndSubmissionId = useCallback(() => {
    setSelectedTime(null);
    submissionIdRef.current = null;
  }, []);

  const selectService = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      clearSelectedTimeAndSubmissionId();
    },
    [clearSelectedTimeAndSubmissionId],
  );

  const selectStaff = useCallback(
    (staffId: string | typeof ANY_STAFF) => {
      setSelectedStaffId(staffId);
      clearSelectedTimeAndSubmissionId();
    },
    [clearSelectedTimeAndSubmissionId],
  );

  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      clearSelectedTimeAndSubmissionId();
    },
    [clearSelectedTimeAndSubmissionId],
  );

  const selectTime = useCallback((time: string) => {
    setSelectedTime(time);
    submissionIdRef.current = null; // a (re-)selected time always represents a fresh attempt
  }, []);

  const setCustomerField = useCallback((field: keyof CustomerFields, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => setCurrentStep(step), []);
  const goBack = useCallback(() => {
    setCurrentStep((step) => {
      const index = steps.indexOf(step);
      return index > 0 ? steps[index - 1] : step;
    });
  }, [steps]);
  const goNext = useCallback(() => {
    setCurrentStep((step) => {
      const index = steps.indexOf(step);
      return index >= 0 && index < steps.length - 1 ? steps[index + 1] : step;
    });
  }, [steps]);

  const resetAfterError = useCallback(() => {
    setSubmitStatus("idle");
    setSubmitError(null);
  }, []);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!selectedServiceId || !selectedDate || !selectedTime) return;
    submittingRef.current = true;
    setSubmitStatus("submitting");
    setSubmitError(null);
    try {
      const submissionId = submissionIdRef.current ?? generateSubmissionId();
      submissionIdRef.current = submissionId;
      const result = await submitReservation({
        submissionId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId ?? undefined,
        date: selectedDate,
        time: selectedTime,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        notes: customer.notes || undefined,
      });
      if (result.ok) {
        setSubmitStatus("success");
        setSubmitResult(result.data);
      } else {
        setSubmitStatus("error");
        setSubmitError(result.error.message);
      }
    } finally {
      submittingRef.current = false;
    }
  }, [selectedServiceId, selectedStaffId, selectedDate, selectedTime, customer]);

  return {
    catalogStatus,
    catalogError,
    services,
    staff,
    staffSelectionEnabled,
    anyStaffOptionEnabled,
    steps,
    currentStep,
    selectedServiceId,
    selectedStaffId,
    selectedDate,
    selectedTime,
    customer,
    availabilityStatus,
    availabilityError,
    availableSlots,
    submitStatus,
    submitError,
    submitResult,
    retryCatalog,
    selectService,
    selectStaff,
    selectDate,
    selectTime,
    retryAvailability,
    setCustomerField,
    goToStep,
    goBack,
    goNext,
    submit,
    resetAfterError,
  };
}
```

Note `config.minDate`/`config.maxDate` are accepted in the hook's signature
for forward compatibility with `DateSelection.tsx` (Task 10, which reads
them from the same config object passed to the wizard) but are not
otherwise used inside the hook itself — the hook does not validate dates
against them (that stays presentational, per Global Constraints: never
duplicate business-hours/date-window rules in React). If lint flags the
unused parameter, destructure it as `_config` or reference it in a
one-line comment binding; do not delete the parameter, since
`ReservationWizard.tsx` (Task 16) must still be able to pass it through
unchanged when wiring `DateSelection`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest useReservationWizard -v`
Expected: PASS, all scenarios in Step 1.

- [ ] **Step 5: Commit**

---

### Task 9: `ReservationProgress` component

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/ReservationProgress.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationProgress.test.tsx`

**Interfaces:**
- Consumes: `WizardStep[]` (Task 8).
- Produces: `export function ReservationProgress({ steps, currentStep }: { steps: WizardStep[]; currentStep: WizardStep })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationProgress.test.tsx
import { render, screen } from "@testing-library/react";
import { ReservationProgress } from "./ReservationProgress";

describe("ReservationProgress", () => {
  it("announces the current step number and total, in Japanese", () => {
    render(<ReservationProgress steps={["service", "staff", "datetime", "customer", "review"]} currentStep="datetime" />);
    expect(screen.getByText("ステップ 3/5")).toBeInTheDocument();
  });

  it("labels the current step visibly", () => {
    render(<ReservationProgress steps={["service", "datetime", "customer", "review"]} currentStep="service" />);
    expect(screen.getByText("メニューを選択")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest ReservationProgress -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationProgress.tsx
import type { WizardStep } from "./useReservationWizard";

const STEP_LABELS: Record<WizardStep, string> = {
  service: "メニューを選択",
  staff: "スタッフを選択",
  datetime: "日時を選択",
  customer: "お客様情報を入力",
  review: "予約内容の確認",
};

/** Step-by-step wizard progress indicator (project UI rule: any flow with
 *  more than 3 decision steps must show "ステップ n/N" and a visible
 *  current-step title, never dump every step into one form). */
export function ReservationProgress({ steps, currentStep }: { steps: WizardStep[]; currentStep: WizardStep }) {
  const index = steps.indexOf(currentStep);
  return (
    <div role="status" aria-live="polite" className="mb-8">
      <p className="text-[13px] tracking-[0.02em] text-muted">
        ステップ {index + 1}/{steps.length}
      </p>
      <p className="mt-1 text-[20px] font-medium text-primary">{STEP_LABELS[currentStep]}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest ReservationProgress -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 10: `ServiceSelection` component

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/ServiceSelection.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ServiceSelection.test.tsx`

**Interfaces:**
- Consumes: `PublicService[]` (`@/types/reservation`).
- Produces: `export function ServiceSelection({ services, selectedServiceId, onSelect }: { services: PublicService[]; selectedServiceId: string | null; onSelect: (serviceId: string) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/salon-portfolio/web/components/reservation/ServiceSelection.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceSelection } from "./ServiceSelection";

const services = [
  { serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 },
  { serviceId: "SV002", name: "ジェルネイル", durationMinutes: 90, price: 8800, displayOrder: 2 },
];

describe("ServiceSelection", () => {
  it("renders each service as a selectable option with duration and price", () => {
    render(<ServiceSelection services={services} selectedServiceId={null} onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument();
    expect(screen.getByText("60分")).toBeInTheDocument();
    expect(screen.getByText("¥6,600")).toBeInTheDocument();
  });

  it("marks the selected service as checked", () => {
    render(<ServiceSelection services={services} selectedServiceId="SV002" onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /ジェルネイル/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /まつげパーマ/ })).not.toBeChecked();
  });

  it("calls onSelect with the serviceId when chosen", async () => {
    const onSelect = jest.fn();
    render(<ServiceSelection services={services} selectedServiceId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    expect(onSelect).toHaveBeenCalledWith("SV001");
  });

  it("shows a customer-friendly empty state when there are no services", () => {
    render(<ServiceSelection services={[]} selectedServiceId={null} onSelect={jest.fn()} />);
    expect(screen.getByText(/現在ご案内できるメニューがありません/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest ServiceSelection -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/ServiceSelection.tsx
import type { PublicService } from "@/types/reservation";
import { cn } from "@/lib/utils/cn";

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

/** Menu/service picker (spec §8) — a radiogroup of full-width option
 *  cards, not a `<select>` (every choice stays visible + touch-friendly,
 *  consistent with the rest of the site never hiding choices behind a
 *  native dropdown). Price/duration always come from the server-provided
 *  catalog (Api.ts::getServicesAction) — never edited here. */
export function ServiceSelection({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
}) {
  if (services.length === 0) {
    return (
      <p role="status" className="text-[15px] leading-[1.7] text-secondary">
        現在ご案内できるメニューがありません。しばらくしてから再度お試しください。
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="メニューを選択" className="flex flex-col gap-3">
      {services.map((service) => {
        const checked = service.serviceId === selectedServiceId;
        return (
          <label
            key={service.serviceId}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
              checked && "border-accent",
            )}
          >
            <input
              type="radio"
              name="reservation-service"
              value={service.serviceId}
              checked={checked}
              onChange={() => onSelect(service.serviceId)}
              className="sr-only"
              aria-label={service.name}
            />
            <span>
              <span className="block text-[16px] font-medium text-primary">{service.name}</span>
              <span className="block text-[14px] text-muted">{service.durationMinutes}分</span>
            </span>
            <span className="text-[16px] font-medium text-primary">{formatPrice(service.price)}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest ServiceSelection -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 11: `StaffSelection` component

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/StaffSelection.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/StaffSelection.test.tsx`

**Interfaces:**
- Consumes: `PublicStaff[]`, `ANY_STAFF` (`@/types/reservation`).
- Produces: `export function StaffSelection({ staff, selectedStaffId, onSelect }: { staff: PublicStaff[]; selectedStaffId: string | typeof ANY_STAFF | null; onSelect: (staffId: string | typeof ANY_STAFF) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/salon-portfolio/web/components/reservation/StaffSelection.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffSelection } from "./StaffSelection";
import { ANY_STAFF } from "@/types/reservation";

const staff = [
  { staffId: "ST001", name: "鈴木", displayOrder: 1 },
  { staffId: "ST002", name: "佐藤", displayOrder: 2 },
];

describe("StaffSelection", () => {
  it("renders each staff member plus the 指名なし option", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /鈴木/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /佐藤/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /指名なし/ })).toBeInTheDocument();
  });

  it("calls onSelect with ANY_STAFF for the no-preference option", async () => {
    const onSelect = jest.fn();
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /指名なし/ }));
    expect(onSelect).toHaveBeenCalledWith(ANY_STAFF);
  });

  it("calls onSelect with the staffId for a named staff member", async () => {
    const onSelect = jest.fn();
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /鈴木/ }));
    expect(onSelect).toHaveBeenCalledWith("ST001");
  });

  it("never renders an internal staffId as visible text", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} />);
    expect(screen.queryByText("ST001")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest StaffSelection -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/StaffSelection.tsx
import { ANY_STAFF, PublicStaff } from "@/types/reservation";
import { cn } from "@/lib/utils/cn";

/** Staff preference picker (spec §9) — "指名なし（お任せ）" is a first-class
 *  radio option in the same list, not a separate skip link, matching the
 *  existing `AnyAvailableStaffCard` convention on the main site. Only
 *  `staffId`/`ANY_STAFF` ever leave this component — no internal id is
 *  rendered as visible copy. */
export function StaffSelection({
  staff,
  selectedStaffId,
  onSelect,
}: {
  staff: PublicStaff[];
  selectedStaffId: string | typeof ANY_STAFF | null;
  onSelect: (staffId: string | typeof ANY_STAFF) => void;
}) {
  return (
    <div role="radiogroup" aria-label="スタッフを選択" className="flex flex-col gap-3">
      <label
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
          selectedStaffId === ANY_STAFF && "border-accent",
        )}
      >
        <input
          type="radio"
          name="reservation-staff"
          checked={selectedStaffId === ANY_STAFF}
          onChange={() => onSelect(ANY_STAFF)}
          className="sr-only"
          aria-label="指名なし（お任せ）"
        />
        <span>
          <span className="block text-[16px] font-medium text-primary">指名なし（お任せ）</span>
          <span className="block text-[14px] text-muted">空いているスタッフが対応いたします。</span>
        </span>
      </label>
      {staff.map((member) => {
        const checked = member.staffId === selectedStaffId;
        return (
          <label
            key={member.staffId}
            className={cn(
              "flex cursor-pointer items-center gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
              checked && "border-accent",
            )}
          >
            <input
              type="radio"
              name="reservation-staff"
              checked={checked}
              onChange={() => onSelect(member.staffId)}
              className="sr-only"
              aria-label={member.name}
            />
            <span className="text-[16px] font-medium text-primary">{member.name}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest StaffSelection -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 12: `DateSelection` + `TimeSlotSelection` components

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/DateSelection.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/DateSelection.test.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/TimeSlotSelection.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/TimeSlotSelection.test.tsx`

**Interfaces:**
- `DateSelection`: `export function DateSelection({ value, minDate, maxDate, onChange }: { value: string | null; minDate: string; maxDate: string; onChange: (date: string) => void })`.
- `TimeSlotSelection`: `export function TimeSlotSelection({ status, slots, selectedTime, onSelect, onRetry }: { status: "idle" | "loading" | "ready" | "error"; slots: AvailableTimeSlot[]; selectedTime: string | null; onSelect: (time: string) => void; onRetry: () => void })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/salon-portfolio/web/components/reservation/DateSelection.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateSelection } from "./DateSelection";

describe("DateSelection", () => {
  it("renders a labeled native date input bounded by min/max", () => {
    render(<DateSelection value={null} minDate="2026-09-02" maxDate="2026-11-01" onChange={jest.fn()} />);
    const input = screen.getByLabelText("日付");
    expect(input).toHaveAttribute("min", "2026-09-02");
    expect(input).toHaveAttribute("max", "2026-11-01");
  });

  it("calls onChange with the chosen date", async () => {
    const onChange = jest.fn();
    render(<DateSelection value={null} minDate="2026-09-02" maxDate="2026-11-01" onChange={onChange} />);
    const input = screen.getByLabelText("日付");
    await userEvent.type(input, "2026-09-10");
    expect(onChange).toHaveBeenCalledWith("2026-09-10");
  });
});
```

```tsx
// apps/salon-portfolio/web/components/reservation/TimeSlotSelection.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeSlotSelection } from "./TimeSlotSelection";

describe("TimeSlotSelection", () => {
  it("shows a loading state", () => {
    render(<TimeSlotSelection status="loading" slots={[]} selectedTime={null} onSelect={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("空き状況を確認しています");
  });

  it("renders each available slot as a selectable button", async () => {
    const onSelect = jest.fn();
    render(
      <TimeSlotSelection
        status="ready"
        slots={[{ time: "10:00" }, { time: "10:30" }]}
        selectedTime={null}
        onSelect={onSelect}
        onRetry={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    expect(onSelect).toHaveBeenCalledWith("10:00");
  });

  it("shows the customer-safe empty-slots message", () => {
    render(<TimeSlotSelection status="ready" slots={[]} selectedTime={null} onSelect={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByText(/この日は予約可能な時間がありません/)).toBeInTheDocument();
  });

  it("shows an error state with a retry action", async () => {
    const onRetry = jest.fn();
    render(<TimeSlotSelection status="error" slots={[]} selectedTime={null} onSelect={jest.fn()} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("marks the selected time visually and via aria-pressed", () => {
    render(
      <TimeSlotSelection
        status="ready"
        slots={[{ time: "10:00" }]}
        selectedTime="10:00"
        onSelect={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "10:00" })).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest DateSelection TimeSlotSelection -v`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/DateSelection.tsx
/** Native date input (spec §10) — deliberately not a custom calendar
 *  widget: no new dependency, full keyboard support and mobile picker UX
 *  come from the browser for free. `min`/`max` are advisory UX bounds only
 *  (derived by the caller from `reservation.minLeadHours`/`maxBookingDays`)
 *  — the backend re-validates the actual date/time on both
 *  `getAvailability` and `createReservation`, so this input is never the
 *  authoritative business-hours/holiday check (Global Constraints). */
export function DateSelection({
  value,
  minDate,
  maxDate,
  onChange,
}: {
  value: string | null;
  minDate: string;
  maxDate: string;
  onChange: (date: string) => void;
}) {
  return (
    <div>
      <label htmlFor="reservation-date" className="mb-2 block text-[14px] font-medium text-primary">
        日付
      </label>
      <input
        id="reservation-date"
        type="date"
        value={value ?? ""}
        min={minDate}
        max={maxDate}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className="min-h-[44px] w-full rounded-sm border border-border bg-surface px-4 py-3 text-[16px] text-primary focus-visible:border-accent"
      />
    </div>
  );
}
```

```tsx
// apps/salon-portfolio/web/components/reservation/TimeSlotSelection.tsx
import type { AvailableTimeSlot } from "@/types/reservation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/** Available-time grid (spec §11) — advisory only (Principle 2): a slot
 *  shown here can still be lost to a race before `createReservation`'s own
 *  re-check. Never shows internal availability-strategy names/reasons —
 *  just "空きあり"/"空きなし" via the button grid or the empty-state copy. */
export function TimeSlotSelection({
  status,
  slots,
  selectedTime,
  onSelect,
  onRetry,
}: {
  status: "idle" | "loading" | "ready" | "error";
  slots: AvailableTimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  onRetry: () => void;
}) {
  if (status === "idle") {
    return (
      <p className="text-[14px] text-muted">日付を選択すると、空いている時間が表示されます。</p>
    );
  }

  if (status === "loading") {
    return (
      <p role="status" aria-live="polite" className="text-[14px] text-muted">
        空き状況を確認しています…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-[14px] text-error">
        <p>空き状況の取得に失敗しました。時間をおいて再度お試しください。</p>
        <Button type="button" variant="secondary" onClick={onRetry}>
          再試行
        </Button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p role="status" className="text-[14px] leading-[1.7] text-secondary">
        この日は予約可能な時間がありません。別の日をお選びください。
      </p>
    );
  }

  return (
    <div role="group" aria-label="時間を選択" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {slots.map((slot) => {
        const pressed = slot.time === selectedTime;
        return (
          <button
            key={slot.time}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(slot.time)}
            className={cn(
              "min-h-[44px] rounded-sm border border-border bg-surface text-[15px] text-primary transition-colors",
              pressed && "border-accent bg-surface-sunken font-medium",
            )}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest DateSelection TimeSlotSelection -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 13: `CustomerInfoForm` component

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/CustomerInfoForm.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/CustomerInfoForm.test.tsx`

**Interfaces:**
- Consumes: `CustomerFields` (Task 8), `FormField` (`@/components/forms/FormField`, existing).
- Produces: `export function CustomerInfoForm({ values, errors, onChange, onBlur }: { values: CustomerFields; errors: Partial<Record<keyof CustomerFields, string>>; onChange: (field: keyof CustomerFields, value: string) => void; onBlur: (field: keyof CustomerFields) => void })`. Validation itself (the `errors` map) is computed by the parent (`ReservationWizard.tsx`, Task 16) using a small pure `validateCustomerFields` function — see Task 13 Step 3's second file.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/salon-portfolio/web/components/reservation/CustomerInfoForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerInfoForm, validateCustomerFields } from "./CustomerInfoForm";

const values = { name: "", email: "", phone: "", notes: "" };

describe("CustomerInfoForm", () => {
  it("renders name/email/phone/notes fields with Japanese labels", () => {
    render(<CustomerInfoForm values={values} errors={{}} onChange={jest.fn()} onBlur={jest.fn()} />);
    expect(screen.getByLabelText(/お名前/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument();
    expect(screen.getByLabelText(/備考/)).toBeInTheDocument();
  });

  it("calls onChange as the customer types", async () => {
    const onChange = jest.fn();
    render(<CustomerInfoForm values={values} errors={{}} onChange={onChange} onBlur={jest.fn()} />);
    await userEvent.type(screen.getByLabelText(/お名前/), "山");
    expect(onChange).toHaveBeenCalledWith("name", "山");
  });

  it("shows a field error when present", () => {
    render(
      <CustomerInfoForm
        values={values}
        errors={{ email: "メールアドレスの形式をご確認ください。" }}
        onChange={jest.fn()}
        onBlur={jest.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("メールアドレスの形式をご確認ください。");
  });
});

describe("validateCustomerFields", () => {
  it("requires name and email", () => {
    const errors = validateCustomerFields({ name: "", email: "", phone: "", notes: "" });
    expect(errors.name).toBe("お名前を入力してください。");
    expect(errors.email).toBe("メールアドレスを入力してください。");
  });

  it("rejects a malformed email", () => {
    const errors = validateCustomerFields({ name: "山田太郎", email: "not-an-email", phone: "", notes: "" });
    expect(errors.email).toBe("メールアドレスの形式をご確認ください。");
  });

  it("accepts a valid minimal submission (phone/notes optional)", () => {
    const errors = validateCustomerFields({ name: "山田太郎", email: "yamada@example.com", phone: "", notes: "" });
    expect(errors).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest CustomerInfoForm -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/CustomerInfoForm.tsx
import { FormField } from "@/components/forms/FormField";
import type { CustomerFields } from "./useReservationWizard";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side UX validation only — mirrors `ContactForm.tsx`'s pattern
 *  (same email regex), NOT a re-implementation of any server business rule
 *  (name/email/phone shape checks here are presentation convenience; the
 *  authoritative check is `gas/src/Validation.ts`, Global Constraints). */
export function validateCustomerFields(values: CustomerFields): Partial<Record<keyof CustomerFields, string>> {
  const errors: Partial<Record<keyof CustomerFields, string>> = {};
  if (!values.name.trim()) errors.name = "お名前を入力してください。";
  if (!values.email.trim()) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "メールアドレスの形式をご確認ください。";
  }
  return errors;
}

export function CustomerInfoForm({
  values,
  errors,
  onChange,
  onBlur,
}: {
  values: CustomerFields;
  errors: Partial<Record<keyof CustomerFields, string>>;
  onChange: (field: keyof CustomerFields, value: string) => void;
  onBlur: (field: keyof CustomerFields) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FormField
        id="reservation-name"
        label="お名前"
        required
        autoComplete="name"
        value={values.name}
        onChange={(event) => onChange("name", event.target.value)}
        onBlur={() => onBlur("name")}
        error={errors.name}
      />
      <FormField
        id="reservation-email"
        label="メールアドレス"
        required
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        onChange={(event) => onChange("email", event.target.value)}
        onBlur={() => onBlur("email")}
        error={errors.email}
      />
      <FormField
        id="reservation-phone"
        label="電話番号（任意）"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={(event) => onChange("phone", event.target.value)}
        onBlur={() => onBlur("phone")}
        error={errors.phone}
      />
      <FormField
        id="reservation-notes"
        label="備考（任意）"
        as="textarea"
        value={values.notes}
        onChange={(event) => onChange("notes", event.target.value)}
        onBlur={() => onBlur("notes")}
        error={errors.notes}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest CustomerInfoForm -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 14: `ReservationSummary` component

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/ReservationSummary.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationSummary.test.tsx`

**Interfaces:**
- Consumes: `PublicService`, `PublicStaff`, `CustomerFields`, `ANY_STAFF`.
- Produces: `export function ReservationSummary(props: { service: PublicService; staffName: string | null; date: string; time: string; customer: CustomerFields; onConfirm: () => void; onBack: () => void; confirming: boolean })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationSummary.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationSummary } from "./ReservationSummary";

const service = { serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 };
const customer = { name: "山田太郎", email: "yamada@example.com", phone: "09012345678", notes: "" };

describe("ReservationSummary", () => {
  it("shows menu, duration, price, date/time, and customer info", () => {
    render(
      <ReservationSummary
        service={service}
        staffName="指名なし（お任せ）"
        date="2026-09-10"
        time="14:00"
        customer={customer}
        onConfirm={jest.fn()}
        onBack={jest.fn()}
        confirming={false}
      />,
    );
    expect(screen.getByText("まつげパーマ")).toBeInTheDocument();
    expect(screen.getByText("60分")).toBeInTheDocument();
    expect(screen.getByText("¥6,600")).toBeInTheDocument();
    expect(screen.getByText("指名なし（お任せ）")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
  });

  it("disables the confirm button while confirming", () => {
    render(
      <ReservationSummary service={service} staffName={null} date="2026-09-10" time="14:00" customer={customer} onConfirm={jest.fn()} onBack={jest.fn()} confirming />,
    );
    expect(screen.getByRole("button", { name: /予約を受け付けています/ })).toBeDisabled();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = jest.fn();
    render(
      <ReservationSummary service={service} staffName={null} date="2026-09-10" time="14:00" customer={customer} onConfirm={onConfirm} onBack={jest.fn()} confirming={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest ReservationSummary -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationSummary.tsx
import { Button } from "@/components/ui/Button";
import type { PublicService } from "@/types/reservation";
import type { CustomerFields } from "./useReservationWizard";

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("ja-JP", { weekday: "short", timeZone: "UTC" });
  return `${year}年${month}月${day}日（${weekday}）`;
}

/** Final review before submission (spec §14) — display only; the server
 *  remains authoritative for price/duration/staff/availability at
 *  `createReservation` time regardless of what is shown here. */
export function ReservationSummary({
  service,
  staffName,
  date,
  time,
  customer,
  onConfirm,
  onBack,
  confirming,
}: {
  service: PublicService;
  staffName: string | null;
  date: string;
  time: string;
  customer: CustomerFields;
  onConfirm: () => void;
  onBack: () => void;
  confirming: boolean;
}) {
  const rows: [string, string][] = [
    ["メニュー", service.name],
    ["所要時間", `${service.durationMinutes}分`],
    ["料金", formatPrice(service.price)],
    ...(staffName ? ([["スタッフ", staffName]] as [string, string][]) : []),
    ["日時", `${formatDate(date)} ${time}`],
    ["お名前", customer.name],
    ["メール", customer.email],
    ...(customer.phone ? ([["電話番号", customer.phone]] as [string, string][]) : []),
    ...(customer.notes ? ([["備考", customer.notes]] as [string, string][]) : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <dl className="divide-y divide-border rounded-sm border border-border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
            <dt className="text-[14px] text-muted">{label}</dt>
            <dd className="text-[16px] text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="button" fullWidth disabled={confirming} onClick={onConfirm}>
          {confirming ? "予約を受け付けています…" : "この内容で予約する"}
        </Button>
        <Button type="button" variant="secondary" fullWidth disabled={confirming} onClick={onBack}>
          内容を修正する
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest ReservationSummary -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 15: `ReservationSuccess` + `ReservationErrorNotice` + `ReservationDisabledNotice`

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/ReservationSuccess.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationSuccess.test.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationErrorNotice.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationErrorNotice.test.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationDisabledNotice.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationDisabledNotice.test.tsx`

**Interfaces:**
- `ReservationSuccess`: `export function ReservationSuccess({ reservationId, needsConfirmation }: { reservationId: string; needsConfirmation?: boolean })`.
- `ReservationErrorNotice`: `export function ReservationErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void })`.
- `ReservationDisabledNotice`: `export function ReservationDisabledNotice()`.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationSuccess.test.tsx
import { render, screen } from "@testing-library/react";
import { ReservationSuccess } from "./ReservationSuccess";

describe("ReservationSuccess", () => {
  it("shows the plain confirmed message and reservation number", () => {
    render(<ReservationSuccess reservationId="RES-20260910-X8K2MP" />);
    expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument();
    expect(screen.getByText("RES-20260910-X8K2MP")).toBeInTheDocument();
    expect(screen.getByText(/確認メールをお送りしました/)).toBeInTheDocument();
  });

  it("shows a distinct needsConfirmation message without claiming an email was sent to the customer", () => {
    render(<ReservationSuccess reservationId="RES-20260910-X8K2MP" needsConfirmation />);
    expect(screen.getByText("RES-20260910-X8K2MP")).toBeInTheDocument();
    expect(screen.queryByText(/確認メールをお送りしました/)).not.toBeInTheDocument();
    expect(screen.getByText(/担当より必要に応じてご連絡いたします/)).toBeInTheDocument();
  });
});
```

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationErrorNotice.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationErrorNotice } from "./ReservationErrorNotice";

describe("ReservationErrorNotice", () => {
  it("renders the given message as an alert", () => {
    render(<ReservationErrorNotice message="選択された時間帯はご利用いただけません。" />);
    expect(screen.getByRole("alert")).toHaveTextContent("選択された時間帯はご利用いただけません。");
  });

  it("shows a retry button only when onRetry is given", async () => {
    const onRetry = jest.fn();
    render(<ReservationErrorNotice message="エラー" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "もう一度お試しください" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders no button when onRetry is omitted", () => {
    render(<ReservationErrorNotice message="エラー" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationDisabledNotice.test.tsx
import { render, screen } from "@testing-library/react";
import { ReservationDisabledNotice } from "./ReservationDisabledNotice";

describe("ReservationDisabledNotice", () => {
  it("shows a customer-safe, non-technical unavailable message", () => {
    render(<ReservationDisabledNotice />);
    expect(screen.getByText(/現在、ご予約の受付を停止しております/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest ReservationSuccess ReservationErrorNotice ReservationDisabledNotice -v`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationSuccess.tsx
/** Final wizard state on success (spec §16/§17). `needsConfirmation` is
 *  the one success sub-case where `Api.ts::resolveCreateReservationResponse`
 *  did NOT send the customer a confirmation email (only the owner is
 *  notified — `Api.ts::sendReservationEmailsForOutcome`) — this copy must
 *  not claim otherwise. Both cases are still a real, accepted reservation,
 *  never demoted to a generic failure message (spec §17). */
export function ReservationSuccess({
  reservationId,
  needsConfirmation,
}: {
  reservationId: string;
  needsConfirmation?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" className="rounded-sm border border-border bg-surface p-8 text-center">
      <p className="text-[20px] font-medium text-primary">ご予約ありがとうございます</p>
      <p className="mt-2 text-[15px] leading-[1.7] text-secondary">ご予約を受け付けました。</p>
      <p className="mt-4 text-[14px] text-muted">予約番号</p>
      <p className="text-[18px] font-medium text-primary">{reservationId}</p>
      <p className="mt-4 text-[14px] leading-[1.7] text-secondary">
        {needsConfirmation
          ? "内容を確認の上、担当より必要に応じてご連絡いたします。"
          : "ご登録のメールアドレスへ確認メールをお送りしました。"}
      </p>
    </div>
  );
}
```

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationErrorNotice.tsx
import { Button } from "@/components/ui/Button";

/** Generic inline error banner reused across the wizard (spec §18). The
 *  `message` shown here always comes straight from the backend envelope —
 *  every code path that can reach this component (GAS's
 *  `ReservationErrorMapping.ts`, or `/api/gas/route.ts`'s sanitization of
 *  its own local transport codes) already produces a safe, natural
 *  Japanese sentence, so this component never re-maps or appends to it
 *  (Global Constraints). */
export function ReservationErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-sm border border-error/40 bg-surface px-5 py-4 text-[14px] text-error">
      <p>{message}</p>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          もう一度お試しください
        </Button>
      ) : null}
    </div>
  );
}
```

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationDisabledNotice.tsx
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Shown at `/reservation` when `features.reservation` is off (spec §19)
 *  — no API call is attempted in this state (the page never renders
 *  `ReservationWizard` when this is shown, see `app/reservation/page.tsx`). */
export function ReservationDisabledNotice() {
  return (
    <Container className="py-24 text-center">
      <SectionHeading eyebrow="Reservation" title="ご予約について" align="center" />
      <p className="mx-auto mt-6 max-w-[480px] text-[15px] leading-[1.8] text-secondary">
        現在、ご予約の受付を停止しております。お手数をおかけしますが、お電話にてお問い合わせください。
      </p>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest ReservationSuccess ReservationErrorNotice ReservationDisabledNotice -v`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 16: `ReservationWizard` composition component

**Files:**
- Create: `apps/salon-portfolio/web/components/reservation/ReservationWizard.tsx`
- Create: `apps/salon-portfolio/web/components/reservation/ReservationWizard.test.tsx`

**Interfaces:**
- Consumes every component from Tasks 8-15 plus `useReservationWizard`.
- Produces: `export function ReservationWizard({ minDate, maxDate }: { minDate: string; maxDate: string })`. This component owns no business logic itself — it renders `useReservationWizard`'s state through the step components and wires their callbacks; it is intentionally the only file allowed to import every step component (Global Constraints: keep step components independently testable/replaceable).

- [ ] **Step 1: Write the failing test** — integration-style, mocking the API client (same technique as Task 8) rather than the hook itself, so this test exercises the real composition:

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationWizard.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationWizard } from "./ReservationWizard";
import * as reservationClient from "@/lib/api/reservationClient";
import { ANY_STAFF } from "@/types/reservation";

jest.mock("@/lib/api/reservationClient");

function mockHappyPath() {
  (reservationClient.getServices as jest.Mock).mockResolvedValue({
    ok: true,
    data: [{ serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 }],
  });
  (reservationClient.getStaff as jest.Mock).mockResolvedValue({ ok: true, data: [] });
  (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
    ok: true,
    data: { date: "2026-09-10", slots: [{ time: "10:00" }] },
  });
  (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
    ok: true,
    data: { reservationId: "RES-20260910-X8K2MP" },
  });
}

describe("ReservationWizard", () => {
  afterEach(() => jest.restoreAllMocks());

  it("walks a customer from service selection through to success", async () => {
    mockHappyPath();
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    // staff step is skipped (getStaff returned []) — straight to date/time
    const dateInput = await screen.findByLabelText("日付");
    await userEvent.type(dateInput, "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));

    await waitFor(() => expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument());
    expect(screen.getByText("RES-20260910-X8K2MP")).toBeInTheDocument();
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
  });

  it("shows a customer-safe error and lets the customer retry after a failed submission", async () => {
    mockHappyPath();
    (reservationClient.submitReservation as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("選択された時間帯はご利用いただけません。"));
    expect(screen.queryByText("ご予約ありがとうございます")).not.toBeInTheDocument();
  });

  it("disables the confirm button while a submission is in flight and never double-submits", async () => {
    mockHappyPath();
    let resolveSubmit!: (value: unknown) => void;
    (reservationClient.submitReservation as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveSubmit = resolve; }));
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    const confirmButton = screen.getByRole("button", { name: "この内容で予約する" });
    await userEvent.click(confirmButton);
    await userEvent.click(confirmButton); // second click while pending
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);

    resolveSubmit({ ok: true, data: { reservationId: "RES-X" } });
    await waitFor(() => expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest ReservationWizard.test -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/salon-portfolio/web/components/reservation/ReservationWizard.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { useReservationWizard } from "./useReservationWizard";
import { ReservationProgress } from "./ReservationProgress";
import { ServiceSelection } from "./ServiceSelection";
import { StaffSelection } from "./StaffSelection";
import { DateSelection } from "./DateSelection";
import { TimeSlotSelection } from "./TimeSlotSelection";
import { CustomerInfoForm, validateCustomerFields } from "./CustomerInfoForm";
import { ReservationSummary } from "./ReservationSummary";
import { ReservationSuccess } from "./ReservationSuccess";
import { ReservationErrorNotice } from "./ReservationErrorNotice";
import { useState } from "react";
import type { CustomerFields } from "./useReservationWizard";

/**
 * Top-level reservation wizard (spec §22) — owns no business logic of its
 * own; it renders `useReservationWizard`'s state through each step's
 * dedicated component. `app/reservation/page.tsx` only mounts this when
 * `features.reservation` is on (Global Constraints/spec §19).
 */
export function ReservationWizard({ minDate, maxDate }: { minDate: string; maxDate: string }) {
  const wizard = useReservationWizard({ minDate, maxDate });
  const [touched, setTouched] = useState<Partial<Record<keyof CustomerFields, boolean>>>({});

  if (wizard.catalogStatus === "loading") {
    return <p role="status" className="py-16 text-center text-[14px] text-muted">読み込んでいます…</p>;
  }

  if (wizard.catalogStatus === "error") {
    return (
      <ReservationErrorNotice
        message={wizard.catalogError ?? "サーバーエラーが発生しました。"}
        onRetry={wizard.retryCatalog}
      />
    );
  }

  if (wizard.submitStatus === "success" && wizard.submitResult) {
    return (
      <ReservationSuccess
        reservationId={wizard.submitResult.reservationId}
        needsConfirmation={wizard.submitResult.needsConfirmation}
      />
    );
  }

  const customerErrors = validateCustomerFields(wizard.customer);
  const visibleCustomerErrors = Object.fromEntries(
    Object.entries(customerErrors).filter(([field]) => touched[field as keyof CustomerFields]),
  );

  const selectedService = wizard.services.find((service) => service.serviceId === wizard.selectedServiceId) ?? null;
  const selectedStaffName =
    wizard.selectedStaffId === null
      ? null
      : wizard.selectedStaffId === "ANY"
        ? "指名なし（お任せ）"
        : (wizard.staff.find((member) => member.staffId === wizard.selectedStaffId)?.name ?? null);

  function canGoNext(): boolean {
    switch (wizard.currentStep) {
      case "service":
        return wizard.selectedServiceId !== null;
      case "staff":
        return wizard.selectedStaffId !== null;
      case "datetime":
        return wizard.selectedDate !== null && wizard.selectedTime !== null;
      case "customer":
        return Object.keys(customerErrors).length === 0;
      default:
        return false;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <ReservationProgress steps={wizard.steps} currentStep={wizard.currentStep} />

      {wizard.submitStatus === "error" && wizard.submitError ? (
        <ReservationErrorNotice message={wizard.submitError} onRetry={wizard.resetAfterError} />
      ) : null}

      {wizard.currentStep === "service" ? (
        <ServiceSelection services={wizard.services} selectedServiceId={wizard.selectedServiceId} onSelect={wizard.selectService} />
      ) : null}

      {wizard.currentStep === "staff" ? (
        <StaffSelection staff={wizard.staff} selectedStaffId={wizard.selectedStaffId} onSelect={wizard.selectStaff} />
      ) : null}

      {wizard.currentStep === "datetime" ? (
        <div className="flex flex-col gap-6">
          <DateSelection value={wizard.selectedDate} minDate={minDate} maxDate={maxDate} onChange={wizard.selectDate} />
          <TimeSlotSelection
            status={wizard.availabilityStatus}
            slots={wizard.availableSlots}
            selectedTime={wizard.selectedTime}
            onSelect={wizard.selectTime}
            onRetry={wizard.retryAvailability}
          />
        </div>
      ) : null}

      {wizard.currentStep === "customer" ? (
        <CustomerInfoForm
          values={wizard.customer}
          errors={visibleCustomerErrors}
          onChange={wizard.setCustomerField}
          onBlur={(field) => setTouched((prev) => ({ ...prev, [field]: true }))}
        />
      ) : null}

      {wizard.currentStep === "review" && selectedService && wizard.selectedDate && wizard.selectedTime ? (
        <ReservationSummary
          service={selectedService}
          staffName={selectedStaffName}
          date={wizard.selectedDate}
          time={wizard.selectedTime}
          customer={wizard.customer}
          onConfirm={wizard.submit}
          onBack={wizard.goBack}
          confirming={wizard.submitStatus === "submitting"}
        />
      ) : null}

      {wizard.currentStep !== "review" ? (
        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={wizard.goBack} disabled={wizard.steps.indexOf(wizard.currentStep) === 0}>
            戻る
          </Button>
          <Button type="button" onClick={wizard.goNext} disabled={!canGoNext()}>
            次へ
          </Button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest ReservationWizard.test -v`
Expected: PASS, all 3 integration scenarios.

- [ ] **Step 5: Run the entire web suite + typecheck**

Run: `cd apps/salon-portfolio/web && npm test && npm run typecheck`
Expected: PASS, zero regressions in the pre-existing 71 tests.

- [ ] **Step 6: Commit**

---

### Task 17: `app/reservation/page.tsx` — replace the placeholder

**Files:**
- Modify: `apps/salon-portfolio/web/app/reservation/page.tsx`
- Create: `apps/salon-portfolio/web/app/reservation/page.test.tsx`

**Interfaces:**
- Consumes: `getRuntimeConfig` (`@/lib/config/runtimeConfig`, existing), `resolveSiteConfig` (existing), `ReservationWizard` (Task 16), `ReservationDisabledNotice` (Task 15).
- Produces: `export default async function ReservationPage()`.

Because `page.tsx` is an async Server Component, its test renders the
resolved JSX tree the same way `RuntimeConfigNotice`/existing page tests
do — check the repo's existing convention for testing an async Server
Component (there may be none yet, since Phase 3B's pages aren't unit
tested this way). If no existing precedent covers testing an `async`
Server Component directly with RTL, structure the page so nearly all of it
is expressed via a small sync `ReservationPageBody` helper the test renders
directly with plain props, and keep the `async` wrapper itself untested
(consistent with how `layout.tsx`/`app/page.tsx` have no dedicated test
file today — confirm this by checking for `app/page.test.tsx` before
writing this test; if none exists, skip a dedicated `page.test.tsx` here
and instead cover this file's two branches (enabled/disabled) through the
already-thorough `ReservationWizard.test.tsx` (Task 16) and
`ReservationDisabledNotice.test.tsx` (Task 15), noting the omission
explicitly in the final report rather than inventing an untested pattern).

- [ ] **Step 1: Confirm test precedent** — run:

```
cd apps/salon-portfolio/web && find app -name "page.test.tsx"
```

If empty, skip Step 1's test file per the note above and go straight to
Step 3 (implementation), then add a short manual verification (Step 4) via
`npm run build` actually rendering the route. If a precedent exists, follow
it exactly instead of the skip.

- [ ] **Step 3: Write the implementation**

```tsx
// apps/salon-portfolio/web/app/reservation/page.tsx
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ReservationWizard } from "@/components/reservation/ReservationWizard";
import { ReservationDisabledNotice } from "@/components/reservation/ReservationDisabledNotice";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";

function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function todayInTokyo(): string {
  // Asia/Tokyo has no DST — a fixed +9h offset from UTC is always correct.
  const now = new Date();
  const tokyoNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return tokyoNow.toISOString().slice(0, 10);
}

/**
 * Reservation page (Phase 5, replacing the Phase 3C placeholder). Server
 * Component: gates on `features.reservation` (spec §19 — no API call is
 * attempted at all when the feature is off) and derives the date picker's
 * min/max bounds from `reservation.minLeadHours`/`maxBookingDays` (advisory
 * UX bounds only — `getAvailability`/`createReservation` remain
 * authoritative, Global Constraints). `ReservationWizard` itself is a
 * Client Component for interactivity.
 */
export default async function ReservationPage() {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);

  if (!siteConfig.features.reservation) {
    return (
      <main className="flex flex-1 flex-col">
        <ReservationDisabledNotice />
      </main>
    );
  }

  const today = todayInTokyo();
  const minDate = config.reservation.minLeadHours >= 24 ? addDaysToDateString(today, 1) : today;
  const maxDate = addDaysToDateString(today, config.reservation.maxBookingDays);

  return (
    <main className="flex flex-1 flex-col">
      <Container className="py-16 lg:py-24">
        <SectionHeading eyebrow="Reservation" title="ご予約" />
        <div className="mt-10 max-w-[640px]">
          <ReservationWizard minDate={minDate} maxDate={maxDate} />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `cd apps/salon-portfolio/web && npm run build`
Expected: build succeeds, `/reservation` listed in the route output with
no errors. This is the closest this task gets to exercising the real
`async` Server Component boundary, given no existing unit-test precedent
for one in this repo (confirmed in Step 1).

- [ ] **Step 5: Run the full web suite**

Run: `cd apps/salon-portfolio/web && npm test`
Expected: PASS, 71 pre-existing + all new tests from Tasks 5-16, zero
regressions.

- [ ] **Step 6: Commit**

---

### Task 18: Documentation updates

**Files:**
- Modify: `docs/api-documentation.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/architecture-overview.md`
- Create: `docs/reservation-frontend-architecture.md`

No tests (documentation-only task); verified by re-reading the finished
files for internal consistency and cross-references that resolve.

- [ ] **Step 1: `docs/api-documentation.md`** — add `getServices`, `getStaff`,
  `getAvailability` sections (same format as the existing `getConfig`/
  `createReservation` sections: request/response JSON examples, feature-flag
  gating, error codes), and remove `getServices`/`getStaff`/
  `getAvailableSlots` from the "any other action name" not-yet-implemented
  list (replace with the genuinely still-unimplemented
  `createInquiry`/`requestCancellation`/`checkAvailability`/`healthCheck`).
  Update the file's opening "Status as of Phase 4" line to "Status as of
  Phase 5".

- [ ] **Step 2: `docs/roadmap.md`** — check off the line this plan's task
  brief calls "Phase 5" and the file itself calls "Phase 6 — Reservation
  form UI" (`docs/roadmap.md:98-102`): mark it `[x]`, describe what shipped
  (wizard steps, the three new actions, no contact/cancellation work), and
  add one sentence reconciling the numbering — e.g. "referred to as 'Phase
  5' in the task brief that produced this phase; this project's own
  numbering keeps it as Phase 6, with Phase 5 (contact & cancellation)
  still not started below." Do not renumber any other phase.

- [ ] **Step 3: `docs/architecture-overview.md`** — update the "What Phase 4
  added" section's closing sentence (currently: *"No reservation-page
  UI/UX work... deliberately out of this phase's scope"*) to reflect that
  the UI now exists, and add a short "What Phase 5 added" section
  mirroring the existing per-phase summary style: the 3 new GAS actions,
  `components/reservation/`, the `useReservationWizard` hook, and a pointer
  to the new `reservation-frontend-architecture.md`.

- [ ] **Step 4: Create `docs/reservation-frontend-architecture.md`** covering
  (per spec §32): reservation page architecture (Server Component gate +
  Client Component wizard), the frontend/backend boundary (never bypasses
  `/api/gas`; `submissionId` idempotency contract reused unchanged), catalog
  flow (`getServices`/`getStaff` → `useReservationWizard`'s catalog load),
  availability flow (`getAvailability`, advisory-only, re-fetched on
  service/staff/date change per the dependency-reset rules), the
  `createReservation` flow and its two distinct 要確認 outcomes as
  surfaced in `ReservationSuccess`, feature-flag behavior
  (`ReservationDisabledNotice`), error handling (why the frontend never
  re-maps a backend message), and a "Future work" section naming Phase 6
  (per this task's own out-of-scope list: contact form, cancellation UI,
  admin, etc. — cite `docs/roadmap.md`'s Phase 5/7 for where those land).

- [ ] **Step 5: Commit**

---

## Part C — Final verification

### Task 19: Full verification pass, code review, evidence

**Files:** none new — this task runs commands and reviews the diff.

- [ ] **Step 1: Run every check on both sides**

```bash
cd apps/salon-portfolio/gas && npm test 2>&1 | tee /path/to/.evidence/.../gas-test.log
cd apps/salon-portfolio/gas && npx tsc --noEmit 2>&1 | tee /path/to/.evidence/.../typecheck-gas.log
cd apps/salon-portfolio/web && npm test 2>&1 | tee /path/to/.evidence/.../web-test.log
cd apps/salon-portfolio/web && npm run typecheck 2>&1 | tee /path/to/.evidence/.../typecheck-web.log
cd apps/salon-portfolio/web && npm run lint 2>&1 | tee /path/to/.evidence/.../lint.log
cd apps/salon-portfolio/web && npm run build 2>&1 | tee /path/to/.evidence/.../build.log
```

Expected: GAS 231 + ~29 new = ~260 passing; web 71 + ~70 new = ~141
passing (exact counts recorded from the actual run, not estimated — per
this project's evidence-reporting rule, every number in the final report
must cite the log file it came from); zero typecheck/lint errors; build
succeeds including the `/reservation` route.

- [ ] **Step 2: Independent review of the diff** — re-read the full diff
  against the Critical/Important/Minor checklist in spec §34. Specifically
  verify by grep, not by memory:
  - `grep -rn "GAS_WEBAPP_URL" apps/salon-portfolio/web/components apps/salon-portfolio/web/app` → zero matches outside `lib/api/gasClient.ts` and `app/api/gas/route.ts`.
  - `grep -rn "process.env" apps/salon-portfolio/web/components/reservation` → zero matches (client components never read server env).
  - Confirm `createReservation`'s payload in `useReservationWizard.submit` never includes a client-supplied price/duration/reservationId field (it doesn't — `ReservationSubmission` has no such fields to begin with).
  - Confirm no new `jest.mock` in `gas/tests/Api.test.ts` touches `LockService`/the critical-section describe blocks (Tasks 2/4 only add new `describe` blocks; the existing `createReservationAction` suite's mocks are untouched).
  - Confirm `docs/roadmap.md`'s already-shipped phase checkboxes (0-4) are unedited.

- [ ] **Step 3: Fix any Critical/Important finding**, re-run Step 1's
  affected suite, and re-verify before proceeding.

- [ ] **Step 4: Write the evidence directory** at
  `.evidence/<yyyyMMdd-HHmm>-phase5-reservation-ui/` (the baseline logs
  from before this plan started implementation already exist there from
  the planning session — add the final logs, `diff.patch`, `status.txt`,
  and a short `scope-check.txt` walking spec §35's checklist line by line).

- [ ] **Step 5: Report** using the exact structure in spec §39 — do not
  commit anything beyond what each task's own Step 5/6 already committed,
  and do not create a PR or merge, unless explicitly instructed.
