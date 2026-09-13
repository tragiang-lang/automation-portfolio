/**
 * Thin server-only client for calling the Site Report GAS backend's
 * single-action endpoint. A deliberate port of
 * apps/salon-portfolio/web/lib/api/gasClient.ts's established behavior
 * (Task 6 design) — same envelope, same error codes, same fetch/parse
 * shape — reused rather than reinvented.
 *
 * Never import this file from a Client Component: `GAS_WEBAPP_URL` is
 * deliberately NOT prefixed with `NEXT_PUBLIC_`, so it does not exist in
 * browser bundles at all — reading it here only works in server code
 * (Route Handlers, Server Components, Server Actions). This is the
 * opposite boundary from `lib/liff.ts`'s `NEXT_PUBLIC_LIFF_ID`, which
 * must be public because the LIFF SDK runs in the browser.
 *
 * The only caller is `app/api/site-report/route.ts` — the Route Handler
 * proxy the browser reaches via `fetch("/api/site-report")`
 * (`lib/api/siteReportWorkflows.ts`'s `getSites()`/`submitReport()`).
 * That boundary was missing through Task 11: `siteReportWorkflows.ts`
 * called `callSiteReportAction` directly and was itself imported by the
 * "use client" `SiteReportScreen.tsx`, which meant this server-only file
 * was reachable from client-bundled code. Fixed by routing the workflow
 * functions through the Route Handler instead of this module.
 */

import type { SiteReportAction, SiteReportApiResponse } from "@/types/api";

export interface SiteReportClientSuccess<T> {
  ok: true;
  data: T;
}

export interface SiteReportClientFailure {
  ok: false;
  error: { code: string; message: string };
}

export type SiteReportClientResult<T> = SiteReportClientSuccess<T> | SiteReportClientFailure;

function failure(code: string, message: string): SiteReportClientFailure {
  return { ok: false, error: { code, message } };
}

/** True only for a plausible `{ ok: boolean, ... }` envelope — the same
 *  shape the GAS backend's `ApiResponse<T>` always produces (`Api.ts`).
 *  Does not validate `data`'s inner shape; callers validate that
 *  themselves. */
function isApiEnvelope(value: unknown): value is { ok: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/**
 * Calls one Site Report GAS action via its single-endpoint contract:
 * `POST { action, payload } -> { ok, data } | { ok: false, error }`.
 *
 * Requires `GAS_WEBAPP_URL` to already be set — a caller that needs a
 * fallback checks that env var itself before calling this, so this
 * function stays a single-responsibility "talk to GAS" primitive.
 */
export async function callSiteReportAction<T>(
  action: SiteReportAction | string,
  payload: unknown = {},
): Promise<SiteReportClientResult<T>> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    throw new Error("GAS_WEBAPP_URL is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    return failure("NETWORK_ERROR", `Failed to reach GAS: ${message}`);
  }

  if (!response.ok) {
    return failure("HTTP_ERROR", `GAS responded with HTTP ${response.status}.`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return failure("INVALID_RESPONSE", "GAS response was not valid JSON.");
  }

  if (!isApiEnvelope(parsed)) {
    return failure("INVALID_RESPONSE", "GAS response did not match the expected envelope.");
  }

  return parsed as SiteReportClientResult<T>;
}

// Re-exported for callers that want the raw envelope type name.
export type { SiteReportApiResponse };
