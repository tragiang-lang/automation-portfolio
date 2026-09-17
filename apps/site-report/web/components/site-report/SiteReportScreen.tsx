"use client";

/**
 * Task 8 — LIFF site-selection & report-entry-shell screen.
 *
 * Owns UI/application orchestration only:
 *   initializeSiteReportLiff() -> login-required / error / ready
 *                                          -> getSites()+getWorkTypes() -> loading / error / empty / list
 *                                                                  -> site selected -> report-entry shell
 *                                                                                        -> submit (Task 11)
 *
 * Deliberately does not call `liff.*` or `fetch` directly, and does not
 * import `@line/liff` — it consumes only the public abstractions from
 * `lib/liff.ts` (`initializeSiteReportLiff`/`loginToSiteReport`) and
 * `lib/api/siteReportWorkflows.ts` (indirectly, via `submission.ts`'s
 * `submitReportDraft` for submission — see that file's own header
 * comment for why the extra indirection exists and why it still counts
 * as "through the workflow layer").
 */
import { useCallback, useEffect, useState } from "react";
import { initializeSiteReportLiff, loginToSiteReport } from "@/lib/liff";
import { getSites, getWorkTypes, getProgressStatuses } from "@/lib/api/siteReportWorkflows";
import type { LiffError, SiteReportLiffUser } from "@/types/liff";
import type { ProgressStatus, Site, WorkType } from "@/types/api";
import { SitePicker } from "./SitePicker";
import { ReportEntryShell, type DraftNoticeState } from "./ReportEntryShell";
import { createInitialReportDraft, type ReportDraft } from "./reportDraft";
import { validateReportDraft } from "./reportValidation";
import { IDLE_SUBMISSION_STATE, submitReportDraft, type SubmissionState } from "./submission";
import { transitionWorkflow, type ReportWorkflowState } from "./reportWorkflow";
import {
  clearDraft,
  decideDraftRestore,
  draftToReportDraftFields,
  loadRawDraft,
  saveDraft,
  type SiteReportDraftV1,
} from "./reportDraftStorage";
import styles from "./site-report.module.css";

type FormOptionsError = { code: string; message: string };

type ScreenState =
  | { status: "liff-loading" }
  | { status: "login-required" }
  | { status: "liff-error"; error: LiffError }
  | { status: "options-loading"; profile: SiteReportLiffUser }
  | { status: "options-error"; profile: SiteReportLiffUser; error: FormOptionsError }
  | { status: "sites-empty"; profile: SiteReportLiffUser }
  | { status: "site-selection"; profile: SiteReportLiffUser; sites: Site[]; workTypes: WorkType[]; progressStatuses: ProgressStatus[] }
  | {
      status: "report-entry";
      profile: SiteReportLiffUser;
      sites: Site[];
      workTypes: WorkType[];
      progressStatuses: ProgressStatus[];
      selectedSite: Site;
      draft: ReportDraft;
      /** Phase 3 — DRAFT/CONFIRMING/SUBMITTED. Always "DRAFT" the moment
       *  this variant is (re-)entered (single-site auto-advance, an
       *  explicit site pick, a confirmed cross-site restore, or
       *  handleCreateAnother's fresh start) — see docs/superpowers/specs/
       *  2026-09-16-site-report-phase3-design.md §2. */
      workflowState: ReportWorkflowState;
      /** Task 11 — result of the most recent submit attempt, or idle if
       *  none has happened yet for this draft/site selection. */
      submission: SubmissionState;
      /** Task 11 §13 — once a submit has been attempted, `ReportForm`
       *  shows every invalid field's error immediately (not just fields
       *  the user has individually blurred). Sticky for the rest of this
       *  report-entry visit once set, matching common form UX. */
      submitAttempted: boolean;
      /** Phase 2 — what to tell the user about a candidate localStorage
       *  draft for this visit. */
      draftNotice: DraftNoticeState;
      /** Phase 2 — set only while draftNotice is "cross-site"; the full
       *  stored draft, held until the user confirms or discards it. */
      pendingCrossSiteDraft: SiteReportDraftV1 | null;
    };

const GENERIC_OPTIONS_ERROR: FormOptionsError = {
  code: "LOAD_FORM_OPTIONS_FAILED",
  message: "現場一覧の取得に失敗しました。もう一度お試しください。",
};

/** Phase 2 spec §21 — computes the draft/notice/pending-draft trio for a
 *  freshly entered "report-entry" state, whichever path got there (single-
 *  site auto-advance, explicit site pick, or a confirmed cross-site
 *  restore). Reads localStorage once via loadRawDraft(); every other
 *  argument is already in memory, so this never triggers a network call. */
function resolveReportEntryDraftState(
  profile: SiteReportLiffUser,
  sites: Site[],
  selectedSite: Site,
): { draft: ReportDraft; draftNotice: DraftNoticeState; pendingCrossSiteDraft: SiteReportDraftV1 | null } {
  const initialDraft = createInitialReportDraft(profile);
  const activeSiteIds = new Set(sites.map((site) => site.siteId));
  const decision = decideDraftRestore({
    raw: loadRawDraft(),
    currentLineUserId: profile.userId,
    currentSiteId: selectedSite.siteId,
    activeSiteIds,
  });
  switch (decision.action) {
    case "none":
      return { draft: initialDraft, draftNotice: { kind: "none" }, pendingCrossSiteDraft: null };
    case "discard":
      clearDraft();
      return { draft: initialDraft, draftNotice: { kind: "none" }, pendingCrossSiteDraft: null };
    case "auto-restore":
      return {
        draft: { ...initialDraft, ...draftToReportDraftFields(decision.draft) },
        draftNotice: { kind: "restored" },
        pendingCrossSiteDraft: null,
      };
    case "offer-cross-site-restore": {
      const siteName = sites.find((site) => site.siteId === decision.draft.siteId)?.name ?? decision.draft.siteId;
      return {
        draft: initialDraft,
        draftNotice: { kind: "cross-site", siteName },
        pendingCrossSiteDraft: decision.draft,
      };
    }
  }
}

export function SiteReportScreen() {
  const [state, setState] = useState<ScreenState>({ status: "liff-loading" });

  // Phase 1 P0: GET_SITES and GET_WORK_TYPES load in parallel — neither
  // depends on the other's result, and this app is a mobile/LIFF workflow
  // where a serial round-trip pair would double the wait on a slow job-site
  // connection. Either failing shows the same error/retry UI; both are
  // re-requested together on retry.
  const loadFormOptions = useCallback((profile: SiteReportLiffUser) => {
    setState({ status: "options-loading", profile });
    Promise.all([getSites(), getWorkTypes(), getProgressStatuses()])
      .then(([sitesResult, workTypesResult, progressStatusesResult]) => {
        if (!sitesResult.ok) {
          setState({ status: "options-error", profile, error: sitesResult.error });
          return;
        }
        if (!workTypesResult.ok) {
          setState({ status: "options-error", profile, error: workTypesResult.error });
          return;
        }
        if (!progressStatusesResult.ok) {
          setState({ status: "options-error", profile, error: progressStatusesResult.error });
          return;
        }
        const { sites } = sitesResult.data;
        const { workTypes } = workTypesResult.data;
        const { progressStatuses } = progressStatusesResult.data;
        if (sites.length === 0) {
          setState({ status: "sites-empty", profile });
        } else if (sites.length === 1) {
          // Phase 1 P0: exactly one ACTIVE site auto-advances — the user
          // can still change it via ReportEntryShell's 現場を変更, which
          // returns to "site-selection" without refetching.
          const { draft, draftNotice, pendingCrossSiteDraft } = resolveReportEntryDraftState(profile, sites, sites[0]);
          setState({
            status: "report-entry",
            profile,
            sites,
            workTypes,
            progressStatuses,
            selectedSite: sites[0],
            draft,
            workflowState: "DRAFT",
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
            draftNotice,
            pendingCrossSiteDraft,
          });
        } else {
          setState({ status: "site-selection", profile, sites, workTypes, progressStatuses });
        }
      })
      .catch(() => {
        setState({ status: "options-error", profile, error: GENERIC_OPTIONS_ERROR });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    initializeSiteReportLiff().then((liffState) => {
      if (cancelled) {
        return;
      }
      if (liffState.status === "login-required") {
        setState({ status: "login-required" });
      } else if (liffState.status === "error") {
        setState({ status: "liff-error", error: liffState.error });
      } else if (liffState.status === "ready") {
        loadFormOptions(liffState.profile);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadFormOptions]);

  const handleLogin = useCallback(() => {
    // loginToSiteReport() redirects the browser to LINE login on success;
    // a rejection here means the redirect never started (e.g. called
    // outside the browser) and is safe to ignore — the user simply stays
    // on this screen (Task 8 §4).
    loginToSiteReport().catch(() => {});
  }, []);

  const handleSelectSite = useCallback((site: Site) => {
    setState((prev) => {
      if (prev.status !== "site-selection") {
        return prev;
      }
      const { draft, draftNotice, pendingCrossSiteDraft } = resolveReportEntryDraftState(prev.profile, prev.sites, site);
      return {
        status: "report-entry",
        profile: prev.profile,
        sites: prev.sites,
        workTypes: prev.workTypes,
        progressStatuses: prev.progressStatuses,
        selectedSite: site,
        draft,
        workflowState: "DRAFT",
        submission: IDLE_SUBMISSION_STATE,
        submitAttempted: false,
        draftNotice,
        pendingCrossSiteDraft,
      };
    });
  }, []);

  // Phase 1 P0: returns to the dropdown without refetching GET_SITES/
  // GET_WORK_TYPES — sites/workTypes are already in memory from the
  // report-entry state being left.
  const handleChangeSite = useCallback(() => {
    setState((prev) =>
      prev.status === "report-entry"
        ? {
            status: "site-selection",
            profile: prev.profile,
            sites: prev.sites,
            workTypes: prev.workTypes,
            progressStatuses: prev.progressStatuses,
          }
        : prev,
    );
  }, []);

  const handleDraftChange = useCallback((draft: ReportDraft) => {
    setState((prev) => (prev.status === "report-entry" ? { ...prev, draft } : prev));
  }, []);

  // Phase 2 spec §21 Case 5 confirm: switch to the draft's site, then
  // restore its fields — never applied to the currently selected
  // different site first.
  const handleRestoreCrossSiteDraft = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "report-entry" || !prev.pendingCrossSiteDraft) {
        return prev;
      }
      const pending = prev.pendingCrossSiteDraft;
      const targetSite = prev.sites.find((site) => site.siteId === pending.siteId);
      if (!targetSite) {
        return prev; // defensive — decideDraftRestore already checked activeSiteIds
      }
      return {
        ...prev,
        selectedSite: targetSite,
        draft: { ...createInitialReportDraft(prev.profile), ...draftToReportDraftFields(pending) },
        draftNotice: { kind: "restored" },
        pendingCrossSiteDraft: null,
      };
    });
  }, []);

  // Phase 2 — 破棄 for either notice kind: always clears localStorage;
  // "restored" additionally resets the just-restored form back to fresh
  // (the user is discarding the restored content itself), "cross-site"
  // only hides the notice and leaves the current site/form untouched
  // (spec §21 Case 5's discard branch).
  const handleDismissDraftNotice = useCallback(() => {
    clearDraft();
    setState((prev) => {
      if (prev.status !== "report-entry") {
        return prev;
      }
      if (prev.draftNotice.kind === "restored") {
        return {
          ...prev,
          draft: createInitialReportDraft(prev.profile),
          draftNotice: { kind: "none" },
          pendingCrossSiteDraft: null,
        };
      }
      return { ...prev, draftNotice: { kind: "none" }, pendingCrossSiteDraft: null };
    });
  }, []);

  // Phase 3 §8 — DRAFT's "内容を確認する" action: client-validate first
  // (same Task 11 §13 behavior as the old direct-submit button — invalid
  // draft never leaves DRAFT, submitAttempted flips true so ReportForm
  // shows every error), then transition DRAFT -> CONFIRMING. Never calls
  // submitReportDraft itself — that only happens from handleSubmit, now
  // reachable only from the CONFIRMING screen.
  const handleConfirm = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "report-entry") {
        return prev;
      }
      // Task 11 §13: sticky for the rest of this report-entry visit once
      // set, same as the old direct-submit handler — set unconditionally
      // so a later edit made back in DRAFT (e.g. after a failed submit)
      // still shows its error immediately rather than waiting for blur.
      const next = { ...prev, submitAttempted: true };
      const validation = validateReportDraft(prev.draft);
      if (!validation.valid) {
        return next; // never transitions to CONFIRMING for an invalid draft.
      }
      return { ...next, workflowState: transitionWorkflow(prev.workflowState, { type: "CONFIRM" }) };
    });
  }, []);

  // Phase 3 §9 — CONFIRMING's "戻って修正" action. The draft itself is
  // never touched here (it was never mutated while CONFIRMING); autosave
  // resumes on its own via the effect below once workflowState is DRAFT
  // again.
  const handleBack = useCallback(() => {
    setState((prev) =>
      prev.status === "report-entry"
        ? { ...prev, workflowState: transitionWorkflow(prev.workflowState, { type: "BACK" }) }
        : prev,
    );
  }, []);

  // Task 11 §16 double-submit guard, extended by Phase 3 §10 to also
  // require workflowState === "CONFIRMING" (the submit action no longer
  // exists on the DRAFT screen at all — this is defense in depth, not a
  // new mechanism). The `submission.status === "submitting"` half is
  // checked directly against `state` (recreated fresh via `useCallback`'s
  // `[state]` dependency every render), not a ref. This relies on React
  // flushing the "submitting" state update — set synchronously, before the
  // `await` below — for a discrete click event before the next discrete
  // click event's handler runs, which is exactly what React 18's automatic
  // batching/sync-lane handling of discrete user input (click) guarantees;
  // verified directly by `SiteReportScreen.test.tsx`'s "calls submitReport
  // only once for two rapid submit clicks" test (two `fireEvent.click`
  // calls with no `await` between them).
  const handleSubmit = useCallback(async () => {
    if (
      state.status !== "report-entry" ||
      state.workflowState !== "CONFIRMING" ||
      state.submission.status === "submitting"
    ) {
      return;
    }
    const { profile, selectedSite, draft } = state;

    setState((prev) =>
      prev.status === "report-entry" ? { ...prev, submission: { status: "submitting" } } : prev,
    );

    const result = await submitReportDraft({ site: selectedSite, profile, draft });

    if (result.status === "success") {
      clearDraft();
    }

    // Phase 3 §10: success -> SUBMITTED; failure -> DRAFT, with `draft`
    // and `submission` (now "error") both left exactly as `result`/the
    // prior draft already have them — nothing is cleared on failure.
    setState((prev) =>
      prev.status === "report-entry"
        ? {
            ...prev,
            submission: result,
            workflowState: transitionWorkflow(
              prev.workflowState,
              result.status === "success" ? { type: "SUBMIT_SUCCESS" } : { type: "SUBMIT_FAILURE" },
            ),
          }
        : prev,
    );
  }, [state]);

  // Phase 2 spec §18 — debounced draft persistence. Skipped while a
  // cross-site offer is pending (draftNotice.kind === "cross-site"): the
  // current site's fresh, untouched draft must never overwrite the
  // still-undecided offered draft before the user chooses. Also skipped
  // once the current submission has succeeded: handleSubmit's clearDraft()
  // must stick until the user explicitly starts another report via
  // handleCreateAnother (which resets `draft` to a fresh value) — without
  // this guard, this effect re-runs after the post-submit setState (state
  // identity changed) and, ~500ms later, re-saves the just-submitted
  // `state.draft` right back into localStorage, undoing clearDraft() and
  // causing a stale "前回の入力内容を復元しました" restore (and a possible
  // duplicate resubmission) next time the app opens. Depending on the
  // whole `state` (not just `state.draft`) is deliberate — every other
  // branch below is a no-op re-save of the same content when an unrelated
  // field changes, which is harmless since saveDraft is idempotent.
  //
  // Phase 3 spec §6 — also skipped whenever workflowState is not "DRAFT".
  // The draft is frozen (uneditable) while CONFIRMING, so a skipped save
  // here is never a missed edit; resuming is automatic (no separate
  // "resume autosave" action) — this effect simply re-runs and saves again
  // the next time workflowState is back to "DRAFT" (after BACK or a failed
  // submit), the same way it already resumes after any other state change.
  useEffect(() => {
    if (
      state.status !== "report-entry" ||
      state.workflowState !== "DRAFT" ||
      state.draftNotice.kind === "cross-site" ||
      state.submission.status === "success"
    ) {
      return;
    }
    const { profile, selectedSite, draft } = state;
    const timer = setTimeout(() => {
      saveDraft({ lineUserId: profile.userId, siteId: selectedSite.siteId, draft });
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  // Task 12 §7 (Option A) — the only place a post-success draft is ever
  // reset: the user must explicitly choose to start another report. A
  // fresh `createInitialReportDraft` (same convenience defaults as
  // selecting a site for the first time) for the *same* `selectedSite`.
  const handleCreateAnother = useCallback(() => {
    setState((prev) =>
      prev.status === "report-entry"
        ? {
            ...prev,
            draft: createInitialReportDraft(prev.profile),
            workflowState: "DRAFT",
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
            draftNotice: { kind: "none" },
            pendingCrossSiteDraft: null,
          }
        : prev,
    );
  }, []);

  return (
    <div className={styles.screen}>
      {renderBody(
        state,
        handleLogin,
        loadFormOptions,
        handleSelectSite,
        handleChangeSite,
        handleDraftChange,
        handleConfirm,
        handleBack,
        handleSubmit,
        handleCreateAnother,
        handleRestoreCrossSiteDraft,
        handleDismissDraftNotice,
      )}
    </div>
  );
}

function renderBody(
  state: ScreenState,
  handleLogin: () => void,
  loadFormOptions: (profile: SiteReportLiffUser) => void,
  handleSelectSite: (site: Site) => void,
  handleChangeSite: () => void,
  handleDraftChange: (draft: ReportDraft) => void,
  handleConfirm: () => void,
  handleBack: () => void,
  handleSubmit: () => void,
  handleCreateAnother: () => void,
  handleRestoreCrossSiteDraft: () => void,
  handleDismissDraftNotice: () => void,
) {
  switch (state.status) {
    case "liff-loading":
      return (
        <p role="status" className={styles.message}>
          読み込んでいます...
        </p>
      );

    case "login-required":
      return (
        <>
          <h1 className={styles.heading}>ログインが必要です</h1>
          <p className={styles.message}>現場報告を利用するには、LINEでログインしてください。</p>
          <button type="button" className={styles.button} onClick={handleLogin}>
            LINEでログイン
          </button>
        </>
      );

    case "liff-error":
      return (
        <div className={styles.errorBox} role="alert">
          <p className={styles.message}>アプリの初期化に失敗しました。</p>
          <p className={styles.hint}>{state.error.message}</p>
        </div>
      );

    case "options-loading":
      return (
        <p role="status" className={styles.message}>
          現場一覧を読み込んでいます...
        </p>
      );

    case "options-error":
      return (
        <div className={styles.errorBox} role="alert">
          <p className={styles.message}>{state.error.message}</p>
          <button type="button" className={styles.buttonSecondary} onClick={() => loadFormOptions(state.profile)}>
            再試行
          </button>
        </div>
      );

    case "sites-empty":
      return (
        <>
          <h1 className={styles.heading}>現場を選択</h1>
          <p className={styles.message}>現在、利用できる現場がありません。</p>
          <p className={styles.hint}>担当者にお問い合わせいただくか、後でもう一度お試しください。</p>
          <button type="button" className={styles.buttonSecondary} onClick={() => loadFormOptions(state.profile)}>
            再試行
          </button>
        </>
      );

    case "site-selection":
      return (
        <>
          <h1 className={styles.heading}>現場を選択</h1>
          <p className={styles.hint}>報告する現場を選んでください。</p>
          <SitePicker sites={state.sites} onSelect={handleSelectSite} />
        </>
      );

    case "report-entry":
      return (
        <ReportEntryShell
          selectedSite={state.selectedSite}
          draft={state.draft}
          onDraftChange={handleDraftChange}
          workTypes={state.workTypes}
          progressStatuses={state.progressStatuses}
          submission={state.submission}
          submitAttempted={state.submitAttempted}
          workflowState={state.workflowState}
          onConfirm={handleConfirm}
          onBack={handleBack}
          onSubmit={handleSubmit}
          onCreateAnother={handleCreateAnother}
          onChangeSite={handleChangeSite}
          draftNotice={state.draftNotice}
          onRestoreCrossSiteDraft={handleRestoreCrossSiteDraft}
          onDismissDraftNotice={handleDismissDraftNotice}
        />
      );

    default:
      return null;
  }
}
