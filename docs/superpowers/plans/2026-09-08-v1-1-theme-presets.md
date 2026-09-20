# V1.1 Theme Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the six `DesignPreset` values (`kinari`, `femme`, `noir`, `editorial`, `natural`, `modern`) its own curated, contrast-checked color theme, applied purely through CSS custom properties keyed off `html[data-design-preset]`, with zero component-level preset branching.

**Architecture:** Add a typed `ThemeTokens` model (`types/design-config.ts`) and a canonical `THEMES: Record<ThemeId, ThemeTokens>` registry (`config/theme-tokens.ts`). Extend `ThemeId` to all six values and set `theme: id` for each non-kinari preset in the existing `config/design-presets.ts` registry (Task 1 already made `theme` a field of `DesignConfig`). Hand-author matching `html[data-design-preset="x"] { --color-*: ...; }` blocks in `app/globals.css` (already the sole place color tokens live) and add one new token, `--color-accent-hover`, replacing `Button.tsx`'s hard-coded `#833d33`. A Jest test (`config/theme-tokens.test.ts`) parses `globals.css` and cross-checks every theme block against the TS registry, so the two representations cannot silently drift.

**Tech Stack:** Next.js 16 / React 19 / Tailwind CSS v4 (`@theme inline` token mirroring) / Jest 30 + Testing Library / TypeScript.

**Spec:** The task prompt "Implement Theme Presets for V1.1" (this conversation) + `docs/design-customization-audit.md` + `docs/presentation-config-architecture.md`.

## Global Constraints

- Default `kinari` visuals MUST NOT change (same hex values as today's `app/globals.css` `:root`).
- No `if (preset === "x")` branching in any component. Components keep consuming `bg-background`/`text-primary`/etc.; only `globals.css` and the new registry vary per preset.
- No new competing env vars — `SALON_DESIGN_PRESET` stays the only preset input.
- No GAS/Sheets/reservation/Calendar changes.
- No `useEffect`-based theme application; theme must be present at initial server render via `data-design-preset` (already wired in `app/layout.tsx` from Task 1 — not touched here).
- Every theme's text/button/link/focus-indicator/semantic-color tokens must clear WCAG AA (4.5:1 for regular text, 3:1 for the focus-ring/accent against its background) — verified by a test, not eyeballing.
- No Hero/Menu/Staff/Gallery variant, section-order, or section-visibility work (out of scope for this task).

---

### Task 1: `ThemeTokens` type + contrast-ratio utility

**Files:**
- Modify: `apps/salon-portfolio/web/types/design-config.ts`
- Create: `apps/salon-portfolio/web/lib/utils/contrastRatio.ts`
- Create: `apps/salon-portfolio/web/lib/utils/contrastRatio.test.ts`

**Interfaces:**
- Produces: `ThemeTokens` interface (14 keys: `background, surface, surfaceSunken, primary, onPrimary, secondary, accent, onAccent, accentHover, text, muted, border, success, error`, all `string`), `ThemeId = "kinari" | "femme" | "noir" | "editorial" | "natural" | "modern"`, `THEME_TOKEN_KEYS: readonly (keyof ThemeTokens)[]`, `getContrastRatio(hexA: string, hexB: string): number`.

- [ ] Step 1: Write `lib/utils/contrastRatio.test.ts` (failing) with known W3C reference pairs (`#000000`/`#ffffff` → 21, `#767676`/`#ffffff` → ~4.54) and a same-color case (→ 1).
- [ ] Step 2: Run `npm test -- contrastRatio` — expect FAIL (module not found).
- [ ] Step 3: Implement `lib/utils/contrastRatio.ts` (WCAG relative-luminance formula, sRGB gamma correction, `(L1+0.05)/(L2+0.05)` with `L1 >= L2`).
- [ ] Step 4: Run `npm test -- contrastRatio` — expect PASS.
- [ ] Step 5: Extend `types/design-config.ts`: widen `ThemeId` to the 6-value union; add `ThemeTokens` interface with a doc comment referencing `config/theme-tokens.ts` as the registry and `app/globals.css` as the CSS output. No test needed (type-only change; covered by Task 2/3's tests + `tsc --noEmit`).
- [ ] Step 6: Commit (`feat(web): add ThemeTokens type and WCAG contrast-ratio utility`).

---

### Task 2: `THEMES` registry with six contrast-checked palettes

**Files:**
- Create: `apps/salon-portfolio/web/config/theme-tokens.ts`
- Create: `apps/salon-portfolio/web/config/theme-tokens.test.ts`

**Interfaces:**
- Consumes: `ThemeTokens`, `ThemeId` (Task 1), `getContrastRatio` (Task 1).
- Produces: `THEMES: Record<ThemeId, ThemeTokens>`, `THEME_TOKEN_KEYS` re-exported or imported from `types/design-config.ts`.

- [ ] Step 1: Write `config/theme-tokens.test.ts` (failing) asserting: all 6 `ThemeId`s present as keys; every theme has exactly `THEME_TOKEN_KEYS` (no missing/extra keys); every value matches `/^#[0-9a-f]{6}$/i`; `kinari`'s 13 pre-existing tokens equal the exact hex values in today's `app/globals.css` `:root` (hard-coded expected object in the test, so any accidental Kinari edit fails loudly); per-theme contrast assertions using `getContrastRatio` — `text` vs `background`/`surface` ≥ 4.5, `secondary` vs `background`/`surface` ≥ 4.5, `muted` vs `background`/`surface` ≥ 4.5, `primary` vs `onPrimary` ≥ 4.5, `accent` vs `onAccent` ≥ 4.5, `accent` vs `background` ≥ 3 (focus-ring/non-text UI contrast), `error` vs `background`/`surface` ≥ 4.5, `success` vs `background`/`surface` ≥ 4.5; `accent` and `error` hex values differ per theme (decorative accent must stay visually distinguishable from the error semantic).
- [ ] Step 2: Run `npm test -- theme-tokens` — expect FAIL (module not found).
- [ ] Step 3: Implement `config/theme-tokens.ts` exporting `THEMES` with the six palettes below (values already contrast-verified against this task's thresholds):

```ts
export const THEMES: Record<ThemeId, ThemeTokens> = {
  kinari: {
    background: "#faf7f2", surface: "#ffffff", surfaceSunken: "#f1ece3",
    primary: "#2b2622", onPrimary: "#faf7f2", secondary: "#6b5f55",
    accent: "#9c4b3f", onAccent: "#ffffff", accentHover: "#833d33",
    text: "#2b2622", muted: "#7a6f63", border: "#e3dcd1",
    success: "#4b7a62", error: "#b3261e",
  },
  femme: {
    background: "#fdf5f3", surface: "#ffffff", surfaceSunken: "#f7e8e4",
    primary: "#3a2a28", onPrimary: "#fdf5f3", secondary: "#8a6660",
    accent: "#a14f5a", onAccent: "#ffffff", accentHover: "#87424c",
    text: "#3a2a28", muted: "#7d5c56", border: "#ecd9d4",
    success: "#4b7a62", error: "#b3261e",
  },
  noir: {
    background: "#1c1917", surface: "#242019", surfaceSunken: "#2c2721",
    primary: "#e0c896", onPrimary: "#1c1917", secondary: "#cbb9a4",
    accent: "#c17b5e", onAccent: "#1c1917", accentHover: "#a8664c",
    text: "#e0c896", muted: "#a89a89", border: "#3a3229",
    success: "#6fa98a", error: "#e0776e",
  },
  editorial: {
    background: "#ffffff", surface: "#ffffff", surfaceSunken: "#f0f0ef",
    primary: "#111111", onPrimary: "#ffffff", secondary: "#545454",
    accent: "#86691f", onAccent: "#ffffff", accentHover: "#6d551a",
    text: "#111111", muted: "#767676", border: "#dcdcda",
    success: "#3f7a55", error: "#b3261e",
  },
  natural: {
    background: "#f6f2e9", surface: "#fdfbf6", surfaceSunken: "#ece4d2",
    primary: "#332b1f", onPrimary: "#f6f2e9", secondary: "#6f6349",
    accent: "#56684a", onAccent: "#ffffff", accentHover: "#44523a",
    text: "#332b1f", muted: "#6f6353", border: "#ded2b8",
    success: "#3f6b54", error: "#b3261e",
  },
  modern: {
    background: "#f7f7f5", surface: "#ffffff", surfaceSunken: "#ececea",
    primary: "#1f1f1d", onPrimary: "#f7f7f5", secondary: "#5c5c58",
    accent: "#3d6b63", onAccent: "#ffffff", accentHover: "#2f544e",
    text: "#1f1f1d", muted: "#6c6963", border: "#e1e0dc",
    success: "#3f7a55", error: "#b3261e",
  },
};
```

- [ ] Step 4: Run `npm test -- theme-tokens` — expect PASS.
- [ ] Step 5: Commit (`feat(web): add six contrast-checked theme token palettes`).

---

### Task 3: Wire `theme` field per preset in the registry

**Files:**
- Modify: `apps/salon-portfolio/web/config/design-presets.ts`
- Modify: `apps/salon-portfolio/web/config/design-presets.test.ts`

- [ ] Step 1: Add a failing assertion to `design-presets.test.ts`: `for (const id of ALL_PRESET_IDS) expect(DESIGN_PRESETS[id].theme).toBe(id)`.
- [ ] Step 2: Run `npm test -- design-presets` — expect FAIL (`noir` etc. currently have `theme: "kinari"`).
- [ ] Step 3: In `config/design-presets.ts`, change `withPreset(preset)` to also set `theme: preset` (safe because `ThemeId` now includes all six `DesignPreset` values with identical strings).
- [ ] Step 4: Run `npm test -- design-presets` — expect PASS. Also run the full suite once (`npm test`) to confirm nothing else assumed `theme: "kinari"` for every preset.
- [ ] Step 5: Commit (`feat(web): differentiate each design preset's theme id`).

---

### Task 4: `--color-accent-hover` token + `globals.css` per-theme CSS blocks

**Files:**
- Modify: `apps/salon-portfolio/web/app/globals.css`
- Modify: `apps/salon-portfolio/web/components/ui/Button.tsx`
- Create: `apps/salon-portfolio/web/app/globals.css.theme-sync.test.ts` (name chosen so it's obviously about cross-file sync, not component behavior)

**Interfaces:**
- Consumes: `THEMES` (Task 2).

- [ ] Step 1: Add `--color-accent-hover: #833d33;` to `:root` (right after `--color-accent`/`--color-on-accent`) and mirror it into `@theme inline` (`--color-accent-hover: var(--color-accent-hover);`) in `app/globals.css` — this alone changes zero rendered output (same hex Button.tsx already hard-codes).
- [ ] Step 2: In `components/ui/Button.tsx`, change `variants.primary` from `"bg-accent text-on-accent hover:bg-[#833d33] disabled:hover:bg-accent"` to `"bg-accent text-on-accent hover:bg-accent-hover disabled:hover:bg-accent"`. Run `npm test -- Button` (or the full suite if no dedicated Button test file exists — check first) to confirm no snapshot/behavior test breaks.
- [ ] Step 3: Append five `html[data-design-preset="..."] { ... }` blocks to `app/globals.css`, one per non-kinari theme, each setting all 14 `--color-*` custom properties (13 existing + `--color-accent-hover`) to that theme's `THEMES[id]` values from Task 2 verbatim. Do **not** add a `kinari` block — kinari stays defined only at `:root`, which is what today's page already renders (this is the visual-regression guarantee: no `[data-design-preset="kinari"]` selector exists to diverge from `:root`).
- [ ] Step 4: Write `app/globals.css.theme-sync.test.ts` (failing until Step 3 is done): read `app/globals.css` with `fs.readFileSync`, regex-extract each `html[data-design-preset="X"] { ... }` block's `--color-*: value;` pairs into an object keyed by the camelCase token name (`surface-sunken` → `surfaceSunken`, `on-primary` → `onPrimary`, etc.), and assert deep equality against `THEMES[X]` for every non-kinari `ThemeId`. Also assert the `:root` block's tokens equal `THEMES.kinari` exactly (parses `:root { ... }` the same way) — this is the automated Kinari-regression guard.
- [ ] Step 5: Run `npm test -- theme-sync` — expect PASS (or fix any transcription mismatch between Step 3's CSS and Task 2's registry, editing whichever has the typo — the registry is the source of truth for values).
- [ ] Step 6: Run the full web test suite (`npm test`) — expect all pre-existing tests still pass, confirming the Kinari `:root` values were not touched.
- [ ] Step 7: Commit (`feat(web): add per-theme CSS variable blocks and accent-hover token`).

---

### Task 5: Homepage alternative-theme render test + documentation

**Files:**
- Modify: `apps/salon-portfolio/web/app/page.test.tsx`
- Modify: `docs/presentation-config-architecture.md`

- [ ] Step 1: Add a test to `page.test.tsx`: mock `getDesignConfig` to return `{ ...DEFAULT_DESIGN_CONFIG, preset: "noir", theme: "noir" }`, render `Home()`, assert the same section headings from the first test are present (homepage renders successfully under a non-default theme; `sectionVisibility`/`sectionOrder` are unchanged so no new assertions are needed beyond "it still renders").
- [ ] Step 2: Run `npm test -- page` — expect PASS (theme selection is CSS-only; `Home()`'s own logic never branches on `theme`/`preset`, so this mainly guards against an accidental future coupling).
- [ ] Step 3: Add a "Theme tokens (V1.1 Task 2)" section to `docs/presentation-config-architecture.md` covering: the `ThemeTokens` model, the `THEMES` registry as source of truth, how `data-design-preset` on `<html>` (unchanged from Task 1) selects the matching `globals.css` block, why components never branch on preset, how to add a 7th theme (add a `THEMES` entry + a matching `globals.css` block + rerun the sync test), and update the "Not yet implemented" list to move "Theme presets" into a "Implemented" note referencing this section.
- [ ] Step 4: Commit (`docs(web): document the theme token architecture`).

---

### Task 6: Full validation pass

**Files:** none (verification only).

- [ ] Step 1: `npm run typecheck` (web) — 0 errors.
- [ ] Step 2: `npm run lint` (web) — 0 errors/warnings.
- [ ] Step 3: `npm test` (web) — full suite, record before/after counts from the actual output (not estimated).
- [ ] Step 4: `npm run build` (web) — production build succeeds.
- [ ] Step 5: GAS: run its existing `npm test`/typecheck/build commands unchanged (this task touches no GAS file — confirm via `git status -s` scoped to `apps/salon-portfolio/gas/`).
- [ ] Step 6: Visual spot-check (dev server + browser or static render) for `kinari` (unchanged), `noir`, `femme` at desktop + mobile widths, per the task's "Visual verification" section.
- [ ] Step 7: One commit wrapping any leftover formatting-only changes, if needed; otherwise this task produces no diff.

---

## Self-review notes

- Spec coverage: theme token model ✓ (Task 1), six themes ✓ (Task 2), CSS integration via `data-design-preset` ✓ (Task 4, reusing Task 1's existing attribute — no new mechanism), no component branching ✓ (only `globals.css` + `Button.tsx`'s single token-name swap change), accessibility ✓ (Task 2's contrast assertions), Kinari regression ✓ (Task 2 hard-codes expected Kinari hexes + Task 4's `:root`-vs-`THEMES.kinari` sync test), fallback ✓ (already covered by Task 1's `resolveDesignConfig.test.ts`, unchanged), tests for theme definitions/preset integration/fallback/homepage ✓ (Tasks 2/3/5), documentation ✓ (Task 5).
- No placeholders: every step names exact files and, where code is non-trivial (the palette table, the contrast thresholds), includes the literal values.
- Type consistency: `ThemeTokens` (Task 1) keys are used identically in `THEMES` (Task 2), the `globals.css` parser (Task 4), and nowhere else redefined.
