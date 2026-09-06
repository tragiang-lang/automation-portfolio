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

export interface PublicRuntimeConfig {
  business: PublicRuntimeBusinessInfo;
  hours: PublicRuntimeBusinessHours;
  holidays: string[];
  features: PublicRuntimeFeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: PublicRuntimeReservationSettings;
}

/** Where a rendered page's runtime config actually came from — kept
 *  explicit so a GAS outage never silently masquerades as demo content. */
export type RuntimeConfigStatus = "runtime" | "demo-fallback" | "runtime-error";

export interface RuntimeConfigResult {
  status: RuntimeConfigStatus;
  config: PublicRuntimeConfig;
}
