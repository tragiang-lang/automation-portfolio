/**
 * Typed runtime configuration shape (Phase 0 spec §D). ConfigStore.ts
 * produces this from the CONFIG + HOLIDAYS sheets; Api.ts's `getConfig`
 * action returns a PublicConfig projection of it (§20/§V — calendarId
 * and the owner-facing email settings are never sent to the frontend).
 */

export interface BusinessHours {
  monday: string | "closed";
  tuesday: string | "closed";
  wednesday: string | "closed";
  thursday: string | "closed";
  friday: string | "closed";
  saturday: string | "closed";
  sunday: string | "closed";
}

export const BUSINESS_HOURS_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export interface FeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface ReservationSettings {
  timezone: "Asia/Tokyo";
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

/** A single social-media/messaging link (V1.1 Task 4) — built from
 *  whichever `social.*` CONFIG keys are present (ConfigParser.ts's
 *  `SOCIAL_LINK_DEFINITIONS`). Never secret; safe to send via getConfig. */
export interface SocialLink {
  label: string;
  href: string;
}

export interface AppConfig {
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    /** Optional presentation fields (V1.1 Task 4) — undefined when the
     *  CONFIG sheet has no business.nameLatin/tagline/postalCode key yet.
     *  `PublicConfig` carries these through unchanged (no field to strip
     *  — they were never secret). */
    nameLatin?: string;
    tagline?: string;
    postalCode?: string;
  };
  hours: BusinessHours;
  holidays: string[];
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: ReservationSettings;
  /** Optional (V1.1 Task 4) — built from whichever `social.*` CONFIG keys
   *  are present; undefined when none are set. */
  socialLinks?: SocialLink[];
  /** Fallback/shared Calendar ID — internal only, never exposed via
   *  getConfig (Phase 3A §20). */
  calendarId: string;
  /** Internal only, never exposed via getConfig. */
  emailOwnerNotifyAddress: string;
  emailFromName: string;
}

/** The subset of AppConfig safe to return to the frontend (Phase 3A
 *  §20; matches the example response body in phase0-specification.md
 *  §H). Excludes calendarId and the owner-facing email settings. */
export type PublicConfig = Omit<
  AppConfig,
  "calendarId" | "emailOwnerNotifyAddress" | "emailFromName"
>;

/** Raw CONFIG-sheet values, keyed by the sheet's `Key` column, before
 *  type coercion. Values may already be native boolean/number if Google
 *  Sheets auto-typed the cell. */
export type RawConfigMap = Record<string, unknown>;
