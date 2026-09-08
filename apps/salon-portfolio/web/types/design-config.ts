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
 * all six identical to the current Kinari look, and later tasks
 * progressively differentiate one preset's fields at a time without
 * changing this union or the registry's shape.
 */
export type DesignPreset = "kinari" | "femme" | "noir" | "editorial" | "natural" | "modern";

/** Color-token theme id — one entry per curated palette in
 *  `config/theme-tokens.ts`'s `THEMES` registry. Shares its six string
 *  values with `DesignPreset` 1:1 today (each preset uses the
 *  identically-named theme), but is kept as its own type because a future
 *  preset could reuse another preset's theme. */
export type ThemeId = "kinari" | "femme" | "noir" | "editorial" | "natural" | "modern";

/** Font-pairing id. Only "kinari" (the current Shippori Mincho / Cormorant
 *  Garamond / Noto Sans JP / Inter pairing) is implemented as of Task 1 —
 *  a later task adds the remaining curated pairings and extends this union. */
export type TypographyId = "kinari";

/** Hero layout variants (a later task implements the alternates; only
 *  "fullscreen" — today's only layout — is wired to a real component). */
export type HeroVariant = "fullscreen" | "split" | "editorial";

/** Menu layout variants (a later task implements the alternates; only
 *  "editorial-list" — today's only layout — is wired to a real component). */
export type MenuVariant = "editorial-list" | "card-grid" | "minimal-price-list";

/** Staff layout variants (a later task implements the alternate; only
 *  "portrait-grid" — today's only layout — is wired to a real component). */
export type StaffVariant = "portrait-grid" | "horizontal-profile";

/** Gallery layout variants (a later task implements the alternates; only
 *  "masonry" — today's only layout — is wired to a real component). */
export type GalleryVariant = "grid" | "masonry" | "large-feature";

/**
 * Allow-listed homepage sections. Header/footer are always rendered by
 * `app/layout.tsx` and are intentionally excluded from this union — they
 * are not configurable homepage content.
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
/**
 * The semantic color-token model every theme in `config/theme-tokens.ts`
 * must fully implement, and the exact set `app/globals.css` mirrors as
 * `--color-*` custom properties (kebab-cased, e.g. `onPrimary` →
 * `--color-on-primary`). Kept intentionally small — one role per genuinely
 * distinct visual need in the existing components, not a full design-system
 * token set. All values are `#rrggbb` hex strings so
 * `lib/utils/contrastRatio.ts` can validate them directly.
 *
 * Role notes (see docs/presentation-config-architecture.md for the full
 * writeup): `primary`/`onPrimary` are a matched pair used both as
 * text-on-light-surface (`text-primary`, e.g. every heading) and as a
 * dark-band background with light text on top of it (`bg-primary
 * text-on-primary` — the Footer, and the Hero photo's legibility scrim).
 * For a light theme `primary` is the dark ink tone; for a dark theme the
 * roles invert (`primary` becomes the light tone, `onPrimary` the dark one)
 * so both uses stay internally consistent. `accentHover` exists because
 * `components/ui/Button.tsx`'s primary hover state needs a theme-aware
 * shade — it cannot be computed from `accent` with plain CSS custom
 * properties, so each theme states it explicitly.
 */
export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceSunken: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  onAccent: string;
  accentHover: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  error: string;
}

/** Every `ThemeTokens` key, for structural validation
 *  (`config/theme-tokens.test.ts`) and for parsing `app/globals.css`'s
 *  mirrored `--color-*` custom properties back into a `ThemeTokens` shape. */
export const THEME_TOKEN_KEYS: readonly (keyof ThemeTokens)[] = [
  "background",
  "surface",
  "surfaceSunken",
  "primary",
  "onPrimary",
  "secondary",
  "accent",
  "onAccent",
  "accentHover",
  "text",
  "muted",
  "border",
  "success",
  "error",
];

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
