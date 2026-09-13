import type { Site } from "@/types/api";
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
 */
export function ReportEntryShell({
  selectedSite,
  draft,
  onDraftChange,
  submission,
  submitAttempted,
  onSubmit,
  onCreateAnother,
}: {
  selectedSite: Site;
  draft: ReportDraft;
  onDraftChange: (draft: ReportDraft) => void;
  submission: SubmissionState;
  submitAttempted: boolean;
  onSubmit: () => void;
  onCreateAnother: () => void;
}) {
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
      </div>

      <ReportForm draft={draft} onChange={onDraftChange} showAllErrors={submitAttempted} />

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
