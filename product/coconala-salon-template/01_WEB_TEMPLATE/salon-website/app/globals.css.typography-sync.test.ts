/**
 * Guards against `app/globals.css`'s per-preset `--font-heading-ja`/
 * `--font-heading-en` overrides drifting from
 * `config/typography-tokens.ts`'s `TYPOGRAPHY` registry — mirrors
 * `app/globals.css.theme-sync.test.ts`'s approach for color tokens.
 */
import fs from "node:fs";
import path from "node:path";
import { TYPOGRAPHY } from "@/config/typography-tokens";
import type { TypographyId } from "@/types/design-config";

const GLOBALS_CSS_PATH = path.join(__dirname, "globals.css");
const cssText = fs.readFileSync(GLOBALS_CSS_PATH, "utf-8");

// Only these three presets carry a --font-heading-* override — femme/natural
// deliberately reuse kinari's exact heading pairing (config/typography-tokens.ts),
// so their html[data-design-preset] block has no --font-heading-* line at all.
const OVERRIDE_TYPOGRAPHY_IDS: Array<Exclude<TypographyId, "kinari" | "femme" | "natural">> = [
  "noir",
  "editorial",
  "modern",
];
const NO_OVERRIDE_TYPOGRAPHY_IDS: Array<Extract<TypographyId, "femme" | "natural">> = ["femme", "natural"];

function extractBlockBody(css: string, selectorPattern: RegExp): string | null {
  const selectorMatch = css.match(selectorPattern);
  if (!selectorMatch || selectorMatch.index === undefined) return null;
  const openBraceIndex = css.indexOf("{", selectorMatch.index);
  const closeBraceIndex = css.indexOf("}", openBraceIndex);
  return css.slice(openBraceIndex + 1, closeBraceIndex);
}

function extractFontVar(blockBody: string, cssVarName: string): string | null {
  const match = blockBody.match(new RegExp(`${cssVarName}:\\s*(var\\(--font-[a-z0-9-]+\\))\\s*;`));
  return match ? match[1] : null;
}

describe("app/globals.css typography overrides match config/typography-tokens.ts", () => {
  it("the base @theme inline heading/body mapping matches TYPOGRAPHY.kinari exactly", () => {
    const themeBody = extractBlockBody(cssText, /@theme inline\s*\{/);
    expect(themeBody).not.toBeNull();
    expect(extractFontVar(themeBody!, "--font-heading-ja")).toBe(TYPOGRAPHY.kinari.headingJa);
    expect(extractFontVar(themeBody!, "--font-heading-en")).toBe(TYPOGRAPHY.kinari.headingEn);
    expect(extractFontVar(themeBody!, "--font-body-ja")).toBe(TYPOGRAPHY.kinari.bodyJa);
    expect(extractFontVar(themeBody!, "--font-body-en")).toBe(TYPOGRAPHY.kinari.bodyEn);
  });

  it.each(NO_OVERRIDE_TYPOGRAPHY_IDS)(
    'html[data-design-preset="%s"] has no --font-heading override (reuses kinari\'s pairing)',
    (id) => {
      const blockBody = extractBlockBody(cssText, new RegExp(`html\\[data-design-preset=["']${id}["']\\]\\s*\\{`));
      expect(blockBody).not.toBeNull();
      expect(blockBody).not.toMatch(/--font-heading-ja/);
      expect(blockBody).not.toMatch(/--font-heading-en/);
    },
  );

  it.each(OVERRIDE_TYPOGRAPHY_IDS)(
    'html[data-design-preset="%s"] resolves (block override, falling back to kinari where absent) to TYPOGRAPHY.%s',
    (id) => {
      const blockBody = extractBlockBody(cssText, new RegExp(`html\\[data-design-preset=["']${id}["']\\]\\s*\\{`));
      expect(blockBody).not.toBeNull();
      const expected = TYPOGRAPHY[id];
      const actualHeadingJa = extractFontVar(blockBody!, "--font-heading-ja") ?? TYPOGRAPHY.kinari.headingJa;
      const actualHeadingEn = extractFontVar(blockBody!, "--font-heading-en") ?? TYPOGRAPHY.kinari.headingEn;
      expect(actualHeadingJa).toBe(expected.headingJa);
      expect(actualHeadingEn).toBe(expected.headingEn);
    },
  );
});
