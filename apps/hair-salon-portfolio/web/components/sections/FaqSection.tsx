import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { FaqAccordionItem } from "@/components/sections/FaqAccordionItem";
import type { FaqItem } from "@/types/content";

/** FAQ (Phase 2A §6/§13) — accessible accordion, recommended always-on. */
export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className="bg-background py-16 lg:py-24">
      <Container narrow>
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="よくあるご質問" align="center" />
        </Reveal>
        <Reveal delayMs={120} className="mt-12">
          <div>
            {items.map((item) => (
              <FaqAccordionItem key={item.id} item={item} />
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
