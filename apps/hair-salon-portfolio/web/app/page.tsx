import { Fragment, type ReactNode } from "react";
import { HeroSection } from "@/components/sections/HeroSection";
import { ConceptSection } from "@/components/sections/ConceptSection";
import { MenuSection } from "@/components/sections/MenuSection";
import { StaffSection } from "@/components/sections/StaffSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { ReservationCtaBand } from "@/components/sections/ReservationCtaBand";
import { SalonFeaturesSection } from "@/components/sections/SalonFeaturesSection";
import { CustomerFlowSection } from "@/components/sections/CustomerFlowSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { AccessSection } from "@/components/sections/AccessSection";
import { ContactSection } from "@/components/sections/ContactSection";
import {
  ACCESS_INFO,
  CUSTOMER_FLOW_STEPS,
  FAQ_ITEMS,
  GALLERY_IMAGES,
  SALON_FEATURES,
  TESTIMONIALS,
} from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { getRuntimeCatalog } from "@/lib/config/runtimeCatalog";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";
import { getDesignConfig } from "@/lib/config/designConfig";
import { DEFAULT_SECTION_ORDER } from "@/lib/constants/design-sections";
import { isValidSectionOrder } from "@/lib/validation/designConfigValidator";
import type { HomeSection } from "@/types/design-config";

// Page order matches Phase 2A §6, with Testimonials added after Staff
// (presentation-only content feature): Header (layout) → Hero → Concept →
// Menu → Staff → Testimonials → Gallery → Reservation CTA → Salon
// Features → Customer Flow → FAQ → Access → Contact → [closing
// Reservation CTA] → Footer (layout). Configurable sections are gated here
// by the resolved runtime config's `features`, not by editing the section
// components themselves.
//
// GALLERY_IMAGES/SALON_FEATURES/CUSTOMER_FLOW_STEPS/FAQ_ITEMS/ACCESS_INFO
// are not part of the `getConfig` contract (no such fields in
// `PublicConfig`) and stay frontend-owned on `config/demo-content.ts`.
// SERVICES/STAFF moved onto `getServices`/`getStaff` in Phase 5.1
// (lib/config/runtimeCatalog.ts) — see docs/runtime-config-guide.md.
//
// V1.1 Task 1 (Presentation Configuration Layer — see
// docs/presentation-config-architecture.md) adds `sectionVisibility`
// gating for every section below that doesn't already have a business
// feature flag. For staff/reservation/contact, design visibility is
// combined with (never overrides) the existing business feature flag —
// `feature && sectionVisibility.x` — so a design preset can only ever
// hide a section a feature flag already allows, never show one the
// business disabled.
//
// V1.1 Tasks 5-8 (Hero/Menu/Staff/Gallery Layout Variants) add
// `heroVariant`/`menuVariant`/`staffVariant`/`galleryVariant`, each read
// from the same `getDesignConfig()` call and passed straight through to
// its section, which owns its own layout-component selection — this file
// only ever supplies the (variant-independent) runtime content, same as
// it already did before any variant existed.
//
// V1.1 Task 9 (Section Ordering — see
// docs/presentation-config-architecture.md) reads `sectionOrder` and
// renders the 11 allow-listed `HomeSection`s (`SECTIONS` below) in that
// order instead of the previous literal JSX sequence. This is
// deliberately still not a page builder: `SECTIONS` is a fixed,
// exhaustively-typed `Record<HomeSection, ReactNode>` built from the same
// real components/props as before — `sectionOrder` only ever selects a
// permutation of *known* keys, never a component name, prop, or arbitrary
// content. `isValidSectionOrder` re-validates the value at this
// composition-root boundary (the same defense-in-depth every other
// design-config value already gets at its point of use, e.g.
// `HeroSection`'s `isHeroVariant` guard) and falls back to
// `DEFAULT_SECTION_ORDER` rather than crashing or dropping a section.
//
// The homepage has two `ReservationCtaBand` instances — one mid-page, one
// as a closing "thank you for reading" band right before the footer. Only
// the mid-page instance is part of `sectionOrder` (`reservation`); the
// closing band is treated the same as header/footer — an always-last
// structural element, not a reorderable section — so the default order
// (`DEFAULT_SECTION_ORDER`) renders byte-for-byte the same page as before
// this task, and no `sectionOrder` value can ever move or duplicate the
// closing band. Both bands still share the same
// `siteConfig.features.reservation && sectionVisibility.reservation` gate,
// so hiding "reservation" hides both.
export default async function Home() {
  const [{ config }, { services, staff }] = await Promise.all([
    getRuntimeConfig(),
    getRuntimeCatalog(),
  ]);
  const siteConfig = resolveSiteConfig(config);
  const { sectionVisibility, sectionOrder, heroVariant, menuVariant, staffVariant, galleryVariant } =
    getDesignConfig();
  const resolvedSectionOrder = isValidSectionOrder(sectionOrder) ? sectionOrder : DEFAULT_SECTION_ORDER;

  const reservationEnabled = siteConfig.features.reservation && sectionVisibility.reservation;

  // Exhaustive `Record<HomeSection, ...>` — adding a 12th `HomeSection`
  // without a matching entry here is a compile error, not a silent
  // runtime gap (same discipline as `HERO_VARIANT_COMPONENTS` etc.).
  const SECTIONS: Record<HomeSection, ReactNode> = {
    hero: (
      <HeroSection
        headline={siteConfig.business.tagline}
        subheadline={siteConfig.content.heroSubheadline}
        name={siteConfig.business.name}
        nameLatin={siteConfig.business.nameLatin}
        primaryCtaLabel={siteConfig.labels.bookingCta}
        heroVariant={heroVariant}
      />
    ),
    concept: sectionVisibility.concept ? (
      <ConceptSection
        eyebrow={siteConfig.content.conceptEyebrow}
        title={siteConfig.content.conceptTitle}
        paragraphs={[siteConfig.content.conceptParagraph1, siteConfig.content.conceptParagraph2]}
      />
    ) : null,
    menu: (
      <MenuSection
        services={services}
        menuVariant={menuVariant}
        title={siteConfig.labels.service}
        subtitle={siteConfig.content.serviceSubtitle}
        ctaLabel={siteConfig.labels.bookingCta}
      />
    ),
    staff: (
      <StaffSection
        enabled={siteConfig.features.staffSelection && sectionVisibility.staff}
        staff={staff}
        anyAvailableOption={siteConfig.staffAnyAvailableOption}
        businessNameInitial={siteConfig.business.name}
        staffVariant={staffVariant}
      />
    ),
    testimonials: sectionVisibility.testimonials ? (
      <TestimonialsSection testimonials={TESTIMONIALS} />
    ) : null,
    gallery: sectionVisibility.gallery ? (
      <GallerySection images={GALLERY_IMAGES} galleryVariant={galleryVariant} />
    ) : null,
    reservation: reservationEnabled ? (
      <ReservationCtaBand
        heading={siteConfig.content.ctaHeading}
        message={siteConfig.content.ctaMessage}
        ctaLabel={siteConfig.labels.bookingCta}
      />
    ) : null,
    "salon-features": sectionVisibility["salon-features"] ? (
      <SalonFeaturesSection features={SALON_FEATURES} />
    ) : null,
    "customer-flow": sectionVisibility["customer-flow"] ? (
      <CustomerFlowSection steps={CUSTOMER_FLOW_STEPS} />
    ) : null,
    faq: sectionVisibility.faq ? <FaqSection items={FAQ_ITEMS} /> : null,
    access: sectionVisibility.access ? (
      <AccessSection business={siteConfig.business} hours={siteConfig.hours} access={ACCESS_INFO} />
    ) : null,
    contact:
      siteConfig.features.contactForm && sectionVisibility.contact ? (
        <ContactSection business={siteConfig.business} messageLabel={siteConfig.labels.inquiryMessage} />
      ) : null,
  };

  return (
    <main className="flex flex-1 flex-col">
      {resolvedSectionOrder.map((section) => (
        <Fragment key={section}>{SECTIONS[section]}</Fragment>
      ))}

      {reservationEnabled ? (
        <ReservationCtaBand
          heading={siteConfig.content.ctaClosingHeading}
          message={siteConfig.content.ctaClosingMessage}
          ctaLabel={siteConfig.labels.bookingCta}
        />
      ) : null}
    </main>
  );
}
