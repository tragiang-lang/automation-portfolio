import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { GalleryImage } from "@/components/sections/GalleryImage";
import type { GalleryImageItem } from "@/types/content";

/**
 * Gallery (Phase 2A §11) — masonry via CSS `columns` on tablet/desktop,
 * a clean single column on mobile (never a horizontal-scroll carousel).
 * The "end of gallery" CTA moment (Phase 2A §12) is the dedicated
 * `ReservationCtaBand` rendered immediately after this section in
 * `app/page.tsx`, not a button appended in here — one CTA per moment.
 */
export function GallerySection({ images }: { images: GalleryImageItem[] }) {
  return (
    <section id="gallery" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Gallery" title="ギャラリー" align="center" />
        </Reveal>
        <div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
          {images.map((image, index) => (
            <Reveal key={image.id} delayMs={index * 60}>
              <GalleryImage image={image} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
