import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import { HERO_CTA_PRIMARY, HERO_CTA_SECONDARY, HERO_IMAGE, renderHeroHeadline } from "./HeroContent";
import type { HeroContentProps } from "./HeroContent";

/**
 * Hero — "editorial" variant (V1.1 Task 5). Japanese beauty/fashion
 * editorial composition: a centered name/tagline opening, a large photo
 * offset to one side rather than centered under it, and supporting copy/
 * CTA offset to the opposite side beneath that — the asymmetric flow is
 * the point, not a generic centered card. Strong whitespace (`py-20
 * lg:py-32`) and a larger type scale than `HeroFullscreen`/`HeroSplit`
 * carry the "editorial" feeling entirely through spacing/type hierarchy —
 * no new decorative effects, no per-component color, same semantic tokens
 * every other section already uses.
 *
 * No legibility scrim: like `HeroSplit`, the photo is never behind text,
 * so contrast is unaffected by theme choice.
 */
export function HeroEditorial({ headline, subheadline, name, nameLatin }: HeroContentProps) {
  return (
    <section data-testid="hero-editorial" className="bg-background py-20 lg:py-32">
      <Container>
        <Reveal className="mx-auto max-w-[720px] text-center">
          <p className="text-[13px] tracking-[0.12em] text-muted uppercase">{nameLatin}</p>
          <p className="mt-2 text-[18px] font-medium text-primary">{name}</p>
          <h1 className="mt-8 text-[36px] leading-[1.3] font-medium tracking-[-0.01em] text-primary lg:text-[64px] lg:leading-[1.16]">
            {renderHeroHeadline(headline)}
          </h1>
        </Reveal>
      </Container>

      <Reveal delayMs={120} className="mt-14 lg:mt-20">
        {/* Not `Container` here — its two fixed widths (1120/760px, always
            centered) can't express this row's asymmetric offset, so the
            padding it would have provided is applied directly instead. */}
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:mr-[12%] lg:ml-auto lg:max-w-[820px] lg:px-8">
          <PlaceholderImage
            src={HERO_IMAGE.src}
            alt={HERO_IMAGE.alt}
            width={1400}
            height={933}
            priority
            sizes="(max-width: 1023px) 100vw, 70vw"
            objectPosition="50% 40%"
            className="rounded-sm"
          />
        </div>
      </Reveal>

      <Container>
        <Reveal
          delayMs={200}
          className="mx-auto mt-10 max-w-[440px] text-center lg:mr-auto lg:ml-[16%] lg:max-w-[420px] lg:text-left"
        >
          <p className="text-[16px] leading-[1.7] text-secondary lg:text-[17px] lg:leading-[1.76]">
            {subheadline}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-start">
            <Button href={HERO_CTA_PRIMARY.href} fullWidth className="sm:w-auto">
              {HERO_CTA_PRIMARY.label}
            </Button>
            <Button href={HERO_CTA_SECONDARY.href} variant="text" className="text-accent sm:w-auto">
              {HERO_CTA_SECONDARY.label}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
