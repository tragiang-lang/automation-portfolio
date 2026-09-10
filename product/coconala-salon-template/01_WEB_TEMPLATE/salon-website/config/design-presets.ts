/**
 * Canonical default design configuration + preset registry.
 * Nothing salon-specific (business copy, prices, staff, hours) belongs
 * here — that lives in `config/demo-content.ts` / runtime `getConfig`.
 * This file only holds presentation defaults, matching the ownership
 * split `config/theme.ts` already documents for CSS-token JS mirrors.
 *
 * V1.1 Task 10 (Design Presets) is what turns this from "six differently
 * named themes" into "six complete visual compositions" — see
 * docs/presentation-config-architecture.md's "Design presets" section for
 * the full rationale and the target matrix each entry below implements.
 */
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/constants/design-sections";
import type { DesignConfig, DesignPreset, HomeSection } from "@/types/design-config";

/**
 * The current 凛 (Kinari) — Quiet Japanese Luxury look, unchanged from
 * what `app/page.tsx` already renders. `lib/config/resolveDesignConfig.ts`
 * falls back to this whenever a requested preset id is missing/invalid.
 * This is also the stable baseline every other preset is compared against
 * — Task 10 must not change a single field here.
 */
export const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  preset: "kinari",
  theme: "kinari",
  typography: "kinari",
  heroVariant: "fullscreen",
  menuVariant: "editorial-list",
  staffVariant: "portrait-grid",
  galleryVariant: "grid",
  // Cloned, not a direct reference to `DEFAULT_SECTION_VISIBILITY`/
  // `DEFAULT_SECTION_ORDER` — every `DesignConfig` (including this one)
  // must own its own sectionVisibility/sectionOrder object so no two
  // configs (or a config and the shared constant it was built from) can
  // ever alias the same object.
  sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
  sectionOrder: [
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
  ],
};

/**
 * One curated visual composition. Every non-`preset`/`theme`/`typography`
 * field mirrors `DesignConfig` exactly — kept as a separate type (rather
 * than reusing `Omit<DesignConfig, "preset">`) so a future field added to
 * `DesignConfig` that a preset should *not* curate (hypothetically) has to
 * be a deliberate decision here, not an accidental inherited requirement.
 */
type PresetComposition = Pick<
  DesignConfig,
  "heroVariant" | "menuVariant" | "staffVariant" | "galleryVariant" | "sectionOrder" | "sectionVisibility"
>;

const DEFAULT_ORDER: readonly HomeSection[] = DEFAULT_DESIGN_CONFIG.sectionOrder;

/**
 * Every optional section stays visible in every curated preset (spec §13:
 * "Do not use section visibility as the primary way to differentiate
 * presets" — none of the six below has a genuine design reason to hide a
 * customer-facing section by default).
 */
function defaultVisibility() {
  return { ...DEFAULT_SECTION_VISIBILITY };
}

/**
 * Curated compositions for the five non-Kinari presets. `theme` and
 * `typography` are not listed here — they are always the preset's own id
 * (see `buildPreset` below), matching `app/layout.tsx`'s
 * `data-design-preset={designConfig.preset}` CSS selector, which is what
 * actually switches the color/font tokens (`config/theme-tokens.ts`,
 * `config/typography-tokens.ts`). Kinari itself isn't listed either — it
 * stays `DEFAULT_DESIGN_CONFIG` verbatim, the untouched baseline.
 */
const PRESET_COMPOSITIONS: Record<Exclude<DesignPreset, "kinari">, PresetComposition> = {
  // Femme — soft feminine beauty-salon composition: a two-column split
  // hero (photo-forward, less "banner"), bordered card-grid menu, and a
  // masonry gallery opened right after the concept copy so the visual
  // story leads before the price list.
  femme: {
    heroVariant: "split",
    menuVariant: "card-grid",
    staffVariant: "portrait-grid",
    galleryVariant: "masonry",
    sectionOrder: [
      "hero",
      "concept",
      "gallery",
      "menu",
      "staff",
      "reservation",
      "salon-features",
      "customer-flow",
      "faq",
      "access",
      "contact",
    ],
    sectionVisibility: defaultVisibility(),
  },
  // Noir — dark premium/luxury composition: the full-bleed dark hero
  // photo, a restrained undecorated price list, editorial horizontal
  // staff profiles, and one dominant feature-editorial gallery image —
  // every layout choice leans toward fewer, larger, more confident shapes.
  noir: {
    heroVariant: "fullscreen",
    menuVariant: "minimal-price-list",
    staffVariant: "horizontal-profile",
    galleryVariant: "feature-editorial",
    sectionOrder: [
      "hero",
      "concept",
      "gallery",
      "menu",
      "staff",
      "reservation",
      "salon-features",
      "customer-flow",
      "faq",
      "access",
      "contact",
    ],
    sectionVisibility: defaultVisibility(),
  },
  // Editorial — magazine composition: the Gallery immediately follows the
  // editorial Hero (a deliberate strong visual opening, spec §5.4) before
  // any body copy, then the same horizontal-profile staff rows and
  // feature-editorial gallery treatment as Noir, carried by Editorial's
  // own high-contrast monochrome theme instead of Noir's dark one.
  editorial: {
    heroVariant: "editorial",
    menuVariant: "editorial-list",
    staffVariant: "horizontal-profile",
    galleryVariant: "feature-editorial",
    sectionOrder: [
      "hero",
      "gallery",
      "concept",
      "menu",
      "staff",
      "reservation",
      "salon-features",
      "customer-flow",
      "faq",
      "access",
      "contact",
    ],
    sectionVisibility: defaultVisibility(),
  },
  // Natural — organic/botanical composition: same split hero and masonry
  // gallery as Femme (photo-led, unhurried), but the undecorated
  // minimal-price-list menu instead of Femme's bordered cards, and the
  // default section order (spec §5.5: "should not make ordering different
  // merely for the sake of being different").
  natural: {
    heroVariant: "split",
    menuVariant: "minimal-price-list",
    staffVariant: "portrait-grid",
    galleryVariant: "masonry",
    sectionOrder: [...DEFAULT_ORDER],
    sectionVisibility: defaultVisibility(),
  },
  // Modern — contemporary/minimal composition: split hero, card-grid menu
  // (same pairing as Femme, differentiated by Modern's cooler theme and
  // its horizontal-profile staff/grid gallery instead of Femme's
  // portrait-grid/masonry), and Gallery promoted ahead of Staff in the
  // section order for a cleaner, image-led rhythm.
  modern: {
    heroVariant: "split",
    menuVariant: "card-grid",
    staffVariant: "horizontal-profile",
    galleryVariant: "grid",
    sectionOrder: [
      "hero",
      "concept",
      "menu",
      "gallery",
      "staff",
      "reservation",
      "salon-features",
      "customer-flow",
      "faq",
      "access",
      "contact",
    ],
    sectionVisibility: defaultVisibility(),
  },
};

// `ThemeId` and `TypographyId` each share their six string values with
// `DesignPreset` 1:1 (see types/design-config.ts) — every preset uses the
// identically-named theme from `config/theme-tokens.ts`'s `THEMES`
// registry (Theme Presets task) and the identically-named typography
// pairing from `config/typography-tokens.ts`'s `TYPOGRAPHY` registry
// (Typography Presets task). Task 10 only curates the *layout* fields
// (hero/menu/staff/gallery/sectionOrder/sectionVisibility) on top of that
// already-established theme/typography pairing — it never decouples a
// preset's `theme`/`typography` from its own id.
function buildPreset(preset: Exclude<DesignPreset, "kinari">): DesignConfig {
  const composition = PRESET_COMPOSITIONS[preset];
  return {
    preset,
    theme: preset,
    typography: preset,
    heroVariant: composition.heroVariant,
    menuVariant: composition.menuVariant,
    staffVariant: composition.staffVariant,
    galleryVariant: composition.galleryVariant,
    sectionVisibility: { ...composition.sectionVisibility },
    sectionOrder: [...composition.sectionOrder],
  };
}

/**
 * Preset registry — one entry per `DesignPreset` value, each a complete,
 * coherent visual composition (V1.1 Task 10): theme + typography +
 * hero/menu/staff/gallery layout + section order, curated together rather
 * than six independent knobs. `docs/presentation-config-architecture.md`'s
 * "Design presets" section documents the rationale for each preset's
 * choices and the full target matrix.
 */
export const DESIGN_PRESETS: Record<DesignPreset, DesignConfig> = {
  kinari: DEFAULT_DESIGN_CONFIG,
  femme: buildPreset("femme"),
  noir: buildPreset("noir"),
  editorial: buildPreset("editorial"),
  natural: buildPreset("natural"),
  modern: buildPreset("modern"),
};
