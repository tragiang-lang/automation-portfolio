import { cn } from "@/lib/utils/cn";
import type { StaffMember } from "@/types/content";

/**
 * Shared, non-visual Staff content (V1.1 Task 7 — Staff Layout Variants).
 *
 * `StaffPortraitGrid`/`StaffHorizontalProfile` each compose their own JSX,
 * but both must format the same runtime `StaffMember[]` the same way
 * (photo alt text, the missing-photo fallback tile, the "any available"
 * option's copy) — duplicating this across two files would risk them
 * drifting (e.g. one variant's fallback initial using a different font
 * size than the other, or the "お任せ" copy diverging). Centralizing here
 * keeps that content/fallback/accessibility logic reusable, mirroring
 * `HeroContent.tsx`/`MenuContent.tsx`'s existing pattern.
 *
 * None of this is business/runtime content — it's the existing runtime
 * `StaffMember[]` (`getRuntimeCatalog` → `getStaff` →
 * `mapPublicStaffToStaffMember`, see `lib/config/resolveCatalog.ts`)
 * already produced. Staff filtering (`Active`) and ordering (`DisplayOrder`)
 * both already happen server-side (`apps/salon-portfolio/gas/src/
 * PublicCatalog.ts`'s `buildPublicStaff`) before the array ever reaches
 * this module — no variant re-filters or re-sorts `staff` (Task 7 §3/§5).
 */

/** The one "no staff preference" copy every Staff variant renders when
 *  `anyAvailableOption` is on — kept here once so its label/description can
 *  never drift between variants, mirroring `MenuContent.tsx`'s `MENU_CTA`
 *  pattern. Byte-identical to the pre-Task-7 `AnyAvailableStaffCard` copy. */
export const STAFF_ANY_AVAILABLE = {
  label: "指名なし（お任せ）",
  description: "空いているスタッフが対応いたします。",
};

/** Alt text for a staff member's photo — falls back to the staff member's
 *  name (the STAFF sheet has no dedicated alt-text column, so a runtime-
 *  sourced staff member never has `photoAlt`) rather than leaving the photo
 *  unlabeled. Shared by every variant that renders a photo. */
export function staffPhotoAlt(staff: StaffMember): string {
  return staff.photoAlt ?? staff.name;
}

/**
 * Initial-letter placeholder tile shown when a staff member (or the "any
 * available" option) has no photo — the same fallback treatment across
 * every variant so a missing photo never renders a broken `<img>` (Task 7
 * §10). `aspectRatio` and `textClassName` let each variant match its own
 * photo proportions (portrait-grid: 4:5 portrait; horizontal-profile:
 * square) without duplicating the fallback markup itself.
 */
export function StaffPhotoFallback({
  initial,
  aspectRatio,
  textClassName,
  className,
}: {
  initial: string;
  aspectRatio: string;
  textClassName: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center justify-center rounded-sm bg-surface-sunken", className)}
      style={{ aspectRatio }}
    >
      <span className={cn("font-medium text-accent/70", textClassName)}>{initial.slice(0, 1)}</span>
    </div>
  );
}

/** Props every Staff variant component receives — the one Staff data model
 *  (Task 7 §2: "do not create another staff model"). Sourced in
 *  `app/page.tsx` entirely from the existing runtime `staff`
 *  (`getRuntimeCatalog` → `getStaff` → `StaffMember[]`, `types/content.ts`)
 *  plus the two existing non-staff-model props `StaffSection` already took
 *  (`anyAvailableOption`, `businessNameInitial`); no variant introduces its
 *  own content shape. */
export interface StaffContentProps {
  staff: StaffMember[];
  anyAvailableOption: boolean;
  businessNameInitial: string;
}
