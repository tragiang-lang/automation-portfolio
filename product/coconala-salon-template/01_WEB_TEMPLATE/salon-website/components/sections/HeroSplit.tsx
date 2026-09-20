import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import { HERO_CTA_PRIMARY, HERO_CTA_SECONDARY, HERO_IMAGE, renderHeroHeadline } from "./HeroContent";
import type { HeroContentProps } from "./HeroContent";

/**
 * Hero — "split" variant (V1.1 Task 5). Text and photo occupy separate
 * columns rather than one full-bleed image with text overlaid on top of
 * it — a genuinely different composition from `HeroFullscreen`, not a CSS
 * reorder of the same layout. Desktop: two columns, text first (keeps DOM/
 * reading/tab order name → tagline → CTA → image, and puts the `<h1>`
 * first for anyone skimming, not just visually). Mobile: collapses to a
 * single stacked column via the same `grid-cols-1 lg:grid-cols-2` `Concept`/
 * `SalonFeatures` sections already use — no bespoke breakpoint logic.
 *
 * No legibility scrim is needed here (unlike `HeroFullscreen`): the photo
 * is never behind text, so this variant reads correctly under every theme
 * purely from the existing `text-primary`/`text-secondary`/`bg-surface`
 * semantic tokens, same as every other non-Hero section.
 */
export function HeroSplit({ headline, subheadline, name, nameLatin }: HeroContentProps) {
  return (
    <section data-testid="hero-split" className="bg-surface py-16 lg:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <p className="text-[13px] tracking-[0.08em] text-muted uppercase">{nameLatin}</p>
            <p className="mt-1 text-[20px] font-medium text-primary">{name}</p>
            <h1 className="mt-6 text-[32px] leading-[1.24] font-medium tracking-[-0.01em] text-primary lg:text-[48px] lg:leading-[1.14]">
              {renderHeroHeadline(headline)}
            </h1>
            <p className="mt-6 max-w-[52ch] text-[16px] leading-[1.7] text-secondary lg:text-[17px] lg:leading-[1.76]">
              {subheadline}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href={HERO_CTA_PRIMARY.href} fullWidth className="sm:w-auto">
                {HERO_CTA_PRIMARY.label}
              </Button>
              <Button href={HERO_CTA_SECONDARY.href} variant="text" className="text-accent sm:w-auto">
                {HERO_CTA_SECONDARY.label}
              </Button>
            </div>
          </Reveal>
          <Reveal delayMs={120}>
            <PlaceholderImage
              src={HERO_IMAGE.src}
              alt={HERO_IMAGE.alt}
              width={1000}
              height={1200}
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              objectPosition="50% 30%"
              className="rounded-sm"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
