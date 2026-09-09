import { formatMenuDuration, formatMenuPrice } from "@/components/sections/MenuContent";
import type { Service } from "@/types/content";

/**
 * One menu line (Phase 2A §9) — not an independently clickable "card",
 * just a row in a printed-menu-style list. Price wraps under the name on
 * mobile, sits right-aligned on desktop. `editorial-list`'s own row
 * component (V1.1 Task 6); `MenuCardGrid`/`MenuMinimalPriceList` render
 * their own markup, but all three share `formatMenuPrice`/
 * `formatMenuDuration` from `MenuContent.tsx`.
 */
export function MenuRow({ service }: { service: Service }) {
  return (
    <li className="flex flex-col gap-1 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="sm:max-w-[70%]">
        <h3 className="text-[20px] leading-[1.4] font-medium text-primary lg:text-[26px] lg:leading-[1.3]">
          {service.name}
        </h3>
        {service.description ? (
          <p className="mt-1 text-[14px] leading-[1.43] text-muted">{service.description}</p>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-4 text-[16px] text-secondary sm:flex-col sm:items-end sm:text-right">
        <span>{formatMenuDuration(service.durationMinutes)}</span>
        <span className="text-[20px] font-medium text-primary">{formatMenuPrice(service.price)}</span>
      </div>
    </li>
  );
}
