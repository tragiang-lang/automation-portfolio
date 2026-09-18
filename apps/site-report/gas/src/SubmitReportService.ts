import { SiteReport } from "./models/Report";
import { ReportPhoto } from "./models/ReportPhoto";
import { Site } from "./models/Site";
import { SubmitReportInput, SubmitReportPhotoInput } from "./models/SubmitReportInput";
import { ValidationIssue } from "./Validation";
import { getSiteReportConfig } from "./ConfigStore";
import { buildSitesResult, getSiteRows } from "./SitesRepository";
import { buildWorkTypesResult, getWorkTypeRows } from "./WorkTypesRepository";
import { buildProgressStatusResult, getProgressStatusRows } from "./ProgressStatusRepository";
import { generatePhotoId, generateReportId } from "./ids/ReportId";
import { deleteUploadedFile, uploadReportPhoto } from "./DriveStorage";
import { resolveReportPhotoFolder } from "./DriveFolderResolver";
import { appendReportPhotoRow, appendReportRow } from "./ReportsRepository";
import { sendAdminNotification } from "./AdminNotification";
import { ReportPhotoRow, ReportRow } from "./SheetSchemas";

/**
 * Business workflow for SUBMIT_REPORT (Task 5). Api.ts stays thin (parse
 * envelope -> call this module -> map result to response, Task 5 §36);
 * every validate/upload/persist/notify decision lives here.
 */

// --- Request parsing (pure) ---------------------------------------------
//
// Deliberately a small, dedicated validator over the *request* shape
// (SubmitReportInput), not a reuse of Validation.ts's validateReportRow:
// that function validates an already-mapped *sheet row* shape (ReportRow)
// with fields a submission does not have yet at all (reportId, status,
// photoCount, createdAt/updatedAt are server-generated, never client
// input — Task 5 §6 "do not expose spreadsheet Row types directly as API
// input types"). The calendar-date check below is intentionally
// duplicated from Validation.ts's private isValidCalendarDateString in
// the same spirit Validation.ts itself documents for its own duplication
// from salon's Utils.ts: a small pure helper, re-implemented rather than
// exported-and-imported across an unrelated module boundary, to avoid
// coupling this file to Validation.ts's internals for one regex.

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDateString(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function isValidBase64(value: string): boolean {
  return value.length > 0 && value.length % 4 === 0 && BASE64_PATTERN.test(value);
}

function requireString(value: unknown, field: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ field, reason: "is required" });
    return undefined;
  }
  return value;
}

/** Validates a required "YES"|"NO" field — same {field, reason} issue
 *  shape as requireString, but with a fixed allowed-value set instead of
 *  "any non-empty string". */
function requireYesNo(value: unknown, field: string, issues: ValidationIssue[]): "YES" | "NO" | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ field, reason: "is required" });
    return undefined;
  }
  if (value !== "YES" && value !== "NO") {
    issues.push({ field, reason: 'must be "YES" or "NO"' });
    return undefined;
  }
  return value;
}

function parsePhotos(rawPhotos: unknown, issues: ValidationIssue[]): SubmitReportPhotoInput[] {
  if (rawPhotos === undefined) {
    return [];
  }
  if (!Array.isArray(rawPhotos)) {
    issues.push({ field: "photos", reason: "must be an array" });
    return [];
  }
  const photos: SubmitReportPhotoInput[] = [];
  rawPhotos.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      issues.push({ field: `photos[${index}]`, reason: "must be an object" });
      return;
    }
    const photo = raw as Record<string, unknown>;
    const fileName = requireString(photo.fileName, `photos[${index}].fileName`, issues);
    const mimeType = requireString(photo.mimeType, `photos[${index}].mimeType`, issues);
    const base64Data = requireString(photo.base64Data, `photos[${index}].base64Data`, issues);
    if (base64Data !== undefined && !isValidBase64(base64Data)) {
      issues.push({ field: `photos[${index}].base64Data`, reason: "must be valid base64-encoded data" });
      return;
    }
    if (fileName !== undefined && mimeType !== undefined && base64Data !== undefined) {
      photos.push({ fileName, mimeType, base64Data });
    }
  });
  return photos;
}

export type ParseSubmitReportInputResult =
  | { ok: true; input: SubmitReportInput }
  | { ok: false; issues: ValidationIssue[] };

/** Pure request-shape+business-field validation for SUBMIT_REPORT (Task 5
 *  §7: "before any external write" — this runs before SubmitReportService
 *  even reads CONFIG/SITES, let alone touches Drive/Sheets/Gmail). Never
 *  touches SpreadsheetApp/DriveApp/GmailApp. Accumulates every issue in
 *  one pass, same convention as Validation.ts's validators. */
export function parseSubmitReportInput(rawPayload: unknown): ParseSubmitReportInputResult {
  const issues: ValidationIssue[] = [];
  if (typeof rawPayload !== "object" || rawPayload === null || Array.isArray(rawPayload)) {
    return { ok: false, issues: [{ field: "payload", reason: "must be an object" }] };
  }
  const payload = rawPayload as Record<string, unknown>;

  const siteId = requireString(payload.siteId, "siteId", issues);
  const lineUserId = requireString(payload.lineUserId, "lineUserId", issues);
  const workerName = requireString(payload.workerName, "workerName", issues);
  const workType = requireString(payload.workType, "workType", issues);
  const reportDate = requireString(payload.reportDate, "reportDate", issues);
  if (reportDate !== undefined && !isValidCalendarDateString(reportDate)) {
    issues.push({ field: "reportDate", reason: "must be a valid calendar date in YYYY-MM-DD format" });
  }
  const workerId =
    payload.workerId === undefined ? undefined : requireString(payload.workerId, "workerId", issues);
  const comment =
    payload.comment === undefined || payload.comment === ""
      ? undefined
      : requireString(payload.comment, "comment", issues);

  // Phase 2: progressStatus is required, same shape as workType.
  const progressStatus = requireString(payload.progressStatus, "progressStatus", issues);

  // Phase 2: hasIssue is required and must be exactly "YES"/"NO";
  // issueDetail is required only when hasIssue is "YES" — same
  // "" treated as absent" normalization comment already uses.
  const hasIssue = requireYesNo(payload.hasIssue, "hasIssue", issues);
  const issueDetail =
    hasIssue === "YES"
      ? requireString(payload.issueDetail, "issueDetail", issues)
      : payload.issueDetail === undefined || payload.issueDetail === ""
        ? undefined
        : requireString(payload.issueDetail, "issueDetail", issues);

  const photos = parsePhotos(payload.photos, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    input: {
      siteId: siteId as string,
      workerId,
      lineUserId: lineUserId as string,
      workerName: workerName as string,
      reportDate: reportDate as string,
      workType: workType as string,
      comment,
      progressStatus: progressStatus as string,
      hasIssue: hasIssue as "YES" | "NO",
      issueDetail,
      photos,
    },
  };
}

// --- Orchestration --------------------------------------------------------

export type SubmitReportOutcome =
  | { kind: "site_not_found" }
  | { kind: "sites_unavailable" }
  | { kind: "work_type_not_found" }
  | { kind: "work_types_unavailable" }
  | { kind: "progress_status_not_found" }
  | { kind: "progress_statuses_unavailable" }
  | { kind: "drive_upload_failed"; reason: string }
  | { kind: "reports_write_failed"; reason: string }
  | { kind: "report_photos_write_failed"; reason: string }
  | { kind: "success"; report: SiteReport; photos: ReportPhoto[]; notificationSent: boolean };

interface UploadedPhoto {
  fileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const DEFAULT_PHOTO_EXTENSION = "jpg";

function extensionForMimeType(mimeType: string): string {
  return MIME_TYPE_EXTENSIONS[mimeType] ?? DEFAULT_PHOTO_EXTENSION;
}

/** `{reportId}_{sequence}.{extension}` — deterministic and collision-free
 *  across an entire submission (the reportId+sequence prefix alone
 *  already guarantees uniqueness); the original client fileName never
 *  appears in the Drive filename. Sequence is zero-padded to 2 digits
 *  (naturally growing to 3+ digits past 99, no special-casing needed). */
function buildPhotoFileName(reportId: string, sequence: number, mimeType: string): string {
  return `${reportId}_${String(sequence).padStart(2, "0")}.${extensionForMimeType(mimeType)}`;
}

/** Best-effort cleanup of every Drive file this submission itself
 *  uploaded (Task 5 §20/§42) — never any pre-existing file. A cleanup
 *  failure is logged and swallowed: it must never replace or hide the
 *  original failure that triggered the cleanup. */
function cleanupUploadedPhotos(uploaded: UploadedPhoto[]): void {
  for (const photo of uploaded) {
    try {
      deleteUploadedFile(photo.fileId);
    } catch (cleanupError) {
      console.error("[SUBMIT_REPORT] cleanup failed for Drive file:", photo.fileId, cleanupError);
    }
  }
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The full validate(already done by the caller)->resolve site->upload->
 *  persist->notify workflow (Task 5 §3). Assumes `input` already passed
 *  parseSubmitReportInput — this function performs no request-shape
 *  validation of its own, only the site-existence check and the
 *  write/upload workflow. Throws SiteReportConfigError/MissingHeadersError
 *  (from getSiteReportConfig/getSiteRows) — Api.ts's submitReportAction
 *  catches those the same way getSitesAction does; every other failure is
 *  reported as a SubmitReportOutcome, never thrown. */
export function submitReport(input: SubmitReportInput): SubmitReportOutcome {
  // Task 5 §8: reuse GET_SITES's own infrastructure, never a duplicate
  // Sites lookup. getSiteReportConfig()/getSiteRows() may throw
  // SiteReportConfigError/MissingHeadersError, intentionally left
  // uncaught here — Api.ts maps those exactly as GET_SITES does.
  const config = getSiteReportConfig();
  const sitesResult = buildSitesResult(getSiteRows());
  if (!sitesResult.ok) {
    console.error("[SUBMIT_REPORT] SITES sheet failed validation while resolving site:", JSON.stringify(sitesResult));
    return { kind: "sites_unavailable" };
  }
  const site: Site | undefined = sitesResult.sites.find((candidate) => candidate.siteId === input.siteId);
  if (!site) {
    return { kind: "site_not_found" };
  }

  // Phase 1 P0: same existence-check pattern as the site lookup above,
  // reusing GET_WORK_TYPES's own infrastructure rather than a duplicate
  // lookup.
  const workTypesResult = buildWorkTypesResult(getWorkTypeRows());
  if (!workTypesResult.ok) {
    console.error(
      "[SUBMIT_REPORT] WORK_TYPES sheet failed validation while resolving work type:",
      JSON.stringify(workTypesResult),
    );
    return { kind: "work_types_unavailable" };
  }
  const workType = workTypesResult.workTypes.find((candidate) => candidate.code === input.workType);
  if (!workType) {
    return { kind: "work_type_not_found" };
  }

  // Phase 2: same existence-check pattern as the work-type lookup above,
  // reusing GET_PROGRESS_STATUS's own infrastructure rather than a
  // duplicate lookup.
  const progressStatusesResult = buildProgressStatusResult(getProgressStatusRows());
  if (!progressStatusesResult.ok) {
    console.error(
      "[SUBMIT_REPORT] PROGRESS_STATUS sheet failed validation while resolving progress status:",
      JSON.stringify(progressStatusesResult),
    );
    return { kind: "progress_statuses_unavailable" };
  }
  const progressStatus = progressStatusesResult.progressStatuses.find(
    (candidate) => candidate.code === input.progressStatus,
  );
  if (!progressStatus) {
    return { kind: "progress_status_not_found" };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const reportId = generateReportId(now);

  // Photo storage structure: resolve (or create) the Date -> Site ->
  // Worker folder once per submission, before any photo upload. A
  // resolution failure must block every photo upload the same way a
  // Drive upload failure would — reusing drive_upload_failed rather than
  // introducing a new outcome kind.
  let photoFolderId: string;
  try {
    photoFolderId = resolveReportPhotoFolder(config.driveRootFolderId, input.reportDate, site.name, input.workerName);
  } catch (error) {
    console.error("[SUBMIT_REPORT] Drive photo folder resolution failed:", error);
    return { kind: "drive_upload_failed", reason: errorReason(error) };
  }

  // All-or-nothing photo upload: if any photo fails, nothing has been
  // written to REPORTS/REPORT_PHOTOS yet, so the only cleanup needed is
  // the Drive files already uploaded earlier in this same loop (Task 5
  // §18/§19 "Drive upload failure" case).
  const uploaded: UploadedPhoto[] = [];
  for (let index = 0; index < input.photos.length; index++) {
    const photo = input.photos[index];
    const fileName = buildPhotoFileName(reportId, index + 1, photo.mimeType);
    try {
      const result = uploadReportPhoto({
        folderId: photoFolderId,
        fileName,
        mimeType: photo.mimeType,
        base64Data: photo.base64Data,
      });
      uploaded.push({ fileId: result.fileId, fileUrl: result.fileUrl, fileName, mimeType: photo.mimeType });
    } catch (error) {
      console.error(`[SUBMIT_REPORT] Drive upload failed for photo index ${index}:`, error);
      cleanupUploadedPhotos(uploaded);
      return { kind: "drive_upload_failed", reason: errorReason(error) };
    }
  }

  // Task 5 §18: photoCount always matches the number of photos actually
  // uploaded (== input.photos.length here, since any earlier failure
  // already returned above) — never the raw requested count.
  const reportRow: ReportRow = {
    reportId,
    siteId: site.siteId,
    workerId: input.workerId,
    lineUserId: input.lineUserId,
    workerName: input.workerName,
    reportDate: input.reportDate,
    workType: input.workType,
    comment: input.comment,
    photoCount: uploaded.length,
    status: "SUBMITTED",
    createdAt: nowIso,
    updatedAt: nowIso,
    workTypeName: workType.name,
    progressStatus: input.progressStatus,
    progressStatusName: progressStatus.name,
    hasIssue: input.hasIssue,
    issueDetail: input.issueDetail,
  };

  try {
    appendReportRow(reportRow);
  } catch (error) {
    console.error("[SUBMIT_REPORT] REPORTS write failed:", error);
    cleanupUploadedPhotos(uploaded);
    return { kind: "reports_write_failed", reason: errorReason(error) };
  }

  const photoRows: ReportPhotoRow[] = uploaded.map((photo) => ({
    photoId: generatePhotoId(now),
    reportId,
    fileId: photo.fileId,
    fileUrl: photo.fileUrl,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    createdAt: nowIso,
  }));

  try {
    for (const photoRow of photoRows) {
      appendReportPhotoRow(photoRow);
    }
  } catch (error) {
    // The REPORTS row written just above is *not* rolled back here: no
    // safe "delete this exact Sheet row" primitive exists yet in
    // SheetStore.ts (Task 5 known limitation — see
    // docs/site-report-architecture-overview.md). Drive cleanup is still
    // safe and is performed, since without a REPORT_PHOTOS row nothing
    // else references these uploaded files.
    console.error("[SUBMIT_REPORT] REPORT_PHOTOS write failed:", error);
    cleanupUploadedPhotos(uploaded);
    return { kind: "report_photos_write_failed", reason: errorReason(error) };
  }

  const report: SiteReport = {
    reportId: reportRow.reportId,
    siteId: reportRow.siteId,
    workerId: reportRow.workerId,
    lineUserId: reportRow.lineUserId,
    workerName: reportRow.workerName,
    reportDate: reportRow.reportDate,
    workType: reportRow.workType,
    comment: reportRow.comment,
    photoCount: reportRow.photoCount,
    status: "SUBMITTED",
    createdAt: reportRow.createdAt,
    updatedAt: reportRow.updatedAt,
    workTypeName: reportRow.workTypeName,
    progressStatus: reportRow.progressStatus,
    progressStatusName: reportRow.progressStatusName,
    hasIssue: reportRow.hasIssue as "YES" | "NO",
    issueDetail: reportRow.issueDetail,
  };
  const photos: ReportPhoto[] = photoRows.map((row) => ({ ...row }));

  // Task 5 §19: a notification failure never undoes an already-persisted
  // submission, and never retries any part of the workflow above (no
  // duplicate report is ever created). Best-effort only.
  let notificationSent = true;
  try {
    sendAdminNotification(config.adminEmail, report, site);
  } catch (error) {
    notificationSent = false;
    console.error("[SUBMIT_REPORT] admin notification failed (report already persisted):", reportId, error);
  }

  return { kind: "success", report, photos, notificationSent };
}
