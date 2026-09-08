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
});
