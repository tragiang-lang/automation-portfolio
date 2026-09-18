import type { ComponentType } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { isMenuVariant } from "@/lib/validation/designConfigValidator";
import { DEFAULT_MENU_VARIANT } from "@/lib/constants/menu-variants";
import type { MenuVariant } from "@/types/design-config";
import { MENU_CTA } from "@/components/sections/MenuContent";
import type { MenuContentProps } from "@/components/sections/MenuContent";
import { MenuEditorialList } from "@/components/sections/MenuEditorialList";
import { MenuCardGrid } from "@/components/sections/MenuCardGrid";
import { MenuMinimalPriceList } from "@/components/sections/MenuMinimalPriceList";

/**
 * Menu (V1.1 Task 6 — Menu Layout Variants). Thin router, mirroring
 * `HeroSection.tsx`'s pattern: normalizes whatever `menuVariant` it
 * receives and delegates the service list to the matching layout
 * component. `DesignConfig.menuVariant` (`types/design-config.ts`)
 * selects the component, nothing else decides.
 *
 * Unlike Hero (where each variant owns its whole `<section>`), the
 * section chrome here — the `#menu` anchor id (linked to by
 * `HeroContent.tsx`'s `HERO_CTA_SECONDARY` and the site nav,
 * `config/demo-content.ts`), the "メニュー" heading, and the reservation
 * CTA — is identical across all three variants, so it lives once in this
 * router instead of being duplicated three times. Only the service list
 * body genuinely differs per variant, which is what the task's "genuinely
 * different compositions" requirement is actually about.
 *
 * `MENU_VARIANT_COMPONENTS` being a `Record<MenuVariant, ...>` makes the
 * mapping exhaustive at the type level: adding a 4th `MenuVariant` without
 * a matching entry here is a compile error, not a silent runtime gap.
 */
const MENU_VARIANT_COMPONENTS: Record<MenuVariant, ComponentType<MenuContentProps>> = {
  "editorial-list": MenuEditorialList,
  "card-grid": MenuCardGrid,
  "minimal-price-list": MenuMinimalPriceList,
};

export function MenuSection({
  services,
  menuVariant,
  title = "メニュー",
  subtitle = "施術時間は目安です。カウンセリングのお時間を含め、少し余裕を持ってご来店ください。",
  ctaLabel = MENU_CTA.label,
}: MenuContentProps & {
  /**
   * Optional and validated here (not trusted from the caller) so a
   * missing or invalid value can never crash or blank the Menu — falls
   * back to `DEFAULT_MENU_VARIANT` ("editorial-list"), preserving every
   * existing deployment's current appearance (§13 backward compatibility).
   */
  menuVariant?: MenuVariant;
  /** Business terminology (Starter MVP reusability — `siteConfig.labels.service`/
   *  `siteConfig.content.serviceSubtitle`/`siteConfig.labels.bookingCta`).
   *  Each defaults to the current salon copy so every existing call site
   *  (tests included) renders unchanged when omitted. */
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
}) {
  const resolvedVariant = isMenuVariant(menuVariant) ? menuVariant : DEFAULT_MENU_VARIANT;
  const MenuVariantComponent = MENU_VARIANT_COMPONENTS[resolvedVariant];

  return (
    <section id="menu" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Menu" title={title} subtitle={subtitle} />
        </Reveal>
        <Reveal delayMs={120} className="mt-12">
          <MenuVariantComponent services={services} />
        </Reveal>
        <div className="mt-12 flex justify-center">
          <Button href={MENU_CTA.href}>{ctaLabel}</Button>
        </div>
      </Container>
    </section>
  );
}
