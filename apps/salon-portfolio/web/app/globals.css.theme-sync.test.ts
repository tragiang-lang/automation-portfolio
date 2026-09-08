/**
 * Guards against `app/globals.css` (what the browser actually renders)
 * drifting from `config/theme-tokens.ts`'s `THEMES` registry (the typed,
 * tested source of truth) — the two are separate files by necessity (CSS
 * custom properties aren't generated from TS at build time here), so this
 * test is what keeps them in sync instead of a build step.
 */
import fs from "node:fs";
import path from "node:path";
import { THEMES } from "@/config/theme-tokens";
import { THEME_TOKEN_KEYS } from "@/types/design-config";
import type { ThemeId, ThemeTokens } from "@/types/design-config";

const GLOBALS_CSS_PATH = path.join(__dirname, "globals.css");
const cssText = fs.readFileSync(GLOBALS_CSS_PATH, "utf-8");

const NON_KINARI_THEME_IDS: Exclude<ThemeId, "kinari">[] = [
  "femme",
  "noir",
  "editorial",
  "natural",
  "modern",
];

/** `surfaceSunken` -> `surface-sunken`, `onPrimary` -> `on-primary`, etc. —
 *  matches the kebab-case `--color-*` custom property names in globals.css. */
function toCssVarName(tokenKey: keyof ThemeTokens): string {
  return `--color-${tokenKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Extracts every `--color-*: #value;` declaration from one `{ ... }` CSS
 *  block's body text into a `ThemeTokens`-shaped object. */
function parseColorTokensFromBlock(blockBody: string): Partial<ThemeTokens> {
  const result: Partial<ThemeTokens> = {};
  for (const tokenKey of THEME_TOKEN_KEYS) {
    const varName = toCssVarName(tokenKey);
    const match = blockBody.match(new RegExp(`${varName}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
    if (match) {
      result[tokenKey] = match[1].toLowerCase();
    }
  }
  return result;
}

/** Finds `selector { ... }` (single-level braces, which is all this file
 *  uses for its color-token blocks) and returns the body between `{`/`}`. */
function extractBlockBody(css: string, selectorPattern: RegExp): string | null {
  const selectorMatch = css.match(selectorPattern);
  if (!selectorMatch || selectorMatch.index === undefined) return null;
  const openBraceIndex = css.indexOf("{", selectorMatch.index);
  const closeBraceIndex = css.indexOf("}", openBraceIndex);
  return css.slice(openBraceIndex + 1, closeBraceIndex);
}

describe("app/globals.css theme blocks match config/theme-tokens.ts", () => {
  it(":root matches THEMES.kinari exactly (Kinari stays the CSS default, no override block)", () => {
    const rootBody = extractBlockBody(cssText, /:root\s*\{/);
    expect(rootBody).not.toBeNull();
    const parsed = parseColorTokensFromBlock(rootBody!);
    for (const key of THEME_TOKEN_KEYS) {
      expect(parsed[key]).toBe(THEMES.kinari[key].toLowerCase());
    }
  });

  it("has no html[data-design-preset=\"kinari\"] override block (kinari is the :root default)", () => {
    expect(cssText).not.toMatch(/html\[data-design-preset=["']kinari["']\]/);
  });

  it.each(NON_KINARI_THEME_IDS)("html[data-design-preset=\"%s\"] matches THEMES.%s exactly", (id) => {
    const blockBody = extractBlockBody(
      cssText,
      new RegExp(`html\\[data-design-preset=["']${id}["']\\]\\s*\\{`),
    );
    expect(blockBody).not.toBeNull();
    const parsed = parseColorTokensFromBlock(blockBody!);
    for (const key of THEME_TOKEN_KEYS) {
      expect(parsed[key]).toBe(THEMES[id][key].toLowerCase());
    }
  });
});
