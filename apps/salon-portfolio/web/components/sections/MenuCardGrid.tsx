import { formatMenuDuration, formatMenuPrice } from "@/components/sections/MenuContent";
import type { MenuContentProps } from "@/components/sections/MenuContent";

/**
 * Menu — "card-grid" variant (V1.1 Task 6). Modern commercial salon
 * layout: each service is its own bordered card in a responsive grid,
 * rather than editorial-list's continuous divided list — a genuinely
 * different composition, not a recolor of the same rows.
 *
 * Deliberately flat (no `groupServices` grouping): a category, when
 * present, becomes a small per-card label instead of a section heading —
 * grouping into visual sections doesn't fit a grid the way it fits a
 * list, and `Service.category` is never required (Task 6 §5/§7).
 *
 * Every card is a flex column with its price/duration row pinned to the
 * bottom via `mt-auto`, so CSS Grid's default row-stretch plus that keeps
 * cards visually balanced whether or not a description is present —
 * short and long cards in the same row still align their price rows.
 *
 * `bg-background` (not the section's own `bg-surface`) plus a
 * `border-border` hairline gives each card a boundary that reads under
 * every theme (verified kinari/noir) without a shadow.
 */
export function MenuCardGrid({ services }: MenuContentProps) {
  return (
    <ul data-testid="menu-card-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {services.map((service) => (
        <li
          key={service.serviceId}
          className="flex h-full flex-col rounded-sm border border-border bg-background p-6 lg:p-8"
        >
          {service.category ? (
            <span className="text-[12px] tracking-[0.08em] text-accent uppercase">{service.category}</span>
          ) : null}
          <h3 className="mt-2 text-[20px] leading-[1.35] font-medium text-primary first:mt-0 lg:text-[22px]">
            {service.name}
          </h3>
          {service.description ? (
            <p className="mt-2 text-[14px] leading-[1.6] text-muted">{service.description}</p>
          ) : null}
          <div className="mt-auto flex items-baseline justify-between gap-4 border-t border-border pt-4">
            <span className="text-[20px] font-medium text-primary">{formatMenuPrice(service.price)}</span>
            <span className="text-[14px] text-secondary">{formatMenuDuration(service.durationMinutes)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
