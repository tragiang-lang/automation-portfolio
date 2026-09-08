import { TYPOGRAPHY } from "./typography-tokens";
import { TYPOGRAPHY_TOKEN_KEYS } from "@/types/design-config";
import type { TypographyId } from "@/types/design-config";

const ALL_TYPOGRAPHY_IDS: TypographyId[] = ["kinari", "femme", "noir", "editorial", "natural", "modern"];
const FONT_VAR_REFERENCE = /^var\(--font-[a-z0-9-]+\)$/;

describe("TYPOGRAPHY registry", () => {
  it("has exactly one entry per TypographyId value", () => {
    expect(Object.keys(TYPOGRAPHY).sort()).toEqual([...ALL_TYPOGRAPHY_IDS].sort());
  });

  it.each(ALL_TYPOGRAPHY_IDS)(
    "typography %s has exactly the required TypographyTokens keys, no more, no less",
    (id) => {
      expect(Object.keys(TYPOGRAPHY[id]).sort()).toEqual([...TYPOGRAPHY_TOKEN_KEYS].sort());
    },
  );

  it.each(ALL_TYPOGRAPHY_IDS)("typography %s uses only var(--font-*) references", (id) => {
    for (const key of TYPOGRAPHY_TOKEN_KEYS) {
      expect(TYPOGRAPHY[id][key]).toMatch(FONT_VAR_REFERENCE);
    }
  });

  it("kinari matches the current shipped app/layout.tsx font mapping exactly, unchanged by this task", () => {
    expect(TYPOGRAPHY.kinari).toEqual({
      headingJa: "var(--font-shippori-mincho)",
      headingEn: "var(--font-cormorant-garamond)",
      bodyJa: "var(--font-noto-sans-jp)",
      bodyEn: "var(--font-inter)",
    });
  });

  it("gives every preset the same body typography (no reader-facing benefit to varying it)", () => {
    for (const id of ALL_TYPOGRAPHY_IDS) {
      expect(TYPOGRAPHY[id].bodyJa).toBe(TYPOGRAPHY.kinari.bodyJa);
      expect(TYPOGRAPHY[id].bodyEn).toBe(TYPOGRAPHY.kinari.bodyEn);
    }
  });

  it("femme and natural deliberately reuse kinari's exact heading pairing", () => {
    expect(TYPOGRAPHY.femme).toEqual(TYPOGRAPHY.kinari);
    expect(TYPOGRAPHY.natural).toEqual(TYPOGRAPHY.kinari);
  });

  it("noir, editorial, and modern each differ from kinari in at least one heading token", () => {
    for (const id of ["noir", "editorial", "modern"] as const) {
      const differs =
        TYPOGRAPHY[id].headingJa !== TYPOGRAPHY.kinari.headingJa ||
        TYPOGRAPHY[id].headingEn !== TYPOGRAPHY.kinari.headingEn;
      expect(differs).toBe(true);
    }
  });

  it("editorial's heading pairing is unique across the whole registry (most visually distinctive preset)", () => {
    const editorialPair = `${TYPOGRAPHY.editorial.headingJa}|${TYPOGRAPHY.editorial.headingEn}`;
    for (const id of ALL_TYPOGRAPHY_IDS) {
      if (id === "editorial") continue;
      const pair = `${TYPOGRAPHY[id].headingJa}|${TYPOGRAPHY[id].headingEn}`;
      expect(pair).not.toBe(editorialPair);
    }
  });
});
