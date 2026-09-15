import { useState } from "react";
import type { ProgressStatus, Site, WorkType } from "@/types/api";
import { addPhotosToDraft, removePhotoFromDraft, type ReportDraft } from "./reportDraft";
import { ReportForm } from "./ReportForm";
import { PhotoUploader } from "./PhotoUploader";
import { PhotoPreviewList } from "./PhotoPreviewList";
import type { SubmissionState } from "./submission";
import styles from "./site-report.module.css";

/**
 * Report-entry screen shell (Task 8 §12, real form in Task 9, real photo
 * pipeline in Task 10, real submission in Task 11). Confirms the selected
 * site, renders the editable report-content fields via `ReportForm`, the
 * photo add/preview/remove pipeline via `PhotoUploader`/
 * `PhotoPreviewList`, and now the actual submit action — all controlled
 * through props from `SiteReportScreen`, so `ReportDraft`/`SubmissionState`
 * stay the single source of truth. This component does NOT import
 * `submitReport`, LIFF, or build a `SubmitReportInput` itself (Task 11
 * §22) — `onSubmit`/`onCreateAnother` are plain callbacks, and
 * `submission`/`submitAttempted` are read-only props describing what to
 * render.
 *
 * Post-success UX (Task 12 §7, Option A): once `submission.status` is
 * `"success"`, the form/photo pipeline/submit button are replaced by a
 * confirmation + a single "別のレポートを作成" (create another) action —
 * not left editable with a re-clickable submit button, which would let
 * the exact same already-submitted draft be sent again. The draft itself
 * is only ever reset when the user activates that action (`onCreateAnother`,
 * handled by `SiteReportScreen` — this component never resets state on
 * its own).
 *
 * 現場を変更 (Phase 1 P0): lets the user return to the site-selection
 * dropdown without abandoning the whole app. An untouched draft (never
 * given a work type, comment, or photo — the same shape
 * `createInitialReportDraft` produces) navigates back immediately; any
 * other draft state shows an inline confirmation panel first (never
 * `window.confirm` — this project avoids native browser dialogs in favor
 * of testable UI), describing the concrete consequence rather than a bare
 * "are you sure?".
 */
export function ReportEntryShell({
  selectedSite,
  draft,
  onDraftChange,
  workTypes,
  progressStatuses,
  submission,
  submitAttempted,
  onSubmit,
  onCreateAnother,
  onChangeSite,
}: {
  selectedSite: Site;
  draft: ReportDraft;
  onDraftChange: (draft: ReportDraft) => void;
  workTypes: WorkType[];
  progressStatuses: ProgressStatus[];
  submission: SubmissionState;
  submitAttempted: boolean;
  onSubmit: () => void;
  onCreateAnother: () => void;
  onChangeSite: () => void;
}) {
  const [confirmingChangeSite, setConfirmingChangeSite] = useState(false);

  const draftIsUntouched = draft.workType === "" && draft.comment === "" && draft.photos.length === 0;

  const handleChangeSiteClick = () => {
    if (draftIsUntouched) {
      onChangeSite();
    } else {
      setConfirmingChangeSite(true);
    }
  };

  if (submission.status === "success") {
    return (
      <section aria-labelledby="report-entry-heading" className={styles.reportEntry}>
        <h1 id="report-entry-heading" className={styles.heading}>
          現場報告
        </h1>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>現場</h2>
          <p className={styles.message}>{selectedSite.name}</p>
          <p className={styles.hint}>{selectedSite.siteCode}</p>
        </div>

        <div className={styles.successBox} role="status">
          <p className={styles.message}>レポートを送信しました。</p>
          <p className={styles.hint}>受付番号: {submission.result.reportId}</p>
        </div>

        <button type="button" className={styles.button} onClick={onCreateAnother}>
          別のレポートを作成
        </button>
      </section>
    );
  }

  const isSubmitting = submission.status === "submitting";

  return (
    <section aria-labelledby="report-entry-heading" className={styles.reportEntry}>
      <h1 id="report-entry-heading" className={styles.heading}>
        現場報告
      </h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>現場</h2>
        <p className={styles.message}>{selectedSite.name}</p>
        <p className={styles.hint}>{selectedSite.siteCode}</p>
        <button type="button" className={styles.buttonSecondary} onClick={handleChangeSiteClick}>
          現場を変更
        </button>
        {confirmingChangeSite ? (
          <div className={styles.errorBox} role="alertdialog">
            <p className={styles.message}>現在入力中の内容は失われます。現場を変更しますか？</p>
            <button type="button" className={styles.buttonSecondary} onClick={() => setConfirmingChangeSite(false)}>
              キャンセル
            </button>
            <button type="button" className={styles.button} onClick={onChangeSite}>
              現場を変更する
            </button>
          </div>
        ) : null}
      </div>

      <ReportForm
        draft={draft}
        onChange={onDraftChange}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        showAllErrors={submitAttempted}
      />

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>写真</h2>
        <PhotoUploader onAddPhotos={(photos) => onDraftChange(addPhotosToDraft(draft, photos))} />
        <PhotoPreviewList
          photos={draft.photos}
          onRemove={(photoId) => onDraftChange(removePhotoFromDraft(draft, photoId))}
        />
      </div>

      {submission.status === "error" ? (
        <div className={styles.errorBox} role="alert">
          <p className={styles.message}>{submission.message}</p>
        </div>
      ) : null}

      <button type="button" className={styles.button} onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "レポートを送信"}
      </button>
    </section>
  );
}
