import type { ReportDraft } from "./reportDraft";

/** Field-level error messages, one optional entry per invalid field.
 *  `comment` has no entry at all — `SubmitReportInput.comment` is
 *  optional with no documented format/length rule, so it can never be
 *  invalid on shape grounds alone (Task 9 §7/§8). `hasIssue` has no entry
 *  either — it is always "YES" or "NO" by construction (a radio pair, set
 *  via ReportForm), never blank, so it can never fail this validator. */
export interface ReportDraftErrors {
  workerName?: string;
  workType?: string;
  reportDate?: string;
  progressStatus?: string;
  issueDetail?: string;
}

export interface ReportDraftValidationResult {
  valid: boolean;
  errors: ReportDraftErrors;
}

// Same calendar-date check as apps/site-report/gas/src/
// SubmitReportService.ts's isValidCalendarDateString — re-implemented,
// not imported. web/ and gas/ are separate packages with no shared
// packages/ directory yet (docs/site-report-architecture-overview.md),
// and Task 5's own SubmitReportService.ts documents the same choice for
// itself (re-implementing rather than importing Validation.ts's private
// helper) for one small regex — the same reasoning applies here across
// the wider web/gas boundary.
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDateString(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Client-side, UX-only shape validation (Task 9 §7). Mirrors only the
 * required-field/format rules `apps/site-report/gas/src/
 * SubmitReportService.ts`'s `parseSubmitReportInput` already enforces for
 * the fields this screen collects (`workerName`/`workType`/`reportDate`
 * non-empty, `reportDate` a real `YYYY-MM-DD` calendar date) — GAS stays
 * authoritative; this exists to give the user immediate feedback, not to
 * replace server-side validation. No length limit is checked for any
 * field: none is documented anywhere in the actual contract, and Task 9
 * §7 explicitly says not to invent one.
 */
export function validateReportDraft(draft: ReportDraft): ReportDraftValidationResult {
  const errors: ReportDraftErrors = {};

  if (draft.workerName.trim().length === 0) {
    errors.workerName = "作業者名を入力してください。";
  }
  if (draft.workType.trim().length === 0) {
    errors.workType = "作業種別を入力してください。";
  }
  if (draft.reportDate.trim().length === 0) {
    errors.reportDate = "報告日を入力してください。";
  } else if (!isValidCalendarDateString(draft.reportDate)) {
    errors.reportDate = "報告日はYYYY-MM-DD形式の正しい日付で入力してください。";
  }
  if (draft.progressStatus.trim().length === 0) {
    errors.progressStatus = "進捗状況を選択してください。";
  }
  if (draft.hasIssue === "YES" && draft.issueDetail.trim().length === 0) {
    errors.issueDetail = "問題内容を入力してください。";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
