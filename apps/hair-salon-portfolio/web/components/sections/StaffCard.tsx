import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { StaffPhotoFallback, staffPhotoAlt } from "@/components/sections/StaffContent";
import type { StaffMember } from "@/types/content";

/** Staff portrait card (Phase 2A §10; V1.1 Task 7's `portrait-grid`
 * variant). Consistent 4:5 photo aspect ratio across all staff so the grid
 * stays even. No rating widgets/fake numbers. `role`/`introduction`/
 * `photoSrc`/`photoAlt` are optional (Phase 5.1) — a runtime-sourced staff
 * member (getStaff) never carries `photoAlt`, since the STAFF sheet has no
 * column for it. When the photo is missing, this falls back to the same
 * initial-letter tile treatment `AnyAvailableStaffCard` uses
 * (`StaffContent.tsx`'s shared `StaffPhotoFallback`), so the grid never
 * shows a broken image. */
export function StaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div>
      {staff.photoSrc ? (
        <PlaceholderImage
          src={staff.photoSrc}
          alt={staffPhotoAlt(staff)}
          width={800}
          height={1000}
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          className="rounded-sm"
        />
      ) : (
        <StaffPhotoFallback initial={staff.name} aspectRatio="800 / 1000" textClassName="text-[56px]" />
      )}
      <p className="mt-4 text-[20px] leading-[1.4] font-medium text-primary">{staff.name}</p>
      {staff.role ? <p className="text-[14px] text-accent">{staff.role}</p> : null}
      {staff.introduction ? (
        <p className="mt-1 text-[14px] leading-[1.43] text-muted">{staff.introduction}</p>
      ) : null}
    </div>
  );
}
