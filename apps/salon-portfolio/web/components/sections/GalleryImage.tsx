import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import type { GalleryImageItem } from "@/types/content";

/** One masonry tile — keeps its source aspect ratio (Phase 2A §11). */
export function GalleryImage({ image }: { image: GalleryImageItem }) {
  return (
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
  );
}
