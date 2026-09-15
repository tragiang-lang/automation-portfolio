/**
 * Request payload shape for the SUBMIT_REPORT action (Task 5). Kept
 * separate from the persisted `SiteReport`/`ReportRow` shapes: a
 * submission carries a photo payload that is never persisted as-is
 * (photos become Drive files + `ReportPhoto` rows), and never carries
 * server-generated fields (`reportId`, `photoCount`, `status`,
 * `createdAt`/`updatedAt`) — those are computed by
 * `SubmitReportService.submitReport`, never trusted from the client.
 *
 * Photo representation (Task 5 §11 — flagged explicitly, not silently
 * decided): the project has no other documented photo-upload wire format
 * anywhere yet (`apps/site-report/web` is still a Task 1 placeholder with
 * no upload UI), and the existing `doPost` only ever reads
 * `e.postData.contents` as one JSON string body — there is no multipart
 * upload path anywhere in the current architecture. A base64 payload
 * embedded in the JSON `payload` is therefore the smallest representation
 * consistent with what already exists, not an invented production
 * protocol. A future task, once a real LIFF upload flow exists, may need
 * to revisit this (e.g. size limits, direct-to-Drive resumable uploads).
 */
export interface SubmitReportPhotoInput {
  fileName: string;
  mimeType: string;
  /** Base64-encoded file content, no `data:` URI prefix. */
  base64Data: string;
}

export interface SubmitReportInput {
  siteId: string;
  /** Optional: present only once an admin has linked the submitting LINE
   *  user to a registered Worker record — same optionality as
   *  `ReportRow.workerId`/`SiteReport.workerId` (Task 3). */
  workerId?: string;
  lineUserId: string;
  workerName: string;
  /** Calendar date only, `YYYY-MM-DD` (matches `ReportRow.reportDate`). */
  reportDate: string;
  workType: string;
  comment?: string;
  /** Phase 2: 進捗状況 code — required, resolved/validated server-side
   *  against PROGRESS_STATUS the same way `workType` is validated against
   *  WORK_TYPES. */
  progressStatus: string;
  /** Phase 2: required — exactly "YES" or "NO", never any other value. */
  hasIssue: "YES" | "NO";
  /** Phase 2: required only when hasIssue is "YES" (spec §6.1) — enforced
   *  by parseSubmitReportInput, not this type. */
  issueDetail?: string;
  /** Zero or more — `ReportRow.photoCount`/`Validation.validateReportRow`
   *  already treat 0 as a valid photo count, so an empty submission is
   *  not rejected here either (Task 5 §26: "do not invent arbitrary
   *  limits"). No maximum is enforced for the same reason — none is
   *  documented anywhere in the existing schema/architecture. */
  photos: SubmitReportPhotoInput[];
}
