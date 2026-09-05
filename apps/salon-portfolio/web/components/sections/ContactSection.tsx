import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/forms/ContactForm";
import type { BusinessInfo } from "@/types/content";

/**
 * Contact (Phase 2A §6/§15) — non-reservation inquiries, gated by
 * `features.contactForm` in the composition root (`app/page.tsx`).
 */
export function ContactSection({ business }: { business: BusinessInfo }) {
  return (
    <section id="contact" className="bg-surface py-16 lg:py-24">
      <Container narrow>
        <Reveal>
          <SectionHeading
            eyebrow="Contact"
            title="お問い合わせ"
            subtitle={`ご予約以外のご質問はこちらから。お急ぎの場合はお電話（${business.phone}）にてご連絡ください。`}
          />
        </Reveal>
        <Reveal delayMs={120} className="mt-12">
          <ContactForm />
        </Reveal>
      </Container>
    </section>
  );
}
