import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import { StaffPhotoFallback } from "@/components/sections/StaffContent";
import type { Testimonial } from "@/types/content";

/**
 * Testimonials ("お客様の声") — understated quote cards: the review text
 * carries the visual weight, the small circular avatar is a secondary,
 * supporting element under the quote, not the focus (image demo task).
 *
 * A testimonial's `photoSrc` is optional; when absent this falls back to
 * the same initial-letter tile Staff already uses (`StaffPhotoFallback`,
 * `StaffContent.tsx`) rather than duplicating that fallback treatment, so a
 * testimonial without a photo never renders a broken `<img>`.
 */
export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Voice" title="お客様の声" align="center" />
        </Reveal>
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.id} delayMs={index * 100} as="li">
              <figure className="flex h-full flex-col gap-6 border-t border-border pt-6">
                <blockquote className="flex-1 text-[15px] leading-[1.8] text-primary">
                  <p>{`"${testimonial.comment}"`}</p>
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  {testimonial.photoSrc ? (
                    <PlaceholderImage
                      src={testimonial.photoSrc}
                      alt={testimonial.photoAlt ?? testimonial.name}
                      width={80}
                      height={80}
                      sizes="40px"
                      className="w-10 shrink-0 rounded-full"
                    />
                  ) : (
                    <StaffPhotoFallback
                      initial={testimonial.name}
                      aspectRatio="1 / 1"
                      textClassName="text-[14px]"
                      className="w-10 shrink-0 rounded-full"
                    />
                  )}
                  <span className="text-[13px] text-muted">{testimonial.name}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
