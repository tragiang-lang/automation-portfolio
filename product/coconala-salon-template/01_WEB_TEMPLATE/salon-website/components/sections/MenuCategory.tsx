import { MenuRow } from "@/components/sections/MenuRow";
import type { Service } from "@/types/content";

/** One category group within the menu (Phase 2A §9) — only rendered at
 * all when the section has more than one implicit category. */
export function MenuCategory({
  category,
  services,
}: {
  category?: string;
  services: Service[];
}) {
  return (
    <div className="py-8 first:pt-0 last:pb-0">
      {category ? (
        <p className="mb-2 text-[14px] tracking-[0.01em] text-accent">{category}</p>
      ) : null}
      <ul className="divide-y divide-border">
        {services.map((service) => (
          <MenuRow key={service.serviceId} service={service} />
        ))}
      </ul>
    </div>
  );
}
