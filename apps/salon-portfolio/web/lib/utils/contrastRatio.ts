/**
 * WCAG 2.x relative-luminance contrast ratio between two `#rrggbb` colors.
 * Used by `config/theme-tokens.test.ts` to verify every design theme's
 * text/button/accent token pairs clear AA thresholds (4.5:1 for regular
 * text, 3:1 for large text / non-text UI like a focus ring) — see
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio. Pure math, no DOM/CSS
 * dependency, so it runs the same in a Jest test as it would anywhere else.
 */
function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function channelToLinear(channel8Bit: number): number {
  const channel = channel8Bit / 255;
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns a value from 1 (no contrast) to 21 (black on white), symmetric
 *  regardless of argument order. Both inputs must be `#rrggbb` hex strings. */
export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}
