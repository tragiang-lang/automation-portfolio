import { MenuCategory } from "@/components/sections/MenuCategory";
import { groupServices } from "@/components/sections/MenuContent";
import type { MenuContentProps } from "@/components/sections/MenuContent";

/**
 * Menu — "editorial-list" variant (Phase 2A §9; V1.1 Task 6's default/
 * legacy layout). Elegant Japanese salon / editorial menu: strong
 * category grouping (once `groupServices` decides there's more than one
 * implicit category), hairline dividers between rows, name/price carrying
 * the visual weight, description as quiet supporting copy, no cards, no
 * shadows.
 *
 * This is the pre-Task-6 `MenuSection` body, unchanged, moved here and
 * fed through `groupServices`/`MenuCategory`/`MenuRow` exactly as before —
 * `menuVariant: "editorial-list"` (every preset's current default) must
 * render identically to before this task, per §13's backward-
 * compatibility requirement. The section chrome (`#menu` anchor, heading,
 * reservation CTA) moved to `MenuSection.tsx`, which is shared by every
 * variant rather than duplicated three times.
 */
export function MenuEditorialList({ services }: MenuContentProps) {
  const groups = groupServices(services);

  return (
    <div data-testid="menu-editorial-list">
      {groups.map((group, index) => (
        <MenuCategory key={group.category ?? index} category={group.category} services={group.services} />
      ))}
    </div>
  );
}
