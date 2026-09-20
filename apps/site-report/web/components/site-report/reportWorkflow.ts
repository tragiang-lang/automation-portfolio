/**
 * Phase 3 report workflow state machine. Deliberately a tiny pure reducer
 * over an explicit union rather than scattered booleans
 * (isConfirming/isSubmitted/...) that could represent an impossible
 * combination.
 *
 * Kept separate from `submission.ts`'s `SubmissionState` (idle/submitting/
 * error/success), which continues to describe the transient network
 * request — this type only describes which screen is shown and whether
 * the draft is still editable. See docs/superpowers/specs/
 * 2026-09-16-site-report-phase3-design.md §2 for why the two are not
 * merged.
 *
 * `CONFIRMING` is client-side UI state only (spec §4) — no backend call is
 * made or implied by any transition here except the caller's own submit
 * action between SUBMIT_SUCCESS/SUBMIT_FAILURE.
 */
export type ReportWorkflowState = "DRAFT" | "CONFIRMING" | "SUBMITTED";

export type WorkflowEvent =
  | { type: "CONFIRM" }
  | { type: "BACK" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_FAILURE" };

/**
 * Applies `event` to `state`. Any pairing not in the table below (most
 * importantly, every event applied to `SUBMITTED`) is a no-op that returns
 * `state` unchanged — matching the existing "ignore invalid transitions,
 * never throw" convention already used by SiteReportScreen.tsx's own
 * setState updater functions. Callers that need to gate whether a
 * transition is *allowed* (e.g. only calling CONFIRM after client
 * validation passes) do that check before calling this function; this
 * function itself has no side effects and never validates the draft.
 */
export function transitionWorkflow(state: ReportWorkflowState, event: WorkflowEvent): ReportWorkflowState {
  switch (state) {
    case "DRAFT":
      return event.type === "CONFIRM" ? "CONFIRMING" : state;
    case "CONFIRMING":
      if (event.type === "BACK") return "DRAFT";
      if (event.type === "SUBMIT_SUCCESS") return "SUBMITTED";
      if (event.type === "SUBMIT_FAILURE") return "DRAFT";
      return state;
    case "SUBMITTED":
      return state;
  }
}
