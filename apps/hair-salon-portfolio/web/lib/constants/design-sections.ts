import type { HomeSection, RequiredHomeSection, SectionVisibility } from "@/types/design-config";

/**
 * Every allow-listed homepage section, in the current canonical order —
 * matches `app/page.tsx`'s existing hard-coded JSX sequence exactly (see
 * docs/design-customization-audit.md §A). Doubles as both the allow-list
 * `lib/validation/designConfigValidator.ts` checks section names against
 * and as `DEFAULT_SECTION_ORDER` below.
 */
export const ALL_HOME_SECTIONS: readonly HomeSection[] = [
  "hero",
  "concept",
  "menu",
  "staff",
  "testimonials",
  "gallery",
  "reservation",
  "salon-features",
  "customer-flow",
  "faq",
  "access",
  "contact",
];

/** Sections that always render — see `RequiredHomeSection` in
 *  `types/design-config.ts` for why these two have no visibility flag. */
export const REQUIRED_HOME_SECTIONS: readonly RequiredHomeSection[] = ["hero", "menu"];

/**
 * Every optional section defaults to visible, so wiring this into
 * `app/page.tsx` changes zero rendered output until a preset changes one
 * of these to `false`.
 */
export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  concept: true,
  staff: true,
  testimonials: true,
  gallery: true,
  reservation: true,
  "salon-features": true,
  "customer-flow": true,
  faq: true,
  access: true,
  contact: true,
};

/**
 * The default section order — identical to `ALL_HOME_SECTIONS`, so
 * selecting it renders byte-for-byte the same page as the pre-V1.1-Task-9
 * literal JSX sequence. `app/page.tsx` reads `DesignConfig.sectionOrder`
 * (falling back to this via `isValidSectionOrder` for a malformed value)
 * to choose the render order of its `SECTIONS` registry — see
 * docs/presentation-config-architecture.md. A later task (curated Design
 * Presets) picks specific alternate orders; this task only wires the
 * mechanism, it does not curate new orders itself.
 */
export const DEFAULT_SECTION_ORDER: readonly HomeSection[] = ALL_HOME_SECTIONS;
