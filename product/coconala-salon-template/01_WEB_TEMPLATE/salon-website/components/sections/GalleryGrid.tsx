import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import type { GalleryContentProps } from "@/components/sections/GalleryContent";

/**
 * Gallery — "grid" variant (Phase 2A §11; V1.1 Task 8's default/legacy
 * layout). CSS `columns` masonry-via-columns on tablet/desktop, a clean
 * single column on mobile (never a horizontal-scroll carousel) — each tile
 * keeps its source aspect ratio via `PlaceholderImage`'s own
 * `width`/`height` box.
 *
 * This is the pre-Task-8 `GallerySection`/`GalleryImage` body, byte-
 * identical, moved here — `galleryVariant: "grid"` (every preset's current
 * default, per `DEFAULT_GALLERY_VARIANT`) must render identically to
 * before this task, per the backward-compatibility requirement.
 */
export function GalleryGrid({ images }: GalleryContentProps) {
  return (
    <div data-testid="gallery-grid" className="columns-1 gap-6 sm:columns-2 lg:columns-3">
      {images.map((image, index) => (
        <Reveal key={image.id} delayMs={index * 60}>
          <div className="mb-6 break-inside-avoid">
            <PlaceholderImage
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="rounded-sm"
            />
          </div>
        </Reveal>
      ))}
    </div>
  );
}
