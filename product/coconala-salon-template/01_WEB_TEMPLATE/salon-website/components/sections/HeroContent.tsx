/**
 * Shared, non-visual Hero content (V1.1 Task 5 — Hero Layout Variants).
 *
 * `HeroFullscreen`/`HeroSplit`/`HeroEditorial` each compose their own JSX,
 * but all three must render the identical photo, CTA destinations/labels,
 * and CJK line-break fix — duplicating these across three files would risk
 * them drifting (e.g. one variant's "ご予約はこちら" button pointing
 * somewhere else). Centralizing here keeps that content/CTA/accessibility
 * logic reusable, per the task's explicit "shared content/CTA/
 * accessibility logic should remain reusable" requirement.
 *
 * None of this is business/runtime content (that's `siteConfig.business`,
 * passed into `HeroSection` as props) — it's presentation-layer constants
 * specific to the Hero photo and its two calls to action, same ownership
 * split `config/design-presets.ts` documents for design vs. content.
 */

export const HERO_IMAGE = {
  src: "/images/hero/hero-nail-treatment.jpg",
  alt: "ジェルネイルを丁寧に施術するスタッフの手元",
};

export const HERO_CTA_PRIMARY = { href: "/reservation", label: "ご予約はこちら" };
export const HERO_CTA_SECONDARY = { href: "#menu", label: "メニューを見る" };

/**
 * At narrow widths the default CJK line-break behavior (a break opportunity
 * between almost any two characters, since Japanese has no spaces) was
 * splitting the word "まなざし" mid-word: "...指先とまなざ / しを整える。".
 * Two generic CSS-only fixes were tried and both verified worse or
 * ineffective: `word-break: keep-all` on the whole headline stops ANY break
 * within the longer clause between the sentence's one comma and its
 * period, which doesn't fit this component's width at either breakpoint —
 * it just relocated the awkward break onto "整える" instead. `word-break:
 * auto-phrase` (Chrome's dictionary-based phrase segmentation) didn't move
 * the break point at all here. So this wraps only the specific word in a
 * non-breaking span — the rendered characters are byte-identical to
 * `headline`, this only removes the one bad break opportunity inside them.
 * If a future headline doesn't contain the phrase, this is a no-op and the
 * string renders exactly as passed in.
 */
const HERO_NO_BREAK_PHRASE = "まなざし";

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

/** Props every Hero variant component receives — the one Hero data model
 *  (V1.1 Task 5 §2: "do not create a second Hero data model"). Sourced in
 *  `app/page.tsx` entirely from the existing runtime `siteConfig.business`
 *  fields; no variant introduces its own content shape. */
export interface HeroContentProps {
  /** `siteConfig.business.tagline` — the page's one `<h1>` in every variant. */
  headline: string;
  /** Supporting sentence under the headline (existing `app/page.tsx` literal,
   *  unchanged by this task — see docs/design-customization-audit.md §C). */
  subheadline: string;
  /** `siteConfig.business.name` — rendered as a styled label, not a second
   *  heading (mirrors `SiteHeader`'s existing `<span>` treatment). */
  name: string;
  /** `siteConfig.business.nameLatin`. */
  nameLatin: string;
}
