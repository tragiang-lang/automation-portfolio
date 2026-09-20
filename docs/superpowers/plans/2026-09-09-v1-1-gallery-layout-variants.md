# V1.1 Task 8 — Gallery Layout Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Gallery into a `DesignConfig`-driven presentation variant (`grid` / `masonry` / `feature-editorial`), mirroring the Hero/Menu/Staff router pattern, with zero change to Gallery's runtime content source or to GAS.

**Architecture:** `GallerySection.tsx` becomes a thin router (like `MenuSection`/`StaffSection`) that normalizes `galleryVariant` via `isGalleryVariant` and delegates to one of three dedicated components, all sharing one `GalleryContent.tsx` content/props module. `app/page.tsx` reads `galleryVariant` off `getDesignConfig()` and passes it straight through; the `sectionVisibility.gallery` gate at the call site is unchanged.

**Tech Stack:** Next.js/React/TypeScript, Tailwind CSS (no new dependency), Vitest + Testing Library (existing conventions).

**Spec:** The full Task 8 spec is the user's message that opened this session (goal, 3 required variants, architecture, backward-compat, responsive/theme/a11y/testing/doc requirements). This plan implements it in full; do not re-derive requirements from elsewhere.

## Global Constraints

- Exactly 3 variants: `grid`, `masonry`, `feature-editorial`. No more.
- `grid` must be pixel-for-pixel the current Gallery composition (CSS-columns masonry-via-columns, `PlaceholderImage`, same alt/src/heading/spacing) — it is the compatibility baseline, not a new "uniform grid".
- `DEFAULT_GALLERY_VARIANT = "grid"`; missing/invalid `galleryVariant` must resolve to `grid`.
- No new GAS action, no new content/data model — reuse `GalleryImageItem[]` (`types/content.ts`) and the existing static `GALLERY_IMAGES` (`config/demo-content.ts`) exactly as `app/page.tsx` sources it today.
- No third-party masonry dependency; deterministic layout (no JS measuring image dimensions).
- No horizontal overflow at any breakpoint; no distorted (stretched) images — cropping via `object-cover` is acceptable, matching `PlaceholderImage`'s existing convention.
- Only existing semantic Tailwind tokens — no hard-coded colors.
- Existing baseline (380 web / 277 GAS tests, typecheck, lint, build) must stay green.
- Do not commit.

## Naming reconciliation (read before coding)

`types/design-config.ts` already declares `GalleryVariant = "grid" | "masonry" | "large-feature"`, and `config/design-presets.ts`'s `DEFAULT_DESIGN_CONFIG.galleryVariant` is currently `"masonry"` — because the *pre-existing* (only) `GallerySection` body is a CSS-`columns` masonry-style layout, and Task 1-7's convention was always "the default variant name matches what the shipped component already does" (`heroVariant: "fullscreen"`, `menuVariant: "editorial-list"`, `staffVariant: "portrait-grid"`).

This task's spec requires the union to be exactly `"grid" | "masonry" | "feature-editorial"`, with `grid` as the preserved/default composition. Since `GallerySection.tsx` today does not actually branch on `galleryVariant` at all (the field has been an inert placeholder since Task 1), reusing the current CSS-columns body as `"grid"` and setting `DEFAULT_GALLERY_VARIANT`/`DEFAULT_DESIGN_CONFIG.galleryVariant` to `"grid"` is what keeps the **rendered pixels** backward compatible — not keeping the string `"masonry"` as the default (that would wire up a real component for the first time under a name whose real behavior is about to change, which would be the actual regression). This plan therefore:

- Renames the union's third value `"large-feature"` → `"feature-editorial"`.
- Changes `DEFAULT_DESIGN_CONFIG.galleryVariant` (and thus every preset, via `withPreset`) from `"masonry"` to `"grid"`.
- Updates the one existing test asserting `galleryVariant: "masonry"` (`config/design-presets.test.ts`) to `"grid"` — this is not weakening the assertion, it is correcting it to match the preserved visual output (see Task 1 below for the paper trail this plan requires before touching it).

## File Structure

- `lib/constants/gallery-variants.ts` (new) — `GALLERY_VARIANTS`, `DEFAULT_GALLERY_VARIANT`.
- `lib/validation/designConfigValidator.ts` (modify) — add `isGalleryVariant`.
- `types/design-config.ts` (modify) — rename `"large-feature"` → `"feature-editorial"` in `GalleryVariant`.
- `config/design-presets.ts` (modify) — `DEFAULT_DESIGN_CONFIG.galleryVariant: "grid"`.
- `config/design-presets.test.ts` (modify) — update the one assertion.
- `components/sections/GalleryContent.tsx` (new) — shared `GalleryContentProps` (`images: GalleryImageItem[]`), nothing else needed (unlike Menu/Staff there's no formatting/fallback logic to share — every field is already display-ready).
- `components/sections/GalleryGrid.tsx` (new) — today's CSS-columns body, moved from `GallerySection.tsx` unchanged.
- `components/sections/GalleryMasonry.tsx` (new) — CSS Grid + deterministic per-item row-span from each image's own `width`/`height` ratio (already in the data — no JS measuring).
- `components/sections/GalleryFeatureEditorial.tsx` (new) — first image dominant (spans 2x2), remaining images in a smaller supporting grid.
- `components/sections/GallerySection.tsx` (rewrite) — thin router, mirrors `MenuSection.tsx`.
- `components/sections/GalleryImage.tsx` (delete — folded into `GalleryGrid.tsx`, its only remaining consumer) — confirm no other importer first.
- `components/sections/GallerySection.test.tsx` (new).
- `components/sections/GalleryContent.test.tsx` (new, small).
- `docs/presentation-config-architecture.md` (modify) — new "Gallery layout variants" section + table row + "Not yet implemented" list update.

## Task 1: Confirm `GalleryImage.tsx` has no other importer, then reconcile naming

**Files:**
- Read: `components/sections/GalleryImage.tsx`, everywhere it's imported
- Modify: `types/design-config.ts`, `config/design-presets.ts`, `config/design-presets.test.ts`

**Interfaces:**
- Produces: `GalleryVariant = "grid" | "masonry" | "feature-editorial"`; `DEFAULT_DESIGN_CONFIG.galleryVariant === "grid"`.

- [ ] **Step 1:** `grep -rn "GalleryImage" apps/salon-portfolio/web --include=*.tsx --include=*.ts` — confirm `GalleryImage.tsx` is only imported by `GallerySection.tsx`. Paste the output into the eventual evidence log (Tier 2 requirement: this is the paper trail for deleting/moving a file).
- [ ] **Step 2:** In `types/design-config.ts`, change `export type GalleryVariant = "grid" | "masonry" | "large-feature";` to `export type GalleryVariant = "grid" | "masonry" | "feature-editorial";` and update its doc comment (currently says `only "masonry" ... is wired to a real component`) to describe the new default.
- [ ] **Step 3:** In `config/design-presets.ts`, change `galleryVariant: "masonry",` to `galleryVariant: "grid",` in `DEFAULT_DESIGN_CONFIG`.
- [ ] **Step 4:** In `config/design-presets.test.ts`, change the `toMatchObject` assertion's `galleryVariant: "masonry"` to `galleryVariant: "grid"`.
- [ ] **Step 5:** Run `npm test -- config/design-presets.test.ts` (from `apps/salon-portfolio/web`) — expect PASS.
- [ ] **Step 6:** Run full typecheck (`npm run typecheck`) — expect a pre-existing-only error set (none related to this change) or clean; `GalleryVariant`'s old literal `"large-feature"` must not appear anywhere else (grep to confirm zero remaining references).

## Task 2: `lib/constants/gallery-variants.ts` + `isGalleryVariant`

**Files:**
- Create: `lib/constants/gallery-variants.ts`
- Modify: `lib/validation/designConfigValidator.ts`
- Test: `lib/validation/designConfigValidator.test.ts` (extend existing file — find it first; mirror the `isStaffVariant` test block)

**Interfaces:**
- Produces: `GALLERY_VARIANTS: readonly GalleryVariant[]`, `DEFAULT_GALLERY_VARIANT: GalleryVariant`, `isGalleryVariant(value: unknown): value is GalleryVariant`.

- [ ] **Step 1: Write the failing tests** (append to `lib/validation/designConfigValidator.test.ts`):

```ts
describe("isGalleryVariant", () => {
  it("accepts every registered GalleryVariant", () => {
    for (const variant of ["grid", "masonry", "feature-editorial"]) {
      expect(isGalleryVariant(variant)).toBe(true);
    }
  });

  it("rejects an unregistered string, non-string, and undefined", () => {
    expect(isGalleryVariant("large-feature")).toBe(false);
    expect(isGalleryVariant("not-a-real-variant")).toBe(false);
    expect(isGalleryVariant(42)).toBe(false);
    expect(isGalleryVariant(undefined)).toBe(false);
  });
});
```

Also add `lib/constants/gallery-variants.test.ts`:

```ts
import { GALLERY_VARIANTS, DEFAULT_GALLERY_VARIANT } from "@/lib/constants/gallery-variants";

describe("GALLERY_VARIANTS", () => {
  it("lists exactly the 3 required variants", () => {
    expect(GALLERY_VARIANTS).toEqual(["grid", "masonry", "feature-editorial"]);
  });
});

describe("DEFAULT_GALLERY_VARIANT", () => {
  it("is grid — the preserved/backward-compatible composition", () => {
    expect(DEFAULT_GALLERY_VARIANT).toBe("grid");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** (`npm test -- gallery-variants designConfigValidator`) — expect FAIL (module/export not found).
- [ ] **Step 3: Implement** `lib/constants/gallery-variants.ts`:

```ts
import type { GalleryVariant } from "@/types/design-config";

/**
 * Every real `GalleryVariant` value (V1.1 Task 8 — Gallery Layout
 * Variants). Doubles as the allow-list `lib/validation/
 * designConfigValidator.ts`'s `isGalleryVariant` checks against, mirroring
 * `STAFF_VARIANTS`/`isStaffVariant`'s existing pattern.
 */
export const GALLERY_VARIANTS: readonly GalleryVariant[] = ["grid", "masonry", "feature-editorial"];

/**
 * The pre-Task-8 (and still every preset's) look — used whenever a
 * `DesignConfig`'s `galleryVariant` is missing or fails validation, so an
 * existing deployment's Gallery section never silently changes appearance
 * (Task 8 backward-compatibility requirement). `GallerySection.tsx` never
 * branched on `galleryVariant` before this task; its one CSS-columns body
 * is what `"grid"` renders, so this is the only faithful default.
 */
export const DEFAULT_GALLERY_VARIANT: GalleryVariant = "grid";
```

Add to `lib/validation/designConfigValidator.ts`: import `GALLERY_VARIANTS`, import `GalleryVariant` type, and:

```ts
/**
 * True only for one of the 3 registered `GalleryVariant` ids (V1.1 Task 8).
 * `components/sections/GallerySection.tsx` uses this to normalize whatever
 * `galleryVariant` it receives — an invalid or missing value falls back to
 * `DEFAULT_GALLERY_VARIANT` ("grid") rather than crashing or rendering
 * nothing, the same parse-or-fallback discipline `isHeroVariant`/
 * `isMenuVariant`/`isStaffVariant` above already follow.
 */
export function isGalleryVariant(value: unknown): value is GalleryVariant {
  return typeof value === "string" && (GALLERY_VARIANTS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run tests to verify they pass.**
- [ ] **Step 5: Commit** (staged, not committed — this plan's steps describe the unit of work; actual `git commit` happens only when the user explicitly says so, per this repo's commit-authorization rule).

## Task 3: `GalleryContent.tsx` (shared props)

**Files:**
- Create: `components/sections/GalleryContent.tsx`
- Test: `components/sections/GalleryContent.test.tsx`

**Interfaces:**
- Consumes: `GalleryImageItem` (`types/content.ts`, unchanged: `{ id, src, alt, width, height }`).
- Produces: `GalleryContentProps { images: GalleryImageItem[] }`.

- [ ] **Step 1: Write the failing test:**

```ts
import type { GalleryContentProps } from "@/components/sections/GalleryContent";

describe("GalleryContentProps", () => {
  it("accepts the existing GalleryImageItem[] shape with no extra required fields", () => {
    const props: GalleryContentProps = {
      images: [{ id: "g1", src: "/x.jpg", alt: "a", width: 100, height: 80 }],
    };
    expect(props.images).toHaveLength(1);
  });
});
```

- [ ] **Step 2:** Run — expect FAIL (module not found).
- [ ] **Step 3: Implement:**

```ts
import type { GalleryImageItem } from "@/types/content";

/**
 * Shared, non-visual Gallery content (V1.1 Task 8 — Gallery Layout
 * Variants). Unlike Menu/Staff, Gallery's `GalleryImageItem` (`types/
 * content.ts`) is already fully display-ready (src/alt/width/height) —
 * there is no price formatting, grouping, or fallback logic to centralize,
 * so this module only defines the one prop shape every variant shares
 * (Task 8: "do not create a new Gallery data model").
 */
export interface GalleryContentProps {
  images: GalleryImageItem[];
}
```

- [ ] **Step 4:** Run — expect PASS.

## Task 4: `GalleryGrid.tsx` (backward-compatible default)

**Files:**
- Create: `components/sections/GalleryGrid.tsx`
- Delete: `components/sections/GalleryImage.tsx` (folded in, per Task 1's confirmed-single-importer check)
- Test: covered by `GallerySection.test.tsx` (Task 7)

**Interfaces:**
- Consumes: `GalleryContentProps` (Task 3).
- Produces: default export function `GalleryGrid({ images }: GalleryContentProps)`, `data-testid="gallery-grid"`.

- [ ] **Step 1:** Create `GalleryGrid.tsx` with the exact pre-existing markup from `GallerySection.tsx`/`GalleryImage.tsx`, unchanged (columns layout, `break-inside-avoid`, `PlaceholderImage`, `sizes`, `rounded-sm`), wrapped in a `data-testid="gallery-grid"` container and each `Reveal`-wrapped tile keyed by `image.id` — `Reveal`/stagger delay logic moves here from the old `GallerySection.tsx` body (the router in Task 7 no longer wraps tiles itself, so each variant owns its own reveal timing, matching how `StaffPortraitGrid`/`StaffHorizontalProfile` each render their own `<ul>` without a shared `Reveal` wrapper per item from the router).
- [ ] **Step 2:** Delete `GalleryImage.tsx`.
- [ ] **Step 3:** (Verification deferred to Task 7's router tests + Task 8 visual check.)

## Task 5: `GalleryMasonry.tsx` (genuinely different composition)

**Files:**
- Create: `components/sections/GalleryMasonry.tsx`

**Interfaces:**
- Consumes: `GalleryContentProps`.
- Produces: `GalleryMasonry({ images }: GalleryContentProps)`, `data-testid="gallery-masonry"`.

**Design:** CSS Grid (`grid-cols-2 lg:grid-cols-4`, `gap-4 lg:gap-6`) with `gridAutoRows` set to a small fixed unit (e.g. `10px`) and each tile given an inline `gridRowEnd: "span N"` computed deterministically from the image's own `width`/`height` (already known — no JS measuring): `N = Math.round((height / width) * ROW_SPAN_SCALE)`, clamped to a sane range so no tile becomes absurdly tall/short. Tiles use `PlaceholderImage` with `className="h-full w-full"`-style full-bleed fill inside the spanned cell (via a wrapper with `height: 100%`), `object-cover` (already `PlaceholderImage`'s default) so a cell taller/shorter than the image's native ratio crops rather than distorts. This is visibly different from `GalleryGrid`'s CSS-columns reading order (column-first) — the grid variant flows row-first with intentionally uneven cell heights (bento-style), which is the "genuinely different" requirement (Task 8 spec, masonry section).

- [ ] **Step 1:** Write `lib/utils/masonryRowSpan.ts`? — no: keep it a small pure function co-located in `GalleryMasonry.tsx` (not worth its own module; no other consumer). Add a focused unit test file `components/sections/GalleryMasonry.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { GalleryMasonry } from "@/components/sections/GalleryMasonry";
import type { GalleryImageItem } from "@/types/content";

const images: GalleryImageItem[] = [
  { id: "g1", src: "/a.jpg", alt: "A", width: 1200, height: 800 },
  { id: "g2", src: "/b.jpg", alt: "B", width: 1200, height: 1600 },
];

describe("GalleryMasonry", () => {
  it("renders every image with its own alt text", () => {
    render(<GalleryMasonry images={images} />);
    expect(screen.getByAltText("A")).toBeInTheDocument();
    expect(screen.getByAltText("B")).toBeInTheDocument();
  });

  it("gives a taller-aspect image a larger row span than a shorter one", () => {
    render(<GalleryMasonry images={images} />);
    const tiles = screen.getAllByTestId("gallery-masonry-tile");
    const spanA = Number(tiles[0].style.gridRowEnd.replace(/\D/g, ""));
    const spanB = Number(tiles[1].style.gridRowEnd.replace(/\D/g, ""));
    expect(spanB).toBeGreaterThan(spanA);
  });

  it("has no data-testid collision with gallery-grid", () => {
    render(<GalleryMasonry images={images} />);
    expect(screen.getByTestId("gallery-masonry")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** Run — FAIL (module not found).
- [ ] **Step 3:** Implement `GalleryMasonry.tsx` per the design above.
- [ ] **Step 4:** Run — PASS.

## Task 6: `GalleryFeatureEditorial.tsx`

**Files:**
- Create: `components/sections/GalleryFeatureEditorial.tsx`
- Test: `components/sections/GalleryFeatureEditorial.test.tsx`

**Interfaces:**
- Consumes: `GalleryContentProps`.
- Produces: `GalleryFeatureEditorial({ images }: GalleryContentProps)`, `data-testid="gallery-feature-editorial"`.

**Design:** First image in `images` renders large (spans 2 columns × 2 rows in a `grid-cols-2 lg:grid-cols-4` grid, or a dedicated `lg:grid-cols-[2fr_1fr_1fr]` split — pick the simpler `grid-cols-2 lg:grid-cols-4` + `col-span-2 row-span-2` approach for the first tile, `col-span-1 row-span-1` for the rest), remaining images in smaller supporting tiles alongside. On mobile, the grid collapses to `grid-cols-2` (feature tile still spans both columns, so it stays dominant; supporting tiles fall into a simple 2-col grid below it) — never a broken 1-column squeeze of a spanned cell. No JS, no image-count branching beyond "first vs. rest" (works for any `images.length >= 1`; single-image case just renders the dominant tile with no supporting grid).

- [ ] **Step 1:** Write the failing test:

```tsx
import { render, screen } from "@testing-library/react";
import { GalleryFeatureEditorial } from "@/components/sections/GalleryFeatureEditorial";
import type { GalleryImageItem } from "@/types/content";

const images: GalleryImageItem[] = [
  { id: "g1", src: "/a.jpg", alt: "Feature", width: 1200, height: 800 },
  { id: "g2", src: "/b.jpg", alt: "Support 1", width: 1200, height: 800 },
  { id: "g3", src: "/c.jpg", alt: "Support 2", width: 1200, height: 800 },
];

describe("GalleryFeatureEditorial", () => {
  it("renders the first image as the dominant tile and the rest as supporting tiles", () => {
    render(<GalleryFeatureEditorial images={images} />);
    const feature = screen.getByTestId("gallery-feature-editorial-feature");
    expect(within(feature).getByAltText("Feature")).toBeInTheDocument();
    expect(screen.getByAltText("Support 1")).toBeInTheDocument();
    expect(screen.getByAltText("Support 2")).toBeInTheDocument();
  });

  it("does not crash with a single image (no supporting tiles)", () => {
    render(<GalleryFeatureEditorial images={[images[0]]} />);
    expect(screen.getByAltText("Feature")).toBeInTheDocument();
  });
});
```

(add `within` to the `@testing-library/react` import)

- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement per the design above.
- [ ] **Step 4:** Run — PASS.

## Task 7: `GallerySection.tsx` router + tests

**Files:**
- Rewrite: `components/sections/GallerySection.tsx`
- Test: `components/sections/GallerySection.test.tsx`

**Interfaces:**
- Consumes: `GalleryContentProps`, `isGalleryVariant`, `DEFAULT_GALLERY_VARIANT`, `GalleryVariant`, the three variant components (Tasks 4-6).
- Produces: `GallerySection({ images, galleryVariant? }: GalleryContentProps & { galleryVariant?: GalleryVariant })`.

- [ ] **Step 1: Write the failing tests** (`components/sections/GallerySection.test.tsx`):

```tsx
import { render, screen } from "@testing-library/react";
import { GallerySection } from "@/components/sections/GallerySection";
import type { GalleryImageItem } from "@/types/content";

const images: GalleryImageItem[] = [
  { id: "g1", src: "/a.jpg", alt: "写真1", width: 1200, height: 800 },
  { id: "g2", src: "/b.jpg", alt: "写真2", width: 1200, height: 900 },
];

const GALLERY_VARIANTS = ["grid", "masonry", "feature-editorial"] as const;

describe("GallerySection", () => {
  it("defaults to the grid variant when galleryVariant is not passed", () => {
    render(<GallerySection images={images} />);
    expect(screen.getByTestId("gallery-grid")).toBeInTheDocument();
  });

  it("falls back to grid for an invalid galleryVariant instead of crashing", () => {
    render(<GallerySection images={images} galleryVariant={"large-feature" as never} />);
    expect(screen.getByTestId("gallery-grid")).toBeInTheDocument();
  });

  it.each(GALLERY_VARIANTS)("renders the %s variant with every runtime image", (variant) => {
    render(<GallerySection images={images} galleryVariant={variant} />);
    expect(screen.getByTestId(`gallery-${variant}`)).toBeInTheDocument();
    expect(screen.getByAltText("写真1")).toBeInTheDocument();
    expect(screen.getByAltText("写真2")).toBeInTheDocument();
  });

  it("always renders the #gallery anchor and exactly one heading, regardless of variant", () => {
    render(<GallerySection images={images} galleryVariant="feature-editorial" />);
    expect(document.querySelector("#gallery")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "ギャラリー" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3: Implement** `GallerySection.tsx`, mirroring `MenuSection.tsx`'s shape exactly (section chrome once, `GALLERY_VARIANT_COMPONENTS: Record<GalleryVariant, ComponentType<GalleryContentProps>>`, `isGalleryVariant`/`DEFAULT_GALLERY_VARIANT` resolution). Keep the `#gallery` id, `eyebrow="Gallery"` / `title="ギャラリー"` / `align="center"` heading exactly as today.
- [ ] **Step 4:** Run — PASS. Run the full web suite (`npm test`) — expect **no regressions**, count increases only.

## Task 8: Wire into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1:** Destructure `galleryVariant` alongside `heroVariant`/`menuVariant`/`staffVariant` from `getDesignConfig()`.
- [ ] **Step 2:** Change `{sectionVisibility.gallery ? <GallerySection images={GALLERY_IMAGES} /> : null}` to pass `galleryVariant={galleryVariant}` — gating expression (`sectionVisibility.gallery`) stays exactly as-is.
- [ ] **Step 3:** Update the file's top comment block to add a "V1.1 Task 8 (Gallery Layout Variants) adds `galleryVariant` the same way" paragraph, matching the existing Task 5/6/7 paragraphs.
- [ ] **Step 4:** Run typecheck + full web test suite — expect PASS, no regressions.

## Task 9: Documentation

**Files:**
- Modify: `docs/presentation-config-architecture.md`

- [ ] **Step 1:** Update the `galleryVariant` table row (currently `| galleryVariant | GalleryVariant (3 values) | Only "masonry" has a real component |`) to reflect all 3 wired components and the new default.
- [ ] **Step 2:** Add a "## Gallery layout variants (V1.1 Task 8)" section, same structure/length as the Staff section (flow diagram, what each variant is for, one data model note, section-chrome-once note, backward-compatibility note, theme-compatibility note).
- [ ] **Step 3:** Remove the "Gallery variant components" bullet from "Not yet implemented" (now done).

## Task 10: Full verification + visual check

- [ ] Run `npm test` (web) — record before/after counts from the actual log, not memory.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm run build` (web) — record PASS/FAIL each.
- [ ] Run the GAS test suite unchanged (`cd apps/salon-portfolio/gas && npm test` or equivalent) — must stay 277/277, since nothing in `gas/` is touched; run it anyway per the task's explicit non-regression requirement.
- [ ] Visual verification via `claude-in-chrome` (or `npm run dev` + manual check) at 1440px and the smallest available mobile width, for all 3 variants, under both `kinari` and `noir` themes (temporarily setting `SALON_DESIGN_PRESET`/rendering each variant via a small local harness page or by editing `DEFAULT_DESIGN_CONFIG.galleryVariant` locally for the check, then reverting) — document what was actually seen, and any tooling limitation (e.g. exact mobile width reached).
- [ ] `git status` + `git diff --stat`.
- [ ] Write the final report per the task's "FINAL REPORT FORMAT".
