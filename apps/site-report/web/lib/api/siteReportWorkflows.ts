/**
 * Typed Site Report workflow functions (Task 7) — the only place that
 * should know the two real GAS action names. Both functions are thin:
 * they build the exact payload the GAS contract expects and delegate
 * everything else (fetch, envelope parsing, error codes) to `callSiteReportRoute`
 * below, which POSTs to the same-origin `/api/site-report` Route Handler
 * (`app/api/site-report/route.ts`).
 *
 * This file is imported directly by the "use client" `SiteReportScreen.tsx`
 * (`getSites`) and, via `components/site-report/submission.ts`, by
 * `submitReport` — so it must never import the server-only
 * `lib/api/siteReportClient.ts` (which reads `process.env.GAS_WEBAPP_URL`)
 * at the module/runtime level. `callSiteReportRoute` is a deliberate port
 * of apps/salon-portfolio/web/lib/api/reservationClient.ts's `callAction`
 * — same "fetch the proxy route, parse the envelope" shape — reused rather
 * than reinvented; `siteReportClient.ts`'s `SiteReportClientResult` type is
 * imported with `import type` only, which TypeScript/SWC erase entirely at
 * compile time, so no runtime reference to that server-only module reaches
 * the client bundle.
 *
 * Deliberately does not initialize LIFF and does not read/import
 * `lib/liff.ts` — LIFF (authentication/profile) and this workflow layer
 * (transport-level actions) are separate boundaries; a future UI/
 * application layer is what combines a `SiteReportLiffUser` with these
 * functions (e.g. passing `profile.userId` as `SubmitReportInput.
 * lineUserId`).
 */

import type { SiteReportClientResult } from "./siteReportClient";
import { SITE_REPORT_ACTIONS } from "@/types/api";
import type {
  GetSitesResponseData,
  GetWorkTypesResponseData,
  SiteReportAction,
  SubmitReportInput,
  SubmitReportResponseData,
} from "@/types/api";

function failure(code: string, message: string): SiteReportClientResult<never> {
  return { ok: false, error: { code, message } };
}

/** True only for a plausible `{ ok: boolean, ... }` envelope — the same
 *  shape `/api/site-report` always returns (it forwards GAS's own
 *  `ApiResponse<T>` shape unchanged). Does not validate `data`'s inner
 *  shape; callers validate that themselves. */
function isApiEnvelope(value: unknown): value is { ok: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/**
 * POSTs `{ action, payload }` to the same-origin `/api/site-report` proxy
 * and parses the response envelope — the browser-safe counterpart to
 * `siteReportClient.ts`'s `callSiteReportAction`, which this same request
 * eventually reaches server-side. Never reads `GAS_WEBAPP_URL` and never
 * throws: every failure mode (network, HTTP, malformed JSON) resolves to a
 * `{ ok: false, error }` envelope instead, matching `callAction` in
 * `apps/salon-portfolio/web/lib/api/reservationClient.ts`.
 */
async function callSiteReportRoute<T>(
  action: SiteReportAction,
  payload: unknown,
): Promise<SiteReportClientResult<T>> {
  let response: Response;
  try {
    response = await fetch("/api/site-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    return failure("NETWORK_ERROR", `Failed to reach /api/site-report: ${message}`);
  }

  if (!response.ok) {
    return failure("HTTP_ERROR", `/api/site-report responded with HTTP ${response.status}.`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return failure("INVALID_RESPONSE", "/api/site-report response was not valid JSON.");
  }

  if (!isApiEnvelope(parsed)) {
    return failure("INVALID_RESPONSE", "/api/site-report response did not match the expected envelope.");
  }

  return parsed as SiteReportClientResult<T>;
}

/**
 * Calls `GET_SITES`. The actual GAS handler (`apps/site-report/gas/src/
 * Api.ts`'s `getSitesAction()`) takes no arguments and never reads a
 * payload — confirmed by inspecting the GAS source, not assumed — so
 * this function accepts no parameters and sends an empty payload. There
 * is no userId/authentication field to validate client-side because the
 * contract has none.
 */
export function getSites(): Promise<SiteReportClientResult<GetSitesResponseData>> {
  return callSiteReportRoute<GetSitesResponseData>(SITE_REPORT_ACTIONS.GET_SITES, {});
}

/**
 * Calls `GET_WORK_TYPES`. Same shape as `getSites()` above — the GAS
 * handler takes no payload.
 */
export function getWorkTypes(): Promise<SiteReportClientResult<GetWorkTypesResponseData>> {
  return callSiteReportRoute<GetWorkTypesResponseData>(SITE_REPORT_ACTIONS.GET_WORK_TYPES, {});
}

/**
 * Calls `SUBMIT_REPORT` with `input` passed through unchanged as the
 * request payload — the exact shape `apps/site-report/gas/src/Api.ts`'s
 * `submitReportAction(rawPayload)` expects. No field is added, renamed,
 * or transformed; TypeScript's `SubmitReportInput` type is the only
 * client-side structural check. Runtime business validation
 * (`SubmitReportService.parseSubmitReportInput`) stays authoritative on
 * the GAS side, not duplicated here.
 */
export function submitReport(
  input: SubmitReportInput,
): Promise<SiteReportClientResult<SubmitReportResponseData>> {
  return callSiteReportRoute<SubmitReportResponseData>(SITE_REPORT_ACTIONS.SUBMIT_REPORT, input);
}
