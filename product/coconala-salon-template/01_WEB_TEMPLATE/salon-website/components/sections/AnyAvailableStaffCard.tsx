import { STAFF_ANY_AVAILABLE, StaffPhotoFallback } from "@/components/sections/StaffContent";
import type { BusinessInfo } from "@/types/content";

/**
 * The "お任せ" (any available staff) tile (Phase 2A §10; V1.1 Task 7's
 * `portrait-grid` variant) — same card size and photo-frame proportions as
 * a real staff card, rendered as a first-class option in the same grid,
 * not a separate "or skip" link. Copy is shared via `StaffContent.tsx`'s
 * `STAFF_ANY_AVAILABLE` so `horizontal-profile`'s equivalent row can never
 * drift onto different wording.
 */
export function AnyAvailableStaffCard({ initial }: { initial: BusinessInfo["name"] }) {
  return (
    <div>
      <StaffPhotoFallback initial={initial} aspectRatio="800 / 1000" textClassName="text-[56px]" />
      <p className="mt-4 text-[20px] leading-[1.4] font-medium text-primary">{STAFF_ANY_AVAILABLE.label}</p>
      <p className="mt-1 text-[14px] leading-[1.43] text-muted">{STAFF_ANY_AVAILABLE.description}</p>
    </div>
  );
}
