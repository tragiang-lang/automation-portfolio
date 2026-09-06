import { ReservationSubmission, ReservationSubmissionResult } from "@/types/reservation";

/**
 * Client-safe wrapper for submitting a reservation through the existing
 * `/api/gas` proxy (Phase 3B `app/api/gas/route.ts`) — this file may be
 * imported from a Client Component; it never touches `GAS_WEBAPP_URL`
 * directly (that stays inside the server-only `lib/api/gasClient.ts`,
 * reached only via the Next.js route handler). Building an actual
 * reservation form/wizard UI around this function is out of scope for
 * Phase 4 (see docs/reservation-transaction-architecture.md) — this
 * establishes the wiring only.
 */
export async function submitReservation(
  submission: ReservationSubmission,
): Promise<ReservationSubmissionResult> {
  let response: Response;
  try {
    response = await fetch("/api/gas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createReservation", payload: submission }),
    });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "サーバーに接続できませんでした。" } };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { ok: false, error: { code: "INVALID_RESPONSE", message: "サーバーからの応答を処理できませんでした。" } };
  }

  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { ok?: unknown }).ok !== "boolean") {
    return { ok: false, error: { code: "INVALID_RESPONSE", message: "サーバーからの応答を処理できませんでした。" } };
  }

  return parsed as ReservationSubmissionResult;
}
