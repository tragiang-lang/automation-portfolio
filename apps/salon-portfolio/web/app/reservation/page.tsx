import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ReservationWizard } from "@/components/reservation/ReservationWizard";
import { ReservationDisabledNotice } from "@/components/reservation/ReservationDisabledNotice";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";

function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function todayInTokyo(): string {
  // Asia/Tokyo has no DST — a fixed +9h offset from UTC is always correct.
  const now = new Date();
  const tokyoNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return tokyoNow.toISOString().slice(0, 10);
}

/**
 * Reservation page (Phase 5, replacing the Phase 3C placeholder). Server
 * Component: gates on `features.reservation` (spec §19 — no API call is
 * attempted at all when the feature is off) and derives the date picker's
 * min/max bounds from `reservation.minLeadHours`/`maxBookingDays` (advisory
 * UX bounds only — `getAvailability`/`createReservation` remain
 * authoritative, Global Constraints). `ReservationWizard` itself is a
 * Client Component for interactivity.
 */
export default async function ReservationPage() {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);

  if (!siteConfig.features.reservation) {
    return (
      <main className="flex flex-1 flex-col">
        <ReservationDisabledNotice />
      </main>
    );
  }

  const today = todayInTokyo();
  const minDate = config.reservation.minLeadHours >= 24 ? addDaysToDateString(today, 1) : today;
  const maxDate = addDaysToDateString(today, config.reservation.maxBookingDays);

  return (
    <main className="flex flex-1 flex-col">
      <Container className="py-16 lg:py-24">
        <SectionHeading eyebrow="Reservation" title="ご予約" />
        <div className="mt-10 max-w-[640px]">
          <ReservationWizard minDate={minDate} maxDate={maxDate} />
        </div>
      </Container>
    </main>
  );
}
