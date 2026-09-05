import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import type { SalonFeature } from "@/types/content";

/**
 * Salon Features (Phase 2A §6/§8 anti-pattern list) — practical
 * reassurance presented editorially: a numbered hairline list paired with
 * a photograph, deliberately not the generic "icon-in-a-circle" SaaS
 * feature grid (Phase 2A §24).
 */
export function SalonFeaturesSection({ features }: { features: SalonFeature[] }) {
  return (
    <section className="bg-background py-16 lg:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <PlaceholderImage
              src="/images/salon/salon-treatment-room.jpg"
              alt="清潔に整えられた個室の施術ブースの様子"
              width={1400}
              height={933}
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="rounded-sm"
            />
          </Reveal>
          <Reveal delayMs={120} className="order-1 lg:order-2">
            <SectionHeading eyebrow="Features" title="サロンについて" />
            <ul className="mt-8 flex flex-col">
              {features.map((feature, index) => (
                <li
                  key={feature.id}
                  className="flex gap-6 border-t border-border py-6 first:border-t-0 first:pt-0"
                >
                  <span className="text-[20px] font-medium text-accent tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[17px] font-medium text-primary">{feature.title}</p>
                    <p className="mt-1 text-[14px] leading-[1.6] text-muted">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
