import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Demo-content photography (Phase 2A §11/§20; Phase 2C image integration).
 * Reserves its aspect ratio up front via CSS so nothing shifts as it loads
 * (CLS), lazy-loads by default, and only the hero opts into `priority`
 * (eager + high fetch-priority).
 *
 * `src` is either a real demo photograph (`.jpg`) sourced under
 * `public/images/{hero,gallery,salon}` or an illustrated stand-in
 * (`.svg`, e.g. `public/images/staff`) — both are still swappable demo
 * content, not final production assets (Phase 2A §18). Raster photos go
 * through Next's normal image optimizer (resize/WebP/AVIF, responsive
 * `srcset`); SVGs are passed through `unoptimized` since Next's optimizer
 * doesn't process local SVGs by default. Detected from the file
 * extension so callers don't have to know which is which.
 */
export function PlaceholderImage({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = "100vw",
  className,
  objectPosition,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** CSS `object-position` value (e.g. "65% 40%") — lets a full-bleed crop
   * (hero) keep its subject in frame differently per breakpoint instead of
   * always centering (Phase 2A §8/§22: "do not simply use the exact same
   * crop on mobile"). Defaults to centered. */
  objectPosition?: string;
}) {
  const isSvg = src.endsWith(".svg");

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-sunken", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized={isSvg}
        priority={priority}
        sizes={sizes}
        className="object-cover"
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}
