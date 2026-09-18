import { ANY_STAFF, PublicStaff } from "@/types/reservation";
import { cn } from "@/lib/utils/cn";

/** Staff preference picker (spec §9) — "指名なし（お任せ）" is a first-class
 *  radio option in the same list, not a separate skip link, matching the
 *  existing `AnyAvailableStaffCard` convention on the main site. Only
 *  `staffId`/`ANY_STAFF` ever leave this component — no internal id is
 *  rendered as visible copy. */
export function StaffSelection({
  staff,
  selectedStaffId,
  onSelect,
}: {
  staff: PublicStaff[];
  selectedStaffId: string | typeof ANY_STAFF | null;
  onSelect: (staffId: string | typeof ANY_STAFF) => void;
}) {
  return (
    <div role="radiogroup" aria-label="スタッフを選択" className="flex flex-col gap-3">
      <label
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
          selectedStaffId === ANY_STAFF && "border-accent",
        )}
      >
        <input
          type="radio"
          name="reservation-staff"
          checked={selectedStaffId === ANY_STAFF}
          onChange={() => onSelect(ANY_STAFF)}
          className="sr-only"
          aria-label="指名なし（お任せ）"
        />
        <span>
          <span className="block text-[16px] font-medium text-primary">指名なし（お任せ）</span>
          <span className="block text-[14px] text-muted">空いているスタッフが対応いたします。</span>
        </span>
      </label>
      {staff.map((member) => {
        const checked = member.staffId === selectedStaffId;
        return (
          <label
            key={member.staffId}
            className={cn(
              "flex cursor-pointer items-center gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
              checked && "border-accent",
            )}
          >
            <input
              type="radio"
              name="reservation-staff"
              checked={checked}
              onChange={() => onSelect(member.staffId)}
              className="sr-only"
              aria-label={member.name}
            />
            <span className="text-[16px] font-medium text-primary">{member.name}</span>
          </label>
        );
      })}
    </div>
  );
}
