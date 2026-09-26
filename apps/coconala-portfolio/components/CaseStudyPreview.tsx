import Link from "next/link";
import { siteContent } from "@/content/site";
import { RichMenuImage } from "./DemoVisuals";
import { DemoBadge, Section, SectionHeading } from "./ui";

export function CaseStudyPreview() {
  const { caseStudyPreview: cs } = siteContent;
  return (
    <Section id="works">
      <SectionHeading eyebrow={cs.eyebrow} title={cs.sectionTitle} />
      <Link
        href={cs.href}
        className="group grid gap-6 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md sm:p-6 md:grid-cols-2 md:items-center md:gap-10"
      >
        <RichMenuImage sizes="(min-width: 768px) 480px, 100vw" />
        <div>
          <DemoBadge label={cs.badge} />
          <h3 className="mt-4 text-2xl font-bold">{cs.title}</h3>
          <p className="mt-1 text-base font-medium">{cs.subtitle}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">{cs.description}</p>
          <p className="mt-6 text-sm font-bold text-accent group-hover:underline">{cs.linkLabel} →</p>
        </div>
      </Link>
    </Section>
  );
}
