import type { ComponentType } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { isStaffVariant } from "@/lib/validation/designConfigValidator";
import { DEFAULT_STAFF_VARIANT } from "@/lib/constants/staff-variants";
import type { StaffVariant } from "@/types/design-config";
import type { StaffContentProps } from "@/components/sections/StaffContent";
import { StaffPortraitGrid } from "@/components/sections/StaffPortraitGrid";
import { StaffHorizontalProfile } from "@/components/sections/StaffHorizontalProfile";

/**
 * Staff (V1.1 Task 7 — Staff Layout Variants). Thin router, mirroring
 * `MenuSection.tsx`'s pattern: normalizes whatever `staffVariant` it
 * receives and delegates the staff list to the matching layout component.
 * `DesignConfig.staffVariant` (`types/design-config.ts`) selects the
 * component, nothing else decides.
 *
 * Like Menu (and unlike Hero, where each variant owns its whole
 * `<section>`), the section chrome here — the `#staff` id, the "スタッフ紹介"
 * heading, and the `enabled` gate — is identical across both variants, so
 * it lives once in this router instead of being duplicated twice. Only the
 * staff list body genuinely differs per variant.
 *
 * `enabled` mirrors `CONFIG.features.staffSelection` — when false this
 * section renders nothing at all (not just visually hidden), matching
 * Phase 0 §K: a shared-calendar salon has no staff-selection concept in
 * the DOM. This is checked before any variant resolution, so an invalid
 * `staffVariant` on a disabled section still renders nothing.
 *
 * `STAFF_VARIANT_COMPONENTS` being a `Record<StaffVariant, ...>` makes the
 * mapping exhaustive at the type level: adding a 3rd `StaffVariant` without
 * a matching entry here is a compile error, not a silent runtime gap.
 */
const STAFF_VARIANT_COMPONENTS: Record<StaffVariant, ComponentType<StaffContentProps>> = {
  "portrait-grid": StaffPortraitGrid,
  "horizontal-profile": StaffHorizontalProfile,
};

export function StaffSection({
  enabled,
  staff,
  anyAvailableOption,
  businessNameInitial,
  staffVariant,
}: StaffContentProps & {
  enabled: boolean;
  /**
   * Optional and validated here (not trusted from the caller) so a
   * missing or invalid value can never crash or blank the Staff section —
   * falls back to `DEFAULT_STAFF_VARIANT` ("portrait-grid"), preserving
   * every existing deployment's current appearance (§16 backward
   * compatibility).
   */
  staffVariant?: StaffVariant;
}) {
  if (!enabled) return null;

  const resolvedVariant = isStaffVariant(staffVariant) ? staffVariant : DEFAULT_STAFF_VARIANT;
  const StaffVariantComponent = STAFF_VARIANT_COMPONENTS[resolvedVariant];

  return (
    <section id="staff" className="bg-background py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Staff" title="スタッフ紹介" />
        </Reveal>
        <Reveal delayMs={120} className="mt-12">
          <StaffVariantComponent
            staff={staff}
            anyAvailableOption={anyAvailableOption}
            businessNameInitial={businessNameInitial}
          />
        </Reveal>
      </Container>
    </section>
  );
}
