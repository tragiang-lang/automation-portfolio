import { Button } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

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

function renderHeroHeadline(headline: string) {
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

/**
 * Hero (Phase 2A §8) — full-bleed photograph, headline/subhead/CTAs in the
 * lower-left third, dark-to-transparent scrim for legibility (not a
 * decorative gradient). ~90vh desktop, ~100vh minus header on mobile.
 */
export function HeroSection({
  headline,
  subheadline,
}: {
  headline: string;
  subheadline: string;
}) {
  return (
    <section className="relative flex min-h-[calc(100vh-56px)] items-end overflow-hidden lg:min-h-[90vh]">
      <div className="absolute inset-0">
        {/* Same photograph on both breakpoints, art-directed with a
            different container ratio + focal point per breakpoint rather
            than one blind object-fit crop (Phase 2A §8/§22: "do not simply
            use the exact same crop on mobile"). The mobile portrait crop
            only has room for ~half the frame's width, so its focal point
            shifts right to keep the hands/treatment detail in view instead
            of the empty wall on the left; the desktop crop barely trims
            top/bottom and stays centered. */}
        <PlaceholderImage
          src="/images/hero/hero-nail-treatment.jpg"
          alt="ジェルネイルを丁寧に施術するスタッフの手元"
          width={900}
          height={1200}
          priority
          sizes="100vw"
          objectPosition="65% 50%"
          className="h-full sm:hidden"
        />
        <PlaceholderImage
          src="/images/hero/hero-nail-treatment.jpg"
          alt="ジェルネイルを丁寧に施術するスタッフの手元"
          width={1600}
          height={1000}
          priority
          sizes="100vw"
          objectPosition="50% 40%"
          className="hidden h-full sm:block"
        />
        {/* Legibility scrim, not decoration (Phase 2A §8/§2) — strengthened
            slightly over the real photo's bright equipment/highlights
            versus the flat placeholder it replaces, re-verified against
            the on-primary text it sits under (§25 contrast spot-check). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/35 to-transparent"
        />
      </div>

      <div className="animate-hero-enter relative w-full px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-[560px]">
            <h1 className="text-[34px] leading-[1.24] font-medium tracking-[-0.01em] text-on-primary lg:text-[56px] lg:leading-[1.14]">
              {renderHeroHeadline(headline)}
            </h1>
            <p className="mt-6 text-[16px] leading-[1.7] text-on-primary/90 lg:text-[17px] lg:leading-[1.76]">
              {subheadline}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href="/reservation" fullWidth className="sm:w-auto">
                ご予約はこちら
              </Button>
              <Button href="#menu" variant="text" className="text-on-primary sm:w-auto">
                メニューを見る
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
