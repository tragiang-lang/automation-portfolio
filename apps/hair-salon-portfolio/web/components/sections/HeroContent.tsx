/**
 * Shared, non-visual Hero content for atelier ito.
 *
 * `HeroFullscreen`/`HeroSplit`/`HeroEditorial` each compose their own JSX,
 * but all three must render the identical photo, CTA destinations/labels,
 * and CJK line-break fix. Centralizing here keeps that content/CTA/
 * accessibility logic reusable, matching the reference architecture's
 * ownership split (design vs. content).
 *
 * None of this is business/runtime content (that's `siteConfig.business`,
 * passed into `HeroSection` as props) -- it's presentation-layer constants
 * specific to the Hero photo and its two calls to action.
 */

export const HERO_IMAGE = {
  src: "/images/hero/hero-hair-cutting.jpg",
  alt: "髪を丁寧にカットするスタイリストの手元",
};

export const HERO_CTA_PRIMARY = { href: "/reservation", label: "予約する" };
export const HERO_CTA_SECONDARY = { href: "#menu", label: "メニューを見る" };

/**
 * Protects "向き合う" from an awkward mid-word CJK line break at narrow
 * widths, the same technique the reference architecture uses for its own
 * headline's line-break-sensitive phrase. A no-op if a future headline
 * doesn't contain the phrase.
 */
const HERO_NO_BREAK_PHRASE = "向き合う";

export function renderHeroHeadline(headline: string) {
  const index = headline.indexOf(HERO_NO_BREAK_PHRASE);
  if (index === -1) return headline;

  return (
    <>
      {headline.slice(0, index)}
      <span style={{ whiteSpace: "nowrap" }}>{HERO_NO_BREAK_PHRASE}</span>
      {headline.slice(index + HERO_NO_BREAK_PHRASE.length)}
    </>
  );
}

/** Props every Hero variant component receives -- the one Hero data model.
 *  Sourced in `app/page.tsx` entirely from the runtime `siteConfig.business`
 *  fields; no variant introduces its own content shape. */
export interface HeroContentProps {
  /** `siteConfig.business.tagline` -- the page's one `<h1>` in every variant. */
  headline: string;
  /** Supporting sentence under the headline. */
  subheadline: string;
  /** `siteConfig.business.name` -- rendered as a styled label, not a second heading. */
  name: string;
  /** `siteConfig.business.nameLatin`. */
  nameLatin: string;
  /** `siteConfig.labels.bookingCta` -- defaults to `HERO_CTA_PRIMARY.label`
   *  ("予約する") so every call site renders unchanged when omitted. */
  primaryCtaLabel?: string;
}
