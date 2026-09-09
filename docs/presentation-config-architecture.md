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

| Field | Type | Status as of this task |
|---|---|---|
| `preset` | `DesignPreset` (6 values) | All 6 registered; only `kinari` differs from the others (identically for now) |
| `theme` | `ThemeId` | Only `"kinari"` exists — a later task adds curated palettes |
| `typography` | `TypographyId` (6 values) | All 6 registered with curated heading-font pairings (Typography Presets task); body typography is shared across all 6 |
| `heroVariant` | `HeroVariant` (3 values) | All 3 registered — `fullscreen`/`split`/`editorial` (Hero Layout Variants task) |
| `menuVariant` | `MenuVariant` (3 values) | All 3 registered — `editorial-list`/`card-grid`/`minimal-price-list` (Menu Layout Variants task) |
| `staffVariant` | `StaffVariant` (2 values) | All 2 registered — `portrait-grid`/`horizontal-profile` (Staff Layout Variants task) |
| `galleryVariant` | `GalleryVariant` (3 values) | All 3 registered — `grid`/`masonry`/`feature-editorial` (Gallery Layout Variants task) |
| `sectionVisibility` | `Record<OptionalHomeSection, boolean>` | Fully wired into `app/page.tsx`; every default is `true` |
| `sectionOrder` | `HomeSection[]` | Typed, defaulted, and validated (`isValidSectionOrder`); **not yet** read by `app/page.tsx` |

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
what keeps the design layer free of business logic: it never decides
whether reservation/staff-selection/contact-form *should* be available,
only whether an already-available section is visually shown.

There is intentionally no `sections: {id, component}[]` registry driving a
generic render loop — `app/page.tsx` still lists each section as its own
JSX element with its own real props. `sectionOrder` exists as validated,
typed data today so a future task has a safe foundation, but wiring it
into render order is deferred; building a generic section-rendering
engine now, before a second real order exists to justify it, would be
over-engineering.

## Preset registry

`config/design-presets.ts` exports `DEFAULT_DESIGN_CONFIG` (today's
Kinari look) and `DESIGN_PRESETS: Record<DesignPreset, DesignConfig>`. As
of this task, all six registry entries are identical except `preset`
itself — selecting `femme`/`noir`/`editorial`/`natural`/`modern` today is
a safe no-op. Each future task (theme, typography, hero/menu/staff/
gallery variants, section order/visibility, curated multi-field presets)
edits one field on one or more preset entries; none of them need to touch
the registry's shape, the validator, or the resolver.

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

## Theme tokens (V1.1 Theme Presets task)

Task 1 left every `ThemeId` resolving to the same Kinari colors. This task
gives all six presets (`kinari`, `femme`, `noir`, `editorial`, `natural`,
`modern`) their own curated palette, entirely through CSS custom properties
— no component was given preset-aware logic.

```text
DesignConfig.theme (ThemeId)
        |
        v
config/theme-tokens.ts — THEMES: Record<ThemeId, ThemeTokens>
        |                        (typed, contrast-tested source of truth)
        v
app/globals.css — html[data-design-preset="x"] { --color-*: ...; }
        |                        (hand-mirrored, cross-checked by a test)
        v
existing components — bg-background, text-primary, bg-accent, ... (unchanged)
```

**`ThemeTokens` model** (`types/design-config.ts`): 14 semantic roles —
`background`, `surface`, `surfaceSunken`, `primary`, `onPrimary`,
`secondary`, `accent`, `onAccent`, `accentHover`, `text`, `muted`, `border`,
`success`, `error`. This is the same set already centralized in
`app/globals.css` before this task, plus one new token: `accentHover`,
because `components/ui/Button.tsx`'s primary-button hover state needed a
theme-aware shade that plain CSS custom properties can't derive from
`accent` alone (it was a hard-coded `#833d33` before this task). `primary`/
`onPrimary` are a matched pair used both as text-on-light-surface
(`text-primary` — every heading, the secondary-button label) and as a
dark-band background with light text on it (`bg-primary text-on-primary` —
the Footer, and the Hero photo's legibility scrim); for a light theme
`primary` is the dark ink tone, for a dark theme (`noir`) the roles invert
so both uses stay internally consistent — see the full role note on
`ThemeTokens` in `types/design-config.ts`.

**Six themes** (`config/theme-tokens.ts`'s `THEMES` registry):

| Theme | Direction |
|---|---|
| `kinari` | Unchanged shipped default — washi off-white, sumi ink, muted enji-iro (terracotta) accent |
| `femme` | Blush-cream background, muted dusty-rose accent — elegant, not neon or "cute app" |
| `noir` | Warm charcoal (never pure black), ivory ink, muted copper accent — a deliberate dark-first preset, not a light/dark toggle |
| `editorial` | Crisp white/near-black monochrome, higher contrast than Kinari, one restrained mustard-gold accent |
| `natural` | Warm sand background, deep earth-brown ink, muted sage-green accent |
| `modern` | Cooler crisp-neutral background, stronger near-black ink, a single deep-teal accent |

Every theme's text/button/link/focus-ring/semantic-color token pairs are
verified against WCAG AA thresholds (4.5:1 body text, 3:1 focus-ring/
non-text UI) in `config/theme-tokens.test.ts`, using
`lib/utils/contrastRatio.ts` — a plain WCAG relative-luminance calculator,
no DOM dependency. `accent` and `error` are asserted to always differ per
theme, so a themed CTA can never be mistaken for an error state.

**How the selection reaches CSS:** unchanged from Task 1 —
`app/layout.tsx` already sets `data-design-preset={designConfig.preset}` on
`<html>` from the resolved `DesignConfig`, server-rendered on first paint
(no `useEffect`, no client-side hydration step). `app/globals.css` selects
the matching `html[data-design-preset="x"] { --color-*: ...; }` block; the
`kinari` preset intentionally has **no** override block — it stays defined
only at `:root`, so the current default look cannot diverge from what
already ships. `app/globals.css.theme-sync.test.ts` parses `globals.css`
and cross-checks every block against `THEMES` (including that `:root`
matches `THEMES.kinari` exactly), since the CSS file and the TS registry
are necessarily two files that could otherwise drift silently.

**Why components never branch on preset:** every section/UI component
already consumed only semantic Tailwind utilities backed by these
`--color-*` custom properties (confirmed by grepping the whole `components/`
tree before this task — the only literal hex color anywhere outside
`globals.css` was `Button.tsx`'s now-removed `#833d33`). Swapping a theme is
therefore purely a CSS-variable value change; no component file changed
except `Button.tsx`'s one-line rename from a hard-coded hex to the
`accent-hover` token class.

**Adding a 7th theme later:** add one `ThemeTokens` entry to `THEMES` in
`config/theme-tokens.ts` (contrast-checked automatically by the existing
`theme-tokens.test.ts` `describe.each`), copy its values into a matching
`html[data-design-preset="..."]` block in `app/globals.css`
(`globals.css.theme-sync.test.ts` will fail until the two match), and add
the new id to `ThemeId` in `types/design-config.ts` plus a `DesignPreset`
registry entry in `config/design-presets.ts` if it should also be
selectable as its own preset. No component file needs to change.

## Typography tokens (V1.1 Typography Presets task)

Theme Presets gave every preset its own colors; this task gives every
preset its own heading-font personality, through the same mechanism —
`TypographyId`, widened from the Task-1 placeholder (`"kinari"` only) to
all six `DesignPreset` values, and a `TYPOGRAPHY` registry mirrored into
`app/globals.css`.

```text
DesignConfig.typography (TypographyId)
        |
        v
config/typography-tokens.ts — TYPOGRAPHY: Record<TypographyId, TypographyTokens>
        |                        (typed source of truth, 4 keys)
        v
app/globals.css — html[data-design-preset="x"] { --font-heading-*: ...; }
        |                        (hand-mirrored, cross-checked by a test)
        v
h1,h2,h3 { font-family: var(--font-heading-ja), var(--font-heading-en), ... }
body     { font-family: var(--font-body-ja), var(--font-body-en), ... }
        |                        (pre-existing global CSS, unchanged in shape)
        v
existing components (no component reads a font token directly)
```

**`TypographyTokens` model** (`types/design-config.ts`): 4 keys —
`headingJa`, `headingEn`, `bodyJa`, `bodyEn` — reusing the exact
`--font-heading-ja`/`--font-heading-en`/`--font-body-ja`/`--font-body-en`
CSS variable names that already existed before V1.1 (only their per-preset
override capability is new). No new semantic role (e.g. a separate
"display" token) was added, because no component or existing CSS rule
consumes anything beyond these 4 roles today — the task's own guidance
("only add tokens that are actually needed") ruled that out. Each token's
value is a ready-to-use `var(--font-xxx)` string pointing at a
`next/font/google` loader variable declared in `app/layout.tsx`, exactly
mirroring how `ThemeTokens` stores ready-to-use hex strings.

**Six typography pairings** (`config/typography-tokens.ts`'s `TYPOGRAPHY`
registry):

| Typography | Heading (JA / EN) | Rationale |
|---|---|---|
| `kinari` | Shippori Mincho / Cormorant Garamond | Unchanged shipped default |
| `femme` | Shippori Mincho / Cormorant Garamond | Deliberately identical to Kinari — the "elegant feminine serif" direction is already close to Kinari's own quiet-luxury mincho; personality comes from `femme`'s theme colors instead of a second near-identical serif |
| `natural` | Shippori Mincho / Cormorant Garamond | Deliberately identical to Kinari, same rationale — "warm organic mincho" is Kinari's pairing already |
| `noir` | Shippori Mincho / Playfair Display | Kinari's restrained mincho stays for Japanese; Latin headings switch to a sophisticated editorial display serif |
| `editorial` | Zen Kaku Gothic New / Playfair Display | The most distinctive pairing: a bold clean Japanese sans against a high-contrast Latin display serif — a fashion-magazine contrast no other preset uses |
| `modern` | Zen Kaku Gothic New / Inter | Sans-only in both scripts — the strongest possible contrast against Kinari's serif/mincho baseline |

Body typography (`bodyJa`/`bodyEn`) is Noto Sans JP + Inter for **every**
preset, never varied — see the rationale comment at the top of
`config/typography-tokens.ts`.

**Font loading strategy and its tradeoff:** all 6 curated font families (4
pre-existing — Shippori Mincho, Cormorant Garamond, Noto Sans JP, Inter —
plus 2 new: Playfair Display, Zen Kaku Gothic New, each loaded at exactly
one weight) are declared as `next/font/google` loaders in `app/layout.tsx`
and self-hosted in **every** production build, regardless of which single
preset that build's `SALON_DESIGN_PRESET` selects — the same "load
everything, switch by CSS attribute" strategy the Theme Presets task
already uses for colors. Verified directly (`npm run build`'s output marks
`/` as `○ (Static)`): the homepage is prerendered **at build time**, so
`SALON_DESIGN_PRESET` is genuinely build-time configuration here, not a
value `next start` can pick up from a changed env var without a rebuild —
each buyer's deployment runs its own `next build` with its own env var
already set, consistent with `.env.example`'s existing framing of this
variable. Even so, this task deliberately did **not** try to make
`next/font/google` load only the active preset's families conditionally
per build: its loader calls must be static, module-scope calls for the
compiler's static analysis to pick them up, so branching on
`process.env.SALON_DESIGN_PRESET` around a loader call would need to
survive dead-code elimination reliably to actually skip fetching/bundling
the unused family's files — not guaranteed, and risky to depend on without
per-buyer custom build tooling, which is out of scope. The practical cost
of loading all 6 unconditionally is small and asymmetric: unused
`@font-face` declarations add a few extra font files to the build's static
output, but browsers only *fetch* a `@font-face` resource when rendered
text actually resolves to that font-family — since only one preset's
`data-design-preset` value is ever baked into a given deployment's `<html>`
element, a visitor only ever downloads the ~4 font files their site's
preset actually renders with, not all ~7 loader instances. This is the
same tradeoff already accepted for theme colors (near-zero marginal byte
cost there); for fonts the marginal cost is a handful of extra static files
in the build artifact, judged acceptable against the alternative (a
second, more complex conditional build-time font-selection system) per the
task's explicit "do not over-engineer this" guidance.

**Why `femme`/`natural` have no CSS override block:** `app/globals.css`
already has one `html[data-design-preset="x"]` block per non-kinari theme
(for colors); this task adds `--font-heading-ja`/`--font-heading-en` lines
only to the three blocks whose typography actually differs from Kinari's
(`noir`, `editorial`, `modern`). `femme`'s and `natural`'s blocks
deliberately get no font lines at all — the same "no override needed
because the value already matches the inherited default" pattern Kinari
itself uses for having no block whatsoever. `app/globals.css.typography-sync.test.ts`
asserts both things: the three differing presets' overrides match
`TYPOGRAPHY`, and `femme`/`natural`'s blocks contain no `--font-heading-*`
line at all.

**Why components never consume a font token directly:** confirmed by
grepping `components/` before this task — no component sets `font-family`,
imports a font loader, or references `Shippori`/`Cormorant`/`Noto`/`Inter`
by name. Every heading and every body text already renders through exactly
two pre-existing global CSS rules (`h1,h2,h3` and `body` in
`app/globals.css`), both unchanged in shape by this task — only the
variable values behind `--font-heading-ja`/`--font-heading-en` gained a
per-preset override. Zero component files were modified by this task.

**Explicitly not implemented — per-preset line-height/letter-spacing:** the
Natural typography direction's brief called for "relaxed line-height," but
this was deliberately **not** implemented. Every section's line-height is
already set as a per-component Tailwind arbitrary-value utility (e.g.
`leading-[1.7]` on a paragraph), not a global token — a blanket
`body { line-height: ... }` override would be outranked by every one of
those more-specific class selectors and produce no visible effect. Faking
this with a rule that doesn't actually change rendered output would be
worse than not shipping it; a real per-component/per-preset line-height
system is a larger, separate change and is called out here as deferred,
not silently dropped.

**Adding a 7th typography pairing later:** add a `TYPOGRAPHY` entry to
`config/typography-tokens.ts` (validated automatically by the existing
`typography-tokens.test.ts`), add `--font-heading-*` line(s) to a matching
`html[data-design-preset="..."]` block in `app/globals.css` **only if** the
new pairing differs from Kinari's (`app/globals.css.typography-sync.test.ts`
will fail until the two match), and add the new id to `TypographyId` in
`types/design-config.ts` plus a `DesignPreset` registry entry in
`config/design-presets.ts` if it should also be selectable as its own
preset. If the new pairing needs a font family not already loaded, add one
`next/font/google` loader call in `app/layout.tsx` at the single weight
actually needed — do not add a family "just in case."

## Hero layout variants (V1.1 Task 5)

Task 1 left `HeroVariant` a 3-value union with only `"fullscreen"` wired to
a real component. This task builds the other two and turns `HeroSection`
into a router:

```text
DesignConfig.heroVariant (HeroVariant)
        |
        v
lib/validation/designConfigValidator.ts — isHeroVariant()
        |            (invalid/missing → DEFAULT_HERO_VARIANT "fullscreen")
        v
components/sections/HeroSection.tsx
        — HERO_VARIANT_COMPONENTS: Record<HeroVariant, ComponentType<...>>
        |
        +-- "fullscreen" -> HeroFullscreen  (today's pre-Task-5 look, unchanged)
        +-- "split"      -> HeroSplit       (text column + image column)
        +-- "editorial"  -> HeroEditorial   (centered opening, asymmetric photo/copy)
```

**What each variant is for:**

- `fullscreen` — the shipped default: a full-bleed photo with a legibility
  scrim, headline/CTA in the lower-left third. Every preset's current
  `heroVariant` (§10 below), and the only variant that shows a dark photo
  behind the header.
- `split` — text and photo in separate columns (not a CSS reorder of
  `fullscreen`): salon name/nameLatin/tagline/CTA on one side, the photo on
  the other. Collapses to a single stacked column on mobile.
- `editorial` — a centered name/tagline opening, a large photo offset to
  one side, and supporting copy/CTA offset to the other — a Japanese
  editorial composition carried by whitespace and type scale, not new
  decoration.

**One Hero data model:** all three variants take the same
`HeroContentProps` (`components/sections/HeroContent.tsx`) —
`headline`/`subheadline`/`name`/`nameLatin` — sourced in `app/page.tsx`
entirely from the existing `siteConfig.business` fields (already
runtime-resolved since Task 4). No variant introduces its own content
shape, a second data model, or a new GAS action. The Hero photo path and
both CTA (`href`/label`) pairs also live in `HeroContent.tsx`, shared by
all three variants so they can never drift from each other.

**Selecting a variant:** `DesignConfig.heroVariant`, same as every other
design field — `app/page.tsx` reads it off `getDesignConfig()` and passes
it straight to `HeroSection`. This task does **not** set any
`DESIGN_PRESETS` entry to `split`/`editorial` — every preset still resolves
`heroVariant: "fullscreen"` (§J's "don't ship curated multi-field presets
yet"); `split`/`editorial` are reachable today only by constructing a
`DesignConfig` directly (as the tests do), which is enough to prove the
architecture without jumping ahead to the curated-preset task.

**Backward compatibility:** `isHeroVariant` (mirrors `isHomeSection`) makes
`HeroSection` normalize whatever `heroVariant` it receives — missing or
invalid falls back to `DEFAULT_HERO_VARIANT` (`"fullscreen"`,
`lib/constants/hero-variants.ts`), so an existing deployment's Hero can
never silently change appearance.

**Header contrast fix required by this task:** `SiteHeader`'s transparent,
white-text "floating over the hero" state (Phase 2A §7-8) was written
assuming the homepage always opens on `HeroFullscreen`'s dark photo. Once
`split`/`editorial` (ordinary light section backgrounds) became reachable,
that assumption broke — white nav text over a light background is
unreadable. Fixed with one new `SiteHeader` prop, `overDarkHeroImage`
(default `true`, so every non-homepage route and every existing test call
site keep today's behavior), which `app/layout.tsx` sets to
`designConfig.heroVariant === "fullscreen"`. This is not a new header
*style* — the header still has exactly one visual design — only a
correction to when its existing transparent state applies.

**Presentation-only, still:** no variant reads or writes reservation state,
calls `getServices`/`getStaff`, or touches `app/globals.css`'s theme/
typography tokens directly — every color/font comes from the same semantic
Tailwind utilities (`bg-surface`, `text-primary`, `text-accent`, …) every
other section already uses, so all six `ThemeId`s and all six
`TypographyId`s render correctly under every Hero variant with zero
variant-specific styling logic.

## Menu layout variants (V1.1 Task 6)

Task 1 left `MenuVariant` a 3-value union with only `"editorial-list"` wired
to a real component. This task builds the other two and turns `MenuSection`
into a router — the same shape as Hero's (§ above), with one structural
difference explained below:

```text
DesignConfig.menuVariant (MenuVariant)
        |
        v
lib/validation/designConfigValidator.ts — isMenuVariant()
        |            (invalid/missing → DEFAULT_MENU_VARIANT "editorial-list")
        v
components/sections/MenuSection.tsx
        — owns the #menu anchor, "メニュー" heading, and reservation CTA
        — MENU_VARIANT_COMPONENTS: Record<MenuVariant, ComponentType<...>>
        |
        +-- "editorial-list"    -> MenuEditorialList   (today's pre-Task-6 look, unchanged)
        +-- "card-grid"         -> MenuCardGrid         (bordered card grid)
        +-- "minimal-price-list" -> MenuMinimalPriceList (compact, undecorated list)
```

**What each variant is for:**

- `editorial-list` — the shipped default: services grouped by category
  (once `groupServices` decides there's more than one implicit category,
  Phase 2A §9, unchanged), hairline dividers between rows, name/price
  carrying the visual weight, description as quiet supporting copy.
- `card-grid` — each service is its own bordered card (`bg-background` +
  `border-border`, no shadow) in a responsive grid (`grid-cols-1
  sm:grid-cols-2`); category becomes a small per-card label instead of a
  section heading, and every card's price/duration row is pinned to the
  bottom (`mt-auto`) so cards stay visually balanced whether or not a
  description is present.
- `minimal-price-list` — no category grouping, no per-row dividers, no
  description: tightly packed (`py-2`) name/price rows closed by a single
  hairline rule under the whole list. Deliberately not editorial-list with
  description/borders stripped — the composition (no grouping, no per-row
  separators) differs, not just the decoration.

**One Menu data model:** all three variants take the same
`MenuContentProps` (`components/sections/MenuContent.tsx`) — `services:
Service[]` — sourced in `app/page.tsx` entirely from the existing
`getRuntimeCatalog()` → `getServices` → `Service[]` flow (Phase 5.1/Task 4).
No variant introduces its own service model, and none can become a source
of truth for reservation price/duration — the Reservation Wizard still
resolves those server-side, independently of anything under
`components/sections/Menu*.tsx` (see "Why reservation/GAS code stays
design-agnostic" above). `formatMenuPrice`/`formatMenuDuration`/
`groupServices`/`MENU_CTA` also live in `MenuContent.tsx`, shared by all
three variants so formatting/grouping/the reservation CTA can never drift
between them.

**Section chrome lives once, not three times:** unlike Hero (where each
variant owns its whole `<section>`, because the three layouts' backgrounds/
padding genuinely differ), Menu's `#menu` anchor id — linked to by
`HeroContent.tsx`'s `HERO_CTA_SECONDARY` and the site nav
(`config/demo-content.ts`) — plus its "メニュー" heading and reservation CTA
are identical across all three variants, so `MenuSection.tsx` renders them
once and only swaps the inner service-list component. This still satisfies
the "genuinely different compositions" requirement: the differentiation
that matters is the service list body, not whether a page heading is
duplicated three times.

**Selecting a variant:** `DesignConfig.menuVariant`, same as every other
design field — `app/page.tsx` reads it off `getDesignConfig()` and passes
it straight to `MenuSection`. This task does **not** set any
`DESIGN_PRESETS` entry to `card-grid`/`minimal-price-list` — every preset
still resolves `menuVariant: "editorial-list"` (§J's "don't ship curated
multi-field presets yet"); the other two are reachable today only by
constructing a `DesignConfig` directly (as the tests do).

**Backward compatibility:** `isMenuVariant` (mirrors `isHeroVariant`) makes
`MenuSection` normalize whatever `menuVariant` it receives — missing or
invalid falls back to `DEFAULT_MENU_VARIANT` (`"editorial-list"`,
`lib/constants/menu-variants.ts`), so an existing deployment's Menu can
never silently change appearance. `editorial-list` is the pre-Task-6 Menu
body, moved unchanged into `MenuEditorialList.tsx`.

**Presentation-only, still:** no variant reads or writes reservation state,
invents a price/duration/description, or touches `app/globals.css`'s theme/
typography tokens directly — every color/font comes from the same semantic
Tailwind utilities every other section already uses, so all six `ThemeId`s
and all six `TypographyId`s render correctly under every Menu variant
(visually spot-checked under `kinari`/`noir`) with zero variant-specific
styling logic.

## Staff layout variants (V1.1 Task 7)

Task 1 left `StaffVariant` a 2-value union with only `"portrait-grid"` wired
to a real component. This task builds the alternate and turns `StaffSection`
into a router — the same shape as Menu's (§ above):

```text
DesignConfig.staffVariant (StaffVariant)
        |
        v
lib/validation/designConfigValidator.ts — isStaffVariant()
        |            (invalid/missing → DEFAULT_STAFF_VARIANT "portrait-grid")
        v
components/sections/StaffSection.tsx
        — owns the #staff id, "スタッフ紹介" heading, and the enabled gate
        — STAFF_VARIANT_COMPONENTS: Record<StaffVariant, ComponentType<...>>
        |
        +-- "portrait-grid"      -> StaffPortraitGrid      (today's pre-Task-7 look, unchanged)
        +-- "horizontal-profile" -> StaffHorizontalProfile (editorial profile rows)
```

**What each variant is for:**

- `portrait-grid` — the shipped default: portrait-oriented (4:5) staff
  photos in a responsive grid (`grid-cols-2 lg:grid-cols-4`), name carrying
  the visual weight, role secondary, bio (`introduction`) as supporting
  copy when present. Byte-identical to the pre-Task-7 `StaffSection` body,
  moved unchanged into `StaffPortraitGrid.tsx`.
- `horizontal-profile` — a single-column list of profile rows: a square
  (1:1) photo region alongside a separate text region carrying a clear
  name → role → bio hierarchy, divided by hairline rules. Genuinely
  different composition from `portrait-grid` (square crop vs. portrait
  crop, one column of rows vs. a multi-column grid), not a `flex-row`
  recolor of the same cards.

**One Staff data model:** both variants take the same `StaffContentProps`
(`components/sections/StaffContent.tsx`) — `staff: StaffMember[]`,
`anyAvailableOption: boolean`, `businessNameInitial: string` — sourced in
`app/page.tsx` entirely from the existing `getRuntimeCatalog()` →
`getStaff` → `StaffMember[]` flow (Phase 5.1/Task 4). No variant introduces
its own staff model. `STAFF_ANY_AVAILABLE` (the "指名なし（お任せ）" copy),
`staffPhotoAlt`, and the `StaffPhotoFallback` initial-letter tile also live
in `StaffContent.tsx`, shared by `StaffCard`/`AnyAvailableStaffCard`
(portrait-grid) and `StaffHorizontalProfile` so the fallback/alt-text
behavior can never drift between them.

**Filtering/ordering stays server-side:** `Active` filtering and
`DisplayOrder` sorting both already happen in
`apps/salon-portfolio/gas/src/PublicCatalog.ts`'s `buildPublicStaff` before
`staff` ever reaches the frontend — neither variant re-filters or re-sorts
it, and `CalendarID`/`displayOrder` are never carried into the frontend
`StaffMember` view type (`types/content.ts`) in the first place, so no
backend-only identifier reaches the UI.

**Section chrome lives once, not twice:** like Menu (and unlike Hero,
where each variant owns its whole `<section>`), the `#staff` id, the
"スタッフ紹介" heading, and the `enabled` gate (`CONFIG.features.staffSelection
&& sectionVisibility.staff` — Phase 0 §K: renders nothing at all, not just
visually hidden, when off) are identical across both variants, so
`StaffSection.tsx` renders them once and only swaps the inner staff-list
component.

**Selecting a variant:** `DesignConfig.staffVariant`, same as every other
design field — `app/page.tsx` reads it off `getDesignConfig()` and passes
it straight to `StaffSection`. This task does **not** set any
`DESIGN_PRESETS` entry to `horizontal-profile` — every preset still
resolves `staffVariant: "portrait-grid"`; the alternate is reachable today
only by constructing a `DesignConfig` directly (as the tests do).

**Backward compatibility:** `isStaffVariant` (mirrors `isHeroVariant`/
`isMenuVariant`) makes `StaffSection` normalize whatever `staffVariant` it
receives — missing or invalid falls back to `DEFAULT_STAFF_VARIANT`
(`"portrait-grid"`, `lib/constants/staff-variants.ts`), so an existing
deployment's Staff section can never silently change appearance.

**Presentation-only, still:** no variant reads or writes reservation state,
staff eligibility, or `CalendarID`, and no color/font is hard-coded — every
value comes from the same semantic Tailwind utilities every other section
already uses, so all six `ThemeId`s and all six `TypographyId`s render
correctly under every Staff variant (visually spot-checked under
`kinari`/`noir`) with zero variant-specific styling logic.

## Gallery layout variants (V1.1 Task 8)

Task 1 left `GalleryVariant` a 3-value union (`"grid" | "masonry" |
"large-feature"`) with none of them wired to a real component —
`GallerySection.tsx` never actually branched on `galleryVariant`; it always
rendered one CSS-`columns` body regardless. This task renames the third
value to `"feature-editorial"`, builds all three as real components, and
turns `GallerySection` into a router — the same shape as Menu's/Staff's:

```text
DesignConfig.galleryVariant (GalleryVariant)
        |
        v
lib/validation/designConfigValidator.ts — isGalleryVariant()
        |            (invalid/missing → DEFAULT_GALLERY_VARIANT "grid")
        v
components/sections/GallerySection.tsx
        — owns the #gallery id and "ギャラリー" heading
        — GALLERY_VARIANT_COMPONENTS: Record<GalleryVariant, ComponentType<...>>
        |
        +-- "grid"             -> GalleryGrid             (today's pre-Task-8 look, unchanged)
        +-- "masonry"          -> GalleryMasonry           (bento-style CSS Grid, deterministic pattern)
        +-- "feature-editorial" -> GalleryFeatureEditorial (one dominant image + supporting tiles)
```

**Naming reconciliation:** `DEFAULT_DESIGN_CONFIG.galleryVariant` (and thus
every preset's resolved value) changes from `"masonry"` to `"grid"` in this
task. This is not a behavior change — since `GallerySection` never actually
read `galleryVariant` before this task, the string `"masonry"` was already
an inert label for the shipped CSS-columns look. Renaming the *label* that
now maps to that unchanged look (`"grid"`) is what keeps the **rendered
pixels** backward compatible; keeping the label `"masonry"` as the default
would have wired a real, differently-composed `masonry` component under a
name every existing deployment already resolves to, which would have been
the actual regression.

**What each variant is for:**

- `grid` — the shipped default: CSS `columns` (masonry-via-columns) on
  tablet/desktop, single column on mobile, each tile keeping its own
  source aspect ratio via `PlaceholderImage`. Byte-identical to the
  pre-Task-8 `GallerySection`/`GalleryImage` body, moved unchanged into
  `GalleryGrid.tsx`.
- `masonry` — a true CSS Grid (row-first, not `columns`' column-first
  reading order) with a repeating bento-style pattern of tile row-spans
  cycled by position (`GalleryMasonry.tsx`'s `MASONRY_PATTERN`), not each
  tile's own aspect ratio — the demo photography's ratios are all fairly
  similar landscape crops, so a ratio-driven height would barely read as
  "masonry" at a glance; a positional pattern guarantees visible variety
  regardless of which photos a deployment swaps in, while staying fully
  deterministic (no JS measuring a rendered image).
- `feature-editorial` — the first image renders as one dominant tile
  (`col-span-2 lg:row-span-2`); the rest auto-place as smaller supporting
  tiles via CSS Grid's normal (non-dense) auto-placement, no manual
  row/column math. Asymmetric by design — substantially different from
  both `grid` and `masonry`.

Both `masonry` and `feature-editorial` build their tiles directly on
`next/image` rather than reusing `PlaceholderImage`: `PlaceholderImage`
forces its wrapper's CSS `aspect-ratio` to the image's own `width`/`height`,
which fights a CSS Grid item's row/column-track sizing (the browser sizes
the box from the aspect ratio instead of stretching it to fill the grid
area the track defines). Both variants instead let the grid track size the
box and crop with `object-cover` — never stretching, the same tradeoff
`StaffHorizontalProfile`'s square crop already makes.

**One Gallery data model, no runtime path today:** all three variants take
the same `GalleryContentProps` (`components/sections/GalleryContent.tsx`)
— `images: GalleryImageItem[]` — sourced in `app/page.tsx` entirely from
the existing static `GALLERY_IMAGES` (`config/demo-content.ts`). Unlike
Menu/Staff, Gallery has no `getRuntimeCatalog`/GAS content path today, and
this task does not add one — no variant introduces its own image model.

**Section chrome lives once, not three times:** like Menu/Staff, the
`#gallery` id and "ギャラリー" heading are identical across all three
variants, so `GallerySection.tsx` renders them once and only swaps the
inner composition. Visibility (`sectionVisibility.gallery`) is still gated
by `app/page.tsx` at the call site, unchanged from before this task —
Gallery has no business feature flag of its own to combine with.

**Selecting a variant:** `DesignConfig.galleryVariant`, same as every other
design field — `app/page.tsx` reads it off `getDesignConfig()` and passes
it straight to `GallerySection`. This task does **not** set any
`DESIGN_PRESETS` entry to `masonry`/`feature-editorial` — every preset
still resolves `galleryVariant: "grid"`; the other two are reachable today
only by constructing a `DesignConfig` directly (as the tests do).

**Backward compatibility:** `isGalleryVariant` (mirrors `isHeroVariant`/
`isMenuVariant`/`isStaffVariant`) makes `GallerySection` normalize whatever
`galleryVariant` it receives — missing or invalid falls back to
`DEFAULT_GALLERY_VARIANT` (`"grid"`, `lib/constants/gallery-variants.ts`),
so an existing deployment's Gallery can never silently change appearance.

**Presentation-only, still:** no variant reads or writes reservation state
or invents image alt text (alt text always comes from the existing
`GalleryImageItem.alt`, never generated), and no color is hard-coded —
every value comes from the same semantic Tailwind utilities every other
section already uses, so all six `ThemeId`s render correctly under every
Gallery variant (visually spot-checked under `kinari`/`noir`) with zero
variant-specific styling logic.

## Not yet implemented (tracked for later V1.1 work)

- Section-order-driven rendering — `app/page.tsx` reading `sectionOrder`
  instead of its literal JSX sequence.
- Curated multi-field presets — the five non-`kinari` registry entries
  differentiated from the default.
- Customer-facing documentation — a buyer-facing guide for choosing a
  preset, separate from this architecture note.

See `PLAN_PHASE5_1_V1_1_LP_DESIGN_CUSTOMIZATION.md` for the full task
breakdown and ordering of this remaining work.
