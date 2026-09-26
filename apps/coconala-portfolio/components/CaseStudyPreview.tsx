import Image from "next/image";
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
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {cs.moreDemos.map((demo) => (
          <Link
            key={demo.href}
            href={demo.href}
            className="group flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md sm:p-6"
          >
            <Image
              src={demo.image.src}
              width={demo.image.width}
              height={demo.image.height}
              alt={demo.image.alt}
              sizes="(min-width: 768px) 440px, 100vw"
              className="h-auto w-full rounded-lg border border-line"
            />
            <div>
              <DemoBadge label={demo.badge} />
              <h3 className="mt-3 text-xl font-bold">{demo.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{demo.description}</p>
              <p className="mt-4 text-sm font-bold text-accent group-hover:underline">{demo.linkLabel} →</p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
