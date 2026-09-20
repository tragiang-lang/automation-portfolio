# V1.1 Task 4 — Runtime Content Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the SERVICES/STAFF/CONFIG runtime data ceiling identified in
`docs/design-customization-audit.md` §C so the homepage Menu/Staff sections
and business-presentation fields (tagline/nameLatin/postalCode/socialLinks)
can be sourced from a buyer's real Google Sheets data, without breaking any
existing installation whose Sheets predate this change.

**Architecture:** Add optional (never required) columns to the SERVICES and
STAFF sheets, and optional (never required) keys to the CONFIG sheet. Thread
them through the existing GAS parse → validate → public-projection pipeline
and the existing frontend validate → resolve pipeline as optional fields
with safe fallbacks, reusing every existing type/interface rather than
creating parallel ones. No new GAS action, no new frontend component, no
change to reservation eligibility/pricing/availability logic.

**Tech Stack:** TypeScript, Jest (both `apps/salon-portfolio/gas` and
`apps/salon-portfolio/web`), Next.js/React (frontend only touches
`lib`/`types`, not components — `MenuRow`/`MenuCategory`/`StaffCard` already
render these fields conditionally today).

**Spec:** The task prompt in this session (see conversation) plus
`docs/design-customization-audit.md` §C (the "runtime-data ceiling"
finding) and `docs/presentation-config-architecture.md` (confirms this work
is entirely on the *content/runtime* axis, never the *design/preset* axis).

## Global Constraints

- Never make a new column/CONFIG key required — `assertRequiredHeaders`
  (GAS `RowMapper.ts`) must never be asked to require a column that a
  pre-this-task SERVICES/STAFF sheet doesn't have; `parseAppConfig` (GAS
  `ConfigParser.ts`) must never push an `issues` entry for a missing new
  CONFIG key.
- `price`, `durationMinutes`, `Active`, staff/service eligibility, and
  `getAvailability`/`createReservation` behavior must not change at all.
- No new GAS action; extend `getConfig`/`getServices`/`getStaff`'s existing
  response contracts only.
- No `spreadsheetId`, Script Property, or internal diagnostic ever enters a
  public response.
- Staff photo support stays a local `public/images/staff/...`-style path
  (no `next.config.ts` change, no remote image domains, no arbitrary
  external URL) — confirmed safe because `next.config.ts` today configures
  no `images.domains`/`remotePatterns` at all.
- Extend existing types (`PublicService`, `PublicStaff`, `AppConfig`,
  `PublicConfig`, `PublicRuntimeConfig`, `Service`, `StaffMember`,
  `SiteConfig`) — do not create `DisplayService`/`HomepageStaff`/etc.
  parallel types.
- Every new field is optional and additive; every existing required field
  and every existing test's inputs/assertions stay valid.
- Do not touch `types/design-config.ts`, `config/design-presets.ts`,
  `config/theme-tokens.ts`, `config/typography-tokens.ts`, or any
  `DesignConfig` file — this task is the content/runtime axis only.
- One commit at the end, on `feature/v1-1-design-customization`, only after
  full validation — per explicit task instructions (overrides this skill's
  usual per-task commit default).

---

## Part A — GAS backend (`apps/salon-portfolio/gas`)

### Task 1: `RowMapper.rowsToObjects` gains an optional-columns parameter

**Files:**
- Modify: `apps/salon-portfolio/gas/src/RowMapper.ts`
- Test: `apps/salon-portfolio/gas/tests/RowMapper.test.ts`

**Interfaces:**
- Produces: `rowsToObjects<T>(headerMap, dataRows, columns, optionalColumns?: readonly string[])` — a 4th parameter, defaulting to `[]`, so every existing call site (`ConfigStore.ts` × 2) is unaffected. A column named in `optionalColumns` is included in the mapped object (defaulting to `""` when the sheet has no such header) but is never passed to `assertRequiredHeaders`, so its absence from the sheet's header row never throws `MissingHeadersError`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/gas/tests/RowMapper.test.ts — add inside describe("rowsToObjects")
it("includes an optional column's value when the sheet has that header", () => {
  const headerMap = buildHeaderMap(["Name", "Active", "DisplayOrder", "Role"]);
  const result = rowsToObjects(
    headerMap,
    [["Alice", true, 1, "Manager"]],
    ["Name", "Active", "DisplayOrder"],
    ["Role"],
  );
  expect(result).toEqual([{ Name: "Alice", Active: true, DisplayOrder: 1, Role: "Manager" }]);
});

it("never throws when an optional column's header is entirely absent from the sheet", () => {
  const headerMap = buildHeaderMap(["Name", "Active", "DisplayOrder"]);
  expect(() =>
    rowsToObjects(headerMap, [["Alice", true, 1]], ["Name", "Active", "DisplayOrder"], ["Role"]),
  ).not.toThrow();
  const result = rowsToObjects(
    headerMap,
    [["Alice", true, 1]],
    ["Name", "Active", "DisplayOrder"],
    ["Role"],
  );
  expect(result[0]).not.toHaveProperty("Role");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest RowMapper.test.ts`
Expected: FAIL — `rowsToObjects` currently accepts only 3 params, and the
first new test's expectation (`Role: "Manager"` present) fails.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/gas/src/RowMapper.ts — replace rowsToObjects
export function rowsToObjects<T extends Record<string, unknown>>(
  headerMap: Record<string, number>,
  dataRows: unknown[][],
  columns: readonly string[],
  optionalColumns: readonly string[] = [],
): T[] {
  assertRequiredHeaders(headerMap, columns);
  const presentOptionalColumns = optionalColumns.filter((column) => column in headerMap);
  return dataRows.map((row) => {
    const obj = {} as Record<string, unknown>;
    for (const column of columns) {
      const index = headerMap[column];
      obj[column] = row[index] ?? "";
    }
    for (const column of presentOptionalColumns) {
      const index = headerMap[column];
      obj[column] = row[index] ?? "";
    }
    return obj as T;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest RowMapper.test.ts`
Expected: PASS, including every pre-existing `rowsToObjects` test (no
behavior change for the 3-argument call shape).

- [ ] **Step 5: Commit** — deferred to the single end-of-task commit (see Global Constraints).

---

### Task 2: SERVICES/STAFF optional sheet columns in `SheetSchemas.ts`

**Files:**
- Modify: `apps/salon-portfolio/gas/src/SheetSchemas.ts`
- Test: `apps/salon-portfolio/gas/tests/SheetSchemas.test.ts`

**Interfaces:**
- Produces: `SERVICES_OPTIONAL_HEADERS = ["Description", "Category"] as const`, `STAFF_OPTIONAL_HEADERS = ["Role", "Bio", "ImagePath"] as const`; `ServiceRow` gains `Description?: string; Category?: string`; `StaffRow` gains `Role?: string; Bio?: string; ImagePath?: string`. `SERVICES_HEADERS`/`STAFF_HEADERS` (the required lists) are unchanged.

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/gas/tests/SheetSchemas.test.ts — add
import { SERVICES_HEADERS, SERVICES_OPTIONAL_HEADERS, STAFF_HEADERS, STAFF_OPTIONAL_HEADERS } from "../src/SheetSchemas";

describe("SERVICES/STAFF optional presentation columns (V1.1)", () => {
  it("keeps the required SERVICES/STAFF headers unchanged", () => {
    expect(SERVICES_HEADERS).toEqual([
      "ServiceID", "Name", "DurationMinutes", "Price", "Active", "StaffRequired", "DisplayOrder",
    ]);
    expect(STAFF_HEADERS).toEqual(["StaffID", "Name", "Active", "CalendarID", "DisplayOrder"]);
  });

  it("defines SERVICES optional headers as Description/Category", () => {
    expect(SERVICES_OPTIONAL_HEADERS).toEqual(["Description", "Category"]);
  });

  it("defines STAFF optional headers as Role/Bio/ImagePath", () => {
    expect(STAFF_OPTIONAL_HEADERS).toEqual(["Role", "Bio", "ImagePath"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest SheetSchemas.test.ts`
Expected: FAIL — `SERVICES_OPTIONAL_HEADERS`/`STAFF_OPTIONAL_HEADERS` don't exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/gas/src/SheetSchemas.ts — replace the SERVICES and STAFF blocks
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
/** Optional presentation columns (V1.1 Task 4) — a SERVICES sheet from
 *  before this task has neither column. `Catalog.ts` passes these as
 *  `rowsToObjects`'s optional-columns argument, so their absence is never
 *  a MissingHeadersError; a present-but-blank cell parses to `undefined`
 *  the same way a wholly-missing column does. Never read by reservation
 *  eligibility/pricing logic (`ReservationRules.ts`). */
export const SERVICES_OPTIONAL_HEADERS = ["Description", "Category"] as const;
export interface ServiceRow {
  ServiceID: string;
  Name: string;
  DurationMinutes: number;
  Price: number;
  Active: boolean;
  StaffRequired: boolean;
  DisplayOrder: number;
  Description?: string;
  Category?: string;
}

/** STAFF: salon stylist catalog (Phase 0 §C). */
export const STAFF_HEADERS = [
  "StaffID",
  "Name",
  "Active",
  "CalendarID",
  "DisplayOrder",
] as const;
/** Optional presentation columns (V1.1 Task 4) — same backward-compatible
 *  contract as SERVICES_OPTIONAL_HEADERS above. `ImagePath` is a path
 *  under the buyer's own `public/images/staff/` (e.g.
 *  `/images/staff/staff-05.jpg`), never an arbitrary external URL —
 *  `next.config.ts` configures no remote image domains, and this keeps
 *  staff photos on the same "replace a file in your own project" flow
 *  `05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md` already documents. */
export const STAFF_OPTIONAL_HEADERS = ["Role", "Bio", "ImagePath"] as const;
export interface StaffRow {
  StaffID: string;
  Name: string;
  Active: boolean;
  CalendarID?: string;
  DisplayOrder: number;
  Role?: string;
  Bio?: string;
  ImagePath?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest SheetSchemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** — deferred.

---

### Task 3: `CatalogParser.ts` parses the new optional fields

**Files:**
- Modify: `apps/salon-portfolio/gas/src/CatalogParser.ts`
- Test: `apps/salon-portfolio/gas/tests/CatalogParser.test.ts`

**Interfaces:**
- Consumes: `ServiceRow`/`StaffRow` from Task 2.
- Produces: `parseServiceRow`/`parseStaffRow` populate `Description`/`Category`/`Role`/`Bio`/`ImagePath` as `string | undefined` (trimmed, blank → `undefined`).

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/gas/tests/CatalogParser.test.ts — add
describe("parseServiceRow optional presentation fields (V1.1)", () => {
  it("trims and includes Description/Category when present", () => {
    const result = parseServiceRow({
      ServiceID: "SV001", Name: "ジェルネイル", DurationMinutes: 60, Price: 6000,
      Active: true, StaffRequired: false, DisplayOrder: 1,
      Description: "  指先に一色。  ", Category: " ジェルネイル ",
    });
    expect(result.Description).toBe("指先に一色。");
    expect(result.Category).toBe("ジェルネイル");
  });

  it("leaves Description/Category undefined when the cell is blank or the column is absent", () => {
    const result = parseServiceRow({
      ServiceID: "SV001", Name: "x", DurationMinutes: 60, Price: 6000,
      Active: true, StaffRequired: false, DisplayOrder: 1, Description: "",
    });
    expect(result.Description).toBeUndefined();
    expect(result.Category).toBeUndefined();
  });
});

describe("parseStaffRow optional presentation fields (V1.1)", () => {
  it("trims and includes Role/Bio/ImagePath when present", () => {
    const result = parseStaffRow({
      StaffID: "ST001", Name: "田中", Active: true, DisplayOrder: 1,
      Role: " 店長 ", Bio: " 丁寧な施術。 ", ImagePath: " /images/staff/st001.jpg ",
    });
    expect(result.Role).toBe("店長");
    expect(result.Bio).toBe("丁寧な施術。");
    expect(result.ImagePath).toBe("/images/staff/st001.jpg");
  });

  it("leaves Role/Bio/ImagePath undefined when blank or absent", () => {
    const result = parseStaffRow({ StaffID: "ST001", Name: "x", Active: true, DisplayOrder: 1 });
    expect(result.Role).toBeUndefined();
    expect(result.Bio).toBeUndefined();
    expect(result.ImagePath).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest CatalogParser.test.ts`
Expected: FAIL — current `parseServiceRow`/`parseStaffRow` don't set these fields.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/gas/src/CatalogParser.ts — add helper, extend both parse functions
function toOptionalTrimmedString(value: unknown): string | undefined {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : undefined;
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
    Description: toOptionalTrimmedString(raw.Description),
    Category: toOptionalTrimmedString(raw.Category),
  };
}

export function parseStaffRow(raw: Record<string, unknown>): StaffRow {
  return {
    StaffID: toTrimmedString(raw.StaffID),
    Name: toTrimmedString(raw.Name),
    Active: toBoolean(raw.Active),
    CalendarID: toTrimmedString(raw.CalendarID) || undefined,
    DisplayOrder: toNumber(raw.DisplayOrder),
    Role: toOptionalTrimmedString(raw.Role),
    Bio: toOptionalTrimmedString(raw.Bio),
    ImagePath: toOptionalTrimmedString(raw.ImagePath),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest CatalogParser.test.ts`
Expected: PASS, including every pre-existing test.

- [ ] **Step 5: Commit** — deferred.

---

### Task 4: `Catalog.ts` reads SERVICES/STAFF with the optional columns

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Catalog.ts`

**Interfaces:**
- Consumes: `rowsToObjects(..., optionalColumns)` (Task 1), `SERVICES_OPTIONAL_HEADERS`/`STAFF_OPTIONAL_HEADERS` (Task 2).
- Not unit-tested directly (pre-existing convention — file header comment: "Not unit tested by Jest ... CatalogParser.ts's coercion functions carry the tested logic"). No new test file for this task; covered end-to-end by `PublicCatalog.test.ts` (Task 5) and manual verification (documented in Task 9).

- [ ] **Step 1: Modify `getServiceRows`/`getStaffRows`**

```ts
// apps/salon-portfolio/gas/src/Catalog.ts
import { SHEET_NAMES } from "./SheetNames";
import {
  SERVICES_HEADERS,
  SERVICES_OPTIONAL_HEADERS,
  STAFF_HEADERS,
  STAFF_OPTIONAL_HEADERS,
  ServiceRow,
  StaffRow,
} from "./SheetSchemas";
import { getHeaderMap, getSheet, readRawRows } from "./Sheets";
import { rowsToObjects } from "./RowMapper";
import { parseServiceRow, parseStaffRow } from "./CatalogParser";

export function getServiceRows(): ServiceRow[] {
  const sheet = getSheet(SHEET_NAMES.SERVICES);
  const headerMap = getHeaderMap(sheet);
  const rawRows = rowsToObjects<Record<string, unknown>>(
    headerMap,
    readRawRows(sheet),
    SERVICES_HEADERS,
    SERVICES_OPTIONAL_HEADERS,
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
    STAFF_OPTIONAL_HEADERS,
  );
  return rawRows.map(parseStaffRow);
}
```

- [ ] **Step 2: No dedicated test — verify by running the full GAS suite**

Run: `cd apps/salon-portfolio/gas && npx jest`
Expected: PASS (this file has no direct test; `PublicCatalog.test.ts` and
`Api.test.ts` exercise the pipeline downstream with mocked `Catalog`).

- [ ] **Step 3: Commit** — deferred.

---

### Task 5: `models/Catalog.ts` + `PublicCatalog.ts` carry the optional fields to the wire

**Files:**
- Modify: `apps/salon-portfolio/gas/src/models/Catalog.ts`
- Modify: `apps/salon-portfolio/gas/src/PublicCatalog.ts`
- Test: `apps/salon-portfolio/gas/tests/PublicCatalog.test.ts`

**Interfaces:**
- Produces: `PublicService` gains `description?: string; category?: string`. `PublicStaff` gains `role?: string; introduction?: string; photoSrc?: string` (the `ImagePath` sheet column maps to the wire field `photoSrc` — the one deliberate rename in this whole task, chosen because it matches `StaffMember.photoSrc`/`PlaceholderImage`'s existing prop name one hop later).

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/gas/tests/PublicCatalog.test.ts — extend the existing fixtures + add tests
const servicesWithPresentation: ServiceRow[] = [
  { ServiceID: "SV001", Name: "ジェルネイル", DurationMinutes: 60, Price: 6000, Active: true, StaffRequired: false, DisplayOrder: 1, Description: "説明文", Category: "ネイル" },
  { ServiceID: "SV002", Name: "オフのみ", DurationMinutes: 30, Price: 3000, Active: true, StaffRequired: false, DisplayOrder: 2 },
];

const staffWithPresentation: StaffRow[] = [
  { StaffID: "ST001", Name: "田中", Active: true, DisplayOrder: 1, Role: "店長", Bio: "紹介文", ImagePath: "/images/staff/st001.jpg" },
  { StaffID: "ST002", Name: "鈴木", Active: true, DisplayOrder: 2 },
];

describe("buildPublicServices optional presentation fields (V1.1)", () => {
  it("carries description/category through when present", () => {
    const result = buildPublicServices(servicesWithPresentation);
    expect(result[0]).toMatchObject({ description: "説明文", category: "ネイル" });
  });

  it("leaves description/category undefined when the row has none", () => {
    const result = buildPublicServices(servicesWithPresentation);
    expect(result[1].description).toBeUndefined();
    expect(result[1].category).toBeUndefined();
  });
});

describe("buildPublicStaff optional presentation fields (V1.1)", () => {
  it("carries role/introduction/photoSrc through when present (ImagePath -> photoSrc)", () => {
    const result = buildPublicStaff(staffWithPresentation);
    expect(result[0]).toMatchObject({ role: "店長", introduction: "紹介文", photoSrc: "/images/staff/st001.jpg" });
  });

  it("leaves role/introduction/photoSrc undefined when the row has none", () => {
    const result = buildPublicStaff(staffWithPresentation);
    expect(result[1].role).toBeUndefined();
    expect(result[1].introduction).toBeUndefined();
    expect(result[1].photoSrc).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest PublicCatalog.test.ts`
Expected: FAIL — current mappers don't set these fields.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/gas/src/models/Catalog.ts
export interface PublicService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the SERVICES sheet
   *  has no Description/Category column yet, or the cell is blank. Never
   *  read by reservation eligibility/pricing logic. */
  description?: string;
  category?: string;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the STAFF sheet has
   *  no Role/Bio/ImagePath column yet, or the cell is blank. Never read by
   *  reservation eligibility logic. `photoSrc` is `ImagePath`'s sheet
   *  value verbatim (a local `public/images/staff/...`-style path). */
  role?: string;
  introduction?: string;
  photoSrc?: string;
}
```

```ts
// apps/salon-portfolio/gas/src/PublicCatalog.ts
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
      description: service.Description,
      category: service.Category,
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
      role: member.Role,
      introduction: member.Bio,
      photoSrc: member.ImagePath,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest PublicCatalog.test.ts`
Expected: PASS, including every pre-existing test (they use `toEqual`/`not.toHaveProperty` on specific keys, not the new optional keys, and the new keys are `undefined` for rows that don't set `Description`/`Category`/`Role`/`Bio`/`ImagePath` — verify this: the existing `services`/`staff` fixtures in this file never set those fields, so `toEqual([{ serviceId: ..., displayOrder: 1 }, ...])`-style assertions in the "excludes inactive..." tests would fail if `description: undefined` etc. changed object shape under `toEqual` — **Jest's `toEqual` treats `undefined` properties as absent**, so these keep passing unmodified).

- [ ] **Step 5: Commit** — deferred.

---

### Task 6: `models/Config.ts` gains optional business/social fields

**Files:**
- Modify: `apps/salon-portfolio/gas/src/models/Config.ts`

**Interfaces:**
- Produces: `AppConfig["business"]` gains `nameLatin?: string; tagline?: string; postalCode?: string`. New top-level `AppConfig.socialLinks?: SocialLink[]`. New exported `SocialLink { label: string; href: string }`. `PublicConfig` (still `Omit<AppConfig, "calendarId" | "emailOwnerNotifyAddress" | "emailFromName">`) automatically includes all of these.

- [ ] **Step 1: No isolated test for this file** — it's a pure type declaration file (no existing `models/Config.test.ts`); its correctness is exercised by Tasks 7-8's tests and the TypeScript compiler (`tsc --noEmit`, part of Task 12).

- [ ] **Step 2: Write the implementation**

```ts
// apps/salon-portfolio/gas/src/models/Config.ts
export interface SocialLink {
  label: string;
  href: string;
}

export interface AppConfig {
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    /** Optional presentation fields (V1.1 Task 4) — undefined when the
     *  CONFIG sheet has no business.nameLatin/tagline/postalCode key yet.
     *  `PublicConfig` carries these through unchanged (no field to strip
     *  — they were never secret). */
    nameLatin?: string;
    tagline?: string;
    postalCode?: string;
  };
  hours: BusinessHours;
  holidays: string[];
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: ReservationSettings;
  /** Optional (V1.1 Task 4) — built from whichever `social.*` CONFIG keys
   *  are present (see ConfigParser.ts's SOCIAL_LINK_DEFINITIONS); undefined
   *  when none are set. */
  socialLinks?: SocialLink[];
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

- [ ] **Step 3: Commit** — deferred.

---

### Task 7: `ConfigParser.ts` parses the new optional CONFIG keys

**Files:**
- Modify: `apps/salon-portfolio/gas/src/ConfigParser.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigParser.test.ts`

**Interfaces:**
- Consumes: `AppConfig`/`SocialLink` (Task 6).
- Produces: `SOCIAL_LINK_DEFINITIONS: ReadonlyArray<{ configKey: string; label: string }>` (exported, so `docs/config-and-sheets-guide.md`'s table and the CSV template stay traceable to one source list); `parseAppConfig` populates `business.nameLatin`/`business.tagline`/`business.postalCode`/`socialLinks` as optional, **never** pushing an `issues` entry when they're absent.

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/gas/tests/ConfigParser.test.ts — add
describe("parseAppConfig optional presentation fields (V1.1 Task 4)", () => {
  it("leaves nameLatin/tagline/postalCode/socialLinks undefined when absent, with no issues", () => {
    const result = parseAppConfig(validRawConfig(), []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.nameLatin).toBeUndefined();
      expect(result.config.business.tagline).toBeUndefined();
      expect(result.config.business.postalCode).toBeUndefined();
      expect(result.config.socialLinks).toBeUndefined();
    }
  });

  it("parses nameLatin/tagline/postalCode when present, trimmed", () => {
    const raw = validRawConfig();
    raw["business.nameLatin"] = "  Rin Nail & Eyelash  ";
    raw["business.tagline"] = " 静けさの中で。 ";
    raw["business.postalCode"] = " 〒104-0061 ";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.nameLatin).toBe("Rin Nail & Eyelash");
      expect(result.config.business.tagline).toBe("静けさの中で。");
      expect(result.config.business.postalCode).toBe("〒104-0061");
    }
  });

  it("builds socialLinks only from the social.* keys that are actually present", () => {
    const raw = validRawConfig();
    raw["social.instagram"] = "https://instagram.com/example";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.socialLinks).toEqual([
        { label: "Instagram", href: "https://instagram.com/example" },
      ]);
    }
  });

  it("orders socialLinks by SOCIAL_LINK_DEFINITIONS order, not CONFIG row order", () => {
    const raw = validRawConfig();
    raw["social.line"] = "https://line.me/example";
    raw["social.instagram"] = "https://instagram.com/example";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.socialLinks?.map((link) => link.label)).toEqual(["Instagram", "LINE"]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest ConfigParser.test.ts`
Expected: FAIL — fields don't exist on the parsed config yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/gas/src/ConfigParser.ts — add near the top, after imports
import { AppConfig, BUSINESS_HOURS_DAYS, RawConfigMap, SocialLink } from "./models/Config";

/** Fixed, curated set of CONFIG keys that can build a SocialLink — a flat
 *  key per platform, matching this sheet's existing "discrete keys, no
 *  JSON cell values" convention (see parseJsonSafely's own comment).
 *  Order here is display order in the footer, independent of CONFIG row
 *  order. Add a platform later by adding one entry here plus a matching
 *  row in the CSV template / config-and-sheets-guide.md — no other code
 *  changes. */
export const SOCIAL_LINK_DEFINITIONS: ReadonlyArray<{ configKey: string; label: string }> = [
  { configKey: "social.instagram", label: "Instagram" },
  { configKey: "social.line", label: "LINE" },
  { configKey: "social.x", label: "X" },
  { configKey: "social.facebook", label: "Facebook" },
];

function parseSocialLinks(rawConfig: RawConfigMap): SocialLink[] | undefined {
  const links: SocialLink[] = [];
  for (const { configKey, label } of SOCIAL_LINK_DEFINITIONS) {
    const href = parseNonEmptyString(rawConfig[configKey]);
    if (href !== undefined) {
      links.push({ label, href });
    }
  }
  return links.length > 0 ? links : undefined;
}
```

```ts
// apps/salon-portfolio/gas/src/ConfigParser.ts — inside parseAppConfig, replace the `business` block and the final return
  const business: AppConfig["business"] = {
    name: requireString("business.name"),
    phone: requireString("business.phone"),
    email: requireString("business.email"),
    address: requireString("business.address"),
    nameLatin: parseNonEmptyString(rawConfig["business.nameLatin"]),
    tagline: parseNonEmptyString(rawConfig["business.tagline"]),
    postalCode: parseNonEmptyString(rawConfig["business.postalCode"]),
  };
```

```ts
  // ... unchanged hours/reservation/features/staffAnyAvailableOption/calendarId/emailOwnerNotifyAddress/emailFromName blocks ...

  const socialLinks = parseSocialLinks(rawConfig);

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
      socialLinks,
      calendarId,
      emailOwnerNotifyAddress,
      emailFromName,
    },
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest ConfigParser.test.ts`
Expected: PASS, including the pre-existing "reports every missing required key as an issue" test (still deletes only `business.name`/`calendar.id`, both still required — unaffected).

- [ ] **Step 5: Commit** — deferred.

---

### Task 8: `PublicConfig.ts` carries `socialLinks` through

**Files:**
- Modify: `apps/salon-portfolio/gas/src/PublicConfig.ts`
- Test: `apps/salon-portfolio/gas/tests/PublicConfig.test.ts`

**Interfaces:**
- Consumes: `AppConfig.socialLinks` (Task 6/7).
- Produces: `buildPublicConfig` includes `socialLinks` in its returned object (business.nameLatin/tagline/postalCode already flow through automatically since `business: config.business` copies the whole object).

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/gas/tests/PublicConfig.test.ts — extend fullConfig() and add tests
function fullConfig(): AppConfig {
  return {
    business: {
      name: "Demo Salon",
      phone: "03-0000-0000",
      email: "owner@example.com",
      address: "東京都千代田区1-1-1",
      nameLatin: "Demo Salon Latin",
      tagline: "デモのタグライン",
      postalCode: "〒100-0001",
    },
    hours: { /* unchanged */ monday: "10:00-19:00", tuesday: "10:00-19:00", wednesday: "10:00-19:00", thursday: "10:00-19:00", friday: "10:00-19:00", saturday: "10:00-18:00", sunday: "closed" },
    holidays: ["2026-01-01"],
    features: { contactForm: true, reservation: true, staffSelection: true, calendar: true, emailNotification: true },
    staffAnyAvailableOption: true,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    socialLinks: [{ label: "Instagram", href: "https://instagram.com/example" }],
    calendarId: "secret-calendar-id@group.calendar.google.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo Salon",
  };
}

// add inside describe("buildPublicConfig")
it("carries nameLatin/tagline/postalCode/socialLinks through", () => {
  const result = buildPublicConfig(fullConfig());
  expect(result.business.nameLatin).toBe("Demo Salon Latin");
  expect(result.business.tagline).toBe("デモのタグライン");
  expect(result.business.postalCode).toBe("〒100-0001");
  expect(result.socialLinks).toEqual([{ label: "Instagram", href: "https://instagram.com/example" }]);
});

it("leaves socialLinks undefined when the source config has none", () => {
  const config = fullConfig();
  delete config.socialLinks;
  const result = buildPublicConfig(config);
  expect(result.socialLinks).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest PublicConfig.test.ts`
Expected: FAIL — `buildPublicConfig` doesn't copy `socialLinks` yet (nameLatin/tagline/postalCode already pass since `business` is copied wholesale, but assert them anyway as a regression guard).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/gas/src/PublicConfig.ts
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
    socialLinks: config.socialLinks,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest PublicConfig.test.ts`
Expected: PASS, including "never includes calendarId or the owner-facing email settings" (unaffected — that test only checks for the 3 stripped keys).

- [ ] **Step 5: Commit** — deferred.

---

### Task 9: `DemoSeed.ts` seeds the new optional columns/keys for fresh installs

**Files:**
- Modify: `apps/salon-portfolio/gas/src/DemoSeed.ts`
- Test: `apps/salon-portfolio/gas/tests/DemoSeed.test.ts` (read first — extend only if it asserts exact header/row shapes; do not weaken any existing assertion)

**Interfaces:**
- Consumes: `SERVICES_OPTIONAL_HEADERS`/`STAFF_OPTIONAL_HEADERS` (Task 2).
- Produces: `DEMO_SHEETS`'s `CONFIG`/`SERVICES`/`STAFF` seed rows include realistic values for the new optional keys/columns, so `setupDemoSheets()` (never overwrites an existing sheet — unaffected for upgraders) gives a brand-new install content rich enough to show the homepage's fuller Menu/Staff rendering immediately. `ImagePath` stays blank in the seed (GAS has no way to know what image files exist in the buyer's own Next.js `public/` folder — a path GAS invents could point at a file that doesn't exist, producing a broken image instead of the graceful initial-letter fallback `StaffCard.tsx` already renders for a blank `photoSrc`).

- [ ] **Step 1: Read `DemoSeed.test.ts` first**

Run: `cd apps/salon-portfolio/gas && cat tests/DemoSeed.test.ts` (or open the
file) — confirm whether it hard-codes the full header/row arrays (in which
case Step 3 must update both the source and this test together) or only
checks structural invariants (sheet count, non-empty rows) that survive
unchanged.

- [ ] **Step 2: Update or add tests to match**

If `DemoSeed.test.ts` asserts the literal SERVICES/STAFF header arrays,
update those exact expected arrays to include the new optional headers, in
the same PR-sized edit as Step 3 (this is a same-file "keep in sync" edit,
not a weakened assertion — the test's *invariant*, "headers match
SheetSchemas exactly," is unchanged).

- [ ] **Step 3: Write the implementation**

```ts
// apps/salon-portfolio/gas/src/DemoSeed.ts
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
  SERVICES_OPTIONAL_HEADERS,
  STAFF_HEADERS,
  STAFF_OPTIONAL_HEADERS,
} from "./SheetSchemas";

export interface DemoSheetSeed {
  name: SheetName;
  headers: readonly string[];
  rows: unknown[][];
}

export const DEMO_SHEETS: DemoSheetSeed[] = [
  {
    name: SHEET_NAMES.CONFIG,
    headers: CONFIG_HEADERS,
    rows: [
      ["business.name", "Demo Salon", "店舗名"],
      ["business.nameLatin", "Demo Salon", "店舗名（ローマ字・任意）"],
      ["business.tagline", "丁寧な施術と、心地よいひとときを。", "キャッチコピー（任意）"],
      ["business.phone", "03-0000-0000", "電話番号"],
      ["business.email", "owner@example.com", "店舗メール"],
      ["business.address", "東京都千代田区1-1-1", "住所"],
      ["business.postalCode", "〒100-0001", "郵便番号（任意）"],
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
      ["social.instagram", "", "InstagramのURL（任意・空欄可）"],
      ["social.line", "", "LINEのURL（任意・空欄可）"],
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
    headers: [...SERVICES_HEADERS, ...SERVICES_OPTIONAL_HEADERS],
    rows: [
      ["SV001", "ハンド | ジェルネイル", 60, 6000, true, true, 1, "指先に一色をまとわせる、定番の仕上がりです。", "ハンド"],
      ["SV002", "フット | ジェルペディキュア", 90, 8000, true, true, 2, "一年を通して整えたい足先に。", "フット"],
      ["SV003", "その他 | パラフィンパック", 20, 1500, true, false, 3, "乾燥が気になる季節におすすめです。", "その他"],
    ],
  },
  {
    name: SHEET_NAMES.STAFF,
    headers: [...STAFF_HEADERS, ...STAFF_OPTIONAL_HEADERS],
    rows: [
      ["ST001", "スタッフA", true, "", 1, "店長", "丁寧なカウンセリングを心がけています。", ""],
      ["ST002", "スタッフB", true, "", 2, "スタイリスト", "", ""],
      ["ST003", "スタッフC", true, "", 3, "", "", ""],
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

Run: `cd apps/salon-portfolio/gas && npx jest DemoSeed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** — deferred.

---

## Part B — Frontend (`apps/salon-portfolio/web`)

### Task 10: `types/reservation.ts` — `PublicService`/`PublicStaff` gain optional fields

**Files:**
- Modify: `apps/salon-portfolio/web/types/reservation.ts`

No test file (pure type declarations — exercised by Tasks 11-13's tests and `tsc --noEmit`).

- [ ] **Step 1: Write the implementation**

```ts
// apps/salon-portfolio/web/types/reservation.ts — replace PublicService/PublicStaff
export interface PublicService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the SERVICES sheet
   *  has no Description/Category column yet, or GAS hasn't been upgraded.
   *  Never used for pricing/duration/eligibility. */
  description?: string;
  category?: string;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the STAFF sheet has
   *  no Role/Bio/ImagePath column yet, or GAS hasn't been upgraded. Never
   *  used for staff-eligibility logic. */
  role?: string;
  introduction?: string;
  photoSrc?: string;
}
```

- [ ] **Step 2: Commit** — deferred.

---

### Task 11: `lib/validation/catalogValidator.ts` accepts (and type-checks) the optional fields

**Files:**
- Modify: `apps/salon-portfolio/web/lib/validation/catalogValidator.ts`
- Test: `apps/salon-portfolio/web/lib/validation/catalogValidator.test.ts`

**Interfaces:**
- Consumes: `PublicService`/`PublicStaff` (Task 10).
- Produces: `parsePublicServices`/`parsePublicStaff` pass through `description`/`category`/`role`/`introduction`/`photoSrc` when present-and-string, return `null` (reject the whole payload, matching this file's existing "any shape mismatch -> null" contract) when a present field has the wrong type.

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/web/lib/validation/catalogValidator.test.ts — add
describe("parsePublicServices optional presentation fields (V1.1)", () => {
  it("passes through description/category when present", () => {
    const input = [{ serviceId: "SV001", name: "x", durationMinutes: 60, price: 6000, displayOrder: 1, description: "説明", category: "ネイル" }];
    expect(parsePublicServices(input)).toEqual(input);
  });

  it("leaves description/category undefined when absent", () => {
    const input = [{ serviceId: "SV001", name: "x", durationMinutes: 60, price: 6000, displayOrder: 1 }];
    const result = parsePublicServices(input);
    expect(result?.[0].description).toBeUndefined();
    expect(result?.[0].category).toBeUndefined();
  });

  it("rejects a present description/category with the wrong type", () => {
    const input = [{ serviceId: "SV001", name: "x", durationMinutes: 60, price: 6000, displayOrder: 1, description: 123 }];
    expect(parsePublicServices(input)).toBeNull();
  });
});

describe("parsePublicStaff optional presentation fields (V1.1)", () => {
  it("passes through role/introduction/photoSrc when present", () => {
    const input = [{ staffId: "ST001", name: "田中", displayOrder: 1, role: "店長", introduction: "紹介文", photoSrc: "/images/staff/st001.jpg" }];
    expect(parsePublicStaff(input)).toEqual(input);
  });

  it("leaves role/introduction/photoSrc undefined when absent", () => {
    const input = [{ staffId: "ST001", name: "田中", displayOrder: 1 }];
    const result = parsePublicStaff(input);
    expect(result?.[0].role).toBeUndefined();
    expect(result?.[0].introduction).toBeUndefined();
    expect(result?.[0].photoSrc).toBeUndefined();
  });

  it("rejects a present role/introduction/photoSrc with the wrong type", () => {
    const input = [{ staffId: "ST001", name: "田中", displayOrder: 1, photoSrc: 42 }];
    expect(parsePublicStaff(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/catalogValidator.test.ts`
Expected: FAIL — current parsers drop these fields entirely (the "passes
through" tests fail) but never reject malformed ones either (the "rejects"
tests also fail, since today's code doesn't look at these keys at all).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/web/lib/validation/catalogValidator.ts
import type { PublicService, PublicStaff } from "@/types/reservation";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
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
      !isFiniteNumber(record.displayOrder) ||
      !isOptionalNonEmptyString(record.description) ||
      !isOptionalNonEmptyString(record.category)
    ) {
      return null;
    }
    services.push({
      serviceId: record.serviceId,
      name: record.name,
      durationMinutes: record.durationMinutes,
      price: record.price,
      displayOrder: record.displayOrder,
      description: record.description as string | undefined,
      category: record.category as string | undefined,
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
      !isFiniteNumber(record.displayOrder) ||
      !isOptionalNonEmptyString(record.role) ||
      !isOptionalNonEmptyString(record.introduction) ||
      !isOptionalNonEmptyString(record.photoSrc)
    ) {
      return null;
    }
    staff.push({
      staffId: record.staffId,
      name: record.name,
      displayOrder: record.displayOrder,
      role: record.role as string | undefined,
      introduction: record.introduction as string | undefined,
      photoSrc: record.photoSrc as string | undefined,
    });
  }
  return staff;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/catalogValidator.test.ts`
Expected: PASS, including every pre-existing test.

- [ ] **Step 5: Commit** — deferred.

---

### Task 12: `lib/config/resolveCatalog.ts` maps the optional fields through

**Files:**
- Modify: `apps/salon-portfolio/web/lib/config/resolveCatalog.ts`
- Test: `apps/salon-portfolio/web/lib/config/resolveCatalog.test.ts`

**Interfaces:**
- Consumes: `PublicService`/`PublicStaff` (Task 10), `Service`/`StaffMember` (`types/content.ts`, unchanged — already has `description?`/`category?`/`role?`/`introduction?`/`photoSrc?`/`photoAlt?`).
- Produces: `mapPublicServiceToService`/`mapPublicStaffToStaffMember` pass through the optional fields.

- [ ] **Step 1: Update the existing tests (behavior is intentionally changing) and add new ones**

```ts
// apps/salon-portfolio/web/lib/config/resolveCatalog.test.ts — replace the two "does not invent..." tests
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

  it("passes description/category through when the wire payload has them", () => {
    const input: PublicService = { serviceId: "SV001", name: "x", durationMinutes: 1, price: 1, displayOrder: 1, description: "説明", category: "ネイル" };
    const result = mapPublicServiceToService(input);
    expect(result.description).toBe("説明");
    expect(result.category).toBe("ネイル");
  });

  it("leaves description/category undefined when the wire payload has none (never invents content)", () => {
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

  it("passes role/introduction/photoSrc through when the wire payload has them", () => {
    const input: PublicStaff = { staffId: "ST001", name: "田中", displayOrder: 1, role: "店長", introduction: "紹介文", photoSrc: "/images/staff/st001.jpg" };
    const result = mapPublicStaffToStaffMember(input);
    expect(result.role).toBe("店長");
    expect(result.introduction).toBe("紹介文");
    expect(result.photoSrc).toBe("/images/staff/st001.jpg");
  });

  it("leaves role/introduction/photoSrc/photoAlt undefined when the wire payload has none (never invents content)", () => {
    const input: PublicStaff = { staffId: "ST001", name: "x", displayOrder: 1 };
    const result = mapPublicStaffToStaffMember(input);
    expect(result.role).toBeUndefined();
    expect(result.introduction).toBeUndefined();
    expect(result.photoSrc).toBeUndefined();
    expect(result.photoAlt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveCatalog.test.ts`
Expected: FAIL on the two new "passes ... through" tests.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/web/lib/config/resolveCatalog.ts
/**
 * Maps the canonical GAS-backed catalog wire types — the same
 * `PublicService`/`PublicStaff` the Reservation Wizard already consumes
 * (`lib/api/reservationClient.ts`) — onto the homepage's presentation
 * types (`types/content.ts`). `description`/`category` (Service) and
 * `role`/`introduction`/`photoSrc` (StaffMember) are optional on the wire
 * (V1.1 Task 4: SERVICES/STAFF sheet columns `Description`/`Category`/
 * `Role`/`Bio`/`ImagePath`) — passed through unchanged when present,
 * left `undefined` when the buyer's sheet doesn't have them yet.
 * `photoAlt` still has no sheet-backed source at all; `StaffCard.tsx`
 * already falls back to the staff member's name as alt text.
 */
import type { PublicService, PublicStaff } from "@/types/reservation";
import type { Service, StaffMember } from "@/types/content";

export function mapPublicServiceToService(service: PublicService): Service {
  return {
    serviceId: service.serviceId,
    name: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
    description: service.description,
    category: service.category,
  };
}

export function mapPublicStaffToStaffMember(staff: PublicStaff): StaffMember {
  return {
    staffId: staff.staffId,
    name: staff.name,
    role: staff.role,
    introduction: staff.introduction,
    photoSrc: staff.photoSrc,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveCatalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** — deferred.

---

### Task 13: `types/runtime-config.ts` gains optional business/social fields

**Files:**
- Modify: `apps/salon-portfolio/web/types/runtime-config.ts`

No test file (pure type declarations — exercised by Tasks 14-16).

- [ ] **Step 1: Write the implementation**

```ts
// apps/salon-portfolio/web/types/runtime-config.ts
export interface PublicRuntimeBusinessInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  /** Optional presentation fields (V1.1 Task 4) — undefined when the
   *  buyer's CONFIG sheet has no business.nameLatin/tagline/postalCode
   *  key yet. `resolveSiteConfig.ts` falls back to the frontend-owned
   *  demo value when undefined, so an un-migrated CONFIG sheet renders
   *  exactly as it did before this task. */
  nameLatin?: string;
  tagline?: string;
  postalCode?: string;
}

export interface PublicRuntimeBusinessHours {
  monday: string | "closed";
  tuesday: string | "closed";
  wednesday: string | "closed";
  thursday: string | "closed";
  friday: string | "closed";
  saturday: string | "closed";
  sunday: string | "closed";
}

export interface PublicRuntimeFeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface PublicRuntimeReservationSettings {
  timezone: "Asia/Tokyo";
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

/** Mirrors GAS's `SocialLink` (`gas/src/models/Config.ts`) — same
 *  "separate frontend mirror" convention this file already uses for
 *  `PublicRuntimeBusinessHours`. */
export interface SocialLink {
  label: string;
  href: string;
}

export interface PublicRuntimeConfig {
  business: PublicRuntimeBusinessInfo;
  hours: PublicRuntimeBusinessHours;
  holidays: string[];
  features: PublicRuntimeFeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: PublicRuntimeReservationSettings;
  /** Optional (V1.1 Task 4) — undefined when none of the CONFIG sheet's
   *  social.* keys are set yet. `resolveSiteConfig.ts` falls back to the
   *  frontend-owned demo array when undefined. */
  socialLinks?: SocialLink[];
}

/** Where a rendered page's runtime config actually came from — kept
 *  explicit so a GAS outage never silently masquerades as demo content. */
export type RuntimeConfigStatus = "runtime" | "demo-fallback" | "runtime-error";

export interface RuntimeConfigResult {
  status: RuntimeConfigStatus;
  config: PublicRuntimeConfig;
}
```

- [ ] **Step 2: Commit** — deferred.

---

### Task 14: `lib/validation/runtimeConfigValidator.ts` accepts the optional fields

**Files:**
- Modify: `apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.ts`
- Test: `apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.test.ts`

**Interfaces:**
- Consumes: `PublicRuntimeConfig`/`SocialLink` (Task 13).
- Produces: `parsePublicRuntimeConfig` accepts a response with or without `business.nameLatin`/`tagline`/`postalCode`/top-level `socialLinks`; rejects one where a present field has the wrong shape.

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.test.ts — add
describe("parsePublicRuntimeConfig optional presentation fields (V1.1 Task 4)", () => {
  it("accepts a config with nameLatin/tagline/postalCode/socialLinks present", () => {
    const config = {
      ...validConfig(),
      business: { ...validConfig().business, nameLatin: "Demo Salon Latin", tagline: "タグライン", postalCode: "〒100-0001" },
      socialLinks: [{ label: "Instagram", href: "https://instagram.com/example" }],
    };
    const result = parsePublicRuntimeConfig(config);
    expect(result).not.toBeNull();
    expect(result?.business.nameLatin).toBe("Demo Salon Latin");
    expect(result?.socialLinks).toEqual([{ label: "Instagram", href: "https://instagram.com/example" }]);
  });

  it("accepts a config with none of the optional fields (backward compatible)", () => {
    expect(parsePublicRuntimeConfig(validConfig())).toEqual(validConfig());
  });

  it("rejects a present nameLatin/tagline/postalCode with the wrong type", () => {
    const config = { ...validConfig(), business: { ...validConfig().business, tagline: 123 } };
    expect(parsePublicRuntimeConfig(config)).toBeNull();
  });

  it("rejects a present socialLinks entry missing label/href", () => {
    const config = { ...validConfig(), socialLinks: [{ label: "Instagram" }] };
    expect(parsePublicRuntimeConfig(config)).toBeNull();
  });

  it("rejects socialLinks that isn't an array", () => {
    const config = { ...validConfig(), socialLinks: "not-an-array" };
    expect(parsePublicRuntimeConfig(config)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/runtimeConfigValidator.test.ts`
Expected: FAIL — current validator doesn't look at these fields at all
(so the "accepts ... present" test fails because the returned object won't
carry them, and the "rejects" tests fail because nothing rejects them).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.ts
import { HOURS_DAY_ORDER } from "@/lib/constants/hours";
import type { PublicRuntimeBusinessHours, PublicRuntimeConfig, SocialLink } from "@/types/runtime-config";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseBusinessHours(value: unknown): PublicRuntimeBusinessHours | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const hours = {} as PublicRuntimeBusinessHours;
  for (const day of HOURS_DAY_ORDER) {
    const cell = record[day];
    if (!isNonEmptyString(cell)) return null;
    hours[day] = cell as PublicRuntimeBusinessHours[typeof day];
  }
  return hours;
}

/** `undefined` -> valid/absent; anything else must be an array of
 *  `{ label, href }` non-empty-string pairs. */
function parseOptionalSocialLinks(value: unknown): SocialLink[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const links: SocialLink[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (!isNonEmptyString(record.label) || !isNonEmptyString(record.href)) return null;
    links.push({ label: record.label, href: record.href });
  }
  return links;
}

export function parsePublicRuntimeConfig(value: unknown): PublicRuntimeConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const root = value as Record<string, unknown>;

  const business = root.business;
  if (
    typeof business !== "object" ||
    business === null ||
    !isNonEmptyString((business as Record<string, unknown>).name) ||
    !isNonEmptyString((business as Record<string, unknown>).phone) ||
    !isNonEmptyString((business as Record<string, unknown>).email) ||
    !isNonEmptyString((business as Record<string, unknown>).address) ||
    !isOptionalNonEmptyString((business as Record<string, unknown>).nameLatin) ||
    !isOptionalNonEmptyString((business as Record<string, unknown>).tagline) ||
    !isOptionalNonEmptyString((business as Record<string, unknown>).postalCode)
  ) {
    return null;
  }

  const hours = parseBusinessHours(root.hours);
  if (!hours) return null;

  if (!Array.isArray(root.holidays) || !root.holidays.every((d) => typeof d === "string")) {
    return null;
  }

  const features = root.features;
  if (
    typeof features !== "object" ||
    features === null ||
    !isBoolean((features as Record<string, unknown>).contactForm) ||
    !isBoolean((features as Record<string, unknown>).reservation) ||
    !isBoolean((features as Record<string, unknown>).staffSelection) ||
    !isBoolean((features as Record<string, unknown>).calendar) ||
    !isBoolean((features as Record<string, unknown>).emailNotification)
  ) {
    return null;
  }

  if (!isBoolean(root.staffAnyAvailableOption)) return null;

  const reservation = root.reservation;
  if (
    typeof reservation !== "object" ||
    reservation === null ||
    (reservation as Record<string, unknown>).timezone !== "Asia/Tokyo" ||
    !isFiniteNumber((reservation as Record<string, unknown>).slotMinutes) ||
    !isFiniteNumber((reservation as Record<string, unknown>).minLeadHours) ||
    !isFiniteNumber((reservation as Record<string, unknown>).maxBookingDays)
  ) {
    return null;
  }

  const socialLinks = parseOptionalSocialLinks(root.socialLinks);
  if (socialLinks === null) return null;

  return {
    business: business as PublicRuntimeConfig["business"],
    hours,
    holidays: root.holidays as string[],
    features: features as PublicRuntimeConfig["features"],
    staffAnyAvailableOption: root.staffAnyAvailableOption,
    reservation: reservation as PublicRuntimeConfig["reservation"],
    socialLinks,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/runtimeConfigValidator.test.ts`
Expected: PASS, including every pre-existing test — note the "accepts a
fully valid config" pre-existing test does `toEqual(validConfig())`; since
`socialLinks` is `undefined` on both sides, `toEqual` still passes (Jest
treats `undefined` properties as absent for `toEqual`).

- [ ] **Step 5: Commit** — deferred.

---

### Task 15: `lib/config/resolveSiteConfig.ts` — CONFIG-first with demo fallback

**Files:**
- Modify: `apps/salon-portfolio/web/lib/config/resolveSiteConfig.ts`
- Test: `apps/salon-portfolio/web/lib/config/resolveSiteConfig.test.ts`

**Interfaces:**
- Consumes: `PublicRuntimeConfig` (Task 13), `SITE_CONFIG` (`config/demo-content.ts`, unchanged).
- Produces: `resolveSiteConfig` prefers `runtime.business.nameLatin`/`tagline`/`postalCode`/`runtime.socialLinks` when present, falling back to the existing `SITE_CONFIG` demo values only when absent — this is the fix for the audit's core finding (§C: "these are never overridden by the real GAS CONFIG sheet"), while being 100% backward compatible for a CONFIG sheet that hasn't added the new keys.

- [ ] **Step 1: Write the failing test**

```ts
// apps/salon-portfolio/web/lib/config/resolveSiteConfig.test.ts — add (keep every existing test — they are the backward-compat regression tests)
it("prefers nameLatin/tagline/postalCode/socialLinks from the runtime config when present", () => {
  const runtimeWithPresentation: PublicRuntimeConfig = {
    ...runtime,
    business: { ...runtime.business, nameLatin: "Real Salon Latin", tagline: "本物のタグライン", postalCode: "〒999-9999" },
    socialLinks: [{ label: "Instagram", href: "https://instagram.com/real-salon" }],
  };
  const siteConfig = resolveSiteConfig(runtimeWithPresentation);
  expect(siteConfig.business.nameLatin).toBe("Real Salon Latin");
  expect(siteConfig.business.tagline).toBe("本物のタグライン");
  expect(siteConfig.business.postalCode).toBe("〒999-9999");
  expect(siteConfig.socialLinks).toEqual([{ label: "Instagram", href: "https://instagram.com/real-salon" }]);
});

it("falls back to the demo nameLatin/tagline/postalCode/socialLinks when the runtime config omits them (backward compatible)", () => {
  // covered by the pre-existing "keeps nameLatin/tagline/postalCode/socialLinks
  // from the frontend-owned demo config" test above — `runtime` there has no
  // presentation fields at all, exactly matching a pre-V1.1-Task-4 CONFIG sheet.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveSiteConfig.test.ts`
Expected: FAIL on the new "prefers ... when present" test only; every
existing test still passes unmodified (they establish the fallback path).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/salon-portfolio/web/lib/config/resolveSiteConfig.ts
import { SITE_CONFIG } from "@/config/demo-content";
import type { SiteConfig } from "@/types/content";
import type { PublicRuntimeConfig } from "@/types/runtime-config";

/**
 * Merges runtime business data (Phase 3A `getConfig`) with the
 * presentation fields `nameLatin`/`tagline`/`postalCode`/`socialLinks`
 * (V1.1 Task 4: optional CONFIG keys `business.nameLatin`/`tagline`/
 * `postalCode`/`social.*`). Each falls back independently to the
 * frontend-owned demo value only when the runtime config doesn't carry
 * it — a CONFIG sheet from before this task (none of these keys set)
 * renders exactly as it did before; a buyer who fills in the new keys
 * gets their own value instead of the demo salon's.
 */
export function resolveSiteConfig(runtime: PublicRuntimeConfig): SiteConfig {
  return {
    business: {
      name: runtime.business.name,
      nameLatin: runtime.business.nameLatin ?? SITE_CONFIG.business.nameLatin,
      tagline: runtime.business.tagline ?? SITE_CONFIG.business.tagline,
      phone: runtime.business.phone,
      email: runtime.business.email,
      address: runtime.business.address,
      postalCode: runtime.business.postalCode ?? SITE_CONFIG.business.postalCode,
    },
    hours: runtime.hours,
    features: {
      contactForm: runtime.features.contactForm,
      reservation: runtime.features.reservation,
      staffSelection: runtime.features.staffSelection,
    },
    staffAnyAvailableOption: runtime.staffAnyAvailableOption,
    socialLinks: runtime.socialLinks ?? SITE_CONFIG.socialLinks,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveSiteConfig.test.ts`
Expected: PASS, including every pre-existing test.

- [ ] **Step 5: Commit** — deferred.

---

### Task 16: `lib/config/runtimeConfig.ts` — demo-fallback config stays exactly as-is

**Files:**
- Read only: `apps/salon-portfolio/web/lib/config/runtimeConfig.ts` — **no code change expected.**

**Verification:**

`DEMO_RUNTIME_CONFIG` (the `demo-fallback`/`runtime-error` value) builds its
`business` object from `SITE_CONFIG.business.{name,phone,email,address}`
only — it never included `nameLatin`/`tagline`/`postalCode`/`socialLinks`
even before this task (those were only ever added downstream by
`resolveSiteConfig`). Since `PublicRuntimeBusinessInfo`'s three new fields
and `PublicRuntimeConfig.socialLinks` are optional, `DEMO_RUNTIME_CONFIG`
type-checks unchanged, and `resolveSiteConfig`'s new `?? SITE_CONFIG...`
fallback fires for it exactly the same way the unconditional demo value did
before — so demo mode's rendered output is provably identical.

- [ ] **Step 1: Run the existing test file unchanged as a regression check**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/runtimeConfig.test.ts`
Expected: PASS with zero modifications to this test file or its source.

---

### Task 17: `lib/config/runtimeCatalog.ts` — demo-fallback catalog stays exactly as-is

**Files:**
- Read only: `apps/salon-portfolio/web/lib/config/runtimeCatalog.ts` — **no code change expected.**

**Verification:** `DEMO_CATALOG` reuses `config/demo-content.ts`'s
`SERVICES`/`STAFF` directly (already fully populated with
`description`/`category`/`role`/`introduction`/`photoSrc`/`photoAlt` —
unaffected by any change in this plan). Confirm with the existing test
file.

- [ ] **Step 1: Run the existing test file unchanged as a regression check**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/runtimeCatalog.test.ts`
Expected: PASS with zero modifications.

---

## Part C — Documentation (source/template only, no ZIP rebuild)

### Task 18: `docs/runtime-config-guide.md` — update ownership boundary + fallback description

**Files:**
- Modify: `docs/runtime-config-guide.md`

- [ ] **Step 1**: In "Ownership boundary", move `business.nameLatin`,
  `business.tagline`, `business.postalCode`, and `socialLinks` from
  "Frontend owns" to a new sentence: "GAS/CONFIG owns, optionally (V1.1
  Task 4)" — explain the `social.instagram`/`social.line`/`social.x`/
  `social.facebook` CONFIG keys and that `resolveSiteConfig.ts` falls back
  to the frontend-owned demo value per-field when a key is absent.
- [ ] **Step 2**: In the `SERVICES`/`STAFF` paragraph, replace "have no
  equivalent column in the SERVICES/STAFF sheets ... so a runtime-sourced
  Menu/Staff entry never carries them" with: "have an equivalent *optional*
  column as of V1.1 Task 4 (`Description`/`Category` on SERVICES,
  `Role`/`Bio`/`ImagePath` on STAFF) — present when the buyer's sheet has
  the column and a non-blank cell, `undefined` otherwise."
- [ ] **Step 3**: Run no command — this is documentation only; proofread
  against the actual Task 6/7/12 code before finalizing.

---

### Task 19: `docs/config-and-sheets-guide.md` — add new optional CONFIG keys to the table

**Files:**
- Modify: `docs/config-and-sheets-guide.md`

- [ ] **Step 1**: Add rows to the "Every key currently supported" table:
  `business.nameLatin` (任意 - ローマ字店舗名), `business.tagline` (任意 -
  キャッチコピー), `business.postalCode` (任意 - 郵便番号),
  `social.instagram`/`social.line`/`social.x`/`social.facebook` (任意 - SNS
  URL). Mark all six as optional ("空欄可") explicitly, distinct from every
  other row in the table which is implicitly required.
- [ ] **Step 2**: Add one sentence noting `SERVICES`/`STAFF` also gained
  optional columns, pointing to `product/coconala-salon-template/
  05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md` / `STAFF_CUSTOMIZATION_JA.md`
  (Task 21/22) rather than duplicating the column list here.

---

### Task 20: `docs/api-documentation.md` — update `getConfig`/`getServices`/`getStaff` examples

**Files:**
- Modify: `docs/api-documentation.md`

- [ ] **Step 1**: In the `getConfig` success example, add a one-line note
  below the JSON block: "`business.nameLatin`/`tagline`/`postalCode` and a
  top-level `socialLinks` array are included when the CONFIG sheet defines
  them (V1.1 Task 4) — omitted from the response entirely when absent, not
  sent as `null`."
- [ ] **Step 2**: In the `getServices` success example, append one entry
  showing `description`/`category` present, and note both are omitted when
  the SERVICES sheet has no such column.
- [ ] **Step 3**: In the `getStaff` success example, append one entry
  showing `role`/`introduction`/`photoSrc` present, and note the same
  omission behavior, plus: "`photoSrc` is a path the buyer's own Next.js
  project serves from `public/` (e.g. `/images/staff/st001.jpg`) — never
  an external URL."

---

### Task 21: `product/coconala-salon-template/03_GOOGLE_SHEETS/templates/*.csv` + `SHEET_SETUP_GUIDE_JA.md`

**Files:**
- Modify: `product/coconala-salon-template/03_GOOGLE_SHEETS/templates/CONFIG.csv`
- Modify: `product/coconala-salon-template/03_GOOGLE_SHEETS/templates/SERVICES.csv`
- Modify: `product/coconala-salon-template/03_GOOGLE_SHEETS/templates/STAFF.csv`
- Modify: `product/coconala-salon-template/03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`

- [ ] **Step 1**: Add rows to `CONFIG.csv` mirroring `DemoSeed.ts`'s new
  CONFIG rows (Task 9) — `business.nameLatin`, `business.tagline`,
  `business.postalCode`, `social.instagram`, `social.line` (blank
  `Value`, so importing the CSV as-is behaves identically to a pre-Task-4
  sheet until the buyer fills them in).
- [ ] **Step 2**: Add `Description`,`Category` columns (header + one
  filled example value per row) to `SERVICES.csv`.
- [ ] **Step 3**: Add `Role`,`Bio`,`ImagePath` columns (header + one
  filled `Role`/`Bio` example, blank `ImagePath`) to `STAFF.csv`.
- [ ] **Step 4**: Update the "全9シートの構成一覧" column list in
  `SHEET_SETUP_GUIDE_JA.md` for `SERVICES`/`STAFF`, and add a short note:
  "`Description`/`Category`（SERVICES）と`Role`/`Bio`/`ImagePath`
  （STAFF）は任意項目です。空欄のまま運用しても動作します。既存の
  スプレッドシートをお使いの場合、この列を追加しなくてもエラーには
  なりません — 追加すればトップページの表示がより詳しくなります。"

---

### Task 22: Rewrite `MENU_CUSTOMIZATION_JA.md` / `STAFF_CUSTOMIZATION_JA.md` — retire the "2 places" framing

**Files:**
- Modify: `product/coconala-salon-template/05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`
- Modify: `product/coconala-salon-template/05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md`

These currently describe a two-source-of-truth model (SERVICES/STAFF sheet
for the reservation form, `demo-content.ts` for the homepage) that predates
Phase 5.1's runtime catalog wiring and is now doubly stale after this
task's optional columns. Rewrite both to describe the current single
source of truth:

- [ ] **Step 1**: Replace the "重要: 2箇所を編集する必要があります" section
  with: both the reservation form and the homepage now read the same
  `SERVICES`/`STAFF` sheet (`getServices`/`getStaff`); no separate
  `demo-content.ts` edit is needed for a production deployment.
- [ ] **Step 2**: Document the optional columns (`Description`/`Category`
  for MENU; `Role`/`Bio`/`ImagePath` for STAFF) as what now drives the
  homepage's fuller Menu/Staff rendering, with the exact fallback behavior
  (blank/absent column → the field simply doesn't render, matching
  `MenuRow`/`StaffCard`'s existing conditional rendering).
- [ ] **Step 3**: In `STAFF_CUSTOMIZATION_JA.md`, add an `ImagePath` note
  cross-referencing `IMAGE_CUSTOMIZATION_JA.md`: the value is a path under
  the buyer's own `public/images/staff/` (e.g. after placing a file there
  per the existing image-replacement flow), never an external image URL.
- [ ] **Step 4**: Keep (do not remove) the closing note in
  `STAFF_CUSTOMIZATION_JA.md` about demo staff photos being illustrations,
  not real people.

---

### Task 23: `docs/design-customization-audit.md` — leave unmodified; add a pointer only if asked

This is a dated, read-only audit snapshot with its own "Validation" section
proving no source was touched to produce it. Do not edit its findings
retroactively. If the user later wants a "resolved" marker, add a short new
top-of-file note in a follow-up — out of this plan's scope unless
requested.

---

## Part D — Final validation and commit

### Task 24: Full validation sweep

**Files:** none (verification only).

- [ ] **Step 1**: `cd apps/salon-portfolio/gas && npx jest` — full GAS suite, expect 100% pass, note before/after test counts (before count comes from a `git stash`-clean run or the last known-good CI count — cite the actual command output, not a remembered number).
- [ ] **Step 2**: `cd apps/salon-portfolio/gas && npx tsc --noEmit` (or the project's actual typecheck script — confirm exact script name in `package.json` first).
- [ ] **Step 3**: `cd apps/salon-portfolio/web && npx jest` — full web suite.
- [ ] **Step 4**: `cd apps/salon-portfolio/web && npx tsc --noEmit` (or `npm run typecheck`).
- [ ] **Step 5**: `cd apps/salon-portfolio/web && npm run lint`.
- [ ] **Step 6**: `cd apps/salon-portfolio/web && npm run build`.
- [ ] **Step 7**: Save all of the above raw output under
  `.evidence/<yyyyMMdd-HHmm>-v1-1-runtime-content-schema/` per the
  evidence-reporting rule (`build.log`, `test-gas.log`, `test-web.log`,
  `typecheck-gas.log`, `typecheck-web.log`, `lint.log`, `diff.patch`,
  `status.txt`).

### Task 25: Single commit

- [ ] **Step 1**: `git add` only the files this plan touched (GAS
  `src`/`tests`, web `types`/`lib`, `docs/*.md`,
  `product/coconala-salon-template/03_GOOGLE_SHEETS/**`,
  `product/coconala-salon-template/05_CUSTOMIZATION/{MENU,STAFF}_CUSTOMIZATION_JA.md`,
  this plan file) — never `.evidence/`, never an unrelated pre-existing
  untracked file.
- [ ] **Step 2**: One commit on `feature/v1-1-design-customization`, message
  summarizing the schema/CONFIG changes, ending with the required
  attribution trailer. No push, no merge, no branch deletion.
