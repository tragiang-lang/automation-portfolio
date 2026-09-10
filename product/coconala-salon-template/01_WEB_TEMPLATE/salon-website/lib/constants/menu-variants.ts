import type { MenuVariant } from "@/types/design-config";

/**
 * Every real `MenuVariant` value, in the order they were introduced
 * (V1.1 Task 6 — Menu Layout Variants). Doubles as the allow-list
 * `lib/validation/designConfigValidator.ts`'s `isMenuVariant` checks
 * against, mirroring `HERO_VARIANTS`/`isHeroVariant`'s existing pattern
 * (`lib/constants/hero-variants.ts`).
 */
export const MENU_VARIANTS: readonly MenuVariant[] = ["editorial-list", "card-grid", "minimal-price-list"];

/**
 * The pre-Task-6 (and still every preset's) look — used whenever a
 * `DesignConfig`'s `menuVariant` is missing or fails validation, so an
 * existing deployment's Menu never silently changes appearance (Task 6
 * §13 backward-compatibility requirement). The pre-Task-6 Menu (category-
 * grouped list, hairline dividers, no cards) is already what `editorial-
 * list` renders, so this is the closest, and only, faithful default.
 */
export const DEFAULT_MENU_VARIANT: MenuVariant = "editorial-list";
