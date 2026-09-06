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
  SERVICES,
  STAFF,
} from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";

// Page order matches Phase 2A §6 exactly: Header (layout) → Hero →
// Concept → Menu → Staff → Gallery → Reservation CTA → Salon Features →
// Customer Flow → FAQ → Access → Contact → Footer (layout). Configurable
// sections are gated here by the resolved runtime config's `features`,
// not by editing the section components themselves.
//
// SERVICES/STAFF/GALLERY_IMAGES/SALON_FEATURES/CUSTOMER_FLOW_STEPS/
// FAQ_ITEMS/ACCESS_INFO are not part of the Phase 3A `getConfig` contract
// (no `services`/`staff` fields in `PublicConfig`) and stay on
// `config/demo-content.ts` — see docs/runtime-config-guide.md for the
// Phase 4 plan to move SERVICES/STAFF onto `getServices`/`getStaff`.
export default async function Home() {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);

  return (
    <main className="flex flex-1 flex-col">
      <HeroSection
        headline={siteConfig.business.tagline}
        subheadline="銀座の一角で、丁寧なネイル・まつげのお手入れをご提供しています。"
      />

      <ConceptSection
        eyebrow="Concept"
        title="静けさの中で、指先を整える時間を"
        paragraphs={[
          "流行を追いかけるより、長く付き合える美しさを。当店では、派手さよりも一つひとつの仕上がりの丁寧さを大切にしています。",
          "落ち着いた空間で過ごすひとときそのものも、施術と同じくらい価値のあるものだと考えています。",
        ]}
      />

      <MenuSection services={SERVICES} />

      <StaffSection
        enabled={siteConfig.features.staffSelection}
        staff={STAFF}
        anyAvailableOption={siteConfig.staffAnyAvailableOption}
        businessNameInitial={siteConfig.business.name}
      />

      <GallerySection images={GALLERY_IMAGES} />

      {siteConfig.features.reservation ? (
        <ReservationCtaBand
          heading="仕上がりを見て、気持ちが決まったら"
          message="ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。"
        />
      ) : null}

      <SalonFeaturesSection features={SALON_FEATURES} />

      <CustomerFlowSection steps={CUSTOMER_FLOW_STEPS} />

      <FaqSection items={FAQ_ITEMS} />

      <AccessSection
        business={siteConfig.business}
        hours={siteConfig.hours}
        access={ACCESS_INFO}
      />

      {siteConfig.features.contactForm ? (
        <ContactSection business={siteConfig.business} />
      ) : null}

      {siteConfig.features.reservation ? (
        <ReservationCtaBand
          heading="最後まで読んでくださり、ありがとうございます"
          message="少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。"
        />
      ) : null}
    </main>
  );
}
