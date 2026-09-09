import type { StaffVariant } from "@/types/design-config";

/**
 * Every real `StaffVariant` value, in the order they were introduced
 * (V1.1 Task 7 — Staff Layout Variants). Doubles as the allow-list
 * `lib/validation/designConfigValidator.ts`'s `isStaffVariant` checks
 * against, mirroring `HERO_VARIANTS`/`isHeroVariant` and
 * `MENU_VARIANTS`/`isMenuVariant`'s existing pattern.
 */
export const STAFF_VARIANTS: readonly StaffVariant[] = ["portrait-grid", "horizontal-profile"];

/**
 * The pre-Task-7 (and still every preset's) look — used whenever a
 * `DesignConfig`'s `staffVariant` is missing or fails validation, so an
 * existing deployment's Staff section never silently changes appearance
 * (Task 7 §16 backward-compatibility requirement). The pre-Task-7 Staff
 * grid (portrait photo cards in a responsive grid) is already what
 * `portrait-grid` renders, so this is the closest, and only, faithful
 * default.
 */
export const DEFAULT_STAFF_VARIANT: StaffVariant = "portrait-grid";
