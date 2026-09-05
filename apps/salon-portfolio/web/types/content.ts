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

export interface SiteConfig {
  business: BusinessInfo;
  hours: BusinessHours;
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  socialLinks: SocialLink[];
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
  role: string;
  introduction: string;
  photoSrc: string;
  photoAlt: string;
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
