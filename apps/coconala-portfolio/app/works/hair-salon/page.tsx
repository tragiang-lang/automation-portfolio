import type { Metadata } from "next";
import { CaseStudySection } from "@/components/CaseStudySection";
import { CTA } from "@/components/CTA";
import { EmailMock, RichMenuImage, SpreadsheetMock } from "@/components/DemoVisuals";
import { BackToWorksLink, DemoBadge } from "@/components/ui";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { hairSalonCaseStudy as cs } from "@/content/hair-salon";

export const metadata: Metadata = {
  title: `${cs.eyebrow} ${cs.title}`,
  description: cs.metaDescription,
};

function FlowColumn({
  label,
  steps,
  summary,
  highlight,
}: {
  label: string;
  steps: readonly string[];
  summary: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-6 ${highlight ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
      <p className={`text-sm font-bold tracking-widest ${highlight ? "text-accent" : "text-muted"}`}>{label}</p>
      <ol className="mt-4 flex flex-col items-center gap-1 text-center">
        {steps.map((step, i) => (
          <li key={step} className="flex w-full flex-col items-center gap-1">
            <span className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${highlight ? "bg-surface" : "bg-sunken"}`}>
              {step}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="text-muted">
                ↓
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed">{summary}</p>
    </div>
  );
}

export default function HairSalonCaseStudyPage() {
  return (
    <>
      {/* Overview */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="mb-6">
          <BackToWorksLink />
        </div>
        <DemoBadge label={cs.badge} />
        <p className="mt-6 text-sm font-medium tracking-[0.2em] text-accent">{cs.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold leading-snug sm:text-5xl">
          {cs.titleLines.map((line) => (
            <span key={line} className="inline-block pr-[0.5em]">
              {line}
            </span>
          ))}
        </h1>
        <h2 className="mt-10 text-xs font-medium tracking-[0.2em] text-muted">{cs.overview.title.toUpperCase()}</h2>
        <p className="mt-3 text-lg leading-loose">
          {cs.overview.lines.map((line) => (
            <span key={line} className="sm:block">
              {line}
            </span>
          ))}
        </p>
        <p className="mt-4 text-xs text-muted">{cs.overview.note}</p>
      </section>

      <CaseStudySection title={cs.beforeAfter.title} tone="surface">
        <div className="grid gap-6 md:grid-cols-2">
          <FlowColumn {...cs.beforeAfter.before} />
          <FlowColumn {...cs.beforeAfter.after} highlight />
        </div>
      </CaseStudySection>

      <CaseStudySection title={cs.richMenu.title} description={cs.richMenu.description}>
        <RichMenuImage sizes="(min-width: 1024px) 976px, 100vw" priority />
      </CaseStudySection>

      <CaseStudySection title={cs.workflow.title} description={cs.workflow.note} tone="surface">
        <WorkflowDiagram steps={cs.workflow.steps} />
      </CaseStudySection>

      <CaseStudySection title={cs.spreadsheet.title} description={cs.spreadsheet.description}>
        <SpreadsheetMock />
      </CaseStudySection>

      <CaseStudySection title={cs.email.title} description={cs.email.description} tone="surface">
        <div className="max-w-xl">
          <EmailMock />
        </div>
      </CaseStudySection>

      <CaseStudySection title={cs.technology.title}>
        <ul className="flex flex-wrap gap-2">
          {cs.technology.items.map((item) => (
            <li key={item} className="rounded-full border border-line bg-surface px-4 py-2 text-sm">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted">{cs.technology.portfolioNote}</p>
      </CaseStudySection>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <BackToWorksLink />
      </div>

      <CTA titleLines={cs.cta.titleLines} buttonLabel={cs.cta.buttonLabel} />
    </>
  );
}
