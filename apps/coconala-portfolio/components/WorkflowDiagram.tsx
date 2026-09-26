// Numbered steps: a vertical list with arrows on mobile, an even grid from md upward.
const desktopColumns: Record<number, string> = {
  5: "md:grid-cols-5",
  7: "md:grid-cols-4",
};

export function WorkflowDiagram({ steps }: { steps: readonly { label: string; note: string }[] }) {
  return (
    <ol className={`grid gap-y-1 md:gap-4 ${desktopColumns[steps.length] ?? "md:grid-cols-4"}`}>
      {steps.map((step, i) => (
        <li key={step.label} className="flex flex-col items-center">
          <div className="flex h-full w-full items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 md:flex-col md:items-start md:gap-2 md:p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
              {i + 1}
            </span>
            <div>
              <p className="font-bold leading-snug">{step.label}</p>
              <p className="mt-0.5 text-xs text-muted">{step.note}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <span aria-hidden className="py-1 text-lg leading-none text-accent md:hidden">
              ↓
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
