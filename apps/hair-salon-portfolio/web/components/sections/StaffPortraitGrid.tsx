import { StaffCard } from "@/components/sections/StaffCard";
import { AnyAvailableStaffCard } from "@/components/sections/AnyAvailableStaffCard";
import type { StaffContentProps } from "@/components/sections/StaffContent";

/**
 * Staff — "portrait-grid" variant (Phase 2A §10; V1.1 Task 7's default/
 * legacy layout). Classic premium salon team presentation: portrait-
 * oriented (4:5) staff photos in a responsive grid, name carrying the
 * primary weight, role secondary, bio (`introduction`) as supporting copy
 * when present — no shadows, no generic SaaS card chrome.
 *
 * This is the pre-Task-7 `StaffSection` grid body, unchanged, moved here —
 * `staffVariant: "portrait-grid"` (every preset's current default) must
 * render identically to before this task, per §16's backward-compatibility
 * requirement.
 */
export function StaffPortraitGrid({ staff, anyAvailableOption, businessNameInitial }: StaffContentProps) {
  return (
    <ul data-testid="staff-portrait-grid" className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {staff.map((member) => (
        <li key={member.staffId}>
          <StaffCard staff={member} />
        </li>
      ))}
      {anyAvailableOption ? (
        <li>
          <AnyAvailableStaffCard initial={businessNameInitial} />
        </li>
      ) : null}
    </ul>
  );
}
