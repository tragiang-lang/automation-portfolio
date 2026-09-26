export function CaseStudySection({
  title,
  description,
  tone = "paper",
  children,
}: {
  title: string;
  description?: string;
  tone?: "paper" | "surface";
  children?: React.ReactNode;
}) {
  return (
    <section className={tone === "surface" ? "bg-surface" : undefined}>
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description && <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
