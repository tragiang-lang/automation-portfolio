import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Max-width wrapper for text-bearing sections (Phase 2A §5) — 1120px,
 * never used for full-bleed hero/gallery imagery.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  /** Narrower reading measure for prose-heavy sections (e.g. FAQ). */
  narrow?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        narrow ? "max-w-[760px]" : "max-w-[1120px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
