import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { STAFF_ANY_AVAILABLE, StaffPhotoFallback, staffPhotoAlt } from "@/components/sections/StaffContent";
import type { StaffContentProps } from "@/components/sections/StaffContent";

/**
 * Staff — "horizontal-profile" variant (V1.1 Task 7). Editorial,
 * information-oriented team presentation: each staff member reads as a
 * profile row — a square photo region alongside a separate text region
 * carrying a clear name → role → bio hierarchy — rather than
 * `portrait-grid`'s photo-led grid cards. Rows are stacked in a single
 * column (never a grid) and divided by hairline rules, so the composition
 * itself differs from `portrait-grid`, not just decoration (Task 7 §8: "do
 * not simply render the same cards with flex-row").
 *
 * The square (1:1) photo crop — rather than `portrait-grid`'s 4:5 portrait
 * crop — keeps the photo from dominating the row at any width, which is
 * what lets the text column's name/role/bio hierarchy carry the visual
 * weight here instead of the photo. Both photo and text columns sit in one
 * CSS grid track pair (`grid-cols-[96px_1fr] sm:grid-cols-[160px_1fr]`)
 * that only changes column width per breakpoint, never the underlying
 * row/column composition, so the desktop layout transforms into a
 * deliberately narrower (not cramped) mobile row (Task 7 §12).
 */
export function StaffHorizontalProfile({ staff, anyAvailableOption, businessNameInitial }: StaffContentProps) {
  return (
    <ul data-testid="staff-horizontal-profile" className="divide-y divide-border border-t border-border">
      {staff.map((member) => (
        <li
          key={member.staffId}
          className="grid grid-cols-[96px_1fr] items-center gap-6 py-8 sm:grid-cols-[160px_1fr] sm:gap-10 lg:py-10"
        >
          {member.photoSrc ? (
            <PlaceholderImage
              src={member.photoSrc}
              alt={staffPhotoAlt(member)}
              width={480}
              height={480}
              sizes="(max-width: 639px) 96px, 160px"
              className="rounded-sm"
            />
          ) : (
            <StaffPhotoFallback initial={member.name} aspectRatio="1 / 1" textClassName="text-[32px] lg:text-[40px]" />
          )}
          <div className="min-w-0">
            <p className="text-[20px] leading-[1.4] font-medium break-words text-primary lg:text-[22px]">
              {member.name}
            </p>
            {member.role ? <p className="mt-1 text-[14px] text-accent">{member.role}</p> : null}
            {member.introduction ? (
              <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.7] break-words text-muted">
                {member.introduction}
              </p>
            ) : null}
          </div>
        </li>
      ))}
      {anyAvailableOption ? (
        <li className="grid grid-cols-[96px_1fr] items-center gap-6 py-8 sm:grid-cols-[160px_1fr] sm:gap-10 lg:py-10">
          <StaffPhotoFallback
            initial={businessNameInitial}
            aspectRatio="1 / 1"
            textClassName="text-[32px] lg:text-[40px]"
          />
          <div className="min-w-0">
            <p className="text-[20px] leading-[1.4] font-medium text-primary lg:text-[22px]">
              {STAFF_ANY_AVAILABLE.label}
            </p>
            <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.7] text-muted">
              {STAFF_ANY_AVAILABLE.description}
            </p>
          </div>
        </li>
      ) : null}
    </ul>
  );
}
