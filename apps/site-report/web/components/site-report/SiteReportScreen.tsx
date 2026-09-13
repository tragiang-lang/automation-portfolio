"use client";

/**
 * Task 8 — LIFF site-selection & report-entry-shell screen.
 *
 * Owns UI/application orchestration only:
 *   initializeSiteReportLiff() -> login-required / error / ready
 *                                          -> getSites() -> loading / error / empty / list
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
import { getSites } from "@/lib/api/siteReportWorkflows";
import type { LiffError, SiteReportLiffUser } from "@/types/liff";
import type { Site } from "@/types/api";
import { SitePicker } from "./SitePicker";
import { ReportEntryShell } from "./ReportEntryShell";
import { createInitialReportDraft, type ReportDraft } from "./reportDraft";
import { validateReportDraft } from "./reportValidation";
import { IDLE_SUBMISSION_STATE, submitReportDraft, type SubmissionState } from "./submission";
import styles from "./site-report.module.css";

type GetSitesError = { code: string; message: string };

type ScreenState =
  | { status: "liff-loading" }
  | { status: "login-required" }
  | { status: "liff-error"; error: LiffError }
  | { status: "sites-loading"; profile: SiteReportLiffUser }
  | { status: "sites-error"; profile: SiteReportLiffUser; error: GetSitesError }
  | { status: "sites-empty"; profile: SiteReportLiffUser }
  | { status: "site-selection"; profile: SiteReportLiffUser; sites: Site[] }
  | {
      status: "report-entry";
      profile: SiteReportLiffUser;
      sites: Site[];
      selectedSite: Site;
      draft: ReportDraft;
      /** Task 11 — result of the most recent submit attempt, or idle if
       *  none has happened yet for this draft/site selection. */
      submission: SubmissionState;
      /** Task 11 §13 — once a submit has been attempted, `ReportForm`
       *  shows every invalid field's error immediately (not just fields
       *  the user has individually blurred). Sticky for the rest of this
       *  report-entry visit once set, matching common form UX. */
      submitAttempted: boolean;
    };

const GENERIC_SITES_ERROR: GetSitesError = {
  code: "GET_SITES_FAILED",
  message: "現場一覧の取得に失敗しました。もう一度お試しください。",
};

export function SiteReportScreen() {
  const [state, setState] = useState<ScreenState>({ status: "liff-loading" });

  const loadSites = useCallback((profile: SiteReportLiffUser) => {
    setState({ status: "sites-loading", profile });
    getSites()
      .then((result) => {
        if (!result.ok) {
          setState({ status: "sites-error", profile, error: result.error });
          return;
        }
        const { sites } = result.data;
        if (sites.length === 0) {
          setState({ status: "sites-empty", profile });
        } else {
          setState({ status: "site-selection", profile, sites });
        }
      })
      .catch(() => {
        setState({ status: "sites-error", profile, error: GENERIC_SITES_ERROR });
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
        loadSites(liffState.profile);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadSites]);

  const handleLogin = useCallback(() => {
    // loginToSiteReport() redirects the browser to LINE login on success;
    // a rejection here means the redirect never started (e.g. called
    // outside the browser) and is safe to ignore — the user simply stays
    // on this screen (Task 8 §4).
    loginToSiteReport().catch(() => {});
  }, []);

  const handleSelectSite = useCallback((site: Site) => {
    setState((prev) =>
      prev.status === "site-selection"
        ? {
            status: "report-entry",
            profile: prev.profile,
            sites: prev.sites,
            selectedSite: site,
            draft: createInitialReportDraft(prev.profile),
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
          }
        : prev,
    );
  }, []);

  const handleDraftChange = useCallback((draft: ReportDraft) => {
    setState((prev) => (prev.status === "report-entry" ? { ...prev, draft } : prev));
  }, []);

  // Task 11 §16 double-submit guard: checked directly against `state`
  // (recreated fresh via `useCallback`'s `[state]` dependency every
  // render), not a ref. This relies on React flushing the "submitting"
  // state update — set synchronously, before the `await` below — for a
  // discrete click event before the next discrete click event's handler
  // runs, which is exactly what React 18's automatic batching/sync-lane
  // handling of discrete user input (click) guarantees; verified directly
  // by `SiteReportScreen.test.tsx`'s "calls submitReport only once for
  // two rapid submit clicks" test (two `fireEvent.click` calls with no
  // `await` between them).
  const handleSubmit = useCallback(async () => {
    if (state.status !== "report-entry" || state.submission.status === "submitting") {
      return;
    }
    const { profile, selectedSite, draft } = state;

    setState((prev) => (prev.status === "report-entry" ? { ...prev, submitAttempted: true } : prev));

    const validation = validateReportDraft(draft);
    if (!validation.valid) {
      return; // Task 11 §13: never calls submitReportDraft for an invalid draft.
    }

    setState((prev) =>
      prev.status === "report-entry" ? { ...prev, submission: { status: "submitting" } } : prev,
    );

    const result = await submitReportDraft({ site: selectedSite, profile, draft });

    setState((prev) => (prev.status === "report-entry" ? { ...prev, submission: result } : prev));
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
            submission: IDLE_SUBMISSION_STATE,
            submitAttempted: false,
          }
        : prev,
    );
  }, []);

  return (
    <div className={styles.screen}>
      {renderBody(
        state,
        handleLogin,
        loadSites,
        handleSelectSite,
        handleDraftChange,
        handleSubmit,
        handleCreateAnother,
      )}
    </div>
  );
}

function renderBody(
  state: ScreenState,
  handleLogin: () => void,
  loadSites: (profile: SiteReportLiffUser) => void,
  handleSelectSite: (site: Site) => void,
  handleDraftChange: (draft: ReportDraft) => void,
  handleSubmit: () => void,
  handleCreateAnother: () => void,
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

    case "sites-loading":
      return (
        <p role="status" className={styles.message}>
          現場一覧を読み込んでいます...
        </p>
      );

    case "sites-error":
      return (
        <div className={styles.errorBox} role="alert">
          <p className={styles.message}>{state.error.message}</p>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => loadSites(state.profile)}
          >
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
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => loadSites(state.profile)}
          >
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
          submission={state.submission}
          submitAttempted={state.submitAttempted}
          onSubmit={handleSubmit}
          onCreateAnother={handleCreateAnother}
        />
      );

    default:
      return null;
  }
}
