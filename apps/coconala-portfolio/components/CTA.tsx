import { CoconalaButton } from "./ui";

export function CTA({ titleLines, buttonLabel }: { titleLines: readonly string[]; buttonLabel: string }) {
  return (
    <section id="contact" className="bg-ink text-paper">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="text-xl font-bold leading-relaxed sm:text-3xl">
          {titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <div className="mt-8">
          <CoconalaButton label={buttonLabel} size="lg" />
        </div>
      </div>
    </section>
  );
}
