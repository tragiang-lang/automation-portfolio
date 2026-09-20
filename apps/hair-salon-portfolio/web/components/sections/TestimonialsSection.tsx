import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import type { TestimonialItem } from "@/types/content";

/**
 * Testimonials — presentation-only section: 3 fictional sample reviews,
 * always demo content (spec: "no external review integrations", "no
 * real-person claims"). Mirrors `FaqSection`/`ContactSection`'s own
 * Container/SectionHeading/Reveal composition so it reads as one system
 * with every other homepage section, rather than a one-off pattern.
 *
 * The disclosure line is rendered unconditionally (not gated on any prop)
 * — this section's content is demo-only by design, not merely today's
 * placeholder, so the disclosure is never something a future "real
 * reviews" data source would need to toggle off here.
 */
export function TestimonialsSection({ testimonials }: { testimonials: TestimonialItem[] }) {
  return (
    <section id="testimonials" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Testimonials"
            title="お客様の声"
            subtitle="atelier itoで過ごす時間と、仕上がりについてのお声。"
          />
        </Reveal>
        <Reveal delayMs={120} className="mt-12">
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((item) => (
              <li
                key={item.id}
                className="flex h-full flex-col rounded-sm border border-border bg-background p-6 lg:p-8"
              >
                <span aria-hidden="true" className="text-[40px] leading-none text-accent/40">
                  “
                </span>
                <p className="mt-2 flex-1 text-[15px] leading-[1.8] text-primary">{item.quote}</p>
                <p className="mt-6 text-[13px] tracking-[0.01em] text-muted">{item.context}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <p className="mt-8 text-[12px] text-muted">※ こちらはデモ用のサンプルレビューです。</p>
      </Container>
    </section>
  );
}
