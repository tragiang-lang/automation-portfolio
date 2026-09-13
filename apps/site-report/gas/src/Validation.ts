import { ReportPhotoRow, ReportRow, SiteRow, WorkerRow } from "./SheetSchemas";

/**
 * Pure business/domain validation for Site Report rows (Task 3). Operates
 * on the *Row shapes RowMapper.ts's rowsToObjects produces — i.e. mapped
 * sheet data, before RowMapper.ts's mapXRow functions narrow it into the
 * final domain model (Site/Worker/SiteReport/ReportPhoto). Never touches
 * SpreadsheetApp, so every function here is directly Jest-testable.
 *
 * Deliberately separate from RowMapper.ts's mapXRow functions (Phase 3A
 * §5 "Separation of responsibilities"): those reject values that cannot
 * be *coerced* into the right shape at all (a non-numeric photoCount, an
 * unparseable timestamp type); this file only ever reports business-rule
 * issues (required-but-empty, disallowed value, unparseable date/number
 * format) as data — it never throws.
 *
 * One issue = one field + one human-readable reason (same {field, reason}
 * shape as ConfigParser.ts's ConfigFieldIssue — the project's existing
 * convention), so a caller can always say which field failed and why,
 * per Task 3 §6.
 */
export interface ValidationIssue {
  field: string;
  reason: string;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a string that is both YYYY-MM-DD shaped and a real
 *  calendar date (rejects e.g. "2026-13-40", which the regex alone would
 *  accept). Local to this file — duplicated in spirit from, but not
 *  imported from, apps/salon-portfolio/gas/src/Utils.ts's identical
 *  helper, since the two apps must not share code. */
function isValidCalendarDateString(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function requireNonEmptyString(value: string, field: string, issues: ValidationIssue[]): void {
  if (value.trim().length === 0) {
    issues.push({ field, reason: "is required" });
  }
}

/** Validates a required calendar-date-only field (e.g. reportDate) —
 *  missing is reported the same way as any other required field, and a
 *  present-but-malformed value is reported distinctly. */
function requireValidDate(value: string, field: string, issues: ValidationIssue[]): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push({ field, reason: "is required" });
    return;
  }
  if (!isValidCalendarDateString(trimmed)) {
    issues.push({ field, reason: "must be a valid calendar date in YYYY-MM-DD format" });
  }
}

/** Validates an optional calendar-date-only field (e.g. Site.startDate) —
 *  an empty value is not an issue at all, only a present-but-malformed
 *  one is. */
function validateOptionalDate(value: string | undefined, field: string, issues: ValidationIssue[]): void {
  if (value === undefined || value.trim().length === 0) {
    return;
  }
  if (!isValidCalendarDateString(value.trim())) {
    issues.push({ field, reason: "must be a valid calendar date in YYYY-MM-DD format" });
  }
}

/** Validates a required ISO 8601 timestamp field (createdAt/updatedAt). */
function requireValidTimestamp(value: string, field: string, issues: ValidationIssue[]): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push({ field, reason: "is required" });
    return;
  }
  if (Number.isNaN(Date.parse(trimmed))) {
    issues.push({ field, reason: "must be a valid ISO 8601 timestamp" });
  }
}

function requireStatus<T extends string>(
  value: string,
  field: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): void {
  if (!(allowed as readonly string[]).includes(value)) {
    const expected = allowed.length === 1 ? `"${allowed[0]}"` : allowed.map((v) => `"${v}"`).join(" or ");
    issues.push({ field, reason: `must be ${expected}, got "${value}"` });
  }
}

/** Validates a SITES row. */
export function validateSiteRow(row: SiteRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requireNonEmptyString(row.siteId, "siteId", issues);
  requireNonEmptyString(row.siteCode, "siteCode", issues);
  requireNonEmptyString(row.name, "name", issues);
  requireStatus(row.status, "status", ["ACTIVE", "INACTIVE"] as const, issues);
  validateOptionalDate(row.startDate, "startDate", issues);
  validateOptionalDate(row.endDate, "endDate", issues);
  requireValidTimestamp(row.createdAt, "createdAt", issues);
  requireValidTimestamp(row.updatedAt, "updatedAt", issues);
  return issues;
}

/** Validates a WORKERS row. */
export function validateWorkerRow(row: WorkerRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requireNonEmptyString(row.workerId, "workerId", issues);
  requireNonEmptyString(row.lineUserId, "lineUserId", issues);
  requireNonEmptyString(row.displayName, "displayName", issues);
  requireStatus(row.status, "status", ["ACTIVE", "INACTIVE"] as const, issues);
  requireValidTimestamp(row.createdAt, "createdAt", issues);
  requireValidTimestamp(row.updatedAt, "updatedAt", issues);
  return issues;
}

/** Validates a REPORTS row. `siteId` is the required report/site
 *  relationship; `workerId` stays optional (a report may be submitted
 *  before a worker record is linked) so it is deliberately not checked
 *  here. */
export function validateReportRow(row: ReportRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requireNonEmptyString(row.reportId, "reportId", issues);
  requireNonEmptyString(row.siteId, "siteId", issues);
  requireNonEmptyString(row.lineUserId, "lineUserId", issues);
  requireNonEmptyString(row.workerName, "workerName", issues);
  requireValidDate(row.reportDate, "reportDate", issues);
  requireNonEmptyString(row.workType, "workType", issues);
  requireStatus(row.status, "status", ["SUBMITTED"] as const, issues);
  if (typeof row.photoCount !== "number" || !Number.isInteger(row.photoCount) || row.photoCount < 0) {
    issues.push({ field: "photoCount", reason: "must be a non-negative integer" });
  }
  requireValidTimestamp(row.createdAt, "createdAt", issues);
  requireValidTimestamp(row.updatedAt, "updatedAt", issues);
  return issues;
}

/** Validates a REPORT_PHOTOS row. `reportId` is the required
 *  photo/report relationship. */
export function validateReportPhotoRow(row: ReportPhotoRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requireNonEmptyString(row.photoId, "photoId", issues);
  requireNonEmptyString(row.reportId, "reportId", issues);
  requireNonEmptyString(row.fileId, "fileId", issues);
  requireNonEmptyString(row.fileUrl, "fileUrl", issues);
  requireNonEmptyString(row.fileName, "fileName", issues);
  requireNonEmptyString(row.mimeType, "mimeType", issues);
  requireValidTimestamp(row.createdAt, "createdAt", issues);
  return issues;
}
