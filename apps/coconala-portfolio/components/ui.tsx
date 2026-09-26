// Small shared building blocks: section shell, heading, badge, Coconala button.
import { siteConfig } from "@/content/site";

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

export function DemoBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full border border-accent px-3 py-1 text-xs font-medium tracking-wider text-accent">
      {label}
    </span>
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
