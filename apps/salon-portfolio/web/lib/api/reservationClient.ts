import {
  ApiActionResult,
  AvailabilityRequest,
  GetAvailabilityResult,
  PublicService,
  PublicStaff,
  ReservationSubmission,
  ReservationSubmissionResult,
  ReservationSubmissionSuccess,
} from "@/types/reservation";

/**
 * Client-safe wrapper for every browser-initiated GAS action this
 * reservation flow needs, through the existing `/api/gas` proxy (Phase 3B
 * `app/api/gas/route.ts`) — this file may be imported from a Client
 * Component; it never touches `GAS_WEBAPP_URL` directly (that stays inside
 * the server-only `lib/api/gasClient.ts`, reached only via the Next.js
 * route handler). `callAction` is the one shared "POST an action, parse
 * the envelope" primitive every exported function below builds on — added
 * in Phase 5 alongside `getServices`/`getStaff`/`getAvailability`;
 * `submitReservation` (Phase 4) is reimplemented on top of it with an
 * unchanged external signature and JSON request body.
 */
async function callAction<T>(action: string, payload?: unknown): Promise<ApiActionResult<T>> {
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

/** Building an actual reservation form/wizard UI around this function was
 *  out of scope for Phase 4 — Phase 5 is exactly that UI. */
export async function submitReservation(
  submission: ReservationSubmission,
): Promise<ReservationSubmissionResult> {
  return callAction<ReservationSubmissionSuccess>("createReservation", submission) as Promise<ReservationSubmissionResult>;
}

/** Public menu/service catalog for the reservation picker (Phase 5) — only
 *  active services, no price/duration override accepted from the browser
 *  on submit (Api.ts's `createReservation` always re-resolves these
 *  server-side regardless of what this call returned). */
export async function getServices(): Promise<ApiActionResult<PublicService[]>> {
  return callAction<PublicService[]>("getServices");
}

/** Public staff catalog for the reservation picker (Phase 5). Empty when
 *  `features.staffSelection` is off — not an error. */
export async function getStaff(): Promise<ApiActionResult<PublicStaff[]>> {
  return callAction<PublicStaff[]>("getStaff");
}

/** Advisory availability for one service/staff/date (Phase 5) — UX only.
 *  `createReservation`'s own re-check under `LockService` remains the only
 *  authoritative check; a slot listed here can still be lost to a race. */
export async function getAvailability(
  request: AvailabilityRequest,
): Promise<ApiActionResult<GetAvailabilityResult>> {
  return callAction<GetAvailabilityResult>("getAvailability", request);
}
