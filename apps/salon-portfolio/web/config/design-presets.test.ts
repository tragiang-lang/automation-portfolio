import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "./design-presets";
import { ALL_HOME_SECTIONS, DEFAULT_SECTION_VISIBILITY, REQUIRED_HOME_SECTIONS } from "@/lib/constants/design-sections";
import {
  isGalleryVariant,
  isHeroVariant,
  isMenuVariant,
  isStaffVariant,
  isValidSectionOrder,
  parseDesignPresetId,
} from "@/lib/validation/designConfigValidator";
import type { DesignConfig, DesignPreset } from "@/types/design-config";

const ALL_PRESET_IDS: Exclude<DesignPreset, "starter">[] = ["kinari", "femme", "noir", "editorial", "natural", "modern"];

describe("DEFAULT_DESIGN_CONFIG", () => {
  it("matches the current shipped Kinari look, untouched by this task", () => {
    expect(DEFAULT_DESIGN_CONFIG).toMatchObject({
      preset: "kinari",
      theme: "kinari",
      typography: "kinari",
      heroVariant: "fullscreen",
      menuVariant: "editorial-list",
      staffVariant: "portrait-grid",
      galleryVariant: "grid",
    });
  });

  it("defaults every optional section to visible", () => {
    expect(Object.values(DEFAULT_DESIGN_CONFIG.sectionVisibility).every(Boolean)).toBe(true);
  });
});

describe("DESIGN_PRESETS", () => {
  it("has exactly one registry entry per DesignPreset value", () => {
    // "starter" (Starter MVP reusability) is additive and deliberately
    // excluded from ALL_PRESET_IDS/TARGET_MATRIX below — it doesn't follow
    // the "theme/typography match preset id" invariant those loops check
    // (it reuses Kinari's), so it gets its own dedicated describe block
    // instead of being swept into the six-preset generic assertions.
    expect(Object.keys(DESIGN_PRESETS).sort()).toEqual([...ALL_PRESET_IDS, "starter"].sort());
  });

  it("tags every entry with its own preset id", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].preset).toBe(id);
    }
  });

  it("uses the identically-named theme for every preset (Theme Presets task)", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].theme).toBe(id);
    }
  });

  it("uses the identically-named typography for every preset (Typography Presets task)", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].typography).toBe(id);
    }
  });

  it("gives every preset its own sectionVisibility/sectionOrder — no shared references", () => {
    DESIGN_PRESETS.femme.sectionVisibility.concept = false;
    expect(DESIGN_PRESETS.noir.sectionVisibility.concept).toBe(true);
    expect(DEFAULT_DESIGN_CONFIG.sectionVisibility.concept).toBe(true);

    const removedSection = DESIGN_PRESETS.noir.sectionOrder.pop();
    expect(DESIGN_PRESETS.modern.sectionOrder.length).toBe(12);

    // Restore both mutations — DESIGN_PRESETS is a module-level singleton
    // shared by every test in this file (and this describe block isn't the
    // last one), so leaving it mutated here would silently corrupt later
    // tests' reads of the same objects.
    DESIGN_PRESETS.femme.sectionVisibility.concept = true;
    DESIGN_PRESETS.noir.sectionOrder.push(removedSection!);
  });

  it("does not alias DEFAULT_DESIGN_CONFIG (or DESIGN_PRESETS.kinari, the same object) to the shared DEFAULT_SECTION_VISIBILITY constant", () => {
    DEFAULT_DESIGN_CONFIG.sectionVisibility.gallery = false;
    expect(DEFAULT_SECTION_VISIBILITY.gallery).toBe(true);
    expect(DESIGN_PRESETS.editorial.sectionVisibility.gallery).toBe(true);
  });
});

// V1.1 Task 10 — Design Presets: each preset becomes a complete, curated
// visual composition (theme + typography + hero/menu/staff/gallery variant
// + section order), not merely a differently-named theme. See §14 of the
// task brief for the target matrix this section verifies.
describe("V1.1 Task 10 — curated preset compositions", () => {
  const TARGET_MATRIX: Record<
    Exclude<DesignPreset, "starter">,
    Pick<DesignConfig, "heroVariant" | "menuVariant" | "staffVariant" | "galleryVariant"> & {
      sectionOrder: DesignConfig["sectionOrder"];
    }
  > = {
    kinari: {
      heroVariant: "fullscreen",
      menuVariant: "editorial-list",
      staffVariant: "portrait-grid",
      galleryVariant: "grid",
      sectionOrder: [...ALL_HOME_SECTIONS],
    },
    femme: {
      heroVariant: "split",
      menuVariant: "card-grid",
      staffVariant: "portrait-grid",
      galleryVariant: "masonry",
      sectionOrder: [
        "hero",
        "concept",
        "gallery",
        "menu",
        "staff",
        "testimonials",
        "reservation",
        "salon-features",
        "customer-flow",
        "faq",
        "access",
        "contact",
      ],
    },
    noir: {
      heroVariant: "fullscreen",
      menuVariant: "minimal-price-list",
      staffVariant: "horizontal-profile",
      galleryVariant: "feature-editorial",
      sectionOrder: [
        "hero",
        "concept",
        "gallery",
        "menu",
        "staff",
        "testimonials",
        "reservation",
        "salon-features",
        "customer-flow",
        "faq",
        "access",
        "contact",
      ],
    },
    editorial: {
      heroVariant: "editorial",
      menuVariant: "editorial-list",
      staffVariant: "horizontal-profile",
      galleryVariant: "feature-editorial",
      sectionOrder: [
        "hero",
        "gallery",
        "concept",
        "menu",
        "staff",
        "testimonials",
        "reservation",
        "salon-features",
        "customer-flow",
        "faq",
        "access",
        "contact",
      ],
    },
    natural: {
      heroVariant: "split",
      menuVariant: "minimal-price-list",
      staffVariant: "portrait-grid",
      galleryVariant: "masonry",
      sectionOrder: [...ALL_HOME_SECTIONS],
    },
    modern: {
      heroVariant: "split",
      menuVariant: "card-grid",
      staffVariant: "horizontal-profile",
      galleryVariant: "grid",
      sectionOrder: [
        "hero",
        "concept",
        "menu",
        "gallery",
        "staff",
        "testimonials",
        "reservation",
        "salon-features",
        "customer-flow",
        "faq",
        "access",
        "contact",
      ],
    },
  };

  describe("preset completeness", () => {
    it.each(ALL_PRESET_IDS)("%s defines every required DesignConfig field", (id) => {
      const preset = DESIGN_PRESETS[id];
      expect(typeof preset.theme).toBe("string");
      expect(typeof preset.typography).toBe("string");
      expect(typeof preset.heroVariant).toBe("string");
      expect(typeof preset.menuVariant).toBe("string");
      expect(typeof preset.staffVariant).toBe("string");
      expect(typeof preset.galleryVariant).toBe("string");
      expect(Array.isArray(preset.sectionOrder)).toBe(true);
      expect(typeof preset.sectionVisibility).toBe("object");
    });
  });

  describe("preset validity — every field is a registered value (reuses the existing validators, no second allow-list)", () => {
    it.each(ALL_PRESET_IDS)("%s", (id) => {
      const preset = DESIGN_PRESETS[id];
      expect(parseDesignPresetId(preset.theme)).not.toBeNull();
      expect(parseDesignPresetId(preset.typography)).not.toBeNull();
      expect(isHeroVariant(preset.heroVariant)).toBe(true);
      expect(isMenuVariant(preset.menuVariant)).toBe(true);
      expect(isStaffVariant(preset.staffVariant)).toBe(true);
      expect(isGalleryVariant(preset.galleryVariant)).toBe(true);
      expect(isValidSectionOrder(preset.sectionOrder)).toBe(true);
    });
  });

  it("matches the target matrix exactly for every preset", () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = DESIGN_PRESETS[id];
      const target = TARGET_MATRIX[id];
      expect({
        heroVariant: preset.heroVariant,
        menuVariant: preset.menuVariant,
        staffVariant: preset.staffVariant,
        galleryVariant: preset.galleryVariant,
      }).toEqual({
        heroVariant: target.heroVariant,
        menuVariant: target.menuVariant,
        staffVariant: target.staffVariant,
        galleryVariant: target.galleryVariant,
      });
      expect(preset.sectionOrder).toEqual(target.sectionOrder);
    }
  });

  describe("section order safety", () => {
    it.each(ALL_PRESET_IDS)("%s uses only registered HomeSection values, no duplicates, no unknowns", (id) => {
      const order = DESIGN_PRESETS[id].sectionOrder;
      expect(order).toHaveLength(ALL_HOME_SECTIONS.length);
      expect(new Set(order).size).toBe(order.length);
      for (const section of order) {
        expect(ALL_HOME_SECTIONS).toContain(section);
      }
    });

    it.each(ALL_PRESET_IDS)("%s keeps every required section (hero, menu) present", (id) => {
      const order = DESIGN_PRESETS[id].sectionOrder;
      for (const required of REQUIRED_HOME_SECTIONS) {
        expect(order).toContain(required);
      }
    });

    it.each(ALL_PRESET_IDS)("%s never includes the fixed closing reservation CTA as a section id", (id) => {
      // The closing "thank you" ReservationCtaBand is not a HomeSection at
      // all (types/design-config.ts) — this just re-asserts that no preset
      // smuggles a non-`HomeSection` string in at the value level.
      const order = DESIGN_PRESETS[id].sectionOrder as readonly string[];
      expect(order.every((section) => (ALL_HOME_SECTIONS as readonly string[]).includes(section))).toBe(true);
    });
  });

  describe("visual differentiation — presets are distinguishable beyond theme alone", () => {
    it("no two presets share the exact same (hero, menu, staff, gallery) layout tuple", () => {
      const tuples = ALL_PRESET_IDS.map((id) => {
        const preset = DESIGN_PRESETS[id];
        return JSON.stringify([preset.heroVariant, preset.menuVariant, preset.staffVariant, preset.galleryVariant]);
      });
      expect(new Set(tuples).size).toBe(tuples.length);
    });

    it.each(ALL_PRESET_IDS.filter((id) => id !== "kinari"))(
      "%s differs from Kinari in at least one layout dimension beyond theme/typography",
      (id) => {
        const kinari = DESIGN_PRESETS.kinari;
        const preset = DESIGN_PRESETS[id];
        const differs =
          preset.heroVariant !== kinari.heroVariant ||
          preset.menuVariant !== kinari.menuVariant ||
          preset.staffVariant !== kinari.staffVariant ||
          preset.galleryVariant !== kinari.galleryVariant ||
          JSON.stringify(preset.sectionOrder) !== JSON.stringify(kinari.sectionOrder);
        expect(differs).toBe(true);
      },
    );
  });

  describe("runtime content safety — presets carry no business data", () => {
    it.each(ALL_PRESET_IDS)("%s has no string field containing obvious demo business content", (id) => {
      const preset = DESIGN_PRESETS[id];
      const serialized = JSON.stringify(preset);
      // Presets are presentation-only: no business name, staff name, price,
      // service name, photo path, address, or social URL may appear in a
      // preset's own field values (spec §19). This is a light heuristic,
      // not exhaustive validation — it only guards against the specific
      // mistake of literally embedding demo content in a preset.
      expect(serialized).not.toMatch(/https?:\/\//);
      expect(serialized).not.toMatch(/¥|円/);
    });
  });
});

describe("starter preset (Starter MVP reusability)", () => {
  it("tags itself with its own preset id but reuses Kinari's theme/typography, not its own", () => {
    const preset = DESIGN_PRESETS.starter;
    expect(preset.preset).toBe("starter");
    expect(preset.theme).toBe("kinari");
    expect(preset.typography).toBe("kinari");
  });

  it("shows only the Starter MVP's core sections (hero/menu are always-required; reservation/contact stay visible)", () => {
    const visibility = DESIGN_PRESETS.starter.sectionVisibility;
    expect(visibility.reservation).toBe(true);
    expect(visibility.contact).toBe(true);
  });

  it("hides every salon-flavored extra section by default", () => {
    const visibility = DESIGN_PRESETS.starter.sectionVisibility;
    expect(visibility.concept).toBe(false);
    expect(visibility.staff).toBe(false);
    expect(visibility.gallery).toBe(false);
    expect(visibility.testimonials).toBe(false);
    expect(visibility["salon-features"]).toBe(false);
    expect(visibility["customer-flow"]).toBe(false);
    expect(visibility.faq).toBe(false);
    expect(visibility.access).toBe(false);
  });

  it("does not alias DEFAULT_DESIGN_CONFIG's sectionVisibility object", () => {
    DESIGN_PRESETS.starter.sectionVisibility.reservation = false;
    expect(DEFAULT_DESIGN_CONFIG.sectionVisibility.reservation).toBe(true);
    DESIGN_PRESETS.starter.sectionVisibility.reservation = true;
  });

  it("uses a registered hero/menu/staff/gallery variant and a valid, complete section order", () => {
    const preset = DESIGN_PRESETS.starter;
    expect(isHeroVariant(preset.heroVariant)).toBe(true);
    expect(isMenuVariant(preset.menuVariant)).toBe(true);
    expect(isStaffVariant(preset.staffVariant)).toBe(true);
    expect(isGalleryVariant(preset.galleryVariant)).toBe(true);
    expect(isValidSectionOrder(preset.sectionOrder)).toBe(true);
  });

  it("leaves the existing six presets completely untouched", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].theme).toBe(id);
      expect(DESIGN_PRESETS[id].typography).toBe(id);
    }
  });
});
