import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import type { CustomerFlowStep } from "@/types/content";

/** Customer flow (Phase 2A §6/§12) — "what happens when I book", a clear
 * 3–4 step visual sequence to reduce first-visit anxiety. */
export function CustomerFlowSection({ steps }: { steps: CustomerFlowStep[] }) {
  return (
    <section className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Flow" title="ご来店の流れ" align="center" />
        </Reveal>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, index) => (
            <Reveal key={step.step} delayMs={index * 100} as="li">
              <div className="flex flex-col gap-3">
                <span className="text-[26px] leading-[1.3] font-medium text-accent">
                  {String(step.step).padStart(2, "0")}
                </span>
                <p className="text-[17px] font-medium text-primary">{step.title}</p>
                <p className="text-[14px] leading-[1.6] text-muted">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
