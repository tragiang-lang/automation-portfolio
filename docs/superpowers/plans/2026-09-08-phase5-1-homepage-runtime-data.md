# Phase 5.1 — Homepage Runtime Menu/Staff Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note for this run:** all repo facts below were gathered by
> direct inspection in this same session (direct Reads/Greps of
> `apps/salon-portfolio/web` and `apps/salon-portfolio/gas`), so inline
> execution (no further subagent dispatch) is the efficient path — a fresh
> subagent would have to re-derive the same facts. This mirrors the
> precedent in `docs/superpowers/plans/2026-09-07-coconala-productization.md`.

**Goal:** Make the homepage's Menu and Staff sections read live `getServices`/
`getStaff` data through the same GAS client the Reservation Wizard already
uses, instead of the static `SERVICES`/`STAFF` arrays in
`config/demo-content.ts`, while preserving visual design, demo/error
fallback semantics, and the reservation transaction workflow untouched.

**Architecture:** Add a small server-side runtime-catalog layer
(`lib/config/runtimeCatalog.ts`) that mirrors the existing
`lib/config/runtimeConfig.ts` pattern exactly (same `demo-fallback` /
`runtime` / `runtime-error` status machine, same `callGasAction` client, same
`cache()` wrapping). It fetches `getServices`/`getStaff`, validates their
shape with new pure validators, and maps the canonical `PublicService`/
`PublicStaff` types (already used by `lib/api/reservationClient.ts` and the
wizard) onto the homepage's existing `Service`/`StaffMember` presentation
types via new pure mapper functions — never duplicating those domain models.
`app/page.tsx` calls this instead of importing `SERVICES`/`STAFF` from
`config/demo-content.ts`; `app/layout.tsx`'s existing `RuntimeConfigNotice`
is extended to also fire on a catalog `runtime-error`, so a real backend
failure for Menu/Staff is never silently indistinguishable from demo mode
(same rule the project already enforces for `getConfig`).

**Tech Stack:** Next.js 16, React 19, TypeScript, Jest + Testing Library
(existing `apps/salon-portfolio/web` toolchain — no new dependencies).

**Spec:** The user's "Phase 5.1 — Synchronize Homepage Menu & Staff with
Runtime GAS Data" prompt (sections 0–29), reproduced in full in the
conversation that produced this plan.

## Global Constraints

- Never modify GAS action contracts, Sheets schema, or add new GAS actions —
  `getServices`/`getStaff` (`apps/salon-portfolio/gas/src/Api.ts`,
  `PublicCatalog.ts`) stay exactly as they are.
- Never introduce a duplicate GAS client — reuse
  `lib/api/gasClient.ts::callGasAction` (server-side, same file
  `runtimeConfig.ts` already uses) for the homepage's server-side fetch.
  `lib/api/reservationClient.ts` (browser-side, via `/api/gas`) stays owned
  by the Reservation Wizard only — it is not touched.
- Never duplicate `PublicService`/`PublicStaff` (`types/reservation.ts`) —
  reuse them as the wire type; only map to `Service`/`StaffMember`
  (`types/content.ts`) via small pure functions.
- Preserve the existing `runtime` / `demo-fallback` / `runtime-error` status
  vocabulary (`types/runtime-config.ts::RuntimeConfigStatus`) — do not invent
  a second vocabulary for catalog status.
- No new `"use client"` boundary, no `useEffect`/`fetch` on the homepage —
  Menu/Staff data is fetched server-side in the existing async Server
  Component composition (`app/page.tsx`), exactly like `getConfig` already
  is.
- No visual/design changes to any component's markup/classes beyond the
  minimal null-safety needed for fields the runtime catalog cannot supply
  (see Task 3 below) — no new sections, no new component library usage.
- Do not touch `apps/salon-portfolio/gas/**`, `components/reservation/**`,
  `lib/api/reservationClient.ts`, or `useReservationWizard.ts`.
- Do not run `git commit`/`git push` unless the user explicitly says so in
  this conversation.

## Ground-truth facts (reference for every task below)

**Current wiring** (`apps/salon-portfolio/web/app/page.tsx`): imports
`SERVICES`, `STAFF` from `@/config/demo-content` and passes them straight to
`<MenuSection services={SERVICES} />` / `<StaffSection staff={STAFF} ... />`.
A comment block above `Home()` explicitly says this is because
`getServices`/`getStaff` didn't exist yet ("Phase 4 plan") — they now do
(`lib/api/reservationClient.ts`, added in Phase 5 alongside the Reservation
Wizard), so this comment is stale and must be corrected as part of this
change.

**Existing `getConfig` pattern to mirror exactly**
(`lib/config/runtimeConfig.ts`):
```ts
export async function loadRuntimeConfig(): Promise<RuntimeConfigResult> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    return { status: "demo-fallback", config: DEMO_RUNTIME_CONFIG };
  }
  try {
    const result = await callGasAction<unknown>("getConfig", {});
    if (!result.ok) { /* console.error, return runtime-error */ }
    const parsed = parsePublicRuntimeConfig(result.data);
    if (!parsed) { /* console.error, return runtime-error */ }
    return { status: "runtime", config: parsed };
  } catch (error) { /* console.error, return runtime-error */ }
}
export const getRuntimeConfig = cache(loadRuntimeConfig);
```
`RuntimeConfigStatus = "runtime" | "demo-fallback" | "runtime-error"`
(`types/runtime-config.ts`). `app/layout.tsx` shows
`<RuntimeConfigNotice show={status === "runtime-error"} />` — a calm
Japanese banner, otherwise renders nothing (zero layout shift).

**Canonical wire types already used by the Reservation Wizard**
(`types/reservation.ts`, consumed by `lib/api/reservationClient.ts`,
`components/reservation/ServiceSelection.tsx`,
`components/reservation/StaffSelection.tsx`):
```ts
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
These mirror `apps/salon-portfolio/gas/src/models/Catalog.ts` exactly.
`PublicCatalog.ts` (GAS) already sorts both by `DisplayOrder` ascending
before returning — the frontend must NOT re-sort; pass through in the order
received (`ReservationRules.ts`/`StaffAvailabilityStrategy.ts` document the
same "already sorted" invariant elsewhere in the codebase).

**Homepage presentation types** (`types/content.ts`) — richer than the wire
types, because they also carry frontend-only presentation fields with **no
column in `SERVICES`/`STAFF` sheets**
(`apps/salon-portfolio/gas/src/SheetSchemas.ts` — `SERVICES` columns:
`ServiceID, Name, DurationMinutes, Price, Active, StaffRequired,
DisplayOrder`; `STAFF` columns: `StaffID, Name, Active, CalendarID,
DisplayOrder` — no description/category/role/introduction/photo column
exists in either):
```ts
export interface Service {
  serviceId: string;
  name: string;
  description?: string;   // already optional
  category?: string;      // already optional
  durationMinutes: number;
  price: number;
}
export interface StaffMember {
  staffId: string;
  name: string;
  role: string;            // NOT optional today — Task 3 makes it optional
  introduction: string;    // NOT optional today — Task 3 makes it optional
  photoSrc: string;        // NOT optional today — Task 3 makes it optional
  photoAlt: string;        // NOT optional today — Task 3 makes it optional
}
```
`components/sections/MenuRow.tsx` already renders `service.description`
conditionally (`{service.description ? ... : null}`) — no change needed
there. `components/sections/StaffCard.tsx` renders `staff.role`/
`staff.introduction`/`staff.photoSrc` unconditionally today — Task 3 makes
these conditional, following the exact same established convention as
`MenuRow`.

**Demo fallback data already matches the presentation types as-is**:
`config/demo-content.ts`'s `SERVICES: Service[]` and `STAFF: StaffMember[]`
already carry description/category/role/introduction/photo — this plan's
demo-fallback branch reuses them completely unchanged (no mapping needed),
so local/portfolio-demo mode keeps its current rich appearance exactly.

**Where the loss of description/category/role/introduction/photo actually
shows up:** only on the `runtime` (real GAS backend configured and working)
branch, because the SERVICES/STAFF sheets have no columns for them. This is
a real, pre-existing data-model gap (not something this plan can invent
around without changing Sheets schema, which is explicitly out of scope —
spec §25). Task 3's mapper leaves these fields `undefined`; the presentation
components already/newly degrade gracefully (optional-field pattern), and
this gap is called out verbatim in the final report's "Remaining Issues"
per spec §6/§29 (explicit mapper needed, not a duplicated model).

**`groupServices` behavior with no `category` at all**
(`components/sections/MenuSection.tsx`): services without `category` bucket
under the literal string `"その他"`; if that is the *only* bucket
(`order.length <= 1`), the function returns them ungrouped with no heading —
so runtime services (all lacking `category`) render as a single flat list,
identical in structure to the "6 or fewer services" case already covered by
`MenuSection.test.tsx`. No code change needed in `MenuSection.tsx`/
`MenuCategory.tsx`.

**Test/build commands** (`apps/salon-portfolio/web/package.json`):
`npm test` (jest), `npm run typecheck` (`tsc --noEmit`), `npm run lint`
(`eslint`), `npm run build` (`next build`). GAS regression:
`apps/salon-portfolio/gas` → `npm test`, `npm run typecheck` (no GAS files
touched by this plan; run only to confirm zero regression per spec §22).

---

### Task 1: Branch + catalog response validators

**Files:**
- Create: `apps/salon-portfolio/web/lib/validation/catalogValidator.ts`
- Create: `apps/salon-portfolio/web/lib/validation/catalogValidator.test.ts`

**Interfaces:**
- Consumes: `PublicService`/`PublicStaff` from `@/types/reservation`.
- Produces: `parsePublicServices(value: unknown): PublicService[] | null` and
  `parsePublicStaff(value: unknown): PublicStaff[] | null` — used by Task 4's
  `runtimeCatalog.ts`.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feature/phase5-1-homepage-runtime-data
```

- [ ] **Step 2: Write the failing test file**

```ts
import { parsePublicServices, parsePublicStaff } from "./catalogValidator";

describe("parsePublicServices", () => {
  it("returns the array unchanged when every item has the expected shape", () => {
    const input = [
      { serviceId: "SV001", name: "ジェルネイル", durationMinutes: 60, price: 6000, displayOrder: 1 },
      { serviceId: "SV002", name: "フットジェル", durationMinutes: 90, price: 8000, displayOrder: 2 },
    ];
    expect(parsePublicServices(input)).toEqual(input);
  });

  it("returns null when the value is not an array", () => {
    expect(parsePublicServices({ not: "an array" })).toBeNull();
  });

  it("returns null when an item is missing a required field", () => {
    expect(parsePublicServices([{ serviceId: "SV001", name: "ジェルネイル" }])).toBeNull();
  });

  it("returns null when a numeric field has the wrong type", () => {
    const input = [{ serviceId: "SV001", name: "ジェルネイル", durationMinutes: "60", price: 6000, displayOrder: 1 }];
    expect(parsePublicServices(input)).toBeNull();
  });

  it("returns an empty array unchanged (valid empty catalog)", () => {
    expect(parsePublicServices([])).toEqual([]);
  });
});

describe("parsePublicStaff", () => {
  it("returns the array unchanged when every item has the expected shape", () => {
    const input = [{ staffId: "ST001", name: "田中 あい", displayOrder: 1 }];
    expect(parsePublicStaff(input)).toEqual(input);
  });

  it("returns null when the value is not an array", () => {
    expect(parsePublicStaff("nope")).toBeNull();
  });

  it("returns null when an item is missing a required field", () => {
    expect(parsePublicStaff([{ staffId: "ST001" }])).toBeNull();
  });

  it("returns an empty array unchanged (staffSelection disabled upstream)", () => {
    expect(parsePublicStaff([])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails (module doesn't exist yet)**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/catalogValidator -v`
Expected: FAIL — `Cannot find module './catalogValidator'`.

- [ ] **Step 4: Write the implementation**

```ts
/**
 * Structural validation for `getServices`/`getStaff` GAS responses —
 * mirrors `lib/validation/runtimeConfigValidator.ts::parsePublicRuntimeConfig`
 * exactly (same "return null on any shape mismatch, let the caller fall
 * back safely" contract). Business-rule validation (Active filtering,
 * DisplayOrder sorting) already happened in GAS
 * (`gas/src/PublicCatalog.ts`) before the response was ever sent —
 * duplicating that here would be dead code.
 */
import type { PublicService, PublicStaff } from "@/types/reservation";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parsePublicServices(value: unknown): PublicService[] | null {
  if (!Array.isArray(value)) return null;
  const services: PublicService[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      !isNonEmptyString(record.serviceId) ||
      !isNonEmptyString(record.name) ||
      !isFiniteNumber(record.durationMinutes) ||
      !isFiniteNumber(record.price) ||
      !isFiniteNumber(record.displayOrder)
    ) {
      return null;
    }
    services.push({
      serviceId: record.serviceId,
      name: record.name,
      durationMinutes: record.durationMinutes,
      price: record.price,
      displayOrder: record.displayOrder,
    });
  }
  return services;
}

export function parsePublicStaff(value: unknown): PublicStaff[] | null {
  if (!Array.isArray(value)) return null;
  const staff: PublicStaff[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      !isNonEmptyString(record.staffId) ||
      !isNonEmptyString(record.name) ||
      !isFiniteNumber(record.displayOrder)
    ) {
      return null;
    }
    staff.push({
      staffId: record.staffId,
      name: record.name,
      displayOrder: record.displayOrder,
    });
  }
  return staff;
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/catalogValidator -v`
Expected: PASS, all 9 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/validation/catalogValidator.ts lib/validation/catalogValidator.test.ts
git commit -m "feat(web): add getServices/getStaff response validators"
```

---

### Task 2: Pure mappers from wire types to presentation types

**Files:**
- Create: `apps/salon-portfolio/web/lib/config/resolveCatalog.ts`
- Create: `apps/salon-portfolio/web/lib/config/resolveCatalog.test.ts`

**Interfaces:**
- Consumes: `PublicService`/`PublicStaff` (`@/types/reservation`),
  `Service`/`StaffMember` (`@/types/content`).
- Produces: `mapPublicServiceToService(service: PublicService): Service`,
  `mapPublicStaffToStaffMember(staff: PublicStaff): StaffMember` — used by
  Task 4's `runtimeCatalog.ts`.

- [ ] **Step 1: Write the failing test file**

```ts
import { mapPublicServiceToService, mapPublicStaffToStaffMember } from "./resolveCatalog";
import type { PublicService, PublicStaff } from "@/types/reservation";

describe("mapPublicServiceToService", () => {
  it("carries serviceId/name/durationMinutes/price through unchanged", () => {
    const input: PublicService = {
      serviceId: "SV001",
      name: "ジェルネイル",
      durationMinutes: 60,
      price: 6000,
      displayOrder: 1,
    };
    expect(mapPublicServiceToService(input)).toEqual({
      serviceId: "SV001",
      name: "ジェルネイル",
      durationMinutes: 60,
      price: 6000,
    });
  });

  it("does not invent a description or category", () => {
    const input: PublicService = { serviceId: "SV001", name: "x", durationMinutes: 1, price: 1, displayOrder: 1 };
    const result = mapPublicServiceToService(input);
    expect(result.description).toBeUndefined();
    expect(result.category).toBeUndefined();
  });
});

describe("mapPublicStaffToStaffMember", () => {
  it("carries staffId/name through unchanged", () => {
    const input: PublicStaff = { staffId: "ST001", name: "田中 あい", displayOrder: 1 };
    expect(mapPublicStaffToStaffMember(input)).toEqual({ staffId: "ST001", name: "田中 あい" });
  });

  it("does not invent role/introduction/photo fields", () => {
    const input: PublicStaff = { staffId: "ST001", name: "x", displayOrder: 1 };
    const result = mapPublicStaffToStaffMember(input);
    expect(result.role).toBeUndefined();
    expect(result.introduction).toBeUndefined();
    expect(result.photoSrc).toBeUndefined();
    expect(result.photoAlt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveCatalog -v`
Expected: FAIL — module not found, and (until Task 3 lands) a TS error on
the `StaffMember` optional-field assertions. That's expected at this point;
Task 3 makes `StaffMember`'s extra fields optional. Write this test file now
so Task 3's step order is test-first for the type change too — but do not
worry if this specific file's TS errors don't clear until Task 3 finishes;
Step 5 below is the real gate for this task.

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Maps the canonical GAS-backed catalog wire types — the same
 * `PublicService`/`PublicStaff` the Reservation Wizard already consumes
 * (`lib/api/reservationClient.ts`) — onto the homepage's presentation
 * types (`types/content.ts`). `description`/`category` (Service) and
 * `role`/`introduction`/`photoSrc`/`photoAlt` (StaffMember) have no
 * equivalent column in the SERVICES/STAFF sheets
 * (`apps/salon-portfolio/gas/src/SheetSchemas.ts`), so they are left
 * `undefined` here rather than invented — `MenuRow`/`StaffCard` already
 * render those fields conditionally (see their own files).
 */
import type { PublicService, PublicStaff } from "@/types/reservation";
import type { Service, StaffMember } from "@/types/content";

export function mapPublicServiceToService(service: PublicService): Service {
  return {
    serviceId: service.serviceId,
    name: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
  };
}

export function mapPublicStaffToStaffMember(staff: PublicStaff): StaffMember {
  return {
    staffId: staff.staffId,
    name: staff.name,
  };
}
```

- [ ] **Step 4: Run the test — expect it still fails until Task 3**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveCatalog -v`
Expected: TypeScript compile error from `StaffMember`'s currently-required
`role`/`introduction`/`photoSrc`/`photoAlt` fields. Proceed to Task 3, then
return here.

- [ ] **Step 5 (after Task 3 lands): Run the test to confirm it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveCatalog -v`
Expected: PASS, all 4 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/config/resolveCatalog.ts lib/config/resolveCatalog.test.ts
git commit -m "feat(web): add pure mappers from PublicService/PublicStaff to homepage models"
```

---

### Task 3: Make StaffMember's presentation-only fields optional + StaffCard graceful degradation

**Files:**
- Modify: `apps/salon-portfolio/web/types/content.ts`
- Modify: `apps/salon-portfolio/web/components/sections/StaffCard.tsx`
- Modify: `apps/salon-portfolio/web/components/sections/StaffSection.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `StaffMember.role`/`introduction`/`photoSrc`/`photoAlt` become
  `string | undefined` (same optionality pattern `Service.description`/
  `category` already use). `StaffCard` renders a graceful fallback for each
  when absent instead of crashing or printing "undefined".

- [ ] **Step 1: Write the failing test (extend StaffSection.test.tsx)**

Add this test to the existing `describe("StaffSection", ...)` block in
`apps/salon-portfolio/web/components/sections/StaffSection.test.tsx`:

```ts
  it("renders a runtime-sourced staff member with no role/introduction/photo without crashing", () => {
    const runtimeStaff: StaffMember[] = [{ staffId: "ST002", name: "鈴木 さくら" }];
    render(
      <StaffSection enabled staff={runtimeStaff} anyAvailableOption={false} businessNameInitial="凛" />,
    );
    expect(screen.getByText("鈴木 さくら")).toBeInTheDocument();
    // Falls back to an initial-letter tile (same convention as
    // AnyAvailableStaffCard) instead of rendering a broken <img>.
    expect(screen.getByText("鈴")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd apps/salon-portfolio/web && npx jest components/sections/StaffSection -v`
Expected: FAIL — either a TS error (StaffMember requires role/introduction/
photoSrc/photoAlt) or (once the type is loosened) a missing "鈴" text
assertion, since `StaffCard` doesn't yet render an initial-letter fallback.

- [ ] **Step 3: Loosen `StaffMember` in `types/content.ts`**

Change:
```ts
export interface StaffMember {
  staffId: string;
  name: string;
  role: string;
  introduction: string;
  photoSrc: string;
  photoAlt: string;
}
```
to:
```ts
export interface StaffMember {
  staffId: string;
  name: string;
  /** Frontend-presentation-only fields — no equivalent column in the
   *  STAFF sheet (apps/salon-portfolio/gas/src/SheetSchemas.ts), so a
   *  runtime-sourced staff member (lib/config/runtimeCatalog.ts) never
   *  has these. `config/demo-content.ts`'s STAFF still sets all four. */
  role?: string;
  introduction?: string;
  photoSrc?: string;
  photoAlt?: string;
}
```

- [ ] **Step 4: Make `StaffCard.tsx` render each optional field conditionally**

Replace the whole file with:
```tsx
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import type { StaffMember } from "@/types/content";

/** Staff portrait card (Phase 2A §10) — consistent 4:5 photo aspect ratio
 * across all staff so the grid stays even. No rating widgets/fake numbers.
 * `role`/`introduction`/`photoSrc`/`photoAlt` are optional (Phase 5.1) —
 * a runtime-sourced staff member (getStaff) never carries them, since the
 * STAFF sheet has no columns for them. When the photo is missing, this
 * falls back to the same initial-letter tile treatment
 * `AnyAvailableStaffCard` already uses, so the grid never shows a broken
 * image. */
export function StaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div>
      {staff.photoSrc ? (
        <PlaceholderImage
          src={staff.photoSrc}
          alt={staff.photoAlt ?? staff.name}
          width={800}
          height={1000}
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          className="rounded-sm"
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-sm bg-surface-sunken"
          style={{ aspectRatio: "800 / 1000" }}
        >
          <span className="text-[56px] font-medium text-accent/70" aria-hidden="true">
            {staff.name.slice(0, 1)}
          </span>
        </div>
      )}
      <p className="mt-4 text-[20px] leading-[1.4] font-medium text-primary">{staff.name}</p>
      {staff.role ? <p className="text-[14px] text-accent">{staff.role}</p> : null}
      {staff.introduction ? (
        <p className="mt-1 text-[14px] leading-[1.43] text-muted">{staff.introduction}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `cd apps/salon-portfolio/web && npx jest components/sections/StaffSection -v`
Expected: PASS, all 4 tests (3 existing + 1 new).

- [ ] **Step 6: Run the full test suite once to catch any other StaffMember-shape assumption**

Run: `cd apps/salon-portfolio/web && npm test`
Expected: PASS — no other file constructs a `StaffMember` in a way this
change breaks (`role`/`introduction`/`photoSrc`/`photoAlt` going from
required to optional cannot break any caller that still supplies them, only
callers that omit them — which is exactly the new runtime path).

- [ ] **Step 7: Commit**

```bash
git add types/content.ts components/sections/StaffCard.tsx components/sections/StaffSection.test.tsx
git commit -m "feat(web): make StaffCard degrade gracefully without role/introduction/photo"
```

---

### Task 4: `runtimeCatalog.ts` — fetch/validate/map/fallback, mirroring runtimeConfig.ts

**Files:**
- Create: `apps/salon-portfolio/web/lib/config/runtimeCatalog.ts`
- Create: `apps/salon-portfolio/web/lib/config/runtimeCatalog.test.ts`

**Interfaces:**
- Consumes: `callGasAction` (`@/lib/api/gasClient`), `parsePublicServices`/
  `parsePublicStaff` (Task 1), `mapPublicServiceToService`/
  `mapPublicStaffToStaffMember` (Task 2), `SERVICES`/`STAFF`
  (`@/config/demo-content`), `RuntimeConfigStatus`
  (`@/types/runtime-config`).
- Produces: `export interface RuntimeCatalogResult { status:
  RuntimeConfigStatus; services: Service[]; staff: StaffMember[] }`,
  `export async function loadRuntimeCatalog(): Promise<RuntimeCatalogResult>`,
  `export const getRuntimeCatalog = cache(loadRuntimeCatalog)` — consumed by
  Task 5 (`app/page.tsx`) and Task 6 (`app/layout.tsx`).

- [ ] **Step 1: Write the failing test file**

```ts
jest.mock("../api/gasClient", () => ({
  callGasAction: jest.fn(),
}));

import { callGasAction } from "@/lib/api/gasClient";
import { loadRuntimeCatalog } from "./runtimeCatalog";
import { SERVICES, STAFF } from "@/config/demo-content";

const mockedCallGasAction = callGasAction as jest.Mock;
const ORIGINAL_ENV = process.env;

const RUNTIME_SERVICES = [
  { serviceId: "SV001", name: "ジェルネイル", durationMinutes: 60, price: 6000, displayOrder: 1 },
];
const RUNTIME_STAFF = [{ staffId: "ST001", name: "田中 あい", displayOrder: 1 }];

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mockedCallGasAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("loadRuntimeCatalog", () => {
  it("returns demo-fallback with the demo SERVICES/STAFF when GAS_WEBAPP_URL is not set", async () => {
    delete process.env.GAS_WEBAPP_URL;

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "demo-fallback", services: SERVICES, staff: STAFF });
    expect(mockedCallGasAction).not.toHaveBeenCalled();
  });

  it("returns runtime with mapped services/staff on success", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
        : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
    );

    const result = await loadRuntimeCatalog();

    expect(result.status).toBe("runtime");
    expect(result.services).toEqual([
      { serviceId: "SV001", name: "ジェルネイル", durationMinutes: 60, price: 6000 },
    ]);
    expect(result.staff).toEqual([{ staffId: "ST001", name: "田中 あい" }]);
  });

  it("returns runtime with an empty staff list when staffSelection is off upstream (not an error)", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
        : Promise.resolve({ ok: true, data: [] }),
    );

    const result = await loadRuntimeCatalog();

    expect(result.status).toBe("runtime");
    expect(result.staff).toEqual([]);
  });

  it("falls back to demo-content for both when getServices reports ok:false", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: false, error: { code: "SHEET_ERROR", message: "x" } })
        : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
    );

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  it("falls back to demo-content for both when getStaff reports ok:false", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
        : Promise.resolve({ ok: false, error: { code: "SHEET_ERROR", message: "x" } }),
    );

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  it("falls back to demo-content when a response fails shape validation", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: { nonsense: true } })
        : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
    );

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  it("falls back to demo-content when callGasAction throws", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockRejectedValue(new Error("network down"));

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/runtimeCatalog -v`
Expected: FAIL — `Cannot find module './runtimeCatalog'`.

- [ ] **Step 3: Write the implementation**

```ts
import { cache } from "react";
import { callGasAction } from "@/lib/api/gasClient";
import { parsePublicServices, parsePublicStaff } from "@/lib/validation/catalogValidator";
import { mapPublicServiceToService, mapPublicStaffToStaffMember } from "@/lib/config/resolveCatalog";
import { SERVICES, STAFF } from "@/config/demo-content";
import type { RuntimeConfigStatus } from "@/types/runtime-config";
import type { Service, StaffMember } from "@/types/content";

export interface RuntimeCatalogResult {
  status: RuntimeConfigStatus;
  services: Service[];
  staff: StaffMember[];
}

/** Same demo-fallback rationale as `runtimeConfig.ts::DEMO_RUNTIME_CONFIG` —
 *  reuses the exact `SERVICES`/`STAFF` every other demo-mode section still
 *  renders from, unchanged (they already match `Service[]`/`StaffMember[]`
 *  with description/category/role/introduction/photo intact). */
const DEMO_CATALOG = { services: SERVICES, staff: STAFF };

/**
 * Uncached core — mirrors `lib/config/runtimeConfig.ts::loadRuntimeConfig`
 * exactly: same `demo-fallback`/`runtime`/`runtime-error` status
 * vocabulary, same "any failure anywhere falls back to demo, all or
 * nothing" behavior (never mixes a real service list with demo staff or
 * vice versa — one `status` describes both). `getRuntimeCatalog` (the
 * `cache()`-wrapped export below) is what `app/page.tsx`/`app/layout.tsx`
 * actually call.
 */
export async function loadRuntimeCatalog(): Promise<RuntimeCatalogResult> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    return { status: "demo-fallback", ...DEMO_CATALOG };
  }

  try {
    const [servicesResult, staffResult] = await Promise.all([
      callGasAction<unknown>("getServices", {}),
      callGasAction<unknown>("getStaff", {}),
    ]);

    if (!servicesResult.ok) {
      console.error(
        `[runtimeCatalog] getServices failed: ${servicesResult.error.code} ${servicesResult.error.message}`,
      );
      return { status: "runtime-error", ...DEMO_CATALOG };
    }
    if (!staffResult.ok) {
      console.error(
        `[runtimeCatalog] getStaff failed: ${staffResult.error.code} ${staffResult.error.message}`,
      );
      return { status: "runtime-error", ...DEMO_CATALOG };
    }

    const parsedServices = parsePublicServices(servicesResult.data);
    if (!parsedServices) {
      console.error("[runtimeCatalog] getServices returned a malformed shape.");
      return { status: "runtime-error", ...DEMO_CATALOG };
    }
    const parsedStaff = parsePublicStaff(staffResult.data);
    if (!parsedStaff) {
      console.error("[runtimeCatalog] getStaff returned a malformed shape.");
      return { status: "runtime-error", ...DEMO_CATALOG };
    }

    return {
      status: "runtime",
      services: parsedServices.map(mapPublicServiceToService),
      staff: parsedStaff.map(mapPublicStaffToStaffMember),
    };
  } catch (error) {
    console.error("[runtimeCatalog] unexpected error calling getServices/getStaff:", error);
    return { status: "runtime-error", ...DEMO_CATALOG };
  }
}

export const getRuntimeCatalog = cache(loadRuntimeCatalog);
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/runtimeCatalog -v`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/config/runtimeCatalog.ts lib/config/runtimeCatalog.test.ts
git commit -m "feat(web): add runtimeCatalog fetch/validate/map/fallback layer"
```

---

### Task 5: Wire `app/page.tsx` to the runtime catalog

**Files:**
- Modify: `apps/salon-portfolio/web/app/page.tsx`

**Interfaces:**
- Consumes: `getRuntimeCatalog` (Task 4), existing `getRuntimeConfig`
  (unchanged).
- Produces: no new exports — `Home()`'s rendered output for Menu/Staff now
  comes from the runtime catalog instead of `config/demo-content.ts`.

- [ ] **Step 1: Edit the imports**

Remove `SERVICES` and `STAFF` from the `@/config/demo-content` import list
(keep `ACCESS_INFO, CUSTOMER_FLOW_STEPS, FAQ_ITEMS, GALLERY_IMAGES,
SALON_FEATURES`). Add:
```ts
import { getRuntimeCatalog } from "@/lib/config/runtimeCatalog";
```

- [ ] **Step 2: Replace the stale Phase-4 comment and fetch both resources concurrently**

Replace this comment block:
```ts
// SERVICES/STAFF/GALLERY_IMAGES/SALON_FEATURES/CUSTOMER_FLOW_STEPS/
// FAQ_ITEMS/ACCESS_INFO are not part of the Phase 3A `getConfig` contract
// (no `services`/`staff` fields in `PublicConfig`) and stay on
// `config/demo-content.ts` — see docs/runtime-config-guide.md for the
// Phase 4 plan to move SERVICES/STAFF onto `getServices`/`getStaff`.
export default async function Home() {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);
```
with:
```ts
// GALLERY_IMAGES/SALON_FEATURES/CUSTOMER_FLOW_STEPS/FAQ_ITEMS/ACCESS_INFO
// are not part of the `getConfig` contract (no such fields in
// `PublicConfig`) and stay frontend-owned on `config/demo-content.ts`.
// SERVICES/STAFF moved onto `getServices`/`getStaff` in Phase 5.1
// (lib/config/runtimeCatalog.ts) — see docs/runtime-config-guide.md.
export default async function Home() {
  const [{ config }, { services, staff }] = await Promise.all([
    getRuntimeConfig(),
    getRuntimeCatalog(),
  ]);
  const siteConfig = resolveSiteConfig(config);
```

- [ ] **Step 3: Replace `SERVICES`/`STAFF` props with the fetched values**

```ts
      <MenuSection services={services} />

      <StaffSection
        enabled={siteConfig.features.staffSelection}
        staff={staff}
        anyAvailableOption={siteConfig.staffAnyAvailableOption}
        businessNameInitial={siteConfig.business.name}
      />
```
(unchanged otherwise — same props, same order, same surrounding JSX).

- [ ] **Step 4: Typecheck + build**

Run: `cd apps/salon-portfolio/web && npm run typecheck`
Expected: PASS, no errors.

Run: `cd apps/salon-portfolio/web && npm run build`
Expected: PASS — the `/` route still prerenders/builds successfully with
`GAS_WEBAPP_URL` unset (demo-fallback branch, same as today).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(web): serve homepage Menu/Staff from the runtime catalog"
```

---

### Task 6: Extend the existing runtime-error notice to cover catalog failures

**Files:**
- Modify: `apps/salon-portfolio/web/app/layout.tsx`

**Interfaces:**
- Consumes: `getRuntimeCatalog` (Task 4) — `cache()`-wrapped, so this adds
  zero extra network calls (dedupes with `app/page.tsx`'s call within the
  same request, exactly like `getRuntimeConfig` already dedupes across
  `generateMetadata`/`RootLayout`/`Home`).
- Produces: no new exports — `RuntimeConfigNotice` now also shows when the
  catalog (not just the config) failed, per spec §10's explicit rule that a
  real backend failure must never be silently indistinguishable from demo
  mode.

- [ ] **Step 1: Add the import**

```ts
import { getRuntimeCatalog } from "@/lib/config/runtimeCatalog";
```

- [ ] **Step 2: Fetch the catalog status alongside the config status**

Replace:
```ts
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { status, config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);
```
with:
```ts
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ status, config }, { status: catalogStatus }] = await Promise.all([
    getRuntimeConfig(),
    getRuntimeCatalog(),
  ]);
  const siteConfig = resolveSiteConfig(config);
  const showRuntimeNotice = status === "runtime-error" || catalogStatus === "runtime-error";
```

- [ ] **Step 3: Use the combined flag**

Replace:
```tsx
        <RuntimeConfigNotice show={status === "runtime-error"} />
```
with:
```tsx
        <RuntimeConfigNotice show={showRuntimeNotice} />
```

- [ ] **Step 4: Typecheck + full test suite**

Run: `cd apps/salon-portfolio/web && npm run typecheck && npm test`
Expected: PASS. (No existing test directly renders `RootLayout` today —
verified by the file list gathered during planning — so no existing test
needs updating for this step; if one is found during execution that does
assert on this exact prop wiring, update it to also mock `getRuntimeCatalog`
the same way it already mocks `getRuntimeConfig`.)

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(web): surface catalog runtime errors through the existing notice banner"
```

---

### Task 7: Update the stale ownership-boundary doc

**Files:**
- Modify: `docs/runtime-config-guide.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Fix the "Frontend owns" list and the stale Phase-4 note**

In the `## Ownership boundary` section, replace:
```markdown
**Frontend owns** (stays in `config/demo-content.ts`, never sent by GAS):
`business.nameLatin`, `business.tagline`, `business.postalCode`,
`socialLinks`, all of `SERVICES`, `STAFF`, `GALLERY_IMAGES`,
`SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`, `FAQ_ITEMS`, `ACCESS_INFO`
(transit directions), and every visual/typography/spacing/layout
decision.
```
```markdown
`SERVICES`/`STAFF` are not part of the Phase 3A `PublicConfig` contract
at all (verified in `gas/src/models/Config.ts`) — per `docs/roadmap.md`,
`getServices`/`getStaff` are Phase 4 work. Phase 3B does not invent a
second API to fetch them early.
```
with:
```markdown
**Frontend owns** (stays in `config/demo-content.ts`, never sent by GAS):
`business.nameLatin`, `business.tagline`, `business.postalCode`,
`socialLinks`, `GALLERY_IMAGES`, `SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`,
`FAQ_ITEMS`, `ACCESS_INFO` (transit directions), and every
visual/typography/spacing/layout decision. `config/demo-content.ts`'s
`SERVICES`/`STAFF` remain the demo-fallback catalog only (see below).
```
```markdown
`SERVICES`/`STAFF` moved onto `getServices`/`getStaff` in Phase 5.1
(`lib/config/runtimeCatalog.ts`), following the exact same
fetch/validate/fallback shape as `getConfig` above. The one difference:
`Service`/`StaffMember`'s presentation-only fields
(`description`/`category`/`role`/`introduction`/`photoSrc`/`photoAlt`)
have no equivalent column in the `SERVICES`/`STAFF` sheets
(`gas/src/SheetSchemas.ts`), so a runtime-sourced Menu/Staff entry never
carries them — `lib/config/resolveCatalog.ts`'s mappers leave them
`undefined`, and `MenuRow`/`StaffCard` render them conditionally. The
demo-fallback branch is unaffected: it still reuses `SERVICES`/`STAFF`
from `config/demo-content.ts` directly, with all presentation fields
intact.
```

- [ ] **Step 2: Add catalog rows to the fallback table's surrounding prose**

Immediately after the existing `| unset | ... |` fallback table in
`## Fallback / error behavior`, add one sentence:
```markdown
`lib/config/runtimeCatalog.ts` (Menu/Staff) follows this exact same table —
same three statuses, same all-or-nothing fallback (a `getServices` failure
falls back Menu *and* Staff together, never a mix of real and demo data).
```

- [ ] **Step 3: Verify no other doc references the now-fixed stale claim**

```bash
grep -rn "Phase 4 work" docs/runtime-config-guide.md
```
Expected: no matches (the sentence was removed in Step 1).

- [ ] **Step 4: Commit**

```bash
git add docs/runtime-config-guide.md
git commit -m "docs: correct runtime-config-guide for Phase 5.1 catalog wiring"
```

---

### Task 8: Full verification pass (frontend + GAS regression)

**Files:** none created/modified — verification only.

- [ ] **Step 1: Frontend full suite**

```bash
cd apps/salon-portfolio/web
npm test 2>&1 | tee /tmp/phase5-1-web-test.log
npm run typecheck 2>&1 | tee /tmp/phase5-1-web-typecheck.log
npm run lint 2>&1 | tee /tmp/phase5-1-web-lint.log
npm run build 2>&1 | tee /tmp/phase5-1-web-build.log
```
Expected: all four PASS with zero new failures/errors/warnings.

- [ ] **Step 2: GAS regression (no GAS files touched — confirm zero change in baseline)**

```bash
cd apps/salon-portfolio/gas
npm test 2>&1 | tee /tmp/phase5-1-gas-test.log
npm run typecheck 2>&1 | tee /tmp/phase5-1-gas-typecheck.log
```
Expected: identical pass/fail counts to the pre-change baseline (no GAS
source file is modified by this plan).

- [ ] **Step 3: Save evidence per the project's evidence-reporting protocol**

Copy the four web logs and two GAS logs into
`.evidence/<yyyyMMdd-HHmm>-phase5-1-homepage-runtime-data/`, plus
`git diff master --stat` → `diff.patch`/`status.txt` per the standing
evidence-reporting rule.

- [ ] **Step 4: Report results**

Summarize per the Definition of Done checklist in the original task prompt
(spec §26) and the final-report structure (spec §28) — test counts with
new-test names, typecheck/lint/build PASS/FAIL, architecture verification
statement, and any remaining issues (the description/category/role/
introduction/photo data-model gap documented in this plan's Ground-truth
Facts section is the one known, out-of-scope gap to name explicitly).
