import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";
import {
  isGalleryVariant,
  isHeroVariant,
  isMenuVariant,
  isStaffVariant,
  isThemeId,
  isTypographyId,
  isValidSectionOrder,
  parseDesignPresetId,
} from "@/lib/validation/designConfigValidator";
import type { DesignConfig } from "@/types/design-config";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolves a preset id (raw or object form, see `resolveDesignConfig`
 * below) to its base `DesignConfig` — always a real registry entry,
 * falling back to `DEFAULT_DESIGN_CONFIG` for a missing/invalid id.
 */
function resolveBase(rawPresetId: unknown): DesignConfig {
  const presetId = parseDesignPresetId(rawPresetId);
  return presetId ? DESIGN_PRESETS[presetId] : DEFAULT_DESIGN_CONFIG;
}

/**
 * Applies individually-validated field overrides on top of a base
 * `DesignConfig` (V1.1 Task 10 §7/§8 — "preset selection establishes a
 * base; explicit overrides win over preset defaults, only the overridden
 * field changes"). Every candidate value is re-validated with the exact
 * same guard its own field already uses at every other point of use
 * (`HeroSection`'s `isHeroVariant`, etc.) — an invalid override is simply
 * ignored (the base field wins), never thrown, mirroring this module's
 * existing "never crash, never blank the page" contract. `theme`/
 * `typography` are validated against the `THEMES`/`TYPOGRAPHY` registries
 * directly via `isThemeId`/`isTypographyId`, not against `DESIGN_PRESETS`
 * via `parseDesignPresetId` — a `DesignPreset` like `"starter"` (Starter
 * MVP reusability) is a registered preset id without being a registered
 * theme/typography id of its own (it reuses Kinari's), so reusing
 * `parseDesignPresetId` here would wrongly accept it as a theme override.
 *
 * Returns the exact `base` object (no new object allocated) when no
 * override actually changes a field, so `resolveDesignConfig({ preset:
 * "noir" })` and `resolveDesignConfig("noir")` both return the identical
 * `DESIGN_PRESETS.noir` reference — the same referential-equality
 * guarantee the pre-Task-10 resolver already gave callers.
 */
function applyOverrides(base: DesignConfig, rawOverrides: Record<string, unknown>): DesignConfig {
  const next: DesignConfig = { ...base };
  let changed = false;

  if (isThemeId(rawOverrides.theme)) {
    next.theme = rawOverrides.theme;
    changed = true;
  }

  if (isTypographyId(rawOverrides.typography)) {
    next.typography = rawOverrides.typography;
    changed = true;
  }

  if (isHeroVariant(rawOverrides.heroVariant)) {
    next.heroVariant = rawOverrides.heroVariant;
    changed = true;
  }

  if (isMenuVariant(rawOverrides.menuVariant)) {
    next.menuVariant = rawOverrides.menuVariant;
    changed = true;
  }

  if (isStaffVariant(rawOverrides.staffVariant)) {
    next.staffVariant = rawOverrides.staffVariant;
    changed = true;
  }

  if (isGalleryVariant(rawOverrides.galleryVariant)) {
    next.galleryVariant = rawOverrides.galleryVariant;
    changed = true;
  }

  if (isValidSectionOrder(rawOverrides.sectionOrder)) {
    next.sectionOrder = rawOverrides.sectionOrder;
    changed = true;
  }

  return changed ? next : base;
}

/**
 * Pure resolver: an untrusted preset id (or `{ preset, ...overrides }`)
 * in, a safe `DesignConfig` out. Mirrors `lib/config/resolveSiteConfig.ts`'s
 * "always produce a usable shape" contract. Never throws — an invalid/
 * missing preset id always falls back to `DEFAULT_DESIGN_CONFIG` (the
 * current Kinari look), so a malformed `SALON_DESIGN_PRESET` value can
 * never crash or blank the homepage.
 *
 * Two accepted input shapes:
 * - A raw preset id (`"noir"`, or anything else — invalid values fall
 *   back), the original Task 1 contract, unchanged. `getDesignConfig()`
 *   (`lib/config/designConfig.ts`) still calls this form with
 *   `process.env.SALON_DESIGN_PRESET`.
 * - `{ preset, ...overrides }` (V1.1 Task 10) — resolves `preset` to its
 *   base `DesignConfig` exactly like the raw-id form, then layers any
 *   individually-valid override fields on top (`applyOverrides` above).
 *   This is what lets a preset selection remain a *starting point* rather
 *   than a permanent lock on every other design property (spec §7).
 */
export function resolveDesignConfig(rawInput: unknown): DesignConfig {
  if (!isPlainObject(rawInput)) {
    return resolveBase(rawInput);
  }

  const base = resolveBase(rawInput.preset);
  return applyOverrides(base, rawInput);
}
