"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cancelReservation } from "@/lib/api/reservationClient";

export interface CancelReservationDetails {
  reservationId: string;
  cancellationToken: string;
  date?: string;
  time?: string;
  serviceName?: string;
}

/**
 * Self-service cancellation confirm screen (focused implementation — no
 * `CANCELLATION_REQUESTS` approval workflow, no cancellation emails).
 * Never cancels on mount: a destructive action always needs an explicit
 * confirmation click describing the consequence, not just a "are you
 * sure?" (UI/UX standard). `cancelReservation` already treats an
 * already-cancelled reservation as an idempotent success, so a customer
 * following a stale/reused link never sees a confusing error for that
 * case specifically.
 */
export function CancelReservationView({ details }: { details: CancelReservationDetails }) {
  const [status, setStatus] = useState<"idle" | "cancelling" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    setStatus("cancelling");
    setErrorMessage(null);
    const result = await cancelReservation({
      reservationId: details.reservationId,
      cancellationToken: details.cancellationToken,
    });
    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(result.error.message);
    }
  }

  if (status === "success") {
    return (
      <div role="status" aria-live="polite" className="rounded-sm border border-border bg-surface p-8 text-center">
        <p className="text-[20px] font-medium text-primary">ご予約をキャンセルしました</p>
        <p className="mt-2 text-[15px] leading-[1.7] text-secondary">またのご利用を心よりお待ちしております。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-sm border border-border bg-surface p-8">
      <div>
        <p className="text-[16px] font-medium text-primary">以下のご予約をキャンセルします。</p>
        {details.serviceName || details.date || details.time ? (
          <dl className="mt-4 flex flex-col gap-1 text-[14px] text-secondary">
            {details.serviceName ? (
              <div>
                <dt className="inline text-muted">メニュー: </dt>
                <dd className="inline">{details.serviceName}</dd>
              </div>
            ) : null}
            {details.date ? (
              <div>
                <dt className="inline text-muted">日付: </dt>
                <dd className="inline">{details.date}</dd>
              </div>
            ) : null}
            {details.time ? (
              <div>
                <dt className="inline text-muted">時間: </dt>
                <dd className="inline">{details.time}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
      <p className="text-[14px] leading-[1.7] text-error">
        キャンセルすると元に戻すことはできません。よろしいですか？
      </p>
      {status === "error" && errorMessage ? (
        <p role="alert" className="text-[14px] text-error">
          {errorMessage}
        </p>
      ) : null}
      <Button type="button" variant="primary" onClick={handleConfirm} disabled={status === "cancelling"}>
        {status === "cancelling" ? "処理中…" : "この予約をキャンセルする"}
      </Button>
    </div>
  );
}
