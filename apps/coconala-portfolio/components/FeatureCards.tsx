import { siteContent } from "@/content/site";
import { Section, SectionHeading } from "./ui";

export function FeatureCards() {
  const { features } = siteContent;
  return (
    <Section id="services" tone="surface">
      <SectionHeading eyebrow={features.eyebrow} title={features.title} />
      <ul className="grid gap-4 md:grid-cols-3">
        {features.items.map((item, i) => (
          <li key={item.title} className="rounded-xl border border-line bg-paper p-6">
            <p className="text-xs font-medium text-accent">0{i + 1}</p>
            <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
