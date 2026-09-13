# V1.1 Presentation Configuration Layer — Task 1 Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a typed, centralized Presentation Configuration Layer (`DesignConfig`) in `apps/salon-portfolio/web`, fully separated from business/runtime content, with a default preset, a preset registry keyed by the V1.1 design vocabulary, safe invalid-input fallback, and the minimum homepage wiring needed to prove the architecture works — without changing what the homepage looks like or touching reservation/GAS code.

**Architecture:** A new `types/design-config.ts` defines the design vocabulary (preset/theme/typography/variant unions, the allow-listed `HomeSection` union, `SectionVisibility`, `DesignConfig`). `lib/constants/design-sections.ts` holds the section allow-list + defaults. `config/design-presets.ts` holds `DEFAULT_DESIGN_CONFIG` and the `DESIGN_PRESETS` registry (all 6 preset ids wired to today's look — later tasks differentiate one field at a time). `lib/validation/designConfigValidator.ts` + `lib/config/resolveDesignConfig.ts`/`designConfig.ts` mirror the existing `runtimeConfigValidator.ts` / `resolveSiteConfig.ts` / `runtimeConfig.ts` parse-or-fallback pattern already proven in this codebase. `app/page.tsx`/`app/layout.tsx` consume `getDesignConfig()` only far enough to gate the six currently-ungated sections and tag `<html>` with the preset id — every default is `true`/`"kinari"`, so rendered output is byte-identical to before this task.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript, Jest + React Testing Library (existing `jest.config.ts` via `next/jest`), no new dependencies.

**Spec:** The task prompt in this conversation (V1.1 Task 1 — Presentation Configuration Layer), cross-referenced with `docs/design-customization-audit.md` (full audit of current customization surface) and `PLAN_PHASE5_1_V1_1_LP_DESIGN_CUSTOMIZATION.md` §Task 1 (the multi-task V1.1 roadmap this is step 1 of).

**Note on task numbering:** this plan's own "Task 0"–"Task 8" (below) are this
document's execution steps. Code comments and `docs/presentation-config-architecture.md`
instead cite the *external* V1.1 roadmap's task numbers from
`PLAN_PHASE5_1_V1_1_LP_DESIGN_CUSTOMIZATION.md` (its Task 2 = theme presets,
3 = typography, 6 = Hero variants, 7 = Menu variants, 8 = Staff variants,
9 = Gallery variants, 10 = section order, 11 = curated presets, 12 = customer
docs) — the two numbering schemes are unrelated; don't conflate "Task 6" in a
code comment with "Task 6" in this plan's checklist.

## Global Constraints

- Presentation config MUST NOT contain: calendar logic, reservation validation, availability logic, GAS API implementation, Sheet IDs, secrets, Google service objects, reservation transaction state.
- Do NOT implement Hero/Menu/Staff/Gallery visual variants, theme CSS, or typography CSS in this task — only the types/registry/defaults that later tasks will fill in.
- Do NOT implement section-order-driven rendering in this task — `sectionOrder` is validated, typed, defaulted, and tested, but `app/page.tsx` keeps its literal JSX order.
- Do NOT build a generic `PageBuilder`/`SectionEngine`/drag-and-drop abstraction.
- Do NOT change reservation/GAS/Calendar/LockService/idempotency/`/api/gas` behavior.
- Do NOT duplicate the existing `Service`/`StaffMember` runtime models for presentation purposes.
- `"use client"` is not needed anywhere in this plan — every touched file stays a Server Component.
- The homepage must render pixel-identical output after this task (verified by `app/page.test.tsx`).
- Never commit without an explicit go-ahead from the human (per this project's evidence-reporting rule) — this plan's final task prepares the commit but does not run `git commit` unless separately instructed.
- Branch: `feature/v1-1-design-customization`, created off the current branch (`feature/phase5-1-homepage-runtime-data`, which already has Phase 5.1 merged in). Do not push, merge, or delete the branch.

---

## Task 0: Create the branch and capture baseline evidence

**Files:**
- None created/modified — git and evidence-capture only.

**Interfaces:**
- Produces: a clean `feature/v1-1-design-customization` branch and `.evidence/<timestamp>-v1-1-presentation-config-layer/baseline-*.log` files later tasks' final report cites as the "before" numbers.

- [ ] **Step 1: Create and switch to the feature branch**

```bash
cd apps/salon-portfolio/web/../../.. # repo root
git checkout -b feature/v1-1-design-customization
```

Expected: `Switched to a new branch 'feature/v1-1-design-customization'`.

- [ ] **Step 2: Capture baseline test/typecheck/lint/build logs before any change**

```bash
mkdir -p .evidence/20260908-v1-1-presentation-config-layer
cd apps/salon-portfolio/web
npm test -- --silent 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/baseline-web-test.log
npm run typecheck 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/baseline-web-typecheck.log
npm run lint 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/baseline-web-lint.log
cd ../gas
npm test -- --silent 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/baseline-gas-test.log
npm run typecheck 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/baseline-gas-typecheck.log
cd ../../..
```

Expected: all commands exit 0; note the exact "Tests: N passed" line from `baseline-web-test.log` and `baseline-gas-test.log` — this is the traceable "before" count for the final report.

---

## Task 2: Design vocabulary types + section allow-list constants

**Files:**
- Create: `apps/salon-portfolio/web/types/design-config.ts`
- Create: `apps/salon-portfolio/web/lib/constants/design-sections.ts`
- Test: `apps/salon-portfolio/web/lib/constants/design-sections.test.ts`

**Interfaces:**
- Consumes: nothing (pure foundation).
- Produces: `DesignPreset`, `ThemeId`, `TypographyId`, `HeroVariant`, `MenuVariant`, `StaffVariant`, `GalleryVariant`, `HomeSection`, `RequiredHomeSection`, `OptionalHomeSection`, `SectionVisibility`, `DesignConfig` (all from `types/design-config.ts`); `ALL_HOME_SECTIONS: readonly HomeSection[]`, `REQUIRED_HOME_SECTIONS: readonly RequiredHomeSection[]`, `DEFAULT_SECTION_VISIBILITY: SectionVisibility`, `DEFAULT_SECTION_ORDER: readonly HomeSection[]` (all from `lib/constants/design-sections.ts`) — every later task imports from these two files, never redefines these unions.

- [ ] **Step 1: Write the failing test for the section constants**

Create `apps/salon-portfolio/web/lib/constants/design-sections.test.ts`:

```ts
import {
  ALL_HOME_SECTIONS,
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_VISIBILITY,
  REQUIRED_HOME_SECTIONS,
} from "./design-sections";

describe("ALL_HOME_SECTIONS", () => {
  it("lists all 11 sections exactly once, in the current app/page.tsx order", () => {
    expect(ALL_HOME_SECTIONS).toEqual([
      "hero",
      "concept",
      "menu",
      "staff",
      "gallery",
      "reservation",
      "salon-features",
      "customer-flow",
      "faq",
      "access",
      "contact",
    ]);
    expect(new Set(ALL_HOME_SECTIONS).size).toBe(ALL_HOME_SECTIONS.length);
  });
});

describe("REQUIRED_HOME_SECTIONS", () => {
  it("is exactly hero and menu — the only sections with no visibility flag", () => {
    expect(REQUIRED_HOME_SECTIONS).toEqual(["hero", "menu"]);
  });
});

describe("DEFAULT_SECTION_VISIBILITY", () => {
  it("has one key per optional section, never hero/menu, and defaults every one to true", () => {
    const requiredSet: readonly string[] = REQUIRED_HOME_SECTIONS;
    const expectedKeys = ALL_HOME_SECTIONS.filter((section) => !requiredSet.includes(section)).sort();
    expect(Object.keys(DEFAULT_SECTION_VISIBILITY).sort()).toEqual(expectedKeys);
    expect(Object.values(DEFAULT_SECTION_VISIBILITY).every((visible) => visible === true)).toBe(true);
    expect(DEFAULT_SECTION_VISIBILITY).not.toHaveProperty("hero");
    expect(DEFAULT_SECTION_VISIBILITY).not.toHaveProperty("menu");
  });
});

describe("DEFAULT_SECTION_ORDER", () => {
  it("equals ALL_HOME_SECTIONS (the current, only order today)", () => {
    expect(DEFAULT_SECTION_ORDER).toEqual(ALL_HOME_SECTIONS);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/salon-portfolio/web
npm test -- lib/constants/design-sections.test.ts
```

Expected: FAIL — `Cannot find module './design-sections'`.

- [ ] **Step 3: Write `types/design-config.ts`**

Create `apps/salon-portfolio/web/types/design-config.ts`:

```ts
/**
 * Presentation Configuration Layer — types (V1.1 Task 1 foundation).
 *
 * Strictly presentation-only: no calendar/reservation/availability logic,
 * no GAS wire types, no Sheet IDs, no secrets, no Google service objects.
 * This sits alongside `types/content.ts` (business/runtime content
 * view-model) and `types/runtime-config.ts` (GAS wire shape) as a third,
 * independent axis — see docs/presentation-config-architecture.md for the
 * full picture and why the reservation/GAS code never needs to know this
 * file exists.
 */

/**
 * The V1.1 design vocabulary for the "preset" axis — a named bundle of
 * theme + typography + variant + section choices. `config/design-presets.ts`
 * wires every key to a `DesignConfig`; Task 1 (this codebase state) makes
 * all six identical to the current Kinari look, and Tasks 2/3/6-10
 * progressively differentiate one preset's fields at a time without
 * changing this union or the registry's shape.
 */
export type DesignPreset = "kinari" | "femme" | "noir" | "editorial" | "natural" | "modern";

/** Color-token theme id. Only "kinari" (the current, single palette) is
 *  implemented as of Task 1 — Task 2 adds the remaining curated palettes
 *  and extends this union. */
export type ThemeId = "kinari";

/** Font-pairing id. Only "kinari" (the current Shippori Mincho / Cormorant
 *  Garamond / Noto Sans JP / Inter pairing) is implemented as of Task 1 —
 *  Task 3 adds the remaining curated pairings and extends this union. */
export type TypographyId = "kinari";

/** Hero layout variants (Task 6 implements the alternates; only
 *  "fullscreen" — today's only layout — is wired to a real component). */
export type HeroVariant = "fullscreen" | "split" | "editorial";

/** Menu layout variants (Task 7 implements the alternates; only
 *  "editorial-list" — today's only layout — is wired to a real component). */
export type MenuVariant = "editorial-list" | "card-grid" | "minimal-price-list";

/** Staff layout variants (Task 8 implements the alternate; only
 *  "portrait-grid" — today's only layout — is wired to a real component). */
export type StaffVariant = "portrait-grid" | "horizontal-profile";

/** Gallery layout variants (Task 9 implements the alternates; only
 *  "masonry" — today's only layout — is wired to a real component). */
export type GalleryVariant = "grid" | "masonry" | "large-feature";

/**
 * Allow-listed homepage sections. Header/footer are always rendered by
 * `app/layout.tsx` and are intentionally excluded from this union — they
 * are not configurable homepage content (task requirement: "header/footer
 * must remain outside configurable homepage section ordering").
 */
export type HomeSection =
  | "hero"
  | "concept"
  | "menu"
  | "staff"
  | "gallery"
  | "reservation"
  | "salon-features"
  | "customer-flow"
  | "faq"
  | "access"
  | "contact";

/** Structural sections that always render. Excluded from
 *  `SectionVisibility` below so no config value — valid or invalid — can
 *  ever hide them; TypeScript itself makes "hide the Menu" unrepresentable. */
export type RequiredHomeSection = "hero" | "menu";

/** Every section whose visibility a preset/design config may toggle. */
export type OptionalHomeSection = Exclude<HomeSection, RequiredHomeSection>;

/**
 * Per-section visibility switch for every optional section. `staff`,
 * `reservation`, and `contact` already have a business feature flag
 * (`SiteConfig.features.*` in `types/content.ts`) — the composition root
 * combines this with that flag (`feature && sectionVisibility.x`) so a
 * design preset can only ever narrow what a feature flag already allows,
 * never widen it (no business logic lives in this type or in design
 * config generally).
 */
export type SectionVisibility = Record<OptionalHomeSection, boolean>;

/**
 * The full presentation configuration for one deployment. Resolved by
 * `lib/config/resolveDesignConfig.ts` from an untrusted preset id, always
 * with a safe value — never partial, never `undefined`.
 */
export interface DesignConfig {
  preset: DesignPreset;
  theme: ThemeId;
  typography: TypographyId;
  heroVariant: HeroVariant;
  menuVariant: MenuVariant;
  staffVariant: StaffVariant;
  galleryVariant: GalleryVariant;
  sectionVisibility: SectionVisibility;
  sectionOrder: HomeSection[];
}
```

- [ ] **Step 4: Write `lib/constants/design-sections.ts`**

Create `apps/salon-portfolio/web/lib/constants/design-sections.ts`:

```ts
import type { HomeSection, RequiredHomeSection, SectionVisibility } from "@/types/design-config";

/**
 * Every allow-listed homepage section, in the current canonical order —
 * matches `app/page.tsx`'s existing hard-coded JSX sequence exactly (see
 * docs/design-customization-audit.md §A). Doubles as both the allow-list
 * `lib/validation/designConfigValidator.ts` checks section names against
 * and as `DEFAULT_SECTION_ORDER` below.
 */
export const ALL_HOME_SECTIONS: readonly HomeSection[] = [
  "hero",
  "concept",
  "menu",
  "staff",
  "gallery",
  "reservation",
  "salon-features",
  "customer-flow",
  "faq",
  "access",
  "contact",
];

/** Sections that always render — see `RequiredHomeSection` in
 *  `types/design-config.ts` for why these two have no visibility flag. */
export const REQUIRED_HOME_SECTIONS: readonly RequiredHomeSection[] = ["hero", "menu"];

/**
 * Every optional section defaults to visible, so wiring this into
 * `app/page.tsx` changes zero rendered output until a preset changes one
 * of these to `false`.
 */
export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  concept: true,
  staff: true,
  gallery: true,
  reservation: true,
  "salon-features": true,
  "customer-flow": true,
  faq: true,
  access: true,
  contact: true,
};

/** The only section order that exists today — Task 10 introduces
 *  additional vetted orders; `app/page.tsx` does not yet read this (its
 *  JSX order is still literal), see docs/presentation-config-architecture.md. */
export const DEFAULT_SECTION_ORDER: readonly HomeSection[] = ALL_HOME_SECTIONS;
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test -- lib/constants/design-sections.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd ../../..
git add apps/salon-portfolio/web/types/design-config.ts apps/salon-portfolio/web/lib/constants/design-sections.ts apps/salon-portfolio/web/lib/constants/design-sections.test.ts
git commit -m "feat(web): add design config types and section allow-list constants"
```

---

## Task 3: Default design configuration + preset registry

**Files:**
- Create: `apps/salon-portfolio/web/config/design-presets.ts`
- Test: `apps/salon-portfolio/web/config/design-presets.test.ts`

**Interfaces:**
- Consumes: `DesignConfig`, `DesignPreset` (`@/types/design-config`); `DEFAULT_SECTION_VISIBILITY`, `DEFAULT_SECTION_ORDER` (`@/lib/constants/design-sections`).
- Produces: `DEFAULT_DESIGN_CONFIG: DesignConfig`, `DESIGN_PRESETS: Record<DesignPreset, DesignConfig>` — every later task (validator, resolver, page/layout) imports these two names from this file.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/web/config/design-presets.test.ts`:

```ts
import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "./design-presets";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/constants/design-sections";
import type { DesignPreset } from "@/types/design-config";

const ALL_PRESET_IDS: DesignPreset[] = ["kinari", "femme", "noir", "editorial", "natural", "modern"];

describe("DEFAULT_DESIGN_CONFIG", () => {
  it("matches the current shipped Kinari look, untouched by this task", () => {
    expect(DEFAULT_DESIGN_CONFIG).toMatchObject({
      preset: "kinari",
      theme: "kinari",
      typography: "kinari",
      heroVariant: "fullscreen",
      menuVariant: "editorial-list",
      staffVariant: "portrait-grid",
      galleryVariant: "masonry",
    });
  });

  it("defaults every optional section to visible", () => {
    expect(Object.values(DEFAULT_DESIGN_CONFIG.sectionVisibility).every(Boolean)).toBe(true);
  });
});

describe("DESIGN_PRESETS", () => {
  it("has exactly one registry entry per DesignPreset value", () => {
    expect(Object.keys(DESIGN_PRESETS).sort()).toEqual([...ALL_PRESET_IDS].sort());
  });

  it("tags every entry with its own preset id", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].preset).toBe(id);
    }
  });

  it("gives every preset its own sectionVisibility/sectionOrder — no shared references", () => {
    DESIGN_PRESETS.femme.sectionVisibility.concept = false;
    expect(DESIGN_PRESETS.noir.sectionVisibility.concept).toBe(true);
    expect(DEFAULT_DESIGN_CONFIG.sectionVisibility.concept).toBe(true);

    DESIGN_PRESETS.noir.sectionOrder.pop();
    expect(DESIGN_PRESETS.modern.sectionOrder.length).toBe(11);
  });

  it("does not alias DEFAULT_DESIGN_CONFIG (or DESIGN_PRESETS.kinari, the same object) to the shared DEFAULT_SECTION_VISIBILITY constant", () => {
    DEFAULT_DESIGN_CONFIG.sectionVisibility.gallery = false;
    expect(DEFAULT_SECTION_VISIBILITY.gallery).toBe(true);
    expect(DESIGN_PRESETS.editorial.sectionVisibility.gallery).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- config/design-presets.test.ts
```

Expected: FAIL — `Cannot find module './design-presets'`.

- [ ] **Step 3: Write `config/design-presets.ts`**

Create `apps/salon-portfolio/web/config/design-presets.ts`:

```ts
/**
 * Canonical default design configuration + preset registry (V1.1 Task 1).
 * Nothing salon-specific (business copy, prices, staff, hours) belongs
 * here — that lives in `config/demo-content.ts` / runtime `getConfig`.
 * This file only holds presentation defaults, matching the ownership
 * split `config/theme.ts` already documents for CSS-token JS mirrors.
 */
import { DEFAULT_SECTION_ORDER, DEFAULT_SECTION_VISIBILITY } from "@/lib/constants/design-sections";
import type { DesignConfig, DesignPreset } from "@/types/design-config";

/**
 * The current 凛 (Kinari) — Quiet Japanese Luxury look, unchanged from
 * what `app/page.tsx` already renders. `lib/config/resolveDesignConfig.ts`
 * falls back to this whenever a requested preset id is missing/invalid.
 */
export const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  preset: "kinari",
  theme: "kinari",
  typography: "kinari",
  heroVariant: "fullscreen",
  menuVariant: "editorial-list",
  staffVariant: "portrait-grid",
  galleryVariant: "masonry",
  // Cloned, not a direct reference to `DEFAULT_SECTION_VISIBILITY`/
  // `DEFAULT_SECTION_ORDER` — every `DesignConfig` (including this one)
  // must own its own mutable-in-principle sectionVisibility/sectionOrder
  // so no two configs (or a config and the shared constant it was built
  // from) can ever alias the same object. See the design-presets.test.ts
  // "no shared references" test below.
  sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
  sectionOrder: [...DEFAULT_SECTION_ORDER],
};

function withPreset(preset: DesignPreset): DesignConfig {
  return {
    ...DEFAULT_DESIGN_CONFIG,
    preset,
    sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

/**
 * Preset registry — one entry per `DesignPreset` value. Task 1 (this file)
 * wires every key to the same values as `DEFAULT_DESIGN_CONFIG` except
 * `preset` itself, so selecting any of the five not-yet-designed presets
 * is a safe no-op today. Tasks 2 (theme), 3 (typography), 6-9 (hero/menu/
 * staff/gallery variants), and 10 (section order/visibility) differentiate
 * one preset's fields at a time — later tasks only ever edit a value here,
 * never this file's shape or `lib/config/resolveDesignConfig.ts`'s logic.
 */
export const DESIGN_PRESETS: Record<DesignPreset, DesignConfig> = {
  kinari: DEFAULT_DESIGN_CONFIG,
  femme: withPreset("femme"),
  noir: withPreset("noir"),
  editorial: withPreset("editorial"),
  natural: withPreset("natural"),
  modern: withPreset("modern"),
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- config/design-presets.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck, then commit**

```bash
npm run typecheck
cd ../../..
git add apps/salon-portfolio/web/config/design-presets.ts apps/salon-portfolio/web/config/design-presets.test.ts
git commit -m "feat(web): add default design config and preset registry"
```

---

## Task 4: Design config validator (safe parse-or-null)

**Files:**
- Create: `apps/salon-portfolio/web/lib/validation/designConfigValidator.ts`
- Test: `apps/salon-portfolio/web/lib/validation/designConfigValidator.test.ts`

**Interfaces:**
- Consumes: `DESIGN_PRESETS` (`@/config/design-presets`); `ALL_HOME_SECTIONS`, `REQUIRED_HOME_SECTIONS` (`@/lib/constants/design-sections`); `DesignPreset`, `HomeSection` (`@/types/design-config`).
- Produces: `parseDesignPresetId(value: unknown): DesignPreset | null`, `isHomeSection(value: unknown): value is HomeSection`, `isValidSectionOrder(value: unknown): value is HomeSection[]` — `lib/config/resolveDesignConfig.ts` (Task 5) imports `parseDesignPresetId`.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/web/lib/validation/designConfigValidator.test.ts`:

```ts
import { isHomeSection, isValidSectionOrder, parseDesignPresetId } from "./designConfigValidator";
import { ALL_HOME_SECTIONS } from "@/lib/constants/design-sections";

describe("parseDesignPresetId", () => {
  it.each(["kinari", "femme", "noir", "editorial", "natural", "modern"])(
    "accepts the registered preset id %s",
    (id) => {
      expect(parseDesignPresetId(id)).toBe(id);
    },
  );

  it.each([undefined, null, "", "   ", "not-a-preset", 42, {}])("rejects %p", (value) => {
    expect(parseDesignPresetId(value)).toBeNull();
  });
});

describe("isHomeSection", () => {
  it("accepts every allow-listed section name", () => {
    for (const section of ALL_HOME_SECTIONS) {
      expect(isHomeSection(section)).toBe(true);
    }
  });

  it("rejects a name outside the allow-list and non-string values", () => {
    expect(isHomeSection("footer")).toBe(false);
    expect(isHomeSection(123)).toBe(false);
    expect(isHomeSection(undefined)).toBe(false);
  });
});

describe("isValidSectionOrder", () => {
  it("accepts a full permutation of ALL_HOME_SECTIONS", () => {
    const reordered = [...ALL_HOME_SECTIONS].reverse();
    expect(isValidSectionOrder(reordered)).toBe(true);
  });

  it("rejects an order missing a required section (hero)", () => {
    const missingHero = ALL_HOME_SECTIONS.filter((section) => section !== "hero");
    expect(isValidSectionOrder(missingHero)).toBe(false);
  });

  it("rejects a duplicate entry even when the length matches", () => {
    const duplicated = [...ALL_HOME_SECTIONS.slice(0, -1), "menu"];
    expect(isValidSectionOrder(duplicated)).toBe(false);
  });

  it("rejects an unknown section name", () => {
    const withUnknown = [...ALL_HOME_SECTIONS.slice(0, -1), "testimonials"];
    expect(isValidSectionOrder(withUnknown)).toBe(false);
  });

  it("rejects a non-array value", () => {
    expect(isValidSectionOrder("hero,menu")).toBe(false);
    expect(isValidSectionOrder(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- lib/validation/designConfigValidator.test.ts
```

Expected: FAIL — `Cannot find module './designConfigValidator'`.

- [ ] **Step 3: Write `lib/validation/designConfigValidator.ts`**

Create `apps/salon-portfolio/web/lib/validation/designConfigValidator.ts`:

```ts
import { DESIGN_PRESETS } from "@/config/design-presets";
import { ALL_HOME_SECTIONS, REQUIRED_HOME_SECTIONS } from "@/lib/constants/design-sections";
import type { DesignPreset, HomeSection } from "@/types/design-config";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Structural validation for a design preset id from an untrusted source
 * (today: `SALON_DESIGN_PRESET`; potentially a future CONFIG-sheet field).
 * Returns `null` for anything not a real registry key, so the caller can
 * fall back to `DEFAULT_DESIGN_CONFIG` instead of crashing or blanking the
 * homepage — mirrors `lib/validation/runtimeConfigValidator.ts`'s
 * parse-or-null shape exactly.
 */
export function parseDesignPresetId(value: unknown): DesignPreset | null {
  if (!isNonEmptyString(value)) return null;
  return value in DESIGN_PRESETS ? (value as DesignPreset) : null;
}

/** True only for one of the 11 allow-listed section names — guards against
 *  an arbitrary string reaching `sectionOrder`/`sectionVisibility`. */
export function isHomeSection(value: unknown): value is HomeSection {
  return typeof value === "string" && (ALL_HOME_SECTIONS as readonly string[]).includes(value);
}

/**
 * A valid section order is exactly one permutation of `ALL_HOME_SECTIONS`
 * — every allow-listed section present once, no unknown strings, no
 * duplicates, no section missing. Rejects partial lists rather than
 * silently appending missing sections, so `REQUIRED_HOME_SECTIONS` (hero,
 * menu) can never be dropped by a malformed config.
 */
export function isValidSectionOrder(value: unknown): value is HomeSection[] {
  if (!Array.isArray(value)) return false;
  if (value.length !== ALL_HOME_SECTIONS.length) return false;
  if (!value.every(isHomeSection)) return false;

  const seen = new Set(value);
  if (seen.size !== ALL_HOME_SECTIONS.length) return false;

  return REQUIRED_HOME_SECTIONS.every((section) => seen.has(section));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- lib/validation/designConfigValidator.test.ts
```

Expected: PASS, 20 tests (`parseDesignPresetId`: 6 `it.each` cases + 7 `it.each` cases = 13; `isHomeSection`: 2 plain `it`s; `isValidSectionOrder`: 5 plain `it`s).

- [ ] **Step 5: Typecheck, then commit**

```bash
npm run typecheck
cd ../../..
git add apps/salon-portfolio/web/lib/validation/designConfigValidator.ts apps/salon-portfolio/web/lib/validation/designConfigValidator.test.ts
git commit -m "feat(web): add design config validator with safe parse-or-null fallback"
```

---

## Task 5: Design config resolver + env-backed accessor

**Files:**
- Create: `apps/salon-portfolio/web/lib/config/resolveDesignConfig.ts`
- Test: `apps/salon-portfolio/web/lib/config/resolveDesignConfig.test.ts`
- Create: `apps/salon-portfolio/web/lib/config/designConfig.ts`
- Test: `apps/salon-portfolio/web/lib/config/designConfig.test.ts`
- Modify: `apps/salon-portfolio/web/.env.example`

**Interfaces:**
- Consumes: `DEFAULT_DESIGN_CONFIG`, `DESIGN_PRESETS` (`@/config/design-presets`); `parseDesignPresetId` (`@/lib/validation/designConfigValidator`); `DesignConfig` (`@/types/design-config`).
- Produces: `resolveDesignConfig(rawPresetId: unknown): DesignConfig` (pure), `getDesignConfig(): DesignConfig` (reads `process.env.SALON_DESIGN_PRESET`) — `app/page.tsx` and `app/layout.tsx` (Task 6) import `getDesignConfig` from `@/lib/config/designConfig`.

- [ ] **Step 1: Write the failing test for the pure resolver**

Create `apps/salon-portfolio/web/lib/config/resolveDesignConfig.test.ts`:

```ts
import { resolveDesignConfig } from "./resolveDesignConfig";
import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";

describe("resolveDesignConfig", () => {
  it("returns the matching registry entry for a valid preset id", () => {
    expect(resolveDesignConfig("noir")).toBe(DESIGN_PRESETS.noir);
  });

  it("falls back to the default config for an unknown preset id", () => {
    expect(resolveDesignConfig("does-not-exist")).toBe(DEFAULT_DESIGN_CONFIG);
  });

  it.each([undefined, null, "", 42, {}])("falls back to the default config for %p", (value) => {
    expect(resolveDesignConfig(value)).toBe(DEFAULT_DESIGN_CONFIG);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- lib/config/resolveDesignConfig.test.ts
```

Expected: FAIL — `Cannot find module './resolveDesignConfig'`.

- [ ] **Step 3: Write `lib/config/resolveDesignConfig.ts`**

Create `apps/salon-portfolio/web/lib/config/resolveDesignConfig.ts`:

```ts
import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";
import { parseDesignPresetId } from "@/lib/validation/designConfigValidator";
import type { DesignConfig } from "@/types/design-config";

/**
 * Pure resolver: an untrusted preset id in, a safe `DesignConfig` out.
 * Mirrors `lib/config/resolveSiteConfig.ts`'s "always produce a usable
 * shape" contract. Never throws — an invalid/missing id always falls back
 * to `DEFAULT_DESIGN_CONFIG` (the current Kinari look), so a malformed
 * `SALON_DESIGN_PRESET` value can never crash or blank the homepage.
 */
export function resolveDesignConfig(rawPresetId: unknown): DesignConfig {
  const presetId = parseDesignPresetId(rawPresetId);
  if (!presetId) return DEFAULT_DESIGN_CONFIG;
  return DESIGN_PRESETS[presetId];
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- lib/config/resolveDesignConfig.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing test for the env-backed accessor**

Create `apps/salon-portfolio/web/lib/config/designConfig.test.ts`:

```ts
import { getDesignConfig } from "./designConfig";
import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("getDesignConfig", () => {
  it("returns the default config when SALON_DESIGN_PRESET is unset", () => {
    delete process.env.SALON_DESIGN_PRESET;
    expect(getDesignConfig()).toBe(DEFAULT_DESIGN_CONFIG);
  });

  it("resolves a valid SALON_DESIGN_PRESET value", () => {
    process.env.SALON_DESIGN_PRESET = "editorial";
    expect(getDesignConfig()).toBe(DESIGN_PRESETS.editorial);
  });

  it("falls back to the default for an invalid SALON_DESIGN_PRESET value", () => {
    process.env.SALON_DESIGN_PRESET = "bogus-preset";
    expect(getDesignConfig()).toBe(DEFAULT_DESIGN_CONFIG);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npm test -- lib/config/designConfig.test.ts
```

Expected: FAIL — `Cannot find module './designConfig'`.

- [ ] **Step 7: Write `lib/config/designConfig.ts`**

Create `apps/salon-portfolio/web/lib/config/designConfig.ts`:

```ts
import { resolveDesignConfig } from "@/lib/config/resolveDesignConfig";
import type { DesignConfig } from "@/types/design-config";

/**
 * Reads the deployment's chosen preset from `SALON_DESIGN_PRESET` (server-
 * only env var — never prefix with `NEXT_PUBLIC_`, matching
 * `GAS_WEBAPP_URL`'s convention in `.env.example`) and resolves it to a
 * safe `DesignConfig`. Unlike `getRuntimeConfig`/`getRuntimeCatalog`
 * (`lib/config/runtimeConfig.ts`, `lib/config/runtimeCatalog.ts`) this
 * makes no network/GAS call and is not wrapped in React's `cache()` — it
 * is synchronous and side-effect-free, so there is nothing to dedupe.
 */
export function getDesignConfig(): DesignConfig {
  return resolveDesignConfig(process.env.SALON_DESIGN_PRESET);
}
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
npm test -- lib/config/designConfig.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 9: Document the new env var**

Edit `apps/salon-portfolio/web/.env.example`, appending:

```bash

# Design preset for this deployment — one of: kinari, femme, noir,
# editorial, natural, modern. Leave unset to use "kinari" (the default,
# current look). An unrecognized value safely falls back to "kinari" too
# (see lib/validation/designConfigValidator.ts). Never prefix this with
# NEXT_PUBLIC_ -- it is read only by
# apps/salon-portfolio/web/lib/config/designConfig.ts, server-side.
SALON_DESIGN_PRESET=
```

- [ ] **Step 10: Typecheck, then commit**

```bash
npm run typecheck
cd ../../..
git add apps/salon-portfolio/web/lib/config/resolveDesignConfig.ts apps/salon-portfolio/web/lib/config/resolveDesignConfig.test.ts apps/salon-portfolio/web/lib/config/designConfig.ts apps/salon-portfolio/web/lib/config/designConfig.test.ts apps/salon-portfolio/web/.env.example
git commit -m "feat(web): add design config resolver and SALON_DESIGN_PRESET accessor"
```

---

## Task 6: Wire the design config into the homepage composition root

**Files:**
- Modify: `apps/salon-portfolio/web/app/page.tsx`
- Modify: `apps/salon-portfolio/web/app/layout.tsx`
- Test: `apps/salon-portfolio/web/app/page.test.tsx` (new)

**Interfaces:**
- Consumes: `getDesignConfig` (`@/lib/config/designConfig`); `DEFAULT_DESIGN_CONFIG` (`@/config/design-presets`, test only).
- Produces: no new exports — this is the integration point the whole layer exists to prove works.

- [ ] **Step 1: Write the failing test**

Create `apps/salon-portfolio/web/app/page.test.tsx`:

```tsx
jest.mock("../lib/config/designConfig", () => ({
  getDesignConfig: jest.fn(),
}));
// Keep every real export (DEMO_RUNTIME_CONFIG, loadRuntimeConfig) and
// override only the cached `getRuntimeConfig` entry point `Home` calls —
// mocking the whole module away would make `DEMO_RUNTIME_CONFIG` (used
// below to build test fixtures) undefined.
jest.mock("../lib/config/runtimeConfig", () => ({
  ...jest.requireActual("../lib/config/runtimeConfig"),
  getRuntimeConfig: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import Home from "./page";
import { getDesignConfig } from "@/lib/config/designConfig";
import { getRuntimeConfig, DEMO_RUNTIME_CONFIG } from "@/lib/config/runtimeConfig";
import { DEFAULT_DESIGN_CONFIG } from "@/config/design-presets";
import type { RuntimeConfigResult } from "@/types/runtime-config";

const mockedGetDesignConfig = getDesignConfig as jest.Mock;
const mockedGetRuntimeConfig = getRuntimeConfig as jest.Mock;
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.GAS_WEBAPP_URL; // demo-fallback for the catalog call — no network
  mockedGetDesignConfig.mockReturnValue(DEFAULT_DESIGN_CONFIG);
  mockedGetRuntimeConfig.mockResolvedValue({ status: "demo-fallback", config: DEMO_RUNTIME_CONFIG });
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("Home", () => {
  it("renders every section with the default design config, unchanged from before this task", async () => {
    render(await Home());

    expect(screen.getByRole("heading", { name: "静けさの中で、指先を整える時間を" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "スタッフ紹介" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ギャラリー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "サロンについて" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ご来店の流れ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "よくあるご質問" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アクセス" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
    expect(screen.getAllByText("ご予約はこちら").length).toBeGreaterThanOrEqual(2);
  });

  it("hides an optional section when its sectionVisibility flag is false, without touching required sections", async () => {
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      sectionVisibility: { ...DEFAULT_DESIGN_CONFIG.sectionVisibility, concept: false },
    });

    render(await Home());

    expect(
      screen.queryByRole("heading", { name: "静けさの中で、指先を整える時間を" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
  });

  it("never shows staff/reservation/contact when the business feature flag is off, even though design visibility defaults to true", async () => {
    const allFeaturesOff: RuntimeConfigResult = {
      status: "runtime",
      config: {
        ...DEMO_RUNTIME_CONFIG,
        features: { ...DEMO_RUNTIME_CONFIG.features, staffSelection: false, reservation: false, contactForm: false },
      },
    };
    mockedGetRuntimeConfig.mockResolvedValue(allFeaturesOff);

    render(await Home());

    expect(screen.queryByRole("heading", { name: "スタッフ紹介" })).not.toBeInTheDocument();
    expect(screen.queryByText("仕上がりを見て、気持ちが決まったら")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "お問い合わせ" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
  });

  it("also hides staff/reservation/contact when design visibility is false, even though the business feature flag is on — the AND combination, not just the feature flag alone", async () => {
    // Demo runtime config ships all three feature flags on (beforeEach's
    // default mock) — only design visibility is turned off here. Before
    // this task's app/page.tsx change, these three sections read only
    // `siteConfig.features.*` and had no way to be hidden by design at
    // all, so this assertion fails against the pre-Task-6 code.
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      sectionVisibility: {
        ...DEFAULT_DESIGN_CONFIG.sectionVisibility,
        staff: false,
        reservation: false,
        contact: false,
      },
    });

    render(await Home());

    expect(screen.queryByRole("heading", { name: "スタッフ紹介" })).not.toBeInTheDocument();
    expect(screen.queryByText("仕上がりを見て、気持ちが決まったら")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "お問い合わせ" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- app/page.test.tsx
```

Expected: FAIL on 2 of the 4 tests — the first test passes (current `Home` already renders every section), and the "never shows ... when the business feature flag is off" test also already passes (that gating already exists via `siteConfig.features.*` alone). The "hides an optional section when its sectionVisibility flag is false" test and the "also hides ... when design visibility is false ... AND combination" test both FAIL, because `app/page.tsx` does not yet read `getDesignConfig()` at all — Concept still renders regardless of the mocked `sectionVisibility.concept`, and Staff/Reservation/Contact still render because they only ever checked `siteConfig.features.*`.

- [ ] **Step 3: Update `app/page.tsx`**

Modify `apps/salon-portfolio/web/app/page.tsx` — add the import and read `sectionVisibility`, then gate every currently-ungated section and combine the three already-gated ones with it. Replace the whole file with:

```tsx
import { HeroSection } from "@/components/sections/HeroSection";
import { ConceptSection } from "@/components/sections/ConceptSection";
import { MenuSection } from "@/components/sections/MenuSection";
import { StaffSection } from "@/components/sections/StaffSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { ReservationCtaBand } from "@/components/sections/ReservationCtaBand";
import { SalonFeaturesSection } from "@/components/sections/SalonFeaturesSection";
import { CustomerFlowSection } from "@/components/sections/CustomerFlowSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { AccessSection } from "@/components/sections/AccessSection";
import { ContactSection } from "@/components/sections/ContactSection";
import {
  ACCESS_INFO,
  CUSTOMER_FLOW_STEPS,
  FAQ_ITEMS,
  GALLERY_IMAGES,
  SALON_FEATURES,
} from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { getRuntimeCatalog } from "@/lib/config/runtimeCatalog";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";
import { getDesignConfig } from "@/lib/config/designConfig";

// Page order matches Phase 2A §6 exactly: Header (layout) → Hero →
// Concept → Menu → Staff → Gallery → Reservation CTA → Salon Features →
// Customer Flow → FAQ → Access → Contact → Footer (layout). Configurable
// sections are gated here by the resolved runtime config's `features`,
// not by editing the section components themselves.
//
// GALLERY_IMAGES/SALON_FEATURES/CUSTOMER_FLOW_STEPS/FAQ_ITEMS/ACCESS_INFO
// are not part of the `getConfig` contract (no such fields in
// `PublicConfig`) and stay frontend-owned on `config/demo-content.ts`.
// SERVICES/STAFF moved onto `getServices`/`getStaff` in Phase 5.1
// (lib/config/runtimeCatalog.ts) — see docs/runtime-config-guide.md.
//
// V1.1 Task 1 (Presentation Configuration Layer — see
// docs/presentation-config-architecture.md) adds `sectionVisibility`
// gating for every section below that doesn't already have a business
// feature flag. It intentionally does NOT yet drive section *order* —
// this stays a literal JSX sequence until a later V1.1 task, so this file
// is still not a generic section-rendering engine. For staff/reservation/
// contact, design visibility is combined with (never overrides) the
// existing business feature flag — `feature && sectionVisibility.x` — so
// a design preset can only ever hide a section a feature flag already
// allows, never show one the business disabled.
export default async function Home() {
  const [{ config }, { services, staff }] = await Promise.all([
    getRuntimeConfig(),
    getRuntimeCatalog(),
  ]);
  const siteConfig = resolveSiteConfig(config);
  const { sectionVisibility } = getDesignConfig();

  return (
    <main className="flex flex-1 flex-col">
      <HeroSection
        headline={siteConfig.business.tagline}
        subheadline="銀座の一角で、丁寧なネイル・まつげのお手入れをご提供しています。"
      />

      {sectionVisibility.concept ? (
        <ConceptSection
          eyebrow="Concept"
          title="静けさの中で、指先を整える時間を"
          paragraphs={[
            "流行を追いかけるより、長く付き合える美しさを。当店では、派手さよりも一つひとつの仕上がりの丁寧さを大切にしています。",
            "落ち着いた空間で過ごすひとときそのものも、施術と同じくらい価値のあるものだと考えています。",
          ]}
        />
      ) : null}

      <MenuSection services={services} />

      <StaffSection
        enabled={siteConfig.features.staffSelection && sectionVisibility.staff}
        staff={staff}
        anyAvailableOption={siteConfig.staffAnyAvailableOption}
        businessNameInitial={siteConfig.business.name}
      />

      {sectionVisibility.gallery ? <GallerySection images={GALLERY_IMAGES} /> : null}

      {siteConfig.features.reservation && sectionVisibility.reservation ? (
        <ReservationCtaBand
          heading="仕上がりを見て、気持ちが決まったら"
          message="ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。"
        />
      ) : null}

      {sectionVisibility["salon-features"] ? (
        <SalonFeaturesSection features={SALON_FEATURES} />
      ) : null}

      {sectionVisibility["customer-flow"] ? (
        <CustomerFlowSection steps={CUSTOMER_FLOW_STEPS} />
      ) : null}

      {sectionVisibility.faq ? <FaqSection items={FAQ_ITEMS} /> : null}

      {sectionVisibility.access ? (
        <AccessSection business={siteConfig.business} hours={siteConfig.hours} access={ACCESS_INFO} />
      ) : null}

      {siteConfig.features.contactForm && sectionVisibility.contact ? (
        <ContactSection business={siteConfig.business} />
      ) : null}

      {siteConfig.features.reservation && sectionVisibility.reservation ? (
        <ReservationCtaBand
          heading="最後まで読んでくださり、ありがとうございます"
          message="少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。"
        />
      ) : null}
    </main>
  );
}
```

- [ ] **Step 4: Update `app/layout.tsx`**

In `apps/salon-portfolio/web/app/layout.tsx`, add the import:

```tsx
import { getDesignConfig } from "@/lib/config/designConfig";
```

placed after the `resolveSiteConfig` import. Inside `RootLayout`, after `const siteConfig = resolveSiteConfig(config);`, add:

```tsx
  const designConfig = getDesignConfig();
```

Then add `data-design-preset={designConfig.preset}` to the `<html>` tag, so it reads:

```tsx
    <html
      lang="ja"
      data-design-preset={designConfig.preset}
      className={`${shipporiMincho.variable} ${cormorantGaramond.variable} ${notoSansJP.variable} ${inter.variable} h-full antialiased`}
    >
```

This is additive only — no CSS selects on `[data-design-preset]` yet, so it changes nothing visually; it exists so Task 2's theme CSS has a real hook to key off of without another round of plumbing.

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test -- app/page.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Run the full web test suite to confirm no regression**

```bash
npm test
```

Expected: PASS, previous baseline count (Task 0) + all new tests from Tasks 2-6, zero failures.

- [ ] **Step 7: Typecheck, lint, build**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all three exit 0.

- [ ] **Step 8: Commit**

```bash
cd ../../..
git add apps/salon-portfolio/web/app/page.tsx apps/salon-portfolio/web/app/layout.tsx apps/salon-portfolio/web/app/page.test.tsx
git commit -m "feat(web): wire design config section visibility into the homepage"
```

---

## Task 7: Architecture documentation

**Files:**
- Create: `docs/presentation-config-architecture.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing importable — human-readable reference for Tasks 2-11.

- [ ] **Step 1: Write `docs/presentation-config-architecture.md`**

Create `docs/presentation-config-architecture.md`:

```markdown
# Presentation Configuration Layer (V1.1 Task 1)

## Why this layer exists

`docs/design-customization-audit.md` found that Hero/Menu/Staff/Gallery
each have exactly one hard-coded layout, section order is a literal JSX
sequence in `app/page.tsx`, and there was no typed place to express "which
preset/theme/typography/layout should this deployment use" independent of
business content. The strategic goal of V1.1 is *one codebase → multiple
visually different salon websites* — that requires a config axis for
*presentation* choices that is completely separate from the config axis
for *business/runtime content*, so a visual change can never require a
reservation/GAS code change and vice versa.

## Two independent axes

```text
Runtime/Content                          Presentation Config
(types/content.ts,                       (types/design-config.ts)
 types/runtime-config.ts)
      |                                          |
      | getConfig/getServices/getStaff           | SALON_DESIGN_PRESET env var
      | (GAS, Sheets, demo fallback)             | (no GAS/Sheets dependency)
      v                                          v
resolveSiteConfig.ts / resolveCatalog.ts   resolveDesignConfig.ts / designConfig.ts
      |                                          |
      v                                          v
SiteConfig, Service[], StaffMember[]        DesignConfig
      \                                        /
       \                                      /
        v                                    v
              app/page.tsx / app/layout.tsx
                (Homepage Components)
```

Business/content/runtime data (salon name, tagline, services, staff,
opening hours, holidays, the reservation feature, contact information) is
**never** duplicated into the design layer — `DesignConfig`
(`types/design-config.ts`) has no field that could represent a service, a
staff member, a price, or a business hour. Conversely, `SiteConfig` /
`PublicRuntimeConfig` have no field that represents a preset, a theme, a
layout variant, or a section's visibility.

## What `DesignConfig` controls

| Field | Type | Status as of Task 1 |
|---|---|---|
| `preset` | `DesignPreset` (6 values) | All 6 registered; only `kinari` differs from the others (identically for now) |
| `theme` | `ThemeId` | Only `"kinari"` exists — Task 2 adds curated palettes |
| `typography` | `TypographyId` | Only `"kinari"` exists — Task 3 adds curated pairings |
| `heroVariant` | `HeroVariant` (3 values) | Only `"fullscreen"` has a real component — Task 6 |
| `menuVariant` | `MenuVariant` (3 values) | Only `"editorial-list"` has a real component — Task 7 |
| `staffVariant` | `StaffVariant` (2 values) | Only `"portrait-grid"` has a real component — Task 8 |
| `galleryVariant` | `GalleryVariant` (3 values) | Only `"masonry"` has a real component — Task 9 |
| `sectionVisibility` | `Record<OptionalHomeSection, boolean>` | Fully wired into `app/page.tsx`; every default is `true` |
| `sectionOrder` | `HomeSection[]` | Typed, defaulted, and validated (`isValidSectionOrder`); **not yet** read by `app/page.tsx` — Task 10 |

## Section allow-list, not a page builder

`HomeSection` (`types/design-config.ts`) is a closed union of the 11
homepage sections that exist today (`hero`, `concept`, `menu`, `staff`,
`gallery`, `reservation`, `salon-features`, `customer-flow`, `faq`,
`access`, `contact`). Header and footer are rendered unconditionally by
`app/layout.tsx` and are deliberately outside this union — they are not
configurable homepage content.

`hero` and `menu` are `RequiredHomeSection`s: they are excluded from
`SectionVisibility`'s key set at the *type* level, so no config value can
ever represent "hide the Menu" — the compiler rejects it, not just a
runtime check.

`staff`, `reservation`, and `contact` already have a business feature flag
(`SiteConfig.features.*`). The composition root combines the two:
`feature && sectionVisibility.x`. Design config can therefore only ever
**narrow** what a feature flag already allows — never widen it. This is
what keeps the design layer free of business logic (Rule 2): it never
decides whether reservation/staff-selection/contact-form *should* be
available, only whether an already-available section is visually shown.

There is intentionally no `sections: {id, component}[]` registry driving a
generic render loop — `app/page.tsx` still lists each section as its own
JSX element with its own real props. `sectionOrder` exists as validated,
typed data today so Task 10 has a safe foundation, but wiring it into
render order is deferred; building a generic section-rendering engine now,
before a second real order exists to justify it, would be the
over-engineering this project's rules explicitly warn against.

## Preset registry

`config/design-presets.ts` exports `DEFAULT_DESIGN_CONFIG` (today's
Kinari look) and `DESIGN_PRESETS: Record<DesignPreset, DesignConfig>`. As
of Task 1, all six registry entries are identical except `preset` itself
— selecting `femme`/`noir`/`editorial`/`natural`/`modern` today is a safe
no-op. Each future task (2, 3, 6-10) edits one field on one or more
preset entries; none of them need to touch the registry's shape, the
validator, or the resolver.

## Safe fallback

`lib/validation/designConfigValidator.ts` provides `parseDesignPresetId`
(string → `DesignPreset | null`), mirroring the parse-or-null shape
`lib/validation/runtimeConfigValidator.ts` already uses for `getConfig`.
`lib/config/resolveDesignConfig.ts`'s `resolveDesignConfig` always returns
a full `DesignConfig` — an invalid or missing preset id falls back to
`DEFAULT_DESIGN_CONFIG`, the same "never render a broken/partial page"
guarantee `resolveSiteConfig`/`resolveCatalog` already provide for
business content. `lib/config/designConfig.ts`'s `getDesignConfig()` reads
the deployment's choice from the server-only `SALON_DESIGN_PRESET` env var
(see `.env.example`) — never a `NEXT_PUBLIC_` variable, and never a
network/GAS call, so this layer has zero dependency on `getConfig`,
`getServices`, `getStaff`, or `/api/gas` being reachable.

## Why reservation/GAS code stays design-agnostic

Every field in `DesignConfig` is presentation-only by construction: no
calendar logic, no reservation validation, no availability logic, no GAS
API implementation, no Sheet IDs, no secrets, no Google service objects,
no reservation transaction state. The Reservation Wizard
(`components/reservation/*`) already renders its own independent, simpler
UI for the same `PublicService[]`/`PublicStaff[]` data the homepage
Menu/Staff sections render (see `docs/design-customization-audit.md` §A) —
it does not import `HeroSection`/`MenuSection`/`StaffSection`/
`GallerySection` and never will need to import `DesignConfig` either. A
visual configuration change (a new preset, a new hero variant) therefore
never requires a change to `lib/api/reservationClient.ts`, the GAS
`Api.ts` dispatcher, `Calendar.ts`, `LockService`, or `/api/gas`'s
security boundary.

## Not yet implemented (tracked for later V1.1 tasks)

- Theme presets (Task 2) — actual CSS variable sets per `ThemeId`, keyed
  off `app/layout.tsx`'s new `data-design-preset` attribute on `<html>`.
- Typography presets (Task 3) — actual font-loader + CSS mapping sets per
  `TypographyId`.
- Hero/Menu/Staff/Gallery variant components (Tasks 6-9) — real
  alternate layouts for `HeroVariant`/`MenuVariant`/`StaffVariant`/
  `GalleryVariant` values other than today's default.
- Section-order-driven rendering (Task 10) — `app/page.tsx` reading
  `sectionOrder` instead of its literal JSX sequence.
- Curated multi-field presets (Task 11) — the five non-`kinari` registry
  entries differentiated from the default.
- Customer-facing documentation (Task 12) — a buyer-facing guide for
  choosing a preset, separate from this architecture note.
```

- [ ] **Step 2: Commit**

```bash
git add docs/presentation-config-architecture.md
git commit -m "docs: add Presentation Configuration Layer architecture note"
```

---

## Task 8: Full validation pass + evidence + final report

**Files:**
- None created/modified — validation and evidence capture only.

**Interfaces:**
- Consumes: everything from Tasks 2-7.
- Produces: `.evidence/20260908-v1-1-presentation-config-layer/*.log` (final logs) for the Tier 1/Tier 2 report.

- [ ] **Step 1: Run the full web validation suite and save logs**

```bash
cd apps/salon-portfolio/web
npm test -- --silent 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-web-test.log
npm run typecheck 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-web-typecheck.log
npm run lint 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-web-lint.log
npm run build 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-web-build.log
```

Expected: all four exit 0.

- [ ] **Step 2: Run the full GAS validation suite and save logs (regression-only — no GAS files touched)**

```bash
cd ../gas
npm test -- --silent 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-gas-test.log
npm run typecheck 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-gas-typecheck.log
npm run build 2>&1 | tee ../../../.evidence/20260908-v1-1-presentation-config-layer/final-gas-build.log
cd ../../..
```

Expected: all three exit 0, identical results to `baseline-gas-*.log` from Task 0 (proves zero GAS regression).

- [ ] **Step 3: Save the diff and status**

```bash
git diff feature/phase5-1-homepage-runtime-data..feature/v1-1-design-customization > .evidence/20260908-v1-1-presentation-config-layer/diff.patch
git status -s > .evidence/20260908-v1-1-presentation-config-layer/status.txt
git log --oneline feature/phase5-1-homepage-runtime-data..feature/v1-1-design-customization > .evidence/20260908-v1-1-presentation-config-layer/commits.txt
```

- [ ] **Step 4: Compare final vs. baseline test counts**

Read `baseline-web-test.log` and `final-web-test.log`'s "Tests:" summary lines; read `baseline-gas-test.log` and `final-gas-test.log`'s equivalents. Report the delta with both file paths cited, per this project's evidence-reporting rule — never state a number without naming the log it came from.

- [ ] **Step 5: Produce the Tier 1 report**

Following this project's evidence-reporting rule: Build PASS/FAIL, Test before→after with delta (cite both log paths), full method/test names of every new test (from Tasks 2-6), git status -s + diff --stat, one line per task requirement naming which test/diff proves it, and the exact `.evidence/...` path. Do not commit further or push/merge — the branch stays as-is for review, per this task's git rules.
