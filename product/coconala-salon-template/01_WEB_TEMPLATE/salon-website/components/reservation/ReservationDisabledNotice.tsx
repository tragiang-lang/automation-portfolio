import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Shown at `/reservation` when `features.reservation` is off (spec §19)
 *  — no API call is attempted in this state (the page never renders
 *  `ReservationWizard` when this is shown, see `app/reservation/page.tsx`). */
export function ReservationDisabledNotice() {
  return (
    <Container className="py-24 text-center">
      <SectionHeading eyebrow="Reservation" title="ご予約について" align="center" />
      <p className="mx-auto mt-6 max-w-[480px] text-[15px] leading-[1.8] text-secondary">
        現在、ご予約の受付を停止しております。お手数をおかけしますが、お電話にてお問い合わせください。
      </p>
    </Container>
  );
}
