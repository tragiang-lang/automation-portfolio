import type { GalleryImageItem } from "@/types/content";

/**
 * Shared, non-visual Gallery content (V1.1 Task 8 — Gallery Layout
 * Variants). Unlike Menu/Staff, Gallery's `GalleryImageItem` (`types/
 * content.ts`) is already fully display-ready (`id`/`src`/`alt`/`width`/
 * `height`) — there is no price formatting, category grouping, or
 * missing-photo fallback to centralize, so this module only defines the
 * one prop shape every variant shares (Task 8: "do not create a new
 * Gallery data model").
 *
 * Sourced in `app/page.tsx` entirely from the existing static
 * `GALLERY_IMAGES` (`config/demo-content.ts`) — Gallery has no runtime/GAS
 * content path today (unlike Menu/Staff), and this task does not add one.
 */
export interface GalleryContentProps {
  images: GalleryImageItem[];
}
