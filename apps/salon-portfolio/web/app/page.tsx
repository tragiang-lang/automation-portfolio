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
  SITE_CONFIG,
  STAFF,
} from "@/config/demo-content";

// Page order matches Phase 2A §6 exactly: Header (layout) → Hero →
// Concept → Menu → Staff → Gallery → Reservation CTA → Salon Features →
// Customer Flow → FAQ → Access → Contact → Footer (layout). Configurable
// sections are gated here by SITE_CONFIG.features, not by editing the
// section components themselves.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection
        headline={SITE_CONFIG.business.tagline}
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
        enabled={SITE_CONFIG.features.staffSelection}
        staff={STAFF}
        anyAvailableOption={SITE_CONFIG.staffAnyAvailableOption}
        businessNameInitial={SITE_CONFIG.business.name}
      />

      <GallerySection images={GALLERY_IMAGES} />

      {SITE_CONFIG.features.reservation ? (
        <ReservationCtaBand
          heading="仕上がりを見て、気持ちが決まったら"
          message="ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。"
        />
      ) : null}

      <SalonFeaturesSection features={SALON_FEATURES} />

      <CustomerFlowSection steps={CUSTOMER_FLOW_STEPS} />

      <FaqSection items={FAQ_ITEMS} />

      <AccessSection
        business={SITE_CONFIG.business}
        hours={SITE_CONFIG.hours}
        access={ACCESS_INFO}
      />

      {SITE_CONFIG.features.contactForm ? (
        <ContactSection business={SITE_CONFIG.business} />
      ) : null}

      {SITE_CONFIG.features.reservation ? (
        <ReservationCtaBand
          heading="最後まで読んでくださり、ありがとうございます"
          message="少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。"
        />
      ) : null}
    </main>
  );
}
