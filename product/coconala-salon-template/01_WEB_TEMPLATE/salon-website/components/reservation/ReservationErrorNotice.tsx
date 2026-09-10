import { Button } from "@/components/ui/Button";

/** Generic inline error banner reused across the wizard (spec §18). The
 *  `message` shown here always comes straight from the backend envelope —
 *  every code path that can reach this component (GAS's
 *  `ReservationErrorMapping.ts`, or `/api/gas/route.ts`'s sanitization of
 *  its own local transport codes) already produces a safe, natural
 *  Japanese sentence, so this component never re-maps or appends to it
 *  (Global Constraints). */
export function ReservationErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-sm border border-error/40 bg-surface px-5 py-4 text-[14px] text-error">
      <p>{message}</p>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          もう一度お試しください
        </Button>
      ) : null}
    </div>
  );
}
