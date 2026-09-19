import { filterVisibleNavItems, resolveNavHref } from "./navItems";
import type { NavItem, FeatureFlags } from "@/types/content";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/constants/design-sections";

const NAV_ITEMS: NavItem[] = [
  { label: "コンセプト", href: "#concept" },
  { label: "メニュー", href: "#menu" },
  { label: "スタッフ", href: "#staff" },
  { label: "お客様の声", href: "#testimonials" },
  { label: "ギャラリー", href: "#gallery" },
  { label: "アクセス", href: "#access" },
  { label: "お問い合わせ", href: "#contact" },
];

const allFeaturesOn: FeatureFlags = { contactForm: true, reservation: true, staffSelection: true };

describe("filterVisibleNavItems", () => {
  it("keeps every item unchanged when every section is visible and every feature is on", () => {
    expect(filterVisibleNavItems(NAV_ITEMS, DEFAULT_SECTION_VISIBILITY, allFeaturesOn)).toEqual(NAV_ITEMS);
  });

  it("drops a nav item whose target section is hidden by design visibility (Starter preset regression)", () => {
    const starterVisibility = {
      ...DEFAULT_SECTION_VISIBILITY,
      concept: false,
      staff: false,
      testimonials: false,
      gallery: false,
      access: false,
    };
    const result = filterVisibleNavItems(NAV_ITEMS, starterVisibility, allFeaturesOn);
    expect(result.map((item) => item.href)).toEqual(["#menu", "#contact"]);
  });

  it("never drops #menu — the always-required section has no visibility flag to check", () => {
    const result = filterVisibleNavItems(NAV_ITEMS, DEFAULT_SECTION_VISIBILITY, allFeaturesOn);
    expect(result.some((item) => item.href === "#menu")).toBe(true);
  });

  it("drops #staff when features.staffSelection is off even though design visibility is on", () => {
    const result = filterVisibleNavItems(NAV_ITEMS, DEFAULT_SECTION_VISIBILITY, {
      ...allFeaturesOn,
      staffSelection: false,
    });
    expect(result.some((item) => item.href === "#staff")).toBe(false);
  });

  it("drops #contact when features.contactForm is off even though design visibility is on", () => {
    const result = filterVisibleNavItems(NAV_ITEMS, DEFAULT_SECTION_VISIBILITY, {
      ...allFeaturesOn,
      contactForm: false,
    });
    expect(result.some((item) => item.href === "#contact")).toBe(false);
  });

  it("keeps an item whose href has no known matching section (defensive: never silently drops unrecognized nav entries)", () => {
    const customNav: NavItem[] = [{ label: "その他", href: "#other" }];
    expect(filterVisibleNavItems(customNav, DEFAULT_SECTION_VISIBILITY, allFeaturesOn)).toEqual(customNav);
  });
});

describe("resolveNavHref", () => {
  it("keeps a section-anchor href unchanged on the homepage", () => {
    expect(resolveNavHref("#menu", "/")).toBe("#menu");
    expect(resolveNavHref("#contact", "/")).toBe("#contact");
  });

  it("prefixes a section-anchor href with / when not on the homepage, so it navigates home first", () => {
    expect(resolveNavHref("#menu", "/reservation")).toBe("/#menu");
    expect(resolveNavHref("#contact", "/reservation")).toBe("/#contact");
    expect(resolveNavHref("#menu", "/contact")).toBe("/#menu");
    expect(resolveNavHref("#contact", "/contact")).toBe("/#contact");
  });

  it("leaves a non-fragment path href unchanged regardless of the current pathname", () => {
    expect(resolveNavHref("/privacy", "/")).toBe("/privacy");
    expect(resolveNavHref("/privacy", "/reservation")).toBe("/privacy");
    expect(resolveNavHref("/terms", "/reservation")).toBe("/terms");
  });
});
