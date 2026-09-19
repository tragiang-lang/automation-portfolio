/**
 * Content shapes consumed by the UI.
 *
 * These mirror the Phase 0 GAS models (`AppConfig`, `SERVICES`, `STAFF`,
 * `ContactRequest` — see docs/phase0-specification.md §D/§C/§F) but are
 * trimmed to only the fields the presentation layer actually reads.
 *
 * Phase 2B wires these to `config/demo-content.ts` (static demo data).
 * Phase 3+ replaces that one file with real `getConfig`/`getServices`/
 * `getStaff` API responses — no component in `components/` imports this
 * demo data directly, so that swap never touches component code.
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

export interface FeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
}

export interface BusinessInfo {
  name: string;
  nameLatin: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
}

/** Business terminology (Starter MVP reusability, spec §9) — fully
 *  resolved (never undefined): `resolveSiteConfig.ts` fills every field
 *  from the frontend-owned demo default when the runtime config omits it,
 *  so a consuming component never needs its own fallback string. */
export interface SiteLabels {
  service: string;
  bookingCta: string;
  inquiryMessage: string;
}

/** Business marketing-copy overrides (Starter MVP reusability) — same
 *  "always fully resolved" contract as SiteLabels above. */
export interface SiteContent {
  heroSubheadline: string;
  conceptEyebrow: string;
  conceptTitle: string;
  conceptParagraph1: string;
  conceptParagraph2: string;
  serviceSubtitle: string;
  ctaHeading: string;
  ctaMessage: string;
  ctaClosingHeading: string;
  ctaClosingMessage: string;
}

export interface SiteConfig {
  business: BusinessInfo;
  hours: BusinessHours;
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  socialLinks: SocialLink[];
  labels: SiteLabels;
  content: SiteContent;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface Service {
  serviceId: string;
  name: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  price: number;
}

export interface StaffMember {
  staffId: string;
  name: string;
  /** Frontend-presentation-only fields — no equivalent column in the
   *  STAFF sheet (apps/salon-portfolio/gas/src/SheetSchemas.ts), so a
   *  runtime-sourced staff member (lib/config/runtimeCatalog.ts) never
   *  has these. `config/demo-content.ts`'s STAFF still sets all four. */
  role?: string;
  introduction?: string;
  photoSrc?: string;
  photoAlt?: string;
}

export interface GalleryImageItem {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface SalonFeature {
  id: string;
  title: string;
  description: string;
}

export interface CustomerFlowStep {
  step: number;
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  name: string;
  comment: string;
  /** Frontend-presentation-only, optional (Staff image demo task) — a
   *  missing photo falls back to an initial-letter tile, never a broken
   *  `<img>`. See `config/demo-content.ts`'s `TESTIMONIALS` doc comment for
   *  why these are illustrated stand-ins, not real customer photos. */
  photoSrc?: string;
  photoAlt?: string;
}

export interface TransitDirection {
  id: string;
  label: string;
}

export interface AccessInfo {
  transitDirections: TransitDirection[];
}

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}
