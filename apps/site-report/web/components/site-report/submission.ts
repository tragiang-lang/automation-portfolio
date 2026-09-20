import type { Site, SubmitReportResponseData } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";
import { submitReport as submitReportWorkflow } from "@/lib/api/siteReportWorkflows";
import { buildSubmitReportInput } from "./submitReportMapper";
import type { ReportDraft } from "./reportDraft";

/**
 * Submission state machine (Task 11 §11) — an explicit discriminated
 * union rather than several loosely-related booleans (`isSubmitting`/
 * `isSuccess`/`hasError`), so no combination can become contradictory.
 * `success.result` is `SubmitReportResponseData` exactly as `Api.ts`/
 * `types/api.ts` define it (`{ reportId, photoCount, notificationSent }`)
 * — no field invented.
 */
export type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; result: SubmitReportResponseData }
  | { status: "error"; message: string };

export const IDLE_SUBMISSION_STATE: SubmissionState = { status: "idle" };

/** Shown only when `site`/`profile` are unexpectedly missing (Task 11
 *  §24) — currently unreachable through `SiteReportScreen`'s own state
 *  machine, since its `report-entry` variant's types already guarantee
 *  both are present; this is an invariant guard for any future caller of
 *  `submitReportDraft`, not a replacement for that type guarantee. */
const MISSING_CONTEXT_ERROR_MESSAGE =
  "レポートを送信できませんでした。現場を選び直すか、もう一度ログインしてください。";

/** Shown when `submit` rejects (network failure, `GAS_WEBAPP_URL` not
 *  configured, etc.) rather than resolving with `{ ok: false, ... }` —
 *  the raw error/stack is never shown to the user (Task 11 §19). */
const UNEXPECTED_ERROR_MESSAGE = "レポートの送信に失敗しました。もう一度お試しください。";

/**
 * Combines the pure mapper with the existing `submitReport` workflow
 * function and turns the outcome into a `SubmissionState`. Everything
 * that can fail — a missing context guard, an `{ ok: false }` API
 * response, or an unexpected rejection — resolves to `{ status: "error" }`
 * rather than throwing, so a caller (`SiteReportScreen`) never needs its
 * own try/catch around this.
 *
 * `submit` is injectable (defaults to the real workflow function) purely
 * so this can be unit-tested without mocking module resolution — the real
 * call path is still exactly `SiteReportScreen -> submitReportDraft ->
 * lib/api/siteReportWorkflows.submitReport -> siteReportClient ->
 * fetch`, never a direct `fetch`/`callSiteReportAction` from a component
 * (Task 11 §31).
 */
export async function submitReportDraft({
  site,
  profile,
  draft,
  submit = submitReportWorkflow,
}: {
  site: Site | null | undefined;
  profile: SiteReportLiffUser | null | undefined;
  draft: ReportDraft;
  submit?: typeof submitReportWorkflow;
}): Promise<SubmissionState> {
  if (!site || !profile) {
    return { status: "error", message: MISSING_CONTEXT_ERROR_MESSAGE };
  }

  const input = buildSubmitReportInput({ site, profile, draft });

  try {
    const result = await submit(input);
    if (!result.ok) {
      return { status: "error", message: result.error.message };
    }
    return { status: "success", result: result.data };
  } catch {
    return { status: "error", message: UNEXPECTED_ERROR_MESSAGE };
  }
}
