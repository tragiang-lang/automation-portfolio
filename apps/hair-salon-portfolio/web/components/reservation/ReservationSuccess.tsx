/** Final wizard state on success (spec §16/§17). `needsConfirmation` is
 *  the one success sub-case where `Api.ts::resolveCreateReservationResponse`
 *  did NOT send the customer a confirmation email (only the owner is
 *  notified — `Api.ts::sendReservationEmailsForOutcome`) — this copy must
 *  not claim otherwise. Both cases are still a real, accepted reservation,
 *  never demoted to a generic failure message (spec §17). */
export function ReservationSuccess({
  reservationId,
  needsConfirmation,
}: {
  reservationId: string;
  needsConfirmation?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" className="rounded-sm border border-border bg-surface p-8 text-center">
      <p className="text-[20px] font-medium text-primary">ご予約ありがとうございます</p>
      <p className="mt-2 text-[15px] leading-[1.7] text-secondary">ご予約を受け付けました。</p>
      <p className="mt-4 text-[14px] text-muted">予約番号</p>
      <p className="text-[18px] font-medium text-primary">{reservationId}</p>
      <p className="mt-4 text-[14px] leading-[1.7] text-secondary">
        {needsConfirmation
          ? "内容を確認の上、担当より必要に応じてご連絡いたします。"
          : "ご登録のメールアドレスへ確認メールをお送りしました。"}
      </p>
    </div>
  );
}
