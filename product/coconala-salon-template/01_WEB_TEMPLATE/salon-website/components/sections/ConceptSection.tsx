import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Concept (Phase 2A §6/§9-adjacent) — the salon's philosophy/story.
 * Generous whitespace, editorial typography, no card-heavy layout.
 */
export function ConceptSection({
  eyebrow,
  title,
  paragraphs,
}: {
  eyebrow: string;
  title: string;
  paragraphs: string[];
}) {
  return (
    <section id="concept" className="bg-background py-16 lg:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <SectionHeading eyebrow={eyebrow} title={title} />
            <div className="mt-8 flex flex-col gap-6">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="max-w-[52ch] text-[16px] leading-[1.7] text-secondary lg:text-[17px] lg:leading-[1.76]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
          <Reveal delayMs={120}>
            <PlaceholderImage
              src="/images/salon/salon-reception-light.jpg"
              alt="柔らかな光が差し込む、落ち着いた待合スペースの様子"
              width={1400}
              height={933}
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="rounded-sm"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
