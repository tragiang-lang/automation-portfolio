import { getDesignConfig } from "./designConfig";
import { DEFAULT_DESIGN_CONFIG, DESIGN_PRESETS } from "@/config/design-presets";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("getDesignConfig", () => {
  it("returns the default config when SALON_DESIGN_PRESET is unset", () => {
    delete process.env.SALON_DESIGN_PRESET;
    expect(getDesignConfig()).toBe(DEFAULT_DESIGN_CONFIG);
  });

  it("resolves a valid SALON_DESIGN_PRESET value", () => {
    process.env.SALON_DESIGN_PRESET = "editorial";
    expect(getDesignConfig()).toBe(DESIGN_PRESETS.editorial);
  });

  it("falls back to the default for an invalid SALON_DESIGN_PRESET value", () => {
    process.env.SALON_DESIGN_PRESET = "bogus-preset";
    expect(getDesignConfig()).toBe(DEFAULT_DESIGN_CONFIG);
  });
});
