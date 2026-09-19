import type { FeatureFlags, NavItem } from "@/types/content";
import type { SectionVisibility } from "@/types/design-config";

/**
 * Maps a nav anchor href to the `HomeSection` it scrolls to. `#menu` is
 * deliberately absent — `menu` is a `RequiredHomeSection` (never hideable),
 * so it has no visibility flag to check and is always kept.
 */
const NAV_ITEM_SECTION: Record<string, keyof SectionVisibility | undefined> = {
  "#concept": "concept",
  "#staff": "staff",
  "#gallery": "gallery",
  "#testimonials": "testimonials",
  "#access": "access",
  "#contact": "contact",
};

/**
 * Drops a nav item whose target section is actually hidden on the page —
 * fixes a dead-link regression the Starter preset exposed (Starter MVP
 * verification): `NAV_ITEMS` (`config/demo-content.ts`) is a static list,
 * independent of `sectionVisibility`, so before this a preset hiding any
 * section still linked to it from the header/footer nav. Mirrors
 * `app/page.tsx`'s own `feature && sectionVisibility.x` combination for
 * staff/contact (never widen what a business feature flag already
 * disabled) — same rule, applied here to nav links instead of section
 * rendering. An href with no known matching section (e.g. `#menu`, or any
 * future custom link) is always kept.
 */
export function filterVisibleNavItems(
  navItems: NavItem[],
  sectionVisibility: SectionVisibility,
  features: FeatureFlags,
): NavItem[] {
  return navItems.filter((item) => {
    const section = NAV_ITEM_SECTION[item.href];
    if (!section) return true;
    if (!sectionVisibility[section]) return false;
    if (section === "staff") return features.staffSelection;
    if (section === "contact") return features.contactForm;
    return true;
  });
}
