import { Button } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { HERO_CTA_PRIMARY, HERO_CTA_SECONDARY, HERO_IMAGE, renderHeroHeadline } from "./HeroContent";
import type { HeroContentProps } from "./HeroContent";

/**
 * Hero — "fullscreen" variant (Phase 2A §8; V1.1 Task 5's default/legacy
 * layout). Full-bleed photograph, headline/subhead/CTAs in the lower-left
 * third, dark-to-transparent scrim for legibility (not a decorative
 * gradient). ~90vh desktop, ~100vh minus header on mobile.
 *
 * This is byte-for-byte the pre-Task-5 `HeroSection` markup, moved here
 * unchanged — `heroVariant: "fullscreen"` (every preset's current default)
 * must render identically to before this task, per §10's backward-
 * compatibility requirement. `name`/`nameLatin` are intentionally unused:
 * the pre-Task-5 look never showed them, and this variant must not change.
 */
export function HeroFullscreen({ headline, subheadline }: HeroContentProps) {
  return (
    <section
      data-testid="hero-fullscreen"
      className="relative flex min-h-[calc(100vh-56px)] items-end overflow-hidden lg:min-h-[90vh]"
    >
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
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
          width={900}
          height={1200}
          priority
          sizes="100vw"
          objectPosition="65% 50%"
          className="h-full sm:hidden"
        />
        <PlaceholderImage
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
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
              <Button href={HERO_CTA_PRIMARY.href} fullWidth className="sm:w-auto">
                {HERO_CTA_PRIMARY.label}
              </Button>
              <Button href={HERO_CTA_SECONDARY.href} variant="text" className="text-on-primary sm:w-auto">
                {HERO_CTA_SECONDARY.label}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
