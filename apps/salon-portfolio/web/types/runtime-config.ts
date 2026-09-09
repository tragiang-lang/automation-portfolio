/**
 * Frontend mirror of the GAS `PublicConfig` contract (Phase 3A —
 * apps/salon-portfolio/gas/src/models/Config.ts `PublicConfig`,
 * apps/salon-portfolio/gas/src/PublicConfig.ts `buildPublicConfig`).
 *
 * This is the validated, backend-shaped runtime config — a distinct type
 * from `types/content.ts`'s `SiteConfig` (the UI view-model). The mapping
 * layer (`lib/config/resolveSiteConfig.ts`) converts one into the other;
 * components never see this type directly.
 */

export interface PublicRuntimeBusinessInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  /** Optional presentation fields (V1.1 Task 4) — undefined when the
   *  buyer's CONFIG sheet has no business.nameLatin/tagline/postalCode
   *  key yet. `resolveSiteConfig.ts` falls back to the frontend-owned
   *  demo value per-field when undefined, so an un-migrated CONFIG sheet
   *  renders exactly as it did before this task. */
  nameLatin?: string;
  tagline?: string;
  postalCode?: string;
}

export interface PublicRuntimeBusinessHours {
  monday: string | "closed";
  tuesday: string | "closed";
  wednesday: string | "closed";
  thursday: string | "closed";
  friday: string | "closed";
  saturday: string | "closed";
  sunday: string | "closed";
}

export interface PublicRuntimeFeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface PublicRuntimeReservationSettings {
  timezone: "Asia/Tokyo";
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

/** Mirrors GAS's `SocialLink` (`gas/src/models/Config.ts`) — same
 *  "separate frontend mirror" convention this file already uses for
 *  `PublicRuntimeBusinessHours`. */
export interface SocialLink {
  label: string;
  href: string;
}

export interface PublicRuntimeConfig {
  business: PublicRuntimeBusinessInfo;
  hours: PublicRuntimeBusinessHours;
  holidays: string[];
  features: PublicRuntimeFeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: PublicRuntimeReservationSettings;
  /** Optional (V1.1 Task 4) — undefined when none of the CONFIG sheet's
   *  social.* keys are set yet. `resolveSiteConfig.ts` falls back to the
   *  frontend-owned demo array when undefined. */
  socialLinks?: SocialLink[];
}

/** Where a rendered page's runtime config actually came from — kept
 *  explicit so a GAS outage never silently masquerades as demo content. */
export type RuntimeConfigStatus = "runtime" | "demo-fallback" | "runtime-error";

export interface RuntimeConfigResult {
  status: RuntimeConfigStatus;
  config: PublicRuntimeConfig;
}
