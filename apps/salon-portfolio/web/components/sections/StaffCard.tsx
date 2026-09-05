import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import type { StaffMember } from "@/types/content";

/** Staff portrait card (Phase 2A §10) — consistent 4:5 photo aspect ratio
 * across all staff so the grid stays even. No rating widgets/fake numbers. */
export function StaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div>
      <PlaceholderImage
        src={staff.photoSrc}
        alt={staff.photoAlt}
        width={800}
        height={1000}
        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
        className="rounded-sm"
      />
      <p className="mt-4 text-[20px] leading-[1.4] font-medium text-primary">{staff.name}</p>
      <p className="text-[14px] text-accent">{staff.role}</p>
      <p className="mt-1 text-[14px] leading-[1.43] text-muted">{staff.introduction}</p>
    </div>
  );
}
