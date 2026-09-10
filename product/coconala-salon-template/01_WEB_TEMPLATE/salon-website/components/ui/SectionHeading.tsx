import { cn } from "@/lib/utils/cn";

/**
 * Eyebrow + H2 title (+ optional one-line subtitle), reused by every
 * section (Phase 2A §17). The eyebrow carries the section's small hairline
 * accent underline mentioned in Phase 2A §2 ("a single hairline under a
 * section eyebrow").
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "mb-3 inline-flex flex-col text-[14px] tracking-[0.01em] text-accent",
            align === "center" && "items-center",
          )}
        >
          <span>{eyebrow}</span>
          <span aria-hidden="true" className="mt-2 h-px w-8 bg-accent" />
        </p>
      ) : null}
      <h2 className="text-[28px] leading-[1.28] font-medium tracking-[-0.005em] text-primary lg:text-[40px] lg:leading-[1.2]">
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-4 max-w-[640px] text-[16px] leading-[1.7] text-secondary lg:text-[17px] lg:leading-[1.76]",
            align === "center" && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
