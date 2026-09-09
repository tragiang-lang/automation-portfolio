import { HeroSection } from "@/components/sections/HeroSection";
import { ConceptSection } from "@/components/sections/ConceptSection";
import { MenuSection } from "@/components/sections/MenuSection";
import { StaffSection } from "@/components/sections/StaffSection";
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
} from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { getRuntimeCatalog } from "@/lib/config/runtimeCatalog";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";
import { getDesignConfig } from "@/lib/config/designConfig";

// Page order matches Phase 2A §6 exactly: Header (layout) → Hero →
// Concept → Menu → Staff → Gallery → Reservation CTA → Salon Features →
// Customer Flow → FAQ → Access → Contact → Footer (layout). Configurable
// sections are gated here by the resolved runtime config's `features`,
// not by editing the section components themselves.
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
// feature flag. It intentionally does NOT yet drive section *order* —
// this stays a literal JSX sequence until a later V1.1 task, so this file
// is still not a generic section-rendering engine. For staff/reservation/
// contact, design visibility is combined with (never overrides) the
// existing business feature flag — `feature && sectionVisibility.x` — so
// a design preset can only ever hide a section a feature flag already
// allows, never show one the business disabled.
//
// V1.1 Task 5 (Hero Layout Variants) adds `heroVariant`, read from the
// same `getDesignConfig()` call and passed straight through to
// `HeroSection`, which owns the fullscreen/split/editorial component
// selection itself — this file only supplies the (variant-independent)
// runtime content, same as it already did for every other section.
//
// V1.1 Task 6 (Menu Layout Variants) adds `menuVariant` the same way —
// passed straight through to `MenuSection`, which owns the editorial-
// list/card-grid/minimal-price-list component selection itself. This
// file still only supplies `services` (the existing runtime
// `getRuntimeCatalog` → `getServices` → `Service[]` flow), never a
// variant-specific content shape.
//
// V1.1 Task 7 (Staff Layout Variants) adds `staffVariant` the same way —
// passed straight through to `StaffSection`, which owns the portrait-grid/
// horizontal-profile component selection itself. This file still only
// supplies `staff` (the existing runtime `getRuntimeCatalog` → `getStaff`
// → `StaffMember[]` flow), never a variant-specific content shape.
export default async function Home() {
  const [{ config }, { services, staff }] = await Promise.all([
    getRuntimeConfig(),
    getRuntimeCatalog(),
  ]);
  const siteConfig = resolveSiteConfig(config);
  const { sectionVisibility, heroVariant, menuVariant, staffVariant } = getDesignConfig();

  return (
    <main className="flex flex-1 flex-col">
      <HeroSection
        headline={siteConfig.business.tagline}
        subheadline="銀座の一角で、丁寧なネイル・まつげのお手入れをご提供しています。"
        name={siteConfig.business.name}
        nameLatin={siteConfig.business.nameLatin}
        heroVariant={heroVariant}
      />

      {sectionVisibility.concept ? (
        <ConceptSection
          eyebrow="Concept"
          title="静けさの中で、指先を整える時間を"
          paragraphs={[
            "流行を追いかけるより、長く付き合える美しさを。当店では、派手さよりも一つひとつの仕上がりの丁寧さを大切にしています。",
            "落ち着いた空間で過ごすひとときそのものも、施術と同じくらい価値のあるものだと考えています。",
          ]}
        />
      ) : null}

      <MenuSection services={services} menuVariant={menuVariant} />

      <StaffSection
        enabled={siteConfig.features.staffSelection && sectionVisibility.staff}
        staff={staff}
        anyAvailableOption={siteConfig.staffAnyAvailableOption}
        businessNameInitial={siteConfig.business.name}
        staffVariant={staffVariant}
      />

      {sectionVisibility.gallery ? <GallerySection images={GALLERY_IMAGES} /> : null}

      {siteConfig.features.reservation && sectionVisibility.reservation ? (
        <ReservationCtaBand
          heading="仕上がりを見て、気持ちが決まったら"
          message="ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。"
        />
      ) : null}

      {sectionVisibility["salon-features"] ? (
        <SalonFeaturesSection features={SALON_FEATURES} />
      ) : null}

      {sectionVisibility["customer-flow"] ? (
        <CustomerFlowSection steps={CUSTOMER_FLOW_STEPS} />
      ) : null}

      {sectionVisibility.faq ? <FaqSection items={FAQ_ITEMS} /> : null}

      {sectionVisibility.access ? (
        <AccessSection business={siteConfig.business} hours={siteConfig.hours} access={ACCESS_INFO} />
      ) : null}

      {siteConfig.features.contactForm && sectionVisibility.contact ? (
        <ContactSection business={siteConfig.business} />
      ) : null}

      {siteConfig.features.reservation && sectionVisibility.reservation ? (
        <ReservationCtaBand
          heading="最後まで読んでくださり、ありがとうございます"
          message="少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。"
        />
      ) : null}
    </main>
  );
}
