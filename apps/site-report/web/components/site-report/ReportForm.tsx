"use client";

import { useState } from "react";
import type { ReportDraft } from "./reportDraft";
import { validateReportDraft } from "./reportValidation";
import styles from "./site-report.module.css";

type TouchedFields = Partial<Record<keyof ReportDraft, boolean>>;

/**
 * The editable report-content fields (Task 9): `workerName`/`workType`/
 * `reportDate`/`comment` — the subset of `SubmitReportInput` this screen
 * actually collects (see `reportDraft.ts`'s header comment for why
 * `siteId`/`lineUserId`/`workerId`/`photos` are deliberately absent). A
 * fully controlled component: `draft` is owned by the caller
 * (`SiteReportScreen`'s `report-entry` state via `ReportEntryShell`), and
 * every edit is reported through `onChange` rather than held locally —
 * only per-field "has this been touched yet" state (for validation
 * display timing, Task 9 §9) lives inside this component, since nothing
 * outside it needs that.
 *
 * `showAllErrors` (Task 11 §13, default `false`): when a submit attempt
 * fails client-side validation, the screen needs every invalid field's
 * error visible at once, not just the ones the user happened to already
 * blur. Rather than building a second validation system, this reuses the
 * exact same `validateReportDraft` result and just widens which fields
 * count as "touched" for display purposes — the per-field blur-based
 * `touched` state from Task 9 is untouched and still applies once this is
 * `false` again.
 */
export function ReportForm({
  draft,
  onChange,
  showAllErrors = false,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
  showAllErrors?: boolean;
}) {
  const [touched, setTouched] = useState<TouchedFields>({});
  const { errors } = validateReportDraft(draft);

  const markTouched = (field: keyof ReportDraft) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isShown = (field: keyof ReportDraft) => showAllErrors || Boolean(touched[field]);

  return (
    <div className={styles.reportEntry}>
      <div className={styles.field}>
        <label htmlFor="report-worker-name" className={styles.label}>
          作業者名
        </label>
        <input
          id="report-worker-name"
          type="text"
          className={styles.input}
          value={draft.workerName}
          onChange={(event) => onChange({ ...draft, workerName: event.target.value })}
          onBlur={() => markTouched("workerName")}
          aria-invalid={Boolean(isShown("workerName") && errors.workerName)}
          aria-describedby={isShown("workerName") && errors.workerName ? "report-worker-name-error" : undefined}
        />
        {isShown("workerName") && errors.workerName ? (
          <p id="report-worker-name-error" className={styles.fieldError} role="alert">
            {errors.workerName}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="report-work-type" className={styles.label}>
          作業種別
        </label>
        <input
          id="report-work-type"
          type="text"
          className={styles.input}
          value={draft.workType}
          onChange={(event) => onChange({ ...draft, workType: event.target.value })}
          onBlur={() => markTouched("workType")}
          aria-invalid={Boolean(isShown("workType") && errors.workType)}
          aria-describedby={isShown("workType") && errors.workType ? "report-work-type-error" : undefined}
        />
        {isShown("workType") && errors.workType ? (
          <p id="report-work-type-error" className={styles.fieldError} role="alert">
            {errors.workType}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="report-date" className={styles.label}>
          報告日
        </label>
        <input
          id="report-date"
          type="date"
          className={styles.input}
          value={draft.reportDate}
          onChange={(event) => onChange({ ...draft, reportDate: event.target.value })}
          onBlur={() => markTouched("reportDate")}
          aria-invalid={Boolean(isShown("reportDate") && errors.reportDate)}
          aria-describedby={isShown("reportDate") && errors.reportDate ? "report-date-error" : undefined}
        />
        {isShown("reportDate") && errors.reportDate ? (
          <p id="report-date-error" className={styles.fieldError} role="alert">
            {errors.reportDate}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="report-comment" className={styles.label}>
          コメント
        </label>
        <textarea
          id="report-comment"
          className={styles.textarea}
          rows={4}
          value={draft.comment}
          onChange={(event) => onChange({ ...draft, comment: event.target.value })}
        />
      </div>
    </div>
  );
}
