import {
  isGalleryVariant,
  isHeroVariant,
  isHomeSection,
  isMenuVariant,
  isStaffVariant,
  isThemeId,
  isTypographyId,
  isValidSectionOrder,
  parseDesignPresetId,
} from "./designConfigValidator";
import { ALL_HOME_SECTIONS } from "@/lib/constants/design-sections";
import { HERO_VARIANTS } from "@/lib/constants/hero-variants";
import { MENU_VARIANTS } from "@/lib/constants/menu-variants";
import { STAFF_VARIANTS } from "@/lib/constants/staff-variants";
import { GALLERY_VARIANTS } from "@/lib/constants/gallery-variants";

describe("parseDesignPresetId", () => {
  it.each(["kinari", "femme", "noir", "editorial", "natural", "modern", "starter"])(
    "accepts the registered preset id %s",
    (id) => {
      expect(parseDesignPresetId(id)).toBe(id);
    },
  );

  it.each([undefined, null, "", "   ", "not-a-preset", 42, {}])("rejects %p", (value) => {
    expect(parseDesignPresetId(value)).toBeNull();
  });
});

describe("isThemeId / isTypographyId (Starter MVP reusability)", () => {
  // "starter" is a valid DesignPreset (it has a DESIGN_PRESETS registry
  // entry) but deliberately has no dedicated theme/typography of its own
  // — it reuses Kinari's. isThemeId/isTypographyId check the THEMES/
  // TYPOGRAPHY registries directly (not DesignPreset) so this stays
  // correctly rejected as a theme/typography override value, unlike
  // `parseDesignPresetId` which only tells you a preset id is registered.
  it.each(["kinari", "femme", "noir", "editorial", "natural", "modern"])("isThemeId accepts %s", (id) => {
    expect(isThemeId(id)).toBe(true);
  });

  it("isThemeId rejects starter and other non-theme values", () => {
    expect(isThemeId("starter")).toBe(false);
    expect(isThemeId("not-a-theme")).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
  });

  it.each(["kinari", "femme", "noir", "editorial", "natural", "modern"])("isTypographyId accepts %s", (id) => {
    expect(isTypographyId(id)).toBe(true);
  });

  it("isTypographyId rejects starter and other non-typography values", () => {
    expect(isTypographyId("starter")).toBe(false);
    expect(isTypographyId("not-a-typography")).toBe(false);
    expect(isTypographyId(undefined)).toBe(false);
  });
});

describe("isHomeSection", () => {
  it("accepts every allow-listed section name", () => {
    for (const section of ALL_HOME_SECTIONS) {
      expect(isHomeSection(section)).toBe(true);
    }
  });

  it("rejects a name outside the allow-list and non-string values", () => {
    expect(isHomeSection("footer")).toBe(false);
    expect(isHomeSection(123)).toBe(false);
    expect(isHomeSection(undefined)).toBe(false);
  });
});

describe("isHeroVariant", () => {
  it.each(HERO_VARIANTS)("accepts the registered hero variant %s", (variant) => {
    expect(isHeroVariant(variant)).toBe(true);
  });

  it.each([undefined, null, "", "   ", "not-a-variant", "fullscreen ", 42, {}])(
    "rejects %p",
    (value) => {
      expect(isHeroVariant(value)).toBe(false);
    },
  );
});

describe("isMenuVariant", () => {
  it.each(MENU_VARIANTS)("accepts the registered menu variant %s", (variant) => {
    expect(isMenuVariant(variant)).toBe(true);
  });

  it.each([undefined, null, "", "   ", "not-a-variant", "editorial-list ", 42, {}])(
    "rejects %p",
    (value) => {
      expect(isMenuVariant(value)).toBe(false);
    },
  );
});

describe("isStaffVariant", () => {
  it.each(STAFF_VARIANTS)("accepts the registered staff variant %s", (variant) => {
    expect(isStaffVariant(variant)).toBe(true);
  });

  it.each([undefined, null, "", "   ", "not-a-variant", "portrait-grid ", 42, {}])(
    "rejects %p",
    (value) => {
      expect(isStaffVariant(value)).toBe(false);
    },
  );
});

describe("isGalleryVariant", () => {
  it.each(GALLERY_VARIANTS)("accepts the registered gallery variant %s", (variant) => {
    expect(isGalleryVariant(variant)).toBe(true);
  });

  it.each([undefined, null, "", "   ", "not-a-variant", "large-feature", "grid ", 42, {}])(
    "rejects %p",
    (value) => {
      expect(isGalleryVariant(value)).toBe(false);
    },
  );
});

describe("isValidSectionOrder", () => {
  it("accepts a full permutation of ALL_HOME_SECTIONS", () => {
    const reordered = [...ALL_HOME_SECTIONS].reverse();
    expect(isValidSectionOrder(reordered)).toBe(true);
  });

  it("rejects an order missing a required section (hero)", () => {
    const missingHero = ALL_HOME_SECTIONS.filter((section) => section !== "hero");
    expect(isValidSectionOrder(missingHero)).toBe(false);
  });

  it("rejects a duplicate entry even when the length matches", () => {
    const duplicated = [...ALL_HOME_SECTIONS.slice(0, -1), "menu"];
    expect(isValidSectionOrder(duplicated)).toBe(false);
  });

  it("rejects an unknown section name", () => {
    const withUnknown = [...ALL_HOME_SECTIONS.slice(0, -1), "not-a-real-section"];
    expect(isValidSectionOrder(withUnknown)).toBe(false);
  });

  it("rejects a non-array value", () => {
    expect(isValidSectionOrder("hero,menu")).toBe(false);
    expect(isValidSectionOrder(undefined)).toBe(false);
  });
});
