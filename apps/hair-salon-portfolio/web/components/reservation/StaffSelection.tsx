import { ANY_STAFF, PublicStaff, StaffAvailabilityEntry } from "@/types/reservation";
import { cn } from "@/lib/utils/cn";

function conflictLabel(entry: StaffAvailabilityEntry | undefined): string | null {
  if (!entry || entry.available) return null;
  return entry.conflicts.map((conflict) => `${conflict.startTime}〜${conflict.endTime}`).join("、");
}

/** Staff preference picker (spec §9) — "指名なし（お任せ）" is a first-class
 *  radio option in the same list, not a separate skip link, matching the
 *  existing `AnyAvailableStaffCard` convention on the main site. Only
 *  `staffId`/`ANY_STAFF` ever leave this component — no internal id is
 *  rendered as visible copy.
 *
 *  `staffAvailability` (staff-conflict display) is optional so existing
 *  callers/tests that don't yet have a per-candidate breakdown keep working
 *  unchanged — every staff member is treated as available when it's
 *  omitted. When provided, an unavailable staff member stays visible but
 *  disabled, with its conflicting period shown as text (never color alone),
 *  and an all-busy candidate shows a clear Japanese message instead of a
 *  silently-empty list. */
export function StaffSelection({
  staff,
  selectedStaffId,
  onSelect,
  staffAvailability = [],
}: {
  staff: PublicStaff[];
  selectedStaffId: string | typeof ANY_STAFF | null;
  onSelect: (staffId: string | typeof ANY_STAFF) => void;
  staffAvailability?: StaffAvailabilityEntry[];
}) {
  const availabilityByStaffId = new Map(staffAvailability.map((entry) => [entry.staffId, entry]));
  const anyStaffAvailable = staffAvailability.length === 0 || staffAvailability.some((entry) => entry.available);
  const allStaffBusy = staffAvailability.length > 0 && !anyStaffAvailable;

  return (
    <div className="flex flex-col gap-3">
      {allStaffBusy ? (
        <p role="alert" className="text-[14px] leading-[1.7] text-error">
          この時間帯は担当可能なスタッフが空いていません。
          <br />
          別の時間帯または別の日程をお選びください。
        </p>
      ) : null}
      <div role="radiogroup" aria-label="スタッフを選択" className="flex flex-col gap-3">
        <label
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
            selectedStaffId === ANY_STAFF && "border-accent bg-surface-sunken",
            !anyStaffAvailable && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="radio"
            name="reservation-staff"
            checked={selectedStaffId === ANY_STAFF}
            onChange={() => onSelect(ANY_STAFF)}
            disabled={!anyStaffAvailable}
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
          const entry = availabilityByStaffId.get(member.staffId);
          const available = entry ? entry.available : true;
          const conflicts = conflictLabel(entry);
          return (
            <label
              key={member.staffId}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
                checked && "border-accent bg-surface-sunken",
                !available && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="radio"
                name="reservation-staff"
                checked={checked}
                onChange={() => onSelect(member.staffId)}
                disabled={!available}
                className="sr-only"
                aria-label={member.name}
              />
              <span className="flex-1">
                <span className="block text-[16px] font-medium text-primary">{member.name}</span>
                {staffAvailability.length > 0 ? (
                  <span className={cn("block text-[13px]", available ? "text-muted" : "text-error")}>
                    {available ? "○ 空き" : `× ${conflicts} 予約あり`}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
