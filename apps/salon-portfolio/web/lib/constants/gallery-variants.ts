import type { GalleryVariant } from "@/types/design-config";

/**
 * Every real `GalleryVariant` value, in the order they were introduced
 * (V1.1 Task 8 — Gallery Layout Variants). Doubles as the allow-list
 * `lib/validation/designConfigValidator.ts`'s `isGalleryVariant` checks
 * against, mirroring `HERO_VARIANTS`/`isHeroVariant`,
 * `MENU_VARIANTS`/`isMenuVariant`, and `STAFF_VARIANTS`/`isStaffVariant`'s
 * existing pattern.
 */
export const GALLERY_VARIANTS: readonly GalleryVariant[] = ["grid", "masonry", "feature-editorial"];

/**
 * The pre-Task-8 (and still every preset's) look — used whenever a
 * `DesignConfig`'s `galleryVariant` is missing or fails validation, so an
 * existing deployment's Gallery section never silently changes appearance
 * (Task 8 backward-compatibility requirement). `GallerySection.tsx` never
 * actually branched on `galleryVariant` before this task — its one
 * CSS-columns body is what `"grid"` now renders, so this is the only
 * faithful default (see `docs/presentation-config-architecture.md`'s
 * "Gallery layout variants" section for the full naming reconciliation).
 */
export const DEFAULT_GALLERY_VARIANT: GalleryVariant = "grid";
