import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";
import { parseDesignPresetId } from "@/lib/validation/designConfigValidator";
import type { DesignConfig } from "@/types/design-config";

/**
 * Pure resolver: an untrusted preset id in, a safe `DesignConfig` out.
 * Mirrors `lib/config/resolveSiteConfig.ts`'s "always produce a usable
 * shape" contract. Never throws — an invalid/missing id always falls back
 * to `DEFAULT_DESIGN_CONFIG` (the current Kinari look), so a malformed
 * `SALON_DESIGN_PRESET` value can never crash or blank the homepage.
 */
export function resolveDesignConfig(rawPresetId: unknown): DesignConfig {
  const presetId = parseDesignPresetId(rawPresetId);
  if (!presetId) return DEFAULT_DESIGN_CONFIG;
  return DESIGN_PRESETS[presetId];
}
