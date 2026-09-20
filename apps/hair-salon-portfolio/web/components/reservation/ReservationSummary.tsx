import { Button } from "@/components/ui/Button";
import type { PublicService } from "@/types/reservation";
import type { CustomerFields } from "./useReservationWizard";

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("ja-JP", { weekday: "short", timeZone: "UTC" });
  return `${year}年${month}月${day}日（${weekday}）`;
}

/** Final review before submission (spec §14) — display only; the server
 *  remains authoritative for price/duration/staff/availability at
 *  `createReservation` time regardless of what is shown here. */
export function ReservationSummary({
  service,
  staffName,
  date,
  time,
  customer,
  onConfirm,
  onBack,
  confirming,
}: {
  service: PublicService;
  staffName: string | null;
  date: string;
  time: string;
  customer: CustomerFields;
  onConfirm: () => void;
  onBack: () => void;
  confirming: boolean;
}) {
  const rows: [string, string][] = [
    ["メニュー", service.name],
    ["所要時間", `${service.durationMinutes}分`],
    ["料金", formatPrice(service.price)],
    ...(staffName ? ([["スタッフ", staffName]] as [string, string][]) : []),
    ["日時", `${formatDate(date)} ${time}`],
    ["お名前", customer.name],
    ["メール", customer.email],
    ...(customer.phone ? ([["電話番号", customer.phone]] as [string, string][]) : []),
    ...(customer.notes ? ([["備考", customer.notes]] as [string, string][]) : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <dl className="divide-y divide-border rounded-sm border border-border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
            <dt className="text-[14px] text-muted">{label}</dt>
            <dd className="text-[16px] text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="button" fullWidth disabled={confirming} onClick={onConfirm}>
          {confirming ? "予約を受け付けています…" : "この内容で予約する"}
        </Button>
        <Button type="button" variant="secondary" fullWidth disabled={confirming} onClick={onBack}>
          内容を修正する
        </Button>
      </div>
    </div>
  );
}
