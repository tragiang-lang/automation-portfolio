"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { FaqItem } from "@/types/content";

/**
 * One FAQ row (Phase 2A §13/§19) — self-contained open state so multiple
 * rows can be open at once (no forced single-open behavior). The height
 * transition uses the `grid-template-rows: 0fr -> 1fr` technique so it
 * animates smoothly without any JS height measurement.
 */
export function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const buttonId = useId();

  return (
    <div className="border-b border-border">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full min-h-[44px] items-center justify-between gap-4 py-6 text-left"
        >
          <span className="text-[17px] font-medium text-primary">{item.question}</span>
          <span
            aria-hidden="true"
            className={cn(
              "relative h-5 w-5 flex-none transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-45",
            )}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent" />
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-accent" />
          </span>
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="max-w-[70ch] pb-6 text-[15px] leading-[1.7] text-secondary">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
