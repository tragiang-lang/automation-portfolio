/**
 * Typed Site Report workflow functions (Task 7) — the only place that
 * should know the two real GAS action names. Both functions are thin:
 * they build the exact payload the GAS contract expects and delegate
 * everything else (fetch, envelope parsing, error codes) to
 * `callSiteReportAction` (`lib/api/siteReportClient.ts`). No HTTP/fetch/
 * envelope logic is duplicated here.
 *
 * Deliberately does not initialize LIFF and does not read/import
 * `lib/liff.ts` — LIFF (authentication/profile) and this workflow layer
 * (transport-level actions) are separate boundaries; a future UI/
 * application layer is what combines a `SiteReportLiffUser` with these
 * functions (e.g. passing `profile.userId` as `SubmitReportInput.
 * lineUserId`).
 */

import { callSiteReportAction } from "./siteReportClient";
import type { SiteReportClientResult } from "./siteReportClient";
import { SITE_REPORT_ACTIONS } from "@/types/api";
import type { GetSitesResponseData, SubmitReportInput, SubmitReportResponseData } from "@/types/api";

/**
 * Calls `GET_SITES`. The actual GAS handler (`apps/site-report/gas/src/
 * Api.ts`'s `getSitesAction()`) takes no arguments and never reads a
 * payload — confirmed by inspecting the GAS source, not assumed — so
 * this function accepts no parameters and sends an empty payload. There
 * is no userId/authentication field to validate client-side because the
 * contract has none.
 */
export function getSites(): Promise<SiteReportClientResult<GetSitesResponseData>> {
  return callSiteReportAction<GetSitesResponseData>(SITE_REPORT_ACTIONS.GET_SITES, {});
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
  return callSiteReportAction<SubmitReportResponseData>(SITE_REPORT_ACTIONS.SUBMIT_REPORT, input);
}
