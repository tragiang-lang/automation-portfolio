// Small shared building blocks: section shell, heading, badge, back link, Coconala button.
import { siteConfig, siteContent } from "@/content/site";

export function Section({
  id,
  tone = "paper",
  children,
}: {
  id?: string;
  tone?: "paper" | "surface";
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={tone === "surface" ? "bg-surface" : undefined}>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10 sm:mb-12">
      <p className="text-xs font-medium tracking-[0.2em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
    </div>
  );
}

export function DemoBadge({ label, solid = false }: { label: string; solid?: boolean }) {
  const tone = solid ? "bg-accent text-white" : "text-accent";
  return (
    <span className={`inline-block rounded-full border border-accent px-3 py-1 text-xs font-medium tracking-wider ${tone}`}>
      {label}
    </span>
  );
}

/**
 * Link from a /works/* page back to the WORKS section of the homepage.
 * A plain <a> (like the header nav): next/link's client navigation to "/#works" stays near the top of the page.
 */
export function BackToWorksLink() {
  return (
    <a href="/#works" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
      <span aria-hidden>←</span>
      {siteContent.caseStudyPreview.backLabel}
    </a>
  );
}

export function CoconalaButton({ label, size = "md" }: { label: string; size?: "md" | "lg" }) {
  const sizing = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm";
  return (
    <a
      href={siteConfig.coconalaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-accent font-bold text-white transition-colors hover:bg-accent-dark ${sizing}`}
    >
      {label}
    </a>
  );
}
