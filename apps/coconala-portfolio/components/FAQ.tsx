import { siteContent } from "@/content/site";
import { Section, SectionHeading } from "./ui";

// Native <details> accordion: no client JavaScript needed.
export function FAQ() {
  const { faq } = siteContent;
  return (
    <Section id="faq" tone="surface">
      <SectionHeading eyebrow={faq.eyebrow} title={faq.title} />
      <div className="divide-y divide-line border-y border-line">
        {faq.items.map((item) => (
          <details key={item.q} className="group py-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              <span>Q. {item.q}</span>
              <span aria-hidden className="text-xl text-accent transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted">A. {item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
