/**
 * Canonical typography-token registry (V1.1 Typography Presets task). One
 * `TypographyTokens` entry per `TypographyId` — the single source of truth
 * `app/globals.css`'s per-preset `--font-heading-ja`/`--font-heading-en`
 * overrides mirror (`app/globals.css.typography-sync.test.ts` cross-checks
 * the two stay identical). See `types/design-config.ts` for the
 * `TypographyTokens` shape and `docs/presentation-config-architecture.md`
 * for how a selected preset's `typography` id reaches this registry, then
 * `app/layout.tsx`'s font loaders, then the rendered page.
 *
 * Body typography (`bodyJa`/`bodyEn`) is identical across every preset —
 * Noto Sans JP + Inter are already the clean, highly legible neutral
 * pairing every preset's design direction asks for ("clean Japanese sans
 * body" appears under every persona); varying it per preset would add
 * font-loading cost for a role none of the six directions actually asks to
 * change.
 *
 * `femme` and `natural` reuse `kinari`'s exact heading pairing (Shippori
 * Mincho + Cormorant Garamond) on purpose: both directions ask for a
 * refined/elegant *serif* heading close to Kinari's own "quiet luxury"
 * mincho, and introducing a second near-identical serif family would add
 * font-loading cost for a difference no reader would perceive — their
 * visual personality comes from `config/theme-tokens.ts`'s distinct color
 * palettes instead. `noir`/`editorial`/`modern` each get a heading pairing
 * that could not be mistaken for Kinari's.
 */
import type { TypographyId, TypographyTokens } from "@/types/design-config";

export const TYPOGRAPHY: Record<TypographyId, TypographyTokens> = {
  kinari: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-cormorant-garamond)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Reuses kinari's pairing verbatim — see file header.
  femme: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-cormorant-garamond)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Reuses kinari's pairing verbatim — see file header.
  natural: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-cormorant-garamond)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Noir — a sophisticated editorial serif headline (Playfair Display) for
  // Latin text, paired with Kinari's own restrained mincho for Japanese
  // headings, so the premium/restrained feel reads in both scripts without
  // introducing a second Japanese heading font.
  noir: {
    headingJa: "var(--font-shippori-mincho)",
    headingEn: "var(--font-playfair-display)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Editorial — the most visually distinctive pairing on purpose: a bold,
  // clean Japanese sans heading (Zen Kaku Gothic New) against a
  // high-contrast display serif (Playfair Display) for Latin headings — a
  // fashion-magazine serif/sans heading contrast none of the other five
  // presets use.
  editorial: {
    headingJa: "var(--font-zen-kaku-gothic-new)",
    headingEn: "var(--font-playfair-display)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },

  // Modern — a clean contemporary sans-only pairing (no serif anywhere),
  // the strongest possible typographic contrast against Kinari's
  // mincho + old-style-serif baseline.
  modern: {
    headingJa: "var(--font-zen-kaku-gothic-new)",
    headingEn: "var(--font-inter)",
    bodyJa: "var(--font-noto-sans-jp)",
    bodyEn: "var(--font-inter)",
  },
};
