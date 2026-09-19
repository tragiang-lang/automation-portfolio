import { DESIGN_PRESETS } from "@/config/design-presets";
import { THEMES } from "@/config/theme-tokens";
import { TYPOGRAPHY } from "@/config/typography-tokens";
import { ALL_HOME_SECTIONS, REQUIRED_HOME_SECTIONS } from "@/lib/constants/design-sections";
import { HERO_VARIANTS } from "@/lib/constants/hero-variants";
import { MENU_VARIANTS } from "@/lib/constants/menu-variants";
import { STAFF_VARIANTS } from "@/lib/constants/staff-variants";
import { GALLERY_VARIANTS } from "@/lib/constants/gallery-variants";
import type {
  DesignPreset,
  GalleryVariant,
  HeroVariant,
  HomeSection,
  MenuVariant,
  StaffVariant,
  ThemeId,
  TypographyId,
} from "@/types/design-config";

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

/**
 * True only for a `THEMES`/`TYPOGRAPHY` registry key (Starter MVP
 * reusability) — deliberately checks these registries directly rather
 * than reusing `parseDesignPresetId`/`DESIGN_PRESETS`. A `DesignPreset`
 * like `"starter"` can be a registered preset id without being a
 * registered theme/typography id (it reuses Kinari's); `applyOverrides`
 * (`resolveDesignConfig.ts`) needs exactly this distinction to validate a
 * `theme`/`typography` override field.
 */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && value in THEMES;
}

export function isTypographyId(value: unknown): value is TypographyId {
  return typeof value === "string" && value in TYPOGRAPHY;
}

/** True only for one of the 12 allow-listed section names — guards against
 *  an arbitrary string reaching `sectionOrder`/`sectionVisibility`. */
export function isHomeSection(value: unknown): value is HomeSection {
  return typeof value === "string" && (ALL_HOME_SECTIONS as readonly string[]).includes(value);
}

/**
 * True only for one of the 3 registered `HeroVariant` ids (V1.1 Task 5).
 * `components/sections/HeroSection.tsx` uses this to normalize whatever
 * `heroVariant` it receives — an invalid or missing value falls back to
 * `DEFAULT_HERO_VARIANT` ("fullscreen") rather than crashing or rendering
 * nothing, the same parse-or-fallback discipline every other design-config
 * guard in this file already follows.
 */
export function isHeroVariant(value: unknown): value is HeroVariant {
  return typeof value === "string" && (HERO_VARIANTS as readonly string[]).includes(value);
}

/**
 * True only for one of the 3 registered `MenuVariant` ids (V1.1 Task 6).
 * `components/sections/MenuSection.tsx` uses this to normalize whatever
 * `menuVariant` it receives — an invalid or missing value falls back to
 * `DEFAULT_MENU_VARIANT` ("editorial-list") rather than crashing or
 * rendering nothing, the same parse-or-fallback discipline `isHeroVariant`
 * above already follows.
 */
export function isMenuVariant(value: unknown): value is MenuVariant {
  return typeof value === "string" && (MENU_VARIANTS as readonly string[]).includes(value);
}

/**
 * True only for one of the 2 registered `StaffVariant` ids (V1.1 Task 7).
 * `components/sections/StaffSection.tsx` uses this to normalize whatever
 * `staffVariant` it receives — an invalid or missing value falls back to
 * `DEFAULT_STAFF_VARIANT` ("portrait-grid") rather than crashing or
 * rendering nothing, the same parse-or-fallback discipline `isHeroVariant`/
 * `isMenuVariant` above already follow.
 */
export function isStaffVariant(value: unknown): value is StaffVariant {
  return typeof value === "string" && (STAFF_VARIANTS as readonly string[]).includes(value);
}

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
