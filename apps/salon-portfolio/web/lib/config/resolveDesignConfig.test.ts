import { resolveDesignConfig } from "./resolveDesignConfig";
import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";

describe("resolveDesignConfig", () => {
  it("returns the matching registry entry for a valid preset id", () => {
    expect(resolveDesignConfig("noir")).toBe(DESIGN_PRESETS.noir);
  });

  it("falls back to the default config for an unknown preset id", () => {
    expect(resolveDesignConfig("does-not-exist")).toBe(DEFAULT_DESIGN_CONFIG);
  });

  it.each([undefined, null, "", 42, {}])("falls back to the default config for %p", (value) => {
    expect(resolveDesignConfig(value)).toBe(DEFAULT_DESIGN_CONFIG);
  });

  // V1.1 Task 10 — Design Presets: `resolveDesignConfig` also accepts
  // `{ preset, ...overrides }` so a customer can select a preset and still
  // override individual design properties (spec §7/§8) without a second
  // exported function or a second config-resolution codepath.
  describe("object input — preset + overrides", () => {
    it("resolves { preset: 'noir' } (no overrides) to the exact Noir registry entry", () => {
      expect(resolveDesignConfig({ preset: "noir" })).toBe(DESIGN_PRESETS.noir);
    });

    it("treats an object with no preset and no overrides the same as no input", () => {
      expect(resolveDesignConfig({})).toBe(DEFAULT_DESIGN_CONFIG);
    });

    it("falls back to the default base for an unknown preset id, before overrides apply", () => {
      const resolved = resolveDesignConfig({ preset: "bogus-preset", heroVariant: "split" });
      expect(resolved.theme).toBe(DEFAULT_DESIGN_CONFIG.theme);
      expect(resolved.heroVariant).toBe("split");
    });

    it("overrides only heroVariant, leaving every other Noir field untouched", () => {
      const resolved = resolveDesignConfig({ preset: "noir", heroVariant: "split" });

      expect(resolved.theme).toBe("noir");
      expect(resolved.typography).toBe("noir");
      expect(resolved.heroVariant).toBe("split");
      expect(resolved.menuVariant).toBe(DESIGN_PRESETS.noir.menuVariant);
      expect(resolved.staffVariant).toBe(DESIGN_PRESETS.noir.staffVariant);
      expect(resolved.galleryVariant).toBe(DESIGN_PRESETS.noir.galleryVariant);
      expect(resolved.sectionOrder).toEqual(DESIGN_PRESETS.noir.sectionOrder);
    });

    it("overrides only galleryVariant, leaving every other Femme field untouched", () => {
      const resolved = resolveDesignConfig({ preset: "femme", galleryVariant: "grid" });

      expect(resolved.theme).toBe("femme");
      expect(resolved.heroVariant).toBe(DESIGN_PRESETS.femme.heroVariant);
      expect(resolved.menuVariant).toBe(DESIGN_PRESETS.femme.menuVariant);
      expect(resolved.staffVariant).toBe(DESIGN_PRESETS.femme.staffVariant);
      expect(resolved.galleryVariant).toBe("grid");
      expect(resolved.sectionOrder).toEqual(DESIGN_PRESETS.femme.sectionOrder);
    });

    it("overrides sectionOrder, leaving every other Modern field untouched", () => {
      const customOrder = [...DESIGN_PRESETS.modern.sectionOrder].reverse();
      const resolved = resolveDesignConfig({ preset: "modern", sectionOrder: customOrder });

      expect(resolved.heroVariant).toBe(DESIGN_PRESETS.modern.heroVariant);
      expect(resolved.menuVariant).toBe(DESIGN_PRESETS.modern.menuVariant);
      expect(resolved.sectionOrder).toEqual(customOrder);
    });

    it("ignores an invalid override value and keeps the preset's own value instead", () => {
      const resolved = resolveDesignConfig({ preset: "noir", heroVariant: "not-a-real-variant" });
      expect(resolved.heroVariant).toBe(DESIGN_PRESETS.noir.heroVariant);
    });

    it("ignores an invalid override value for theme/typography and keeps the preset's own value", () => {
      const resolved = resolveDesignConfig({ preset: "noir", theme: "not-a-real-theme" });
      expect(resolved.theme).toBe("noir");
    });

    it("ignores 'starter' as a theme/typography override — it's a registered preset id but not a registered theme/typography id (Starter MVP reusability)", () => {
      const resolved = resolveDesignConfig({ preset: "noir", theme: "starter", typography: "starter" });
      expect(resolved.theme).toBe("noir");
      expect(resolved.typography).toBe("noir");
    });
  });
});
