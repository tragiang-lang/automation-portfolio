import { cn } from "@/lib/utils/cn";

/** Hairline divider — used between menu rows, footer columns, etc. */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-border", className)} />;
}
