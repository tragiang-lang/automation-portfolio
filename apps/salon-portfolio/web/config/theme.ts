/**
 * Presentation-only design tokens (Phase 2A §18) — the JS-side mirror of
 * the CSS custom properties in `app/globals.css`. Nothing salon-specific
 * (business copy, prices, staff, hours) belongs in this file; that lives
 * in `config/demo-content.ts` today and a real `getConfig`/`getServices`/
 * `getStaff` response from Phase 3+ onward.
 *
 * Colors and the `xl` breakpoint are defined in `app/globals.css`'s
 * `@theme inline` block and consumed via Tailwind utility classes
 * (`bg-accent`, `text-muted`, `xl:...`, etc.) — they are not repeated here
 * to avoid two sources of truth. This file only holds values components
 * need as plain JS/TS (durations, numeric breakpoints for JS logic).
 */

/** Spacing scale (Phase 2A §4) — 4px base unit. Tailwind's numeric scale
 * (`p-4`, `gap-6`, ...) already maps 1:1 to these values, so components
 * use Tailwind classes directly; this export exists for the rare case a
 * component needs the raw number (e.g. an IntersectionObserver margin). */
export const SPACING_PX = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
  24: 96,
  32: 128,
} as const;

/** Responsive breakpoints (Phase 2A §5), as plain numbers for JS logic
 * (e.g. matchMedia checks). CSS uses the Tailwind `sm:`/`lg:`/`xl:`
 * prefixes configured in `app/globals.css`. */
export const BREAKPOINTS_PX = {
  tablet: 640,
  desktop: 1024,
  largeDesktop: 1440,
} as const;

/** Animation durations (Phase 2A §21) — kept to this one small set;
 * nothing in the UI should invent a bespoke duration outside it. */
export const MOTION_MS = {
  heroEnter: 400,
  reveal: 300,
  press: 150,
  accordion: 200,
} as const;

/** Content max-width for text-bearing sections (Phase 2A §5). Full-bleed
 * (hero, gallery) intentionally does not use this constant. */
export const CONTENT_MAX_WIDTH_PX = 1120;
