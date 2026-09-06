import { SITE_CONFIG } from "@/config/demo-content";
import type { SiteConfig } from "@/types/content";
import type { PublicRuntimeConfig } from "@/types/runtime-config";

/**
 * Merges runtime business data (Phase 3A `getConfig`) with the
 * presentation-only fields `PublicRuntimeConfig` deliberately doesn't
 * carry — `nameLatin`, `tagline`, `postalCode`, `socialLinks` are not
 * part of the Phase 3A CONFIG contract, so they stay frontend-owned.
 * Produces the same `SiteConfig` shape every Phase 2 component already
 * consumes, so no component signature changes.
 */
export function resolveSiteConfig(runtime: PublicRuntimeConfig): SiteConfig {
  return {
    business: {
      name: runtime.business.name,
      nameLatin: SITE_CONFIG.business.nameLatin,
      tagline: SITE_CONFIG.business.tagline,
      phone: runtime.business.phone,
      email: runtime.business.email,
      address: runtime.business.address,
      postalCode: SITE_CONFIG.business.postalCode,
    },
    hours: runtime.hours,
    features: {
      contactForm: runtime.features.contactForm,
      reservation: runtime.features.reservation,
      staffSelection: runtime.features.staffSelection,
    },
    staffAnyAvailableOption: runtime.staffAnyAvailableOption,
    socialLinks: SITE_CONFIG.socialLinks,
  };
}
