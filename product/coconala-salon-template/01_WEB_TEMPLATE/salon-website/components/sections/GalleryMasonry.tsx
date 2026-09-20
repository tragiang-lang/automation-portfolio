import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils/cn";
import type { GalleryContentProps } from "@/components/sections/GalleryContent";

/**
 * Gallery — "masonry" variant (V1.1 Task 8). A genuinely different
 * composition from `"grid"`'s CSS-`columns` reading order: a true CSS
 * Grid, row-first, with a repeating bento-style pattern of tile sizes
 * (`MASONRY_PATTERN`, cycled by index) rather than every tile preserving
 * its own source aspect ratio.
 *
 * `"grid"`'s demo photography all shares a fairly narrow landscape aspect
 * ratio (~4:3 to 3:2), so deriving tile height purely from each image's
 * own ratio would barely look different from `"grid"` at a glance. Cycling
 * a small set of deliberately different row spans (and, on desktop, an
 * occasional 2-column span) by position instead guarantees a visibly
 * varied, editorial composition regardless of which photos a deployment
 * swaps in — still fully deterministic (no JS measuring a rendered image),
 * per the task's explicit requirement.
 *
 * Each tile is built directly on `next/image` (`fill` + `object-cover`)
 * rather than reusing `PlaceholderImage` — `PlaceholderImage` forces its
 * wrapper's CSS `aspect-ratio` to the image's own `width`/`height`, which
 * fights a CSS Grid item's row/column-track sizing (the browser sizes the
 * box from the aspect ratio instead of stretching it to fill the grid
 * area). Here the tile's box size must come from the grid track alone, so
 * `object-cover` can crop to that shape without distortion (never
 * stretching — only cropping overflow, the same tradeoff
 * `StaffHorizontalProfile`'s square crop already makes).
 */

/** `rowSpanUnits` = how many 10px-tall grid rows a tile occupies (its
 *  rendered height — the container's `auto-rows-[10px]` class below is
 *  this unit); `colSpanLg` optionally widens a tile to 2 columns on `lg+`
 *  only, so mobile/tablet always stay a simple, ungapped 2-column grid
 *  (Task 8: "on mobile ... a simple two-column masonry-like layout"). */
const MASONRY_PATTERN: readonly { rowSpanUnits: number; colSpanLg?: true }[] = [
  { rowSpanUnits: 32, colSpanLg: true },
  { rowSpanUnits: 18 },
  { rowSpanUnits: 24 },
  { rowSpanUnits: 18 },
  { rowSpanUnits: 28 },
  { rowSpanUnits: 20 },
];

export function GalleryMasonry({ images }: GalleryContentProps) {
  return (
    <div
      data-testid="gallery-masonry"
      className="grid auto-rows-[10px] grid-flow-row-dense grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6"
    >
      {images.map((image, index) => {
        const pattern = MASONRY_PATTERN[index % MASONRY_PATTERN.length];
        return (
          <div
            key={image.id}
            data-testid="gallery-masonry-tile"
            style={{ gridRowEnd: `span ${pattern.rowSpanUnits}` }}
            className={cn(
              "relative overflow-hidden rounded-sm bg-surface-sunken",
              pattern.colSpanLg && "lg:col-span-2",
            )}
          >
            {/* Reveal's own root is nested (not the grid item itself) so its
                fade/rise transform never fights this tile's grid-row span. */}
            <Reveal delayMs={index * 60} className="absolute inset-0">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 1023px) 50vw, 25vw"
                className="object-cover"
              />
            </Reveal>
          </div>
        );
      })}
    </div>
  );
}
