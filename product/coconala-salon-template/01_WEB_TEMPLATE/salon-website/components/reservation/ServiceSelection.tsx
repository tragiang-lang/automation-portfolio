import type { PublicService } from "@/types/reservation";
import { cn } from "@/lib/utils/cn";

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

/** Menu/service picker (spec §8) — a radiogroup of full-width option
 *  cards, not a `<select>` (every choice stays visible + touch-friendly,
 *  consistent with the rest of the site never hiding choices behind a
 *  native dropdown). Price/duration always come from the server-provided
 *  catalog (Api.ts::getServicesAction) — never edited here. */
export function ServiceSelection({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
}) {
  if (services.length === 0) {
    return (
      <p role="status" className="text-[15px] leading-[1.7] text-secondary">
        現在ご案内できるメニューがありません。しばらくしてから再度お試しください。
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="メニューを選択" className="flex flex-col gap-3">
      {services.map((service) => {
        const checked = service.serviceId === selectedServiceId;
        return (
          <label
            key={service.serviceId}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-border bg-surface px-5 py-4 transition-colors",
              checked && "border-accent",
            )}
          >
            <input
              type="radio"
              name="reservation-service"
              value={service.serviceId}
              checked={checked}
              onChange={() => onSelect(service.serviceId)}
              className="sr-only"
              aria-label={service.name}
            />
            <span>
              <span className="block text-[16px] font-medium text-primary">{service.name}</span>
              <span className="block text-[14px] text-muted">{service.durationMinutes}分</span>
            </span>
            <span className="text-[16px] font-medium text-primary">{formatPrice(service.price)}</span>
          </label>
        );
      })}
    </div>
  );
}
