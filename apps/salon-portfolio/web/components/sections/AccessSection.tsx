import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { HOURS_DAY_LABELS, HOURS_DAY_ORDER, formatHours } from "@/lib/constants/hours";
import type { AccessInfo, BusinessInfo, SiteConfig } from "@/types/content";

/**
 * Access (Phase 2A §14) — plain selectable address text, a styled map
 * *placeholder* (no Google Maps embed yet — deferred per §14), transit
 * directions as a plain list, and business hours as a two-column table.
 */
export function AccessSection({
  business,
  hours,
  access,
}: {
  business: BusinessInfo;
  hours: SiteConfig["hours"];
  access: AccessInfo;
}) {
  return (
    <section id="access" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Access" title="アクセス" />
        </Reveal>
        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            {/* Static map placeholder — Phase 2A §14 defers a real embed. */}
            <div
              role="img"
              aria-label="地図（実際の地図は今後追加予定です）"
              className="flex flex-col items-center justify-center gap-3 rounded-sm bg-surface-sunken"
              style={{ aspectRatio: "4 / 3" }}
            >
              <Image src="/icons/pin.svg" alt="" width={32} height={32} aria-hidden="true" />
              <span className="text-[14px] text-muted">地図</span>
            </div>

            <address className="mt-6 not-italic text-[16px] leading-[1.7] text-secondary">
              {business.postalCode}
              <br />
              {business.address}
              <br />
              {business.phone}
            </address>

            <ul className="mt-4 flex flex-col gap-1 text-[14px] text-muted">
              {access.transitDirections.map((direction) => (
                <li key={direction.id}>{direction.label}</li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayMs={120}>
            <p className="text-[14px] tracking-[0.01em] text-accent">営業時間</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[16px]">
              {HOURS_DAY_ORDER.map((day) => (
                <div key={day} className="contents">
                  <dt className="text-secondary">{HOURS_DAY_LABELS[day]}</dt>
                  <dd className="text-primary">{formatHours(hours[day])}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
