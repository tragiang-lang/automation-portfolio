import { SITE_CONFIG } from "@/config/demo-content";
import type { SiteConfig } from "@/types/content";
import type { PublicRuntimeConfig } from "@/types/runtime-config";

/**
 * Merges runtime business data (Phase 3A `getConfig`) with the
 * presentation fields `nameLatin`/`tagline`/`postalCode`/`socialLinks`
 * (V1.1 Task 4: optional CONFIG keys `business.nameLatin`/`tagline`/
 * `postalCode`/`social.*`). Each falls back independently to the
 * frontend-owned demo value only when the runtime config doesn't carry
 * it — a CONFIG sheet from before this task (none of these keys set)
 * renders exactly as it did before; a buyer who fills in the new keys
 * gets their own value instead of the demo salon's. Produces the same
 * `SiteConfig` shape every Phase 2 component already consumes, so no
 * component signature changes.
 */
export function resolveSiteConfig(runtime: PublicRuntimeConfig): SiteConfig {
  return {
    business: {
      name: runtime.business.name,
      nameLatin: runtime.business.nameLatin ?? SITE_CONFIG.business.nameLatin,
      tagline: runtime.business.tagline ?? SITE_CONFIG.business.tagline,
      phone: runtime.business.phone,
      email: runtime.business.email,
      address: runtime.business.address,
      postalCode: runtime.business.postalCode ?? SITE_CONFIG.business.postalCode,
    },
    hours: runtime.hours,
    features: {
      contactForm: runtime.features.contactForm,
      reservation: runtime.features.reservation,
      staffSelection: runtime.features.staffSelection,
    },
    staffAnyAvailableOption: runtime.staffAnyAvailableOption,
    socialLinks: runtime.socialLinks ?? SITE_CONFIG.socialLinks,
  };
}
