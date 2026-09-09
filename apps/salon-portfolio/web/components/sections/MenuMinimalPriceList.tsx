import { formatMenuDuration, formatMenuPrice } from "@/components/sections/MenuContent";
import type { MenuContentProps } from "@/components/sections/MenuContent";

/**
 * Menu — "minimal-price-list" variant (V1.1 Task 6). Simple, premium,
 * highly scannable price list: no per-row dividers, no category grouping,
 * no description — just name and price in tight, aligned rows, closed by
 * a single hairline rule under the whole list. Deliberately not
 * editorial-list with description/borders stripped out: editorial-list
 * groups by category with a full divider between every row and generous
 * `py-6` spacing; this variant never groups and packs rows at `py-2`, so
 * the composition itself — not just decoration — differs (Task 6 §8).
 *
 * Duration is folded into the name column as small muted text rather than
 * its own aligned column (unlike `MenuCardGrid`/`MenuEditorialList`) — it
 * stays available without competing with the name/price alignment that
 * carries this variant's whole hierarchy.
 */
export function MenuMinimalPriceList({ services }: MenuContentProps) {
  return (
    <div data-testid="menu-minimal-price-list">
      <ul>
        {services.map((service) => (
          <li key={service.serviceId} className="flex items-baseline justify-between gap-4 py-2">
            <span className="min-w-0 text-[16px] leading-[1.5] font-medium break-words text-primary lg:text-[18px]">
              {service.name}
              <span className="ml-2 text-[13px] font-normal text-muted">
                {formatMenuDuration(service.durationMinutes)}
              </span>
            </span>
            <span className="shrink-0 text-[16px] font-medium whitespace-nowrap text-primary lg:text-[18px]">
              {formatMenuPrice(service.price)}
            </span>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="mt-2 h-px w-full bg-border" />
    </div>
  );
}
