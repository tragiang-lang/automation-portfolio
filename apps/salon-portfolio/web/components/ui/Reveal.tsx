"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * One-time scroll-reveal wrapper (Phase 2A §21): fades/rises content in as
 * it first enters the viewport, never re-triggers on scroll back up.
 * `delayMs` staggers grouped items (gallery tiles, FAQ rows); the stagger
 * is zeroed on mobile via the `[data-reveal]` rule in `globals.css`, and
 * the whole effect is skipped for `prefers-reduced-motion` there too.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLDivElement | HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
      className={cn(visible ? "reveal-visible" : "reveal-hidden", className)}
    >
      {children}
    </Tag>
  );
}
