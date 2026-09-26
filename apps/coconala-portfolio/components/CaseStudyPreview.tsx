import Image from "next/image";
import Link from "next/link";
import { siteContent } from "@/content/site";
import { RichMenuImage } from "./DemoVisuals";
import { DemoBadge, Section, SectionHeading } from "./ui";

const imageSizes = "(min-width: 768px) 480px, 100vw";

/** One work card. All cards share this layout; the featured one only gets a solid badge and a larger title. */
function WorkCard({
  href,
  image,
  badge,
  featuredBadge,
  title,
  subtitle,
  description,
  linkLabel,
}: {
  href: string;
  image: React.ReactNode;
  badge: string;
  featuredBadge?: string;
  title: string;
  subtitle: string;
  description: string;
  linkLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group grid gap-6 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md sm:p-6 md:grid-cols-2 md:items-center md:gap-10"
    >
      {image}
      <div>
        <div className="flex flex-wrap gap-2">
          {featuredBadge && <DemoBadge label={featuredBadge} solid />}
          <DemoBadge label={badge} />
        </div>
        <h3 className={`mt-4 font-bold ${featuredBadge ? "text-2xl" : "text-xl"}`}>{title}</h3>
        <p className="mt-1 text-base font-medium">{subtitle}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>
        <p className="mt-6 text-sm font-bold text-accent group-hover:underline">{linkLabel} →</p>
      </div>
    </Link>
  );
}

export function CaseStudyPreview() {
  const { caseStudyPreview: cs } = siteContent;
  return (
    <Section id="works">
      <SectionHeading eyebrow={cs.eyebrow} title={cs.sectionTitle} />
      <div className="flex flex-col gap-6">
        <WorkCard
          href={cs.href}
          image={<RichMenuImage sizes={imageSizes} />}
          badge={cs.badge}
          featuredBadge={cs.featuredBadge}
          title={cs.title}
          subtitle={cs.subtitle}
          description={cs.description}
          linkLabel={cs.linkLabel}
        />
        {cs.moreDemos.map((demo) => (
          <WorkCard
            key={demo.href}
            href={demo.href}
            image={
              <Image
                src={demo.image.src}
                width={demo.image.width}
                height={demo.image.height}
                alt={demo.image.alt}
                sizes={imageSizes}
                className="h-auto w-full rounded-lg border border-line"
              />
            }
            badge={demo.badge}
            title={demo.title}
            subtitle={demo.subtitle}
            description={demo.description}
            linkLabel={demo.linkLabel}
          />
        ))}
      </div>
    </Section>
  );
}
