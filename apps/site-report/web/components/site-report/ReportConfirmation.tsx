import type { ProgressStatus, Site, WorkType } from "@/types/api";
import type { ReportDraft } from "./reportDraft";
import { PhotoPreviewList } from "./PhotoPreviewList";
import styles from "./site-report.module.css";

/**
 * Phase 3 read-only confirmation screen — the CONFIRMING workflow state's
 * only UI. Renders exactly the `draft`/`site` passed in, resolving
 * `workType`/`progressStatus` codes to their display names via the same
 * `workTypes`/`progressStatuses` lists `ReportForm` already uses to build
 * its `<select>` options, so the label shown here always matches what a
 * server-side resolution against the same ACTIVE master data would
 * produce (see spec §7). Never renders an editable control — no
 * `<input>`/`<select>`/`<textarea>`, and photo removal is intentionally
 * unavailable (`PhotoPreviewList` without `onRemove`).
 *
 * Deliberately has no internal state and calls no API — `onBack`/
 * `onSubmit` are plain callbacks owned by `SiteReportScreen`, matching
 * `ReportEntryShell`'s existing convention of never importing
 * `submitReport`/LIFF/workflow logic directly into a presentational
 * component.
 */
export function ReportConfirmation({
  site,
  draft,
  workTypes,
  progressStatuses,
  isSubmitting,
  onBack,
  onSubmit,
}: {
  site: Site;
  draft: ReportDraft;
  workTypes: WorkType[];
  progressStatuses: ProgressStatus[];
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const workTypeName = workTypes.find((workType) => workType.code === draft.workType)?.name ?? draft.workType;
  const progressStatusName =
    progressStatuses.find((progressStatus) => progressStatus.code === draft.progressStatus)?.name ?? draft.progressStatus;

  return (
    <section aria-labelledby="report-confirmation-heading" className={styles.reportEntry}>
      <h1 id="report-confirmation-heading" className={styles.heading}>
        報告内容の確認
      </h1>

      <div className={styles.section}>
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>現場名</span>
          <p className={styles.confirmValue}>{site.name}</p>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>作業者名</span>
          <p className={styles.confirmValue}>{draft.workerName}</p>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>作業種別</span>
          <p className={styles.confirmValue}>{workTypeName}</p>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>報告日</span>
          <p className={styles.confirmValue}>{draft.reportDate}</p>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>進捗状況</span>
          <p className={styles.confirmValue}>{progressStatusName}</p>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>問題</span>
          <p className={styles.confirmValue}>{draft.hasIssue === "YES" ? "問題あり" : "問題なし"}</p>
        </div>

        {draft.hasIssue === "YES" ? (
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>問題内容</span>
            <p className={styles.confirmValue}>{draft.issueDetail}</p>
          </div>
        ) : null}

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>コメント</span>
          <p className={styles.confirmValue}>{draft.comment}</p>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>写真</span>
          <PhotoPreviewList photos={draft.photos} />
        </div>
      </div>

      <div className={styles.confirmActions}>
        <button type="button" className={styles.buttonSecondary} onClick={onBack} disabled={isSubmitting}>
          戻って修正
        </button>
        <button type="button" className={styles.button} onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "送信中..." : "この内容で送信"}
        </button>
      </div>
    </section>
  );
}
