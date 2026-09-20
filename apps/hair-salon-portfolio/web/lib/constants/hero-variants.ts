import type { HeroVariant } from "@/types/design-config";

/**
 * Every real `HeroVariant` value, in the order they were introduced
 * (V1.1 Task 5 — Hero Layout Variants). Doubles as the allow-list
 * `lib/validation/designConfigValidator.ts`'s `isHeroVariant` checks
 * against, mirroring `ALL_HOME_SECTIONS`/`isHomeSection`'s existing
 * pattern (`lib/constants/design-sections.ts`).
 */
export const HERO_VARIANTS: readonly HeroVariant[] = ["fullscreen", "split", "editorial"];

/**
 * The pre-Task-5 (and still every preset's) look — used whenever a
 * `DesignConfig`'s `heroVariant` is missing or fails validation, so an
 * existing deployment's Hero never silently changes appearance (Task 5
 * §10 backward-compatibility requirement).
 */
export const DEFAULT_HERO_VARIANT: HeroVariant = "fullscreen";
