"use client";

import { useState } from "react";
import type { ReportDraft } from "./reportDraft";
import { validateReportDraft } from "./reportValidation";
import type { ProgressStatus, WorkType } from "@/types/api";
import { RequiredLabel } from "./RequiredLabel";
import styles from "./site-report.module.css";

type TouchedFields = Partial<Record<keyof ReportDraft, boolean>>;

/**
 * The editable report-content fields (Task 9, extended Phase 2 with
 * 進捗状況/問題あり/問題内容). A fully controlled component: `draft` is
 * owned by the caller, and every edit is reported through `onChange`
 * rather than held locally — only per-field "has this been touched yet"
 * state (for validation display timing) lives inside this component.
 *
 * `showAllErrors` (Task 11 §13, default `false`): when a submit attempt
 * fails client-side validation, every invalid field's error becomes
 * visible at once, not just fields the user happened to already blur.
 *
 * Phase 2 §16/§22: switching the 問題あり/問題なし radio to 問題なし
 * immediately clears `issueDetail` in the emitted draft — a hidden
 * textarea's stale text must never look like an active issue to a later
 * re-selection of 問題あり, or (defense in depth) to submitReportMapper.
 */
export function ReportForm({
  draft,
  onChange,
  workTypes,
  progressStatuses,
  showAllErrors = false,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
  workTypes: WorkType[];
  progressStatuses: ProgressStatus[];
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
        <RequiredLabel htmlFor="report-worker-name">作業者名</RequiredLabel>
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
        <RequiredLabel htmlFor="report-work-type">作業種別</RequiredLabel>
        <select
          id="report-work-type"
          className={styles.input}
          value={draft.workType}
          onChange={(event) => onChange({ ...draft, workType: event.target.value })}
          onBlur={() => markTouched("workType")}
          aria-invalid={Boolean(isShown("workType") && errors.workType)}
          aria-describedby={isShown("workType") && errors.workType ? "report-work-type-error" : undefined}
        >
          <option value="" disabled>
            選択してください
          </option>
          {workTypes.map((workType) => (
            <option key={workType.code} value={workType.code}>
              {workType.name}
            </option>
          ))}
        </select>
        {isShown("workType") && errors.workType ? (
          <p id="report-work-type-error" className={styles.fieldError} role="alert">
            {errors.workType}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <RequiredLabel htmlFor="report-date">報告日</RequiredLabel>
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
        <RequiredLabel htmlFor="report-progress-status">進捗状況</RequiredLabel>
        <select
          id="report-progress-status"
          className={styles.input}
          value={draft.progressStatus}
          onChange={(event) => onChange({ ...draft, progressStatus: event.target.value })}
          onBlur={() => markTouched("progressStatus")}
          aria-invalid={Boolean(isShown("progressStatus") && errors.progressStatus)}
          aria-describedby={isShown("progressStatus") && errors.progressStatus ? "report-progress-status-error" : undefined}
        >
          <option value="" disabled>
            選択してください
          </option>
          {progressStatuses.map((progressStatus) => (
            <option key={progressStatus.code} value={progressStatus.code}>
              {progressStatus.name}
            </option>
          ))}
        </select>
        {isShown("progressStatus") && errors.progressStatus ? (
          <p id="report-progress-status-error" className={styles.fieldError} role="alert">
            {errors.progressStatus}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>問題・課題</span>
        <div className={styles.radioGroup} role="radiogroup" aria-label="問題・課題">
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="report-has-issue"
              value="NO"
              checked={draft.hasIssue === "NO"}
              onChange={() => onChange({ ...draft, hasIssue: "NO", issueDetail: "" })}
            />
            問題なし
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="report-has-issue"
              value="YES"
              checked={draft.hasIssue === "YES"}
              onChange={() => onChange({ ...draft, hasIssue: "YES" })}
            />
            問題あり
          </label>
        </div>
      </div>

      {draft.hasIssue === "YES" ? (
        <div className={styles.field}>
          <RequiredLabel htmlFor="report-issue-detail">問題内容</RequiredLabel>
          <textarea
            id="report-issue-detail"
            className={styles.textarea}
            rows={4}
            value={draft.issueDetail}
            onChange={(event) => onChange({ ...draft, issueDetail: event.target.value })}
            onBlur={() => markTouched("issueDetail")}
            aria-invalid={Boolean(isShown("issueDetail") && errors.issueDetail)}
            aria-describedby={isShown("issueDetail") && errors.issueDetail ? "report-issue-detail-error" : undefined}
          />
          {isShown("issueDetail") && errors.issueDetail ? (
            <p id="report-issue-detail-error" className={styles.fieldError} role="alert">
              {errors.issueDetail}
            </p>
          ) : null}
        </div>
      ) : null}

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
