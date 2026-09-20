import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import type { GalleryContentProps } from "@/components/sections/GalleryContent";

/**
 * Gallery — "feature-editorial" variant (V1.1 Task 8). One dominant
 * feature image (the first item in `images` — no re-sorting/re-selection
 * of "the best" photo; the runtime order decides which one leads) plus the
 * remaining images as smaller supporting tiles, asymmetric by design —
 * substantially different from both `"grid"` (uniform-weight CSS columns)
 * and `"masonry"` (bento pattern, no single dominant tile).
 *
 * Layout relies on CSS Grid's normal (non-dense) auto-placement: the
 * feature tile is placed first, spanning 2 columns × 2 rows on `lg+`
 * (`col-span-2 lg:row-span-2`); the supporting tiles that follow it in
 * document order auto-place into the remaining cells in reading order —
 * no manual row/column math needed. Each supporting tile's own
 * `aspect-square` box establishes both grid rows' height; the feature tile
 * sets no aspect ratio of its own on `lg+` (`lg:aspect-auto`) so it
 * stretches to fill exactly the 2×2 area those two rows define — the same
 * "let the grid track size the box, crop with `object-cover`" approach
 * `GalleryMasonry` uses, and for the same reason: `PlaceholderImage`'s
 * self-asserted `aspect-ratio` would otherwise fight the grid's stretch
 * sizing, so this variant also builds its tiles directly on `next/image`.
 *
 * On mobile (below `lg`), the feature simply spans the full 2-column
 * width at a fixed `aspect-[4/3]` (never cropped-looking-broken), and the
 * supporting tiles wrap below it in a plain 2-column grid — collapsing
 * gracefully instead of squeezing a 2-row span into a narrow viewport.
 *
 * With fewer than ~4 supporting images the 2×2 area next to the feature
 * won't be fully populated (the empty cell instead becomes visible ambient
 * asymmetric spacing next to the feature) — an intentionally graceful
 * degradation, not a broken layout; `GALLERY_IMAGES` (`config/
 * demo-content.ts`) has 8 images today, so this only matters for a
 * smaller future gallery.
 */
export function GalleryFeatureEditorial({ images }: GalleryContentProps) {
  const [feature, ...supporting] = images;

  return (
    <div data-testid="gallery-feature-editorial" className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {feature ? (
        <div
          data-testid="gallery-feature-editorial-feature"
          className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-sm bg-surface-sunken lg:aspect-auto lg:row-span-2"
        >
          <Reveal className="absolute inset-0">
            <Image
              src={feature.src}
              alt={feature.alt}
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
          </Reveal>
        </div>
      ) : null}

      {supporting.length > 0 ? (
        // display:contents keeps this element queryable in tests while
        // letting its children auto-place as direct grid items themselves.
        <div data-testid="gallery-feature-editorial-supporting" className="contents">
          {supporting.map((image, index) => (
            <div
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-sm bg-surface-sunken"
            >
              <Reveal delayMs={(index + 1) * 60} className="absolute inset-0">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 1023px) 50vw, 25vw"
                  className="object-cover"
                />
              </Reveal>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
