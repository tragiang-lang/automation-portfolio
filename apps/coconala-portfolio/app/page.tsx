import { CaseStudyPreview } from "@/components/CaseStudyPreview";
import { CTA } from "@/components/CTA";
import { DemoSection } from "@/components/DemoSection";
import { FAQ } from "@/components/FAQ";
import { FeatureCards } from "@/components/FeatureCards";
import { Hero } from "@/components/Hero";
import { Section, SectionHeading } from "@/components/ui";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { siteContent } from "@/content/site";

export default function HomePage() {
  const { howItWorks, cta } = siteContent;
  return (
    <>
      <Hero />
      <FeatureCards />
      <Section id="how-it-works">
        <SectionHeading eyebrow={howItWorks.eyebrow} title={howItWorks.title} />
        <WorkflowDiagram steps={howItWorks.steps} />
      </Section>
      <DemoSection />
      <CaseStudyPreview />
      <FAQ />
      <CTA titleLines={cta.titleLines} buttonLabel={cta.buttonLabel} />
    </>
  );
}
