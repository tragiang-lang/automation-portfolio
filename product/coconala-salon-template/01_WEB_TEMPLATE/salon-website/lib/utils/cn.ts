/**
 * Minimal className joiner. Intentionally not `clsx`/`tailwind-merge` —
 * every call site in this app fully controls its own class list (no
 * consumer-supplied conflicting Tailwind classes to dedupe), so a small
 * local helper avoids two extra dependencies for zero real benefit here.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
