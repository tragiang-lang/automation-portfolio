import { siteContent } from "@/content/site";
import { RichMenuImage } from "./DemoVisuals";
import { CoconalaButton, DemoBadge } from "./ui";

export function Hero() {
  const { hero, demo } = siteContent;
  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-accent sm:text-sm">{hero.eyebrow}</p>
        <h1 className="mt-4 text-[1.625rem] font-bold leading-snug sm:text-4xl lg:text-[2.625rem] lg:leading-tight">
          {hero.titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-6 text-base leading-loose text-muted sm:text-lg">
          {hero.descriptionLines.map((line) => (
            <span key={line} className="sm:block">
              {line}
            </span>
          ))}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href={hero.primaryCta.href}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-ink px-6 py-3 text-sm font-bold transition-colors hover:bg-ink hover:text-paper"
          >
            {hero.primaryCta.label}
          </a>
          <CoconalaButton label={hero.secondaryCtaLabel} />
        </div>
      </div>
      <figure>
        <RichMenuImage sizes="(min-width: 1024px) 420px, 100vw" priority />
        <figcaption className="mt-3 flex items-center gap-2 text-xs text-muted">
          <DemoBadge label={demo.badge} />
          <span>{hero.imageCaption}</span>
        </figcaption>
      </figure>
    </section>
  );
}
