import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CancelReservationView } from "@/components/reservation/CancelReservationView";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Self-service reservation cancellation page, reached via the token link
 * `gas/src/Api.ts::buildCancellationUrl` puts in every confirmation email
 * (`?reservationId=...&token=...&date=...&time=...&service=...`). All
 * interactive behavior lives in `CancelReservationView` (Client
 * Component) — this Server Component only validates the two required
 * query params are present before rendering it.
 */
export default async function ReservationCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const reservationId = firstValue(params.reservationId);
  const token = firstValue(params.token);

  if (!reservationId || !token) {
    return (
      <main className="flex flex-1 flex-col">
        <Container className="py-16 lg:py-24">
          <SectionHeading eyebrow="Reservation" title="予約のキャンセル" />
          <div className="mt-10 max-w-[640px]">
            <p role="alert" className="text-[14px] leading-[1.7] text-error">
              キャンセル用のリンクが正しくありません。お手数ですが、予約確認メールのリンクからもう一度お試しください。
            </p>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <Container className="py-16 lg:py-24">
        <SectionHeading eyebrow="Reservation" title="予約のキャンセル" />
        <div className="mt-10 max-w-[640px]">
          <CancelReservationView
            details={{
              reservationId,
              cancellationToken: token,
              date: firstValue(params.date),
              time: firstValue(params.time),
              serviceName: firstValue(params.service),
            }}
          />
        </div>
      </Container>
    </main>
  );
}
