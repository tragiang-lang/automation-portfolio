/**
 * Temporary scaffold-only placeholder.
 *
 * Phase 1 sets up tooling and routing only — no page in this app renders
 * real design or business content yet. Every route below renders this
 * component until its real UI is implemented in a later phase.
 */
export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    </main>
  );
}
