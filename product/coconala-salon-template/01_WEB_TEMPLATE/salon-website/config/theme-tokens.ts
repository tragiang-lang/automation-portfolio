/**
 * Canonical theme-token registry (V1.1 Theme Presets task). One
 * `ThemeTokens` entry per `ThemeId` — the single source of truth every
 * `html[data-design-preset="x"]` block in `app/globals.css` mirrors as
 * `--color-*` custom properties (`config/theme-tokens.test.ts` cross-checks
 * `globals.css` against these exact values, so the two can't silently
 * drift). See `types/design-config.ts` for the `ThemeTokens` shape and role
 * notes, and `docs/presentation-config-architecture.md` for how a selected
 * preset's `theme` id reaches this registry and then the rendered page.
 *
 * `kinari` is the current shipped default — its values are the exact hex
 * codes already in `app/globals.css`'s `:root`, unchanged by this task. The
 * other five are new curated palettes, each contrast-checked in
 * `theme-tokens.test.ts` against WCAG AA thresholds
 * (`lib/utils/contrastRatio.ts`) rather than picked by eye.
 */
import type { ThemeId, ThemeTokens } from "@/types/design-config";

export const THEMES: Record<ThemeId, ThemeTokens> = {
  // 凛 (Rin) — Quiet Japanese Luxury. Washi off-white, sumi ink, muted
  // enji-iro (terracotta) accent. The existing, unmodified default.
  kinari: {
    background: "#faf7f2",
    surface: "#ffffff",
    surfaceSunken: "#f1ece3",
    primary: "#2b2622",
    onPrimary: "#faf7f2",
    secondary: "#6b5f55",
    accent: "#9c4b3f",
    onAccent: "#ffffff",
    accentHover: "#833d33",
    text: "#2b2622",
    muted: "#7a6f63",
    border: "#e3dcd1",
    success: "#4b7a62",
    error: "#b3261e",
  },

  // Femme — soft, warm, elegant. Blush-cream background, muted dusty-rose
  // accent (deliberately desaturated, not neon/"cute app" pink).
  femme: {
    background: "#fdf5f3",
    surface: "#ffffff",
    surfaceSunken: "#f7e8e4",
    primary: "#3a2a28",
    onPrimary: "#fdf5f3",
    secondary: "#8a6660",
    accent: "#a14f5a",
    onAccent: "#ffffff",
    accentHover: "#87424c",
    text: "#3a2a28",
    muted: "#7d5c56",
    border: "#ecd9d4",
    success: "#4b7a62",
    error: "#b3261e",
  },

  // Noir — dark, restrained, premium. Warm charcoal (never pure black),
  // a warm champagne-gold headline/ink tone, a muted copper accent.
  // `primary`/`onPrimary` invert relative to the light themes (primary is
  // the light tone here) so the Hero scrim and Footer band stay legible on
  // a dark page — see the role note on `ThemeTokens` in
  // types/design-config.ts. `primary` is deliberately a warm gold rather
  // than a plain off-white: an early pass used a near-white ivory
  // (`#f5efe6`) and the Footer's `bg-primary` band (a large filled area,
  // not just text) read as an accidental revert to Kinari's own
  // `#faf7f2` background when checked visually — a champagne tone keeps
  // the same structural "light closing band on a dark page" contrast
  // Kinari's Footer already uses (inverted), while staying unmistakably
  // its own color.
  noir: {
    background: "#1c1917",
    surface: "#242019",
    surfaceSunken: "#2c2721",
    primary: "#e0c896",
    onPrimary: "#1c1917",
    secondary: "#cbb9a4",
    accent: "#c17b5e",
    onAccent: "#1c1917",
    accentHover: "#a8664c",
    text: "#e0c896",
    muted: "#a89a89",
    border: "#3a3229",
    success: "#6fa98a",
    error: "#e0776e",
  },

  // Editorial — fashion-magazine monochrome. Crisp white/near-black,
  // higher-contrast ink than Kinari, one restrained mustard-gold accent
  // used sparingly rather than a SaaS-blue or a hue that reads as "error".
  editorial: {
    background: "#ffffff",
    surface: "#ffffff",
    surfaceSunken: "#f0f0ef",
    primary: "#111111",
    onPrimary: "#ffffff",
    secondary: "#545454",
    accent: "#86691f",
    onAccent: "#ffffff",
    accentHover: "#6d551a",
    text: "#111111",
    muted: "#767676",
    border: "#dcdcda",
    success: "#3f7a55",
    error: "#b3261e",
  },

  // Natural — organic, botanical, relaxing. Warm sand background, deep
  // earth-brown ink, muted sage-green accent (not a bright "eco" green).
  natural: {
    background: "#f6f2e9",
    surface: "#fdfbf6",
    surfaceSunken: "#ece4d2",
    primary: "#332b1f",
    onPrimary: "#f6f2e9",
    secondary: "#6f6349",
    accent: "#56684a",
    onAccent: "#ffffff",
    accentHover: "#44523a",
    text: "#332b1f",
    muted: "#6f6353",
    border: "#ded2b8",
    success: "#3f6b54",
    error: "#b3261e",
  },

  // Modern — clean, contemporary, minimal. Cooler crisp-neutral background
  // than Kinari's warm washi, stronger near-black ink, a single deep-teal
  // accent (contemporary without reading as a generic SaaS dashboard blue).
  modern: {
    background: "#f7f7f5",
    surface: "#ffffff",
    surfaceSunken: "#ececea",
    primary: "#1f1f1d",
    onPrimary: "#f7f7f5",
    secondary: "#5c5c58",
    accent: "#3d6b63",
    onAccent: "#ffffff",
    accentHover: "#2f544e",
    text: "#1f1f1d",
    muted: "#6c6963",
    border: "#e1e0dc",
    success: "#3f7a55",
    error: "#b3261e",
  },
};
