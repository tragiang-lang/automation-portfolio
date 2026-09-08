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
| `typography` | `TypographyId` | Only `"kinari"` exists — a later task adds curated pairings |
| `heroVariant` | `HeroVariant` (3 values) | Only `"fullscreen"` has a real component |
| `menuVariant` | `MenuVariant` (3 values) | Only `"editorial-list"` has a real component |
| `staffVariant` | `StaffVariant` (2 values) | Only `"portrait-grid"` has a real component |
| `galleryVariant` | `GalleryVariant` (3 values) | Only `"masonry"` has a real component |
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

## Not yet implemented (tracked for later V1.1 work)

- Typography presets — actual font-loader + CSS mapping sets per
  `TypographyId`.
- Hero/Menu/Staff/Gallery variant components — real alternate layouts for
  `HeroVariant`/`MenuVariant`/`StaffVariant`/`GalleryVariant` values other
  than today's default.
- Section-order-driven rendering — `app/page.tsx` reading `sectionOrder`
  instead of its literal JSX sequence.
- Curated multi-field presets — the five non-`kinari` registry entries
  differentiated from the default.
- Customer-facing documentation — a buyer-facing guide for choosing a
  preset, separate from this architecture note.

See `PLAN_PHASE5_1_V1_1_LP_DESIGN_CUSTOMIZATION.md` for the full task
breakdown and ordering of this remaining work.
