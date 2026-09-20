import {
  ALL_HOME_SECTIONS,
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_VISIBILITY,
  REQUIRED_HOME_SECTIONS,
} from "./design-sections";

describe("ALL_HOME_SECTIONS", () => {
  it("lists all 12 sections exactly once, in the current app/page.tsx order", () => {
    expect(ALL_HOME_SECTIONS).toEqual([
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
    ]);
    expect(new Set(ALL_HOME_SECTIONS).size).toBe(ALL_HOME_SECTIONS.length);
  });
});

describe("REQUIRED_HOME_SECTIONS", () => {
  it("is exactly hero and menu — the only sections with no visibility flag", () => {
    expect(REQUIRED_HOME_SECTIONS).toEqual(["hero", "menu"]);
  });
});

describe("DEFAULT_SECTION_VISIBILITY", () => {
  it("has one key per optional section, never hero/menu, and defaults every one to true", () => {
    const requiredSet: readonly string[] = REQUIRED_HOME_SECTIONS;
    const expectedKeys = ALL_HOME_SECTIONS.filter((section) => !requiredSet.includes(section)).sort();
    expect(Object.keys(DEFAULT_SECTION_VISIBILITY).sort()).toEqual(expectedKeys);
    expect(Object.values(DEFAULT_SECTION_VISIBILITY).every((visible) => visible === true)).toBe(true);
    expect(DEFAULT_SECTION_VISIBILITY).not.toHaveProperty("hero");
    expect(DEFAULT_SECTION_VISIBILITY).not.toHaveProperty("menu");
  });
});

describe("DEFAULT_SECTION_ORDER", () => {
  it("equals ALL_HOME_SECTIONS (the current, only order today)", () => {
    expect(DEFAULT_SECTION_ORDER).toEqual(ALL_HOME_SECTIONS);
  });
});
