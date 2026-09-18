import { ApiActionResult } from "@/types/reservation";

/**
 * Shared "POST an action, parse the envelope" primitive through the
 * `/api/gas` proxy (`app/api/gas/route.ts`) — every browser-initiated GAS
 * action (reservation, availability, inquiry, ...) builds on this one
 * function so the request/error-envelope shape can never drift between
 * them. Extracted from `reservationClient.ts` (Phase 5) when
 * `inquiryClient.ts` needed the identical primitive.
 */
export async function callGasApiAction<T>(action: string, payload?: unknown): Promise<ApiActionResult<T>> {
  let response: Response;
  try {
    response = await fetch("/api/gas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload === undefined ? JSON.stringify({ action }) : JSON.stringify({ action, payload }),
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

  return parsed as ApiActionResult<T>;
}
