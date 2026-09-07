import type { AvailableTimeSlot } from "@/types/reservation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/** Available-time grid (spec §11) — advisory only (Principle 2): a slot
 *  shown here can still be lost to a race before `createReservation`'s own
 *  re-check. Never shows internal availability-strategy names/reasons —
 *  just "空きあり"/"空きなし" via the button grid or the empty-state copy. */
export function TimeSlotSelection({
  status,
  slots,
  selectedTime,
  onSelect,
  onRetry,
}: {
  status: "idle" | "loading" | "ready" | "error";
  slots: AvailableTimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  onRetry: () => void;
}) {
  if (status === "idle") {
    return (
      <p className="text-[14px] text-muted">日付を選択すると、空いている時間が表示されます。</p>
    );
  }

  if (status === "loading") {
    return (
      <p role="status" aria-live="polite" className="text-[14px] text-muted">
        空き状況を確認しています…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-[14px] text-error">
        <p>空き状況の取得に失敗しました。時間をおいて再度お試しください。</p>
        <Button type="button" variant="secondary" onClick={onRetry}>
          再試行
        </Button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p role="status" className="text-[14px] leading-[1.7] text-secondary">
        この日は予約可能な時間がありません。別の日をお選びください。
      </p>
    );
  }

  return (
    <div role="group" aria-label="時間を選択" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {slots.map((slot) => {
        const pressed = slot.time === selectedTime;
        return (
          <button
            key={slot.time}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(slot.time)}
            className={cn(
              "min-h-[44px] rounded-sm border border-border bg-surface text-[15px] text-primary transition-colors",
              pressed && "border-accent bg-surface-sunken font-medium",
            )}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
