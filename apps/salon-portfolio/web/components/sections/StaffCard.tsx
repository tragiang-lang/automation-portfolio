import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import type { StaffMember } from "@/types/content";

/** Staff portrait card (Phase 2A §10) — consistent 4:5 photo aspect ratio
 * across all staff so the grid stays even. No rating widgets/fake numbers.
 * `role`/`introduction`/`photoSrc`/`photoAlt` are optional (Phase 5.1) —
 * a runtime-sourced staff member (getStaff) never carries them, since the
 * STAFF sheet has no columns for them. When the photo is missing, this
 * falls back to the same initial-letter tile treatment
 * `AnyAvailableStaffCard` already uses, so the grid never shows a broken
 * image. */
export function StaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div>
      {staff.photoSrc ? (
        <PlaceholderImage
          src={staff.photoSrc}
          alt={staff.photoAlt ?? staff.name}
          width={800}
          height={1000}
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          className="rounded-sm"
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-sm bg-surface-sunken"
          style={{ aspectRatio: "800 / 1000" }}
        >
          <span className="text-[56px] font-medium text-accent/70" aria-hidden="true">
            {staff.name.slice(0, 1)}
          </span>
        </div>
      )}
      <p className="mt-4 text-[20px] leading-[1.4] font-medium text-primary">{staff.name}</p>
      {staff.role ? <p className="text-[14px] text-accent">{staff.role}</p> : null}
      {staff.introduction ? (
        <p className="mt-1 text-[14px] leading-[1.43] text-muted">{staff.introduction}</p>
      ) : null}
    </div>
  );
}
