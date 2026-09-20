import { THEMES } from "./theme-tokens";
import { getContrastRatio } from "@/lib/utils/contrastRatio";
import { THEME_TOKEN_KEYS } from "@/types/design-config";
import type { ThemeId } from "@/types/design-config";

const ALL_THEME_IDS: ThemeId[] = ["kinari", "femme", "noir", "editorial", "natural", "modern"];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Kinari must stay byte-for-byte the current shipped `app/globals.css`
// `:root` palette — this is the automated guard against "improving" the
// default theme while adding the other five.
const EXPECTED_KINARI: Record<string, string> = {
  background: "#faf7f2",
  surface: "#ffffff",
  surfaceSunken: "#f1ece3",
  primary: "#2b2622",
  onPrimary: "#faf7f2",
  secondary: "#6b5f55",
  accent: "#9c4b3f",
  onAccent: "#ffffff",
  text: "#2b2622",
  muted: "#7a6f63",
  border: "#e3dcd1",
  success: "#4b7a62",
  error: "#b3261e",
};

describe("THEMES registry", () => {
  it("has exactly one entry per ThemeId value", () => {
    expect(Object.keys(THEMES).sort()).toEqual([...ALL_THEME_IDS].sort());
  });

  it.each(ALL_THEME_IDS)("theme %s has exactly the required ThemeTokens keys, no more, no less", (id) => {
    expect(Object.keys(THEMES[id]).sort()).toEqual([...THEME_TOKEN_KEYS].sort());
  });

  it.each(ALL_THEME_IDS)("theme %s uses only valid #rrggbb hex color values", (id) => {
    for (const key of THEME_TOKEN_KEYS) {
      expect(THEMES[id][key]).toMatch(HEX_COLOR);
    }
  });

  it("kinari matches the current shipped app/globals.css :root palette exactly, unchanged by this task", () => {
    for (const [key, value] of Object.entries(EXPECTED_KINARI)) {
      expect(THEMES.kinari[key as keyof typeof THEMES.kinari]).toBe(value);
    }
  });

  it("gives every theme a distinct accent from its error color (decorative accent must stay distinguishable from the error semantic)", () => {
    for (const id of ALL_THEME_IDS) {
      expect(THEMES[id].accent.toLowerCase()).not.toBe(THEMES[id].error.toLowerCase());
    }
  });

  describe.each(ALL_THEME_IDS)("%s — WCAG AA contrast", (id) => {
    const t = THEMES[id];

    it("body text meets 4.5:1 against background and surface", () => {
      expect(getContrastRatio(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it("secondary (paragraph copy) meets 4.5:1 against background and surface", () => {
      expect(getContrastRatio(t.secondary, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(t.secondary, t.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it("muted (meta text) meets 4.5:1 against background and surface", () => {
      expect(getContrastRatio(t.muted, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it("primary/onPrimary pair (Hero scrim + Footer band) meets 4.5:1", () => {
      expect(getContrastRatio(t.primary, t.onPrimary)).toBeGreaterThanOrEqual(4.5);
    });

    it("accent/onAccent pair (primary button label) meets 4.5:1", () => {
      expect(getContrastRatio(t.accent, t.onAccent)).toBeGreaterThanOrEqual(4.5);
    });

    it("accent meets 3:1 against background (focus-ring / non-text UI contrast)", () => {
      expect(getContrastRatio(t.accent, t.background)).toBeGreaterThanOrEqual(3);
    });

    it("error meets 4.5:1 against background and surface", () => {
      expect(getContrastRatio(t.error, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(t.error, t.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it("success meets 4.5:1 against background and surface", () => {
      expect(getContrastRatio(t.success, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(t.success, t.surface)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
