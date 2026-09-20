import type { Service } from "@/types/content";

/**
 * Shared, non-visual Menu content (V1.1 Task 6 — Menu Layout Variants).
 *
 * `MenuEditorialList`/`MenuCardGrid`/`MenuMinimalPriceList` each compose
 * their own JSX, but all three must format the same price/duration and
 * group the same runtime `Service[]` by category the same way — duplicating
 * this across three files would risk them drifting (e.g. one variant
 * rounding a price differently). Centralizing here keeps price formatting/
 * service grouping/display-ordering logic reusable, per the task's explicit
 * "do not duplicate ... across all three components" requirement
 * (§4/§7 of the task spec).
 *
 * None of this is business logic: it only formats/groups `Service[]` the
 * existing runtime flow (`getRuntimeCatalog` → `getServices` →
 * `mapPublicServiceToService`, see `lib/config/resolveCatalog.ts`) already
 * produced — no price/duration/eligibility is computed or invented here,
 * and reservation still resolves its own authoritative price/duration
 * server-side (docs/presentation-config-architecture.md).
 */

/** The one reservation CTA every Menu variant renders below its service
 *  list, mirroring `HeroContent.tsx`'s `HERO_CTA_PRIMARY` pattern — kept
 *  here once so its destination/label can never drift between variants. */
export const MENU_CTA = { href: "/reservation", label: "ご予約はこちら" };

const GROUPING_THRESHOLD = 6;

/**
 * Groups services by category, but only when there are enough services to
 * warrant it (Phase 2A §9: "grouping UI is simply not rendered when
 * there's only one implicit category"). Grouping is data-driven off
 * `service.category`, never a hard-coded category list. Shared by every
 * Menu variant that groups by category (`MenuEditorialList` today) so the
 * grouping threshold/behavior can never drift between variants.
 *
 * Preserves the existing `Service[]` order within and across groups —
 * this never re-sorts; the order is already the runtime `displayOrder`
 * sequence `getServices` produced (Task 6 §5: "do not randomly sort
 * services differently per variant").
 */
export function groupServices(
  services: Service[],
): Array<{ category?: string; services: Service[] }> {
  if (services.length <= GROUPING_THRESHOLD) {
    return [{ services }];
  }

  const order: string[] = [];
  const byCategory = new Map<string, Service[]>();
  for (const service of services) {
    const key = service.category ?? "その他";
    if (!byCategory.has(key)) {
      order.push(key);
      byCategory.set(key, []);
    }
    byCategory.get(key)!.push(service);
  }

  if (order.length <= 1) {
    return [{ services }];
  }

  return order.map((category) => ({ category, services: byCategory.get(category)! }));
}

/** `¥6,000` — the one price format every Menu variant renders. */
export function formatMenuPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

/** `60分` — the one duration format every Menu variant renders. */
export function formatMenuDuration(durationMinutes: number): string {
  return `${durationMinutes}分`;
}

/** Props every Menu variant component receives — the one Menu data model
 *  (Task 6 §2/§4: "do not create another service model"). Sourced in
 *  `app/page.tsx` entirely from the existing runtime `services`
 *  (`getRuntimeCatalog` → `getServices` → `Service[]`, `types/content.ts`);
 *  no variant introduces its own content shape. */
export interface MenuContentProps {
  services: Service[];
}
