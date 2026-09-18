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
import { callGasApiAction as callAction } from "@/lib/api/apiActionClient";

/**
 * Client-safe wrapper for every browser-initiated GAS action this
 * reservation flow needs, through the existing `/api/gas` proxy (Phase 3B
 * `app/api/gas/route.ts`) — this file may be imported from a Client
 * Component; it never touches `GAS_WEBAPP_URL` directly (that stays inside
 * the server-only `lib/api/gasClient.ts`, reached only via the Next.js
 * route handler). `callAction` (`lib/api/apiActionClient.ts`'s
 * `callGasApiAction`) is the one shared "POST an action, parse the
 * envelope" primitive every exported function below builds on — extracted
 * to its own module when `inquiryClient.ts` needed the identical
 * primitive (Starter MVP reusability).
 */

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
