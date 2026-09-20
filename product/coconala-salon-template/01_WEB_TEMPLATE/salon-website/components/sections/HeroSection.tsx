import type { ComponentType } from "react";
import { isHeroVariant } from "@/lib/validation/designConfigValidator";
import { DEFAULT_HERO_VARIANT } from "@/lib/constants/hero-variants";
import type { HeroVariant } from "@/types/design-config";
import type { HeroContentProps } from "./HeroContent";
import { HeroFullscreen } from "./HeroFullscreen";
import { HeroSplit } from "./HeroSplit";
import { HeroEditorial } from "./HeroEditorial";

/**
 * Hero (V1.1 Task 5 — Hero Layout Variants). Thin router: normalizes
 * whatever `heroVariant` it receives and delegates to the matching layout
 * component. Holds no markup of its own — `DesignConfig.heroVariant`
 * (`types/design-config.ts`) selects the component, nothing else decides.
 *
 * `HERO_VARIANT_COMPONENTS` being a `Record<HeroVariant, ...>` makes the
 * mapping exhaustive at the type level: adding a 4th `HeroVariant` without
 * a matching entry here is a compile error, not a silent runtime gap.
 */
const HERO_VARIANT_COMPONENTS: Record<HeroVariant, ComponentType<HeroContentProps>> = {
  fullscreen: HeroFullscreen,
  split: HeroSplit,
  editorial: HeroEditorial,
};

export function HeroSection({
  headline,
  subheadline,
  name,
  nameLatin,
  heroVariant,
}: HeroContentProps & {
  /**
   * Optional and validated here (not trusted from the caller) so a
   * missing or invalid value can never crash or blank the Hero — falls
   * back to `DEFAULT_HERO_VARIANT` ("fullscreen"), preserving every
   * existing deployment's current appearance (§10 backward compatibility).
   */
  heroVariant?: HeroVariant;
}) {
  const resolvedVariant = isHeroVariant(heroVariant) ? heroVariant : DEFAULT_HERO_VARIANT;
  const HeroVariantComponent = HERO_VARIANT_COMPONENTS[resolvedVariant];

  return <HeroVariantComponent headline={headline} subheadline={subheadline} name={name} nameLatin={nameLatin} />;
}
