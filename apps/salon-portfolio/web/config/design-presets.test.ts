import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "./design-presets";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/constants/design-sections";
import type { DesignPreset } from "@/types/design-config";

const ALL_PRESET_IDS: DesignPreset[] = ["kinari", "femme", "noir", "editorial", "natural", "modern"];

describe("DEFAULT_DESIGN_CONFIG", () => {
  it("matches the current shipped Kinari look, untouched by this task", () => {
    expect(DEFAULT_DESIGN_CONFIG).toMatchObject({
      preset: "kinari",
      theme: "kinari",
      typography: "kinari",
      heroVariant: "fullscreen",
      menuVariant: "editorial-list",
      staffVariant: "portrait-grid",
      galleryVariant: "masonry",
    });
  });

  it("defaults every optional section to visible", () => {
    expect(Object.values(DEFAULT_DESIGN_CONFIG.sectionVisibility).every(Boolean)).toBe(true);
  });
});

describe("DESIGN_PRESETS", () => {
  it("has exactly one registry entry per DesignPreset value", () => {
    expect(Object.keys(DESIGN_PRESETS).sort()).toEqual([...ALL_PRESET_IDS].sort());
  });

  it("tags every entry with its own preset id", () => {
    for (const id of ALL_PRESET_IDS) {
      expect(DESIGN_PRESETS[id].preset).toBe(id);
    }
  });

  it("gives every preset its own sectionVisibility/sectionOrder — no shared references", () => {
    DESIGN_PRESETS.femme.sectionVisibility.concept = false;
    expect(DESIGN_PRESETS.noir.sectionVisibility.concept).toBe(true);
    expect(DEFAULT_DESIGN_CONFIG.sectionVisibility.concept).toBe(true);

    DESIGN_PRESETS.noir.sectionOrder.pop();
    expect(DESIGN_PRESETS.modern.sectionOrder.length).toBe(11);
  });

  it("does not alias DEFAULT_DESIGN_CONFIG (or DESIGN_PRESETS.kinari, the same object) to the shared DEFAULT_SECTION_VISIBILITY constant", () => {
    DEFAULT_DESIGN_CONFIG.sectionVisibility.gallery = false;
    expect(DEFAULT_SECTION_VISIBILITY.gallery).toBe(true);
    expect(DESIGN_PRESETS.editorial.sectionVisibility.gallery).toBe(true);
  });
});
