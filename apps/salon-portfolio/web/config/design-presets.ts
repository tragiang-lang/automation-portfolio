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
  // must own its own sectionVisibility/sectionOrder object so no two
  // configs (or a config and the shared constant it was built from) can
  // ever alias the same object.
  sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
  sectionOrder: [...DEFAULT_SECTION_ORDER],
};

// `ThemeId` shares its six string values with `DesignPreset` 1:1 (see
// types/design-config.ts) — every preset uses the identically-named theme
// from `config/theme-tokens.ts`'s `THEMES` registry (Theme Presets task).
function withPreset(preset: DesignPreset): DesignConfig {
  return {
    ...DEFAULT_DESIGN_CONFIG,
    preset,
    theme: preset,
    sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

/**
 * Preset registry — one entry per `DesignPreset` value. Task 1 (this file)
 * wires every key to the same values as `DEFAULT_DESIGN_CONFIG` except
 * `preset` itself, so selecting any of the five not-yet-designed presets
 * is a safe no-op today. Later tasks (theme, typography, hero/menu/staff/
 * gallery variants, section order/visibility) differentiate one preset's
 * fields at a time — they only ever edit a value here, never this file's
 * shape or `lib/config/resolveDesignConfig.ts`'s logic.
 */
export const DESIGN_PRESETS: Record<DesignPreset, DesignConfig> = {
  kinari: DEFAULT_DESIGN_CONFIG,
  femme: withPreset("femme"),
  noir: withPreset("noir"),
  editorial: withPreset("editorial"),
  natural: withPreset("natural"),
  modern: withPreset("modern"),
};
