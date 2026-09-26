import type { Metadata } from "next";
import Image from "next/image";
import { CaseStudySection } from "@/components/CaseStudySection";
import { CTA } from "@/components/CTA";
import { BackToWorksLink, DemoBadge } from "@/components/ui";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { nailSalonDemo as demo } from "@/content/nail-salon";

export const metadata: Metadata = {
  title: `${demo.eyebrow} ${demo.title}`,
  description: demo.metaDescription,
};

export default function NailSalonDemoPage() {
  const { image } = demo.richMenu;
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="mb-6">
          <BackToWorksLink />
        </div>
        <DemoBadge label={demo.badge} />
        <p className="mt-6 text-sm font-medium tracking-[0.2em] text-accent">{demo.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold leading-snug sm:text-5xl">
          {demo.titleLines.map((line) => (
            <span key={line} className="inline-block pr-[0.5em]">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-loose">{demo.description}</p>
        <p className="mt-4 text-xs text-muted">{demo.note}</p>
      </section>

      <CaseStudySection title={demo.richMenu.title} description={demo.richMenu.description} tone="surface">
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(min-width: 1024px) 976px, 100vw"
          priority
          className="h-auto w-full rounded-lg border border-line"
        />
      </CaseStudySection>

      <CaseStudySection title={demo.workflow.title} description={demo.workflow.note}>
        <WorkflowDiagram steps={demo.workflow.steps} />
      </CaseStudySection>

      <CaseStudySection title={demo.menu.title} description={demo.menu.description} tone="surface">
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {demo.menu.items.map((item) => (
            <li key={item.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:text-base">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted">
                {item.minutes}分 ・ {item.price}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">{demo.menu.note}</p>
      </CaseStudySection>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <BackToWorksLink />
      </div>

      <CTA titleLines={demo.cta.titleLines} buttonLabel={demo.cta.buttonLabel} />
    </>
  );
}
