import type { ComponentType } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { isGalleryVariant } from "@/lib/validation/designConfigValidator";
import { DEFAULT_GALLERY_VARIANT } from "@/lib/constants/gallery-variants";
import type { GalleryVariant } from "@/types/design-config";
import type { GalleryContentProps } from "@/components/sections/GalleryContent";
import { GalleryGrid } from "@/components/sections/GalleryGrid";
import { GalleryMasonry } from "@/components/sections/GalleryMasonry";
import { GalleryFeatureEditorial } from "@/components/sections/GalleryFeatureEditorial";

/**
 * Gallery (V1.1 Task 8 — Gallery Layout Variants). Thin router, mirroring
 * `MenuSection.tsx`'s/`StaffSection.tsx`'s pattern: normalizes whatever
 * `galleryVariant` it receives and delegates the image list to the
 * matching layout component. `DesignConfig.galleryVariant`
 * (`types/design-config.ts`) selects the component, nothing else decides.
 *
 * Like Menu (and unlike Hero, where each variant owns its whole
 * `<section>`), the section chrome here — the `#gallery` id, the
 * "ギャラリー" heading — is identical across all three variants, so it
 * lives once in this router instead of being duplicated three times. Only
 * the image composition itself differs per variant. Visibility
 * (`sectionVisibility.gallery`) is still gated by the caller
 * (`app/page.tsx`), same as before this task — Gallery has no business
 * feature flag of its own to combine with, unlike Staff/Reservation/
 * Contact.
 *
 * `GALLERY_VARIANT_COMPONENTS` being a `Record<GalleryVariant, ...>` makes
 * the mapping exhaustive at the type level: adding a 4th `GalleryVariant`
 * without a matching entry here is a compile error, not a silent runtime
 * gap.
 */
const GALLERY_VARIANT_COMPONENTS: Record<GalleryVariant, ComponentType<GalleryContentProps>> = {
  grid: GalleryGrid,
  masonry: GalleryMasonry,
  "feature-editorial": GalleryFeatureEditorial,
};

export function GallerySection({
  images,
  galleryVariant,
}: GalleryContentProps & {
  /**
   * Optional and validated here (not trusted from the caller) so a
   * missing or invalid value can never crash or blank the Gallery — falls
   * back to `DEFAULT_GALLERY_VARIANT` ("grid"), preserving every existing
   * deployment's current appearance (backward-compatibility requirement).
   */
  galleryVariant?: GalleryVariant;
}) {
  const resolvedVariant = isGalleryVariant(galleryVariant) ? galleryVariant : DEFAULT_GALLERY_VARIANT;
  const GalleryVariantComponent = GALLERY_VARIANT_COMPONENTS[resolvedVariant];

  return (
    <section id="gallery" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Gallery" title="ギャラリー" align="center" />
        </Reveal>
        <div className="mt-12">
          <GalleryVariantComponent images={images} />
        </div>
      </Container>
    </section>
  );
}
