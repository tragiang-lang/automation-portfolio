import type { BusinessInfo } from "@/types/content";

/**
 * The "お任せ" (any available staff) tile (Phase 2A §10) — same card size
 * and photo-frame proportions as a real staff card, rendered as a
 * first-class option in the same grid, not a separate "or skip" link.
 */
export function AnyAvailableStaffCard({ initial }: { initial: BusinessInfo["name"] }) {
  return (
    <div>
      <div
        className="flex items-center justify-center rounded-sm bg-surface-sunken"
        style={{ aspectRatio: "800 / 1000" }}
      >
        <span className="text-[56px] font-medium text-accent/70" aria-hidden="true">
          {initial.slice(0, 1)}
        </span>
      </div>
      <p className="mt-4 text-[20px] leading-[1.4] font-medium text-primary">指名なし（お任せ）</p>
      <p className="mt-1 text-[14px] leading-[1.43] text-muted">
        空いているスタッフが対応いたします。
      </p>
    </div>
  );
}
