# V1.1 Typography Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the six `DesignPreset` values its own curated
typography personality (`TypographyId`), reached the same way the Theme
Presets task reached color: a typed token registry, mirrored into
`app/globals.css` as per-preset CSS custom-property overrides keyed off
`html[data-design-preset]`, with zero component-level preset branching.

**Architecture:** Widen `TypographyId` to all six `DesignPreset` values and
add a `TypographyTokens` model (`types/design-config.ts`, 4 keys:
`headingJa`, `headingEn`, `bodyJa`, `bodyEn` — the same 4 semantic roles
`app/globals.css` already declares as `--font-heading-ja`/
`--font-heading-en`/`--font-body-ja`/`--font-body-en`). Add a canonical
`TYPOGRAPHY: Record<TypographyId, TypographyTokens>` registry
(`config/typography-tokens.ts`), each value a ready-to-use
`var(--font-xxx)` reference to a `next/font/google` loader variable
declared in `app/layout.tsx`. Set `typography: preset` for every non-kinari
entry in `config/design-presets.ts`'s existing `withPreset` helper (mirrors
Task 2's `theme: preset`). Two new font families
(`Playfair_Display`, `Zen_Kaku_Gothic_New`) are added to `app/layout.tsx`
alongside the four already loaded; every font for every preset is always
loaded (small, curated, 6-family total set) and switched purely via CSS —
browsers only fetch the `@font-face` files a deployment's active preset
actually renders text with, so the "load everything, switch by CSS
attribute" strategy that already works for zero-cost color tokens stays
cheap for fonts too (this tradeoff is documented in
`docs/presentation-config-architecture.md`, not left implicit). A Jest test
(`app/globals.css.typography-sync.test.ts`) parses `globals.css` and
cross-checks every preset's resolved heading fonts (including the two
presets — `femme`, `natural` — that intentionally have **no** override
block because they reuse Kinari's exact pairing) against the TS registry,
so the two representations cannot silently drift.

**Tech Stack:** Next.js 16 / React 19 (`next/font/google`) / Tailwind CSS
v4 (`@theme inline` token mirroring) / Jest 30 + Testing Library /
TypeScript.

**Spec:** The task prompt "Implement Typography Presets for V1.1" (this
conversation) + `docs/design-customization-audit.md` +
`docs/presentation-config-architecture.md` +
`docs/superpowers/plans/2026-09-08-v1-1-theme-presets.md` (the sibling task
this plan mirrors structurally).

## Global Constraints

- Default `kinari` visuals MUST NOT change — same 4 font families/weights
  `app/layout.tsx` already loads, same CSS output.
- No `if (preset === "x")`/`if (typography === "x")` branching in any
  component. Components keep consuming the existing `h1,h2,h3`/`body`
  global CSS rules (`font-family: var(--font-heading-ja), ...`); only
  `app/layout.tsx` (font loaders) and `app/globals.css` (per-preset
  overrides) vary per preset.
- No second typography configuration system — extend `DesignConfig`'s
  existing `typography: TypographyId` field (already present since Task 1)
  and the existing `--font-heading-ja`/`--font-heading-en`/
  `--font-body-ja`/`--font-body-en` CSS variable names (already present
  since before V1.1). Do not invent a `--font-display` token or any other
  role with no existing consumer.
- No new competing env vars — `SALON_DESIGN_PRESET` stays the only preset
  input; typography is derived from the same preset id as theme, never a
  second `SALON_DESIGN_TYPOGRAPHY` variable.
- Small curated font set — 2 new Google Fonts families only
  (`Playfair_Display`, `Zen_Kaku_Gothic_New`), each loaded at exactly one
  weight (matching the existing single-weight-per-heading-role pattern of
  `Shippori_Mincho`/`Cormorant_Garamond`). Do not add a font family for
  every preset — `femme` and `natural` deliberately reuse `kinari`'s exact
  pairing (see Task 2).
- No Hero/Menu/Staff/Gallery variant, section-order, or section-visibility
  work (out of scope for this task).
- No GAS/Sheets/reservation/Calendar changes.

---

### Task 1: `TypographyTokens` type + widen `TypographyId`

**Files:**
- Modify: `apps/salon-portfolio/web/types/design-config.ts`

**Interfaces:**
- Produces: `TypographyId = "kinari" | "femme" | "noir" | "editorial" | "natural" | "modern"`, `TypographyTokens` interface (4 keys: `headingJa`, `headingEn`, `bodyJa`, `bodyEn`, all `string`), `TYPOGRAPHY_TOKEN_KEYS: readonly (keyof TypographyTokens)[]`.

- [ ] Step 1: In `types/design-config.ts`, replace the current `TypographyId` line and its doc comment:

```ts
/** Font-pairing id — one entry per curated typography pairing in
 *  `config/typography-tokens.ts`'s `TYPOGRAPHY` registry. Shares its six
 *  string values with `DesignPreset` 1:1 (see `ThemeId` above) — every
 *  preset uses the identically-named typography pairing. `femme` and
 *  `natural` deliberately reuse `kinari`'s exact font pairing (see
 *  `config/typography-tokens.ts` for the rationale); `noir`, `editorial`,
 *  and `modern` each get a distinct heading treatment. */
export type TypographyId = "kinari" | "femme" | "noir" | "editorial" | "natural" | "modern";
```

- [ ] Step 2: Immediately after the existing `THEME_TOKEN_KEYS` export (end of the theme-tokens block), add:

```ts
/**
 * The semantic font-family token model every pairing in
 * `config/typography-tokens.ts` must fully implement, and the exact set
 * `app/globals.css` already declares as `--font-heading-ja`/
 * `--font-heading-en`/`--font-body-ja`/`--font-body-en` custom properties
 * (those names predate V1.1 — only their per-preset override capability is
 * new). Each value is a ready-to-use CSS `var(--font-xxx)` reference to one
 * of the `next/font/google` loader variables declared in `app/layout.tsx`,
 * never a raw font-family string — this keeps `app/globals.css` and this
 * registry trivially diffable against each other (see
 * `app/globals.css.typography-sync.test.ts`).
 *
 * Kept to 4 keys because that is the complete set of type roles the
 * existing global CSS already reads (`h1,h2,h3 { font-family: var(--font-heading-ja), ... }`,
 * `body { font-family: var(--font-body-ja), ... }`) — no component consumes
 * a font token directly, so no additional role (e.g. a separate "display"
 * token) is introduced without an existing consumer.
 */
export interface TypographyTokens {
  headingJa: string;
  headingEn: string;
  bodyJa: string;
  bodyEn: string;
}

/** Every `TypographyTokens` key, for structural validation
 *  (`config/typography-tokens.test.ts`) and for parsing `app/globals.css`'s
 *  per-preset `--font-heading-*` overrides back into a `TypographyTokens`
 *  shape. */
export const TYPOGRAPHY_TOKEN_KEYS: readonly (keyof TypographyTokens)[] = [
  "headingJa",
  "headingEn",
  "bodyJa",
  "bodyEn",
];
```

- [ ] Step 3: Run `npm test` (web) — expect the full existing suite to still PASS (type-only/additive change, nothing consumes these new exports yet). Run `npm run typecheck` (web) — expect 0 errors.
- [ ] Step 4: Commit (`feat(web): add TypographyTokens type and widen TypographyId to six presets`).

---

### Task 2: `TYPOGRAPHY` registry with six curated pairings

**Files:**
- Create: `apps/salon-portfolio/web/config/typography-tokens.ts`
- Create: `apps/salon-portfolio/web/config/typography-tokens.test.ts`

**Interfaces:**
- Consumes: `TypographyId`, `TypographyTokens`, `TYPOGRAPHY_TOKEN_KEYS` (Task 1).
- Produces: `TYPOGRAPHY: Record<TypographyId, TypographyTokens>`.

- [ ] Step 1: Write `config/typography-tokens.test.ts` (failing — module not found):

```ts
import { TYPOGRAPHY } from "./typography-tokens";
import { TYPOGRAPHY_TOKEN_KEYS } from "@/types/design-config";
import type { TypographyId } from "@/types/design-config";

const ALL_TYPOGRAPHY_IDS: TypographyId[] = ["kinari", "femme", "noir", "editorial", "natural", "modern"];
const FONT_VAR_REFERENCE = /^var\(--font-[a-z0-9-]+\)$/;

describe("TYPOGRAPHY registry", () => {
  it("has exactly one entry per TypographyId value", () => {
    expect(Object.keys(TYPOGRAPHY).sort()).toEqual([...ALL_TYPOGRAPHY_IDS].sort());
  });

  it.each(ALL_TYPOGRAPHY_IDS)(
    "typography %s has exactly the required TypographyTokens keys, no more, no less",
    (id) => {
      expect(Object.keys(TYPOGRAPHY[id]).sort()).toEqual([...TYPOGRAPHY_TOKEN_KEYS].sort());
    },
  );

  it.each(ALL_TYPOGRAPHY_IDS)("typography %s uses only var(--font-*) references", (id) => {
    for (const key of TYPOGRAPHY_TOKEN_KEYS) {
      expect(TYPOGRAPHY[id][key]).toMatch(FONT_VAR_REFERENCE);
    }
  });

  it("kinari matches the current shipped app/layout.tsx font mapping exactly, unchanged by this task", () => {
    expect(TYPOGRAPHY.kinari).toEqual({
      headingJa: "var(--font-shippori-mincho)",
      headingEn: "var(--font-cormorant-garamond)",
      bodyJa: "var(--font-noto-sans-jp)",
      bodyEn: "var(--font-inter)",
    });
  });

  it("gives every preset the same body typography (no reader-facing benefit to varying it)", () => {
    for (const id of ALL_TYPOGRAPHY_IDS) {
      expect(TYPOGRAPHY[id].bodyJa).toBe(TYPOGRAPHY.kinari.bodyJa);
      expect(TYPOGRAPHY[id].bodyEn).toBe(TYPOGRAPHY.kinari.bodyEn);
    }
  });

  it("femme and natural deliberately reuse kinari's exact heading pairing", () => {
    expect(TYPOGRAPHY.femme).toEqual(TYPOGRAPHY.kinari);
    expect(TYPOGRAPHY.natural).toEqual(TYPOGRAPHY.kinari);
  });

  it("noir, editorial, and modern each differ from kinari in at least one heading token", () => {
    for (const id of ["noir", "editorial", "modern"] as const) {
      const differs =
        TYPOGRAPHY[id].headingJa !== TYPOGRAPHY.kinari.headingJa ||
        TYPOGRAPHY[id].headingEn !== TYPOGRAPHY.kinari.headingEn;
      expect(differs).toBe(true);
    }
  });

  it("editorial's heading pairing is unique across the whole registry (most visually distinctive preset)", () => {
    const editorialPair = `${TYPOGRAPHY.editorial.headingJa}|${TYPOGRAPHY.editorial.headingEn}`;
    for (const id of ALL_TYPOGRAPHY_IDS) {
      if (id === "editorial") continue;
      const pair = `${TYPOGRAPHY[id].headingJa}|${TYPOGRAPHY[id].headingEn}`;
      expect(pair).not.toBe(editorialPair);
    }
  });
});
```

- [ ] Step 2: Run `npm test -- typography-tokens` — expect FAIL (module not found).
- [ ] Step 3: Implement `config/typography-tokens.ts`:

```ts
/**
 * Canonical typography-token registry (V1.1 Typography Presets task). One
 * `TypographyTokens` entry per `TypographyId` — the single source of truth
 * `app/globals.css`'s per-preset `--font-heading-ja`/`--font-heading-en`
 * overrides mirror (`app/globals.css.typography-sync.test.ts` cross-checks
 * the two stay identical). See `types/design-config.ts` for the
 * `TypographyTokens` shape and `docs/presentation-config-architecture.md`
 * for how a selected preset's `typography` id reaches this registry, then
 * `app/layout.tsx`'s font loaders, then the rendered page.
 *
 * Body typography (`bodyJa`/`bodyEn`) is identical across every preset —
 * Noto Sans JP + Inter are already the clean, highly legible neutral
 * pairing every preset's design direction asks for ("clean Japanese sans
 * body" appears under every persona); varying it per preset would add
 * font-loading cost for a role none of the six directions actually asks to
 * change.
 *
 * `femme` and `natural` reuse `kinari`'s exact heading pairing (Shippori
 * Mincho + Cormorant Garamond) on purpose: both directions ask for a
 * refined/elegant *serif* heading close to Kinari's own "quiet luxury"
 * mincho, and introducing a second near-identical serif family would add
 * font-loading cost for a difference no reader would perceive — their
 * visual personality comes from `config/theme-tokens.ts`'s distinct color
 * palettes instead. `noir`/`editorial`/`modern` each get a heading pairing
 * that could not be mistaken for Kinari's.
 */
import type { TypographyId, TypographyTokens } from "@/types/design-config";

export const TYPOGRAPHY: Record<TypographyId, TypographyTokens> = {
  kinari: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-cormorant-garamond)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Reuses kinari's pairing verbatim — see file header.
  femme: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-cormorant-garamond)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Reuses kinari's pairing verbatim — see file header.
  natural: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-cormorant-garamond)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Noir — a sophisticated editorial serif headline (Playfair Display) for
  // Latin text, paired with Kinari's own restrained mincho for Japanese
  // headings, so the premium/restrained feel reads in both scripts without
  // introducing a second Japanese heading font.
  noir: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-playfair-display)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Editorial — the most visually distinctive pairing on purpose: a bold,
  // clean Japanese sans heading (Zen Kaku Gothic New) against a
  // high-contrast display serif (Playfair Display) for Latin headings — a
  // fashion-magazine serif/sans heading contrast none of the other five
  // presets use.
  editorial: {
    headingJa: "var(--font-zen-kaku-gothic-new)",
    headingEn: "var(--font-playfair-display)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Modern — a clean contemporary sans-only pairing (no serif anywhere),
  // the strongest possible typographic contrast against Kinari's
  // mincho + old-style-serif baseline.
  modern: {
    headingJa: "var(--font-zen-kaku-gothic-new)",
    headingEn: "var(--font-inter)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },
};
```

- [ ] Step 4: Run `npm test -- typography-tokens` — expect PASS.
- [ ] Step 5: Commit (`feat(web): add six curated typography-token pairings`).

---

### Task 3: Wire `typography` field per preset in the registry

**Files:**
- Modify: `apps/salon-portfolio/web/config/design-presets.ts`
- Modify: `apps/salon-portfolio/web/config/design-presets.test.ts`

- [ ] Step 1: Add a failing assertion to `design-presets.test.ts`'s `describe("DESIGN_PRESETS", ...)` block, right after the existing `"uses the identically-named theme for every preset"` test:

```ts
  it("uses the identically-named typography for every preset (Typography Presets task)", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].typography).toBe(id);
    }
  });
```

- [ ] Step 2: Run `npm test -- design-presets` — expect FAIL (`femme`/`noir`/`editorial`/`natural`/`modern` currently have `typography: "kinari"`, inherited from `DEFAULT_DESIGN_CONFIG` via the spread in `withPreset`).
- [ ] Step 3: In `config/design-presets.ts`, change `withPreset(preset)`:

```ts
function withPreset(preset: DesignPreset): DesignConfig {
  return {
    ...DEFAULT_DESIGN_CONFIG,
    preset,
    theme: preset,
    typography: preset,
    sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}
```

  Also update the comment directly above `withPreset` (currently starting `// \`ThemeId\` shares its six string values...`) to read:

```ts
// `ThemeId` and `TypographyId` each share their six string values with
// `DesignPreset` 1:1 (see types/design-config.ts) — every preset uses the
// identically-named theme from `config/theme-tokens.ts`'s `THEMES`
// registry (Theme Presets task) and the identically-named typography
// pairing from `config/typography-tokens.ts`'s `TYPOGRAPHY` registry
// (Typography Presets task).
```

- [ ] Step 4: Run `npm test -- design-presets` — expect PASS. Run the full suite (`npm test`) to confirm nothing else assumed `typography: "kinari"` for every preset.
- [ ] Step 5: Commit (`feat(web): differentiate each design preset's typography id`).

---

### Task 4: Font loaders + `globals.css` per-preset heading overrides

**Files:**
- Modify: `apps/salon-portfolio/web/app/layout.tsx`
- Modify: `apps/salon-portfolio/web/app/globals.css`
- Create: `apps/salon-portfolio/web/app/globals.css.typography-sync.test.ts`

**Interfaces:**
- Consumes: `TYPOGRAPHY` (Task 2).

- [ ] Step 1: In `app/layout.tsx`, add two new imports to the existing `next/font/google` import:

```ts
import {
  Shippori_Mincho,
  Cormorant_Garamond,
  Noto_Sans_JP,
  Inter,
  Playfair_Display,
  Zen_Kaku_Gothic_New,
} from "next/font/google";
```

  Then add two new loader consts after the existing `inter` const:

```ts
// Noir/Editorial heading display serif (V1.1 Typography Presets) — a
// single bold weight only; this family is used exclusively as a heading
// font (never body), so no lighter weight is ever requested.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});

// Editorial/Modern Japanese heading (V1.1 Typography Presets) — bold clean
// geometric sans, deliberately distinct from the body's Noto Sans JP so a
// heading using it doesn't just look like enlarged body text.
const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku-gothic-new",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});
```

  Then update the `<html>` `className` to include both new `.variable`s:

```ts
      className={`${shipporiMincho.variable} ${cormorantGaramond.variable} ${notoSansJP.variable} ${inter.variable} ${playfairDisplay.variable} ${zenKakuGothicNew.variable} h-full antialiased`}
```

- [ ] Step 2: Run `npm run build` (web) once to confirm both new `next/font/google` families resolve and download correctly (network-dependent — if the sandbox has no internet access, run `npm run typecheck` instead and note the build step as deferred to Task 6's full validation pass, which runs with network access).
- [ ] Step 3: In `app/globals.css`, update the comment block directly above the five `html[data-design-preset="..."]` blocks (currently starting `/* Theme presets (V1.1 Theme Presets task) — one block per non-kinari ...`) to also mention typography:

```css
/*
 * Theme + typography presets (V1.1 Theme Presets / Typography Presets
 * tasks) — one block per non-kinari `ThemeId`, selected by
 * `html[data-design-preset]` (set from the resolved `DesignConfig.preset`
 * in app/layout.tsx; see docs/presentation-config-architecture.md). Kinari
 * has no block here on purpose: it stays defined only at `:root`/
 * `@theme inline` above, so the current default look cannot diverge from
 * what already ships. Every `--color-*` value is transcribed verbatim from
 * `config/theme-tokens.ts`'s `THEMES` registry
 * (`app/globals.css.theme-sync.test.ts` cross-checks this). Every
 * `--font-heading-*` value (present only on `noir`/`editorial`/`modern` —
 * `femme`/`natural` deliberately have none, since they reuse kinari's exact
 * heading pairing and simply inherit the base `@theme inline` mapping) is
 * transcribed verbatim from `config/typography-tokens.ts`'s `TYPOGRAPHY`
 * registry (`app/globals.css.typography-sync.test.ts` cross-checks this).
 * No component ever branches on which preset is active — every component
 * still only reads the same `--color-*`/`--font-heading-*`/`--font-body-*`
 * custom properties / `bg-background`, `text-primary`, etc. Tailwind
 * utilities; only the values behind them change.
 */
```

- [ ] Step 4: Add one line to the end of the `html[data-design-preset="noir"]` block (right before its closing `}`):

```css
  --font-heading-en: var(--font-playfair-display);
```

- [ ] Step 5: Add two lines to the end of the `html[data-design-preset="editorial"]` block:

```css
  --font-heading-ja: var(--font-zen-kaku-gothic-new);
  --font-heading-en: var(--font-playfair-display);
```

- [ ] Step 6: Add two lines to the end of the `html[data-design-preset="modern"]` block:

```css
  --font-heading-ja: var(--font-zen-kaku-gothic-new);
  --font-heading-en: var(--font-inter);
```

  (`femme` and `natural` blocks get no new lines — they keep inheriting the base `@theme inline` heading mapping, matching `TYPOGRAPHY.femme`/`TYPOGRAPHY.natural` from Task 2.)

- [ ] Step 7: Write `app/globals.css.typography-sync.test.ts` (failing until Steps 4–6 are done):

```ts
/**
 * Guards against `app/globals.css`'s per-preset `--font-heading-ja`/
 * `--font-heading-en` overrides drifting from
 * `config/typography-tokens.ts`'s `TYPOGRAPHY` registry — mirrors
 * `app/globals.css.theme-sync.test.ts`'s approach for color tokens.
 */
import fs from "node:fs";
import path from "node:path";
import { TYPOGRAPHY } from "@/config/typography-tokens";
import type { TypographyId } from "@/types/design-config";

const GLOBALS_CSS_PATH = path.join(__dirname, "globals.css");
const cssText = fs.readFileSync(GLOBALS_CSS_PATH, "utf-8");

// Only these three presets carry a --font-heading-* override — femme/natural
// deliberately reuse kinari's exact heading pairing (config/typography-tokens.ts),
// so their html[data-design-preset] block has no --font-heading-* line at all.
const OVERRIDE_TYPOGRAPHY_IDS: Array<Exclude<TypographyId, "kinari" | "femme" | "natural">> = [
  "noir",
  "editorial",
  "modern",
];
const NO_OVERRIDE_TYPOGRAPHY_IDS: Array<Extract<TypographyId, "femme" | "natural">> = ["femme", "natural"];

function extractBlockBody(css: string, selectorPattern: RegExp): string | null {
  const selectorMatch = css.match(selectorPattern);
  if (!selectorMatch || selectorMatch.index === undefined) return null;
  const openBraceIndex = css.indexOf("{", selectorMatch.index);
  const closeBraceIndex = css.indexOf("}", openBraceIndex);
  return css.slice(openBraceIndex + 1, closeBraceIndex);
}

function extractFontVar(blockBody: string, cssVarName: string): string | null {
  const match = blockBody.match(new RegExp(`${cssVarName}:\\s*(var\\(--font-[a-z0-9-]+\\))\\s*;`));
  return match ? match[1] : null;
}

describe("app/globals.css typography overrides match config/typography-tokens.ts", () => {
  it("the base @theme inline heading/body mapping matches TYPOGRAPHY.kinari exactly", () => {
    const themeBody = extractBlockBody(cssText, /@theme inline\s*\{/);
    expect(themeBody).not.toBeNull();
    expect(extractFontVar(themeBody!, "--font-heading-ja")).toBe(TYPOGRAPHY.kinari.headingJa);
    expect(extractFontVar(themeBody!, "--font-heading-en")).toBe(TYPOGRAPHY.kinari.headingEn);
    expect(extractFontVar(themeBody!, "--font-body-ja")).toBe(TYPOGRAPHY.kinari.bodyJa);
    expect(extractFontVar(themeBody!, "--font-body-en")).toBe(TYPOGRAPHY.kinari.bodyEn);
  });

  it.each(NO_OVERRIDE_TYPOGRAPHY_IDS)(
    'html[data-design-preset="%s"] has no --font-heading override (reuses kinari\'s pairing)',
    (id) => {
      const blockBody = extractBlockBody(cssText, new RegExp(`html\\[data-design-preset=["']${id}["']\\]\\s*\\{`));
      expect(blockBody).not.toBeNull();
      expect(blockBody).not.toMatch(/--font-heading-ja/);
      expect(blockBody).not.toMatch(/--font-heading-en/);
    },
  );

  it.each(OVERRIDE_TYPOGRAPHY_IDS)(
    'html[data-design-preset="%s"] resolves (block override, falling back to kinari where absent) to TYPOGRAPHY.%s',
    (id) => {
      const blockBody = extractBlockBody(cssText, new RegExp(`html\\[data-design-preset=["']${id}["']\\]\\s*\\{`));
      expect(blockBody).not.toBeNull();
      const expected = TYPOGRAPHY[id];
      const actualHeadingJa = extractFontVar(blockBody!, "--font-heading-ja") ?? TYPOGRAPHY.kinari.headingJa;
      const actualHeadingEn = extractFontVar(blockBody!, "--font-heading-en") ?? TYPOGRAPHY.kinari.headingEn;
      expect(actualHeadingJa).toBe(expected.headingJa);
      expect(actualHeadingEn).toBe(expected.headingEn);
    },
  );
});
```

- [ ] Step 8: Run `npm test -- typography-sync` — expect PASS (or fix any transcription mismatch between Steps 4–6's CSS and Task 2's registry — the registry is the source of truth).
- [ ] Step 9: Run the full web test suite (`npm test`) — expect all pre-existing tests still pass, confirming Kinari's font mapping was not touched.
- [ ] Step 10: Commit (`feat(web): add typography font loaders and per-preset heading overrides`).

---

### Task 5: Homepage non-default-typography render test + documentation

**Files:**
- Modify: `apps/salon-portfolio/web/app/page.test.tsx`
- Modify: `docs/presentation-config-architecture.md`

- [ ] Step 1: Add a test to `page.test.tsx`, right after the existing `"renders every section under a non-default theme preset"` test:

```ts
  it("renders every section under a non-default typography preset (Typography Presets task — typography selection is CSS-only, never gates rendering)", async () => {
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      preset: "editorial",
      theme: "editorial",
      typography: "editorial",
    });

    render(await Home());

    expect(screen.getByRole("heading", { name: "静けさの中で、指先を整える時間を" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "スタッフ紹介" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ギャラリー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
  });
```

- [ ] Step 2: Run `npm test -- page` — expect PASS (typography selection is CSS-only; `Home()`'s own logic never branches on `typography`/`theme`/`preset`, so this mainly guards against an accidental future coupling).
- [ ] Step 3: Add a "Typography tokens (V1.1 Typography Presets task)" section to `docs/presentation-config-architecture.md`, placed directly after the existing "Theme tokens (V1.1 Theme Presets task)" section, covering:
  - The `TypographyTokens` model (4 keys) and why it reuses the pre-existing `--font-heading-ja`/`--font-heading-en`/`--font-body-ja`/`--font-body-en` CSS variable names rather than inventing new ones.
  - The `TYPOGRAPHY` registry as source of truth, and how a selected preset's `typography` id reaches `app/layout.tsx`'s font loaders and then `app/globals.css`'s per-preset overrides — the same `data-design-preset` attribute Theme Presets already established, no new mechanism.
  - The font-loading strategy and its documented tradeoff: all 6 curated font families (4 pre-existing + `Playfair_Display` + `Zen_Kaku_Gothic_New`, each at one weight) are always loaded/self-hosted via `next/font/google` and switched purely by which CSS custom property value is active for the deployment's one configured `SALON_DESIGN_PRESET` — browsers only fetch the `@font-face` files actually referenced by rendered text, so an unused preset's fonts add to the build's static asset count but not to what a given deployment's visitors download. Contrast this explicitly with the rejected alternative (conditionally loading fonts per env var at build time), which `next/font/google`'s static-analysis requirement makes impractical without per-buyer custom build tooling — out of scope, not attempted.
  - Why `femme`/`natural` deliberately have no CSS override block (they inherit Kinari's exact heading pairing) while `noir`/`editorial`/`modern` do.
  - Why components never consume a font token directly (only two global CSS rules — `h1,h2,h3` and `body` — do, both pre-existing, both unchanged in shape by this task).
  - An explicit note that per-preset line-height/letter-spacing variation (e.g. Natural's "relaxed line-height" design direction) was considered and **not implemented** in this task: every section's line-height is already a per-component Tailwind utility class (e.g. `leading-[1.7]`), not a global token, so a blanket `body { line-height: ... }` override would be silently outranked by CSS specificity and produce no visible effect — a real per-component line-height system is a larger, separate change and is called out as deferred, not silently skipped.
  - How to add a 7th typography pairing later: add a `TYPOGRAPHY` entry to `config/typography-tokens.ts` (validated automatically by the existing `typography-tokens.test.ts` `describe`/`it.each`), add matching `--font-heading-*` line(s) to a `html[data-design-preset="..."]` block in `app/globals.css` only if it differs from Kinari's pairing (`app/globals.css.typography-sync.test.ts` will fail until the two match), and add the new id to `TypographyId` in `types/design-config.ts` plus a `DesignPreset` registry entry in `config/design-presets.ts` if it should also be selectable as its own preset. If the new pairing needs a font family not already loaded, add one `next/font/google` loader call in `app/layout.tsx` at the single weight actually needed.
  - Update the "Not yet implemented" list: remove "Typography presets" and add a short note referencing the new section, matching how the Theme Presets task's own doc update removed "Theme presets" from that list.
- [ ] Step 4: Commit (`docs(web): document the typography token architecture`).

---

### Task 6: Full validation pass

**Files:** none (verification only).

- [ ] Step 1: `npm run typecheck` (web) — 0 errors.
- [ ] Step 2: `npm run lint` (web) — 0 errors/warnings.
- [ ] Step 3: `npm test` (web) — full suite, record before/after counts from the actual output (not estimated) in the evidence folder.
- [ ] Step 4: `npm run build` (web) — production build succeeds (this is also the real confirmation that `Playfair_Display`/`Zen_Kaku_Gothic_New` resolve correctly, if Task 4 Step 2 had to be deferred for network reasons).
- [ ] Step 5: GAS: run its existing `npm test`/typecheck/build commands unchanged (this task touches no GAS file — confirm via `git status -s` scoped to `apps/salon-portfolio/gas/`).
- [ ] Step 6: Visual spot-check (dev server + browser, or document the limitation if browser tooling is unavailable) for `kinari` (unchanged), `editorial`, `modern` at desktop + mobile widths — Hero heading, section headings, body copy, navigation, buttons, menu, staff, footer; mobile: heading wrapping, body readability, no horizontal overflow. State plainly which of these were directly browser-verified vs. structurally verified only.
- [ ] Step 7: One commit wrapping any leftover formatting-only changes, if needed; otherwise this task produces no diff.

---

## Self-review notes

- Spec coverage: typed typography model ✓ (Task 1), six typography presets ✓ (Task 2, with explicit reuse-vs-distinct rationale per preset), preset integration (`typography: preset`) ✓ (Task 3), CSS integration via existing `data-design-preset` + existing `--font-heading-*`/`--font-body-*` tokens, no new token system ✓ (Task 4), font loading strategy documented (small curated set, tradeoff explained) ✓ (Task 4 architecture note + Task 5 docs), no component branching ✓ (zero component files touched — only `layout.tsx` font loader declarations and `globals.css`), Japanese readability preserved (body always Noto Sans JP, only heading fonts vary, all chosen with real JP glyph coverage) ✓ (Task 2), Kinari preserved byte-for-byte ✓ (Task 2's kinari-equality test + Task 4's sync test), tests for typography registry/preset integration/CSS sync/regression ✓ (Tasks 2/3/4/5), documentation ✓ (Task 5), honest scope note on line-height (requested by the Natural direction, deliberately not implemented, reason stated) ✓ (Task 5).
- No placeholders: every step names exact files and includes literal code (font family names, weights, CSS variable names, full test bodies).
- Type consistency: `TypographyTokens` (Task 1) keys (`headingJa`/`headingEn`/`bodyJa`/`bodyEn`) are used identically in `TYPOGRAPHY` (Task 2), the `globals.css` parser (Task 4), and nowhere else redefined. `TypographyId`'s six values match `DesignPreset`'s six values exactly, consistent with how `ThemeId` already does this.
