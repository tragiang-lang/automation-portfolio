/**
 * Thin Google Drive adapter (Task 5) — wraps DriveApp; decides nothing
 * about filenames, folder resolution beyond the given ID, or retry
 * policy. Not unit tested by Jest (same convention as SheetStore.ts's
 * real-Sheets-touching functions) — SubmitReportService.ts's
 * orchestration carries the tested logic around it, with this module
 * mocked wholesale in its tests.
 */

export interface UploadReportPhotoInput {
  /** Destination folder ID — always the caller-resolved
   *  `SiteReportConfig.driveRootFolderId` (Task 2 CONFIG), never
   *  hard-coded here. */
  folderId: string;
  fileName: string;
  mimeType: string;
  /** Base64-encoded file content, no `data:` URI prefix. */
  base64Data: string;
}

export interface UploadReportPhotoResult {
  fileId: string;
  fileUrl: string;
}

/** Uploads one photo into the configured Drive folder. Throws whatever
 *  DriveApp/Utilities throws (invalid folder ID, quota, malformed blob)
 *  — SubmitReportService.ts is responsible for catching this and running
 *  its cleanup/error-mapping policy; this function performs no retry and
 *  makes no partial-failure decision itself. */
export function uploadReportPhoto(input: UploadReportPhotoInput): UploadReportPhotoResult {
  const folder = DriveApp.getFolderById(input.folderId);
  const blob = Utilities.newBlob(Utilities.base64Decode(input.base64Data), input.mimeType, input.fileName);
  const file = folder.createFile(blob);
  return { fileId: file.getId(), fileUrl: file.getUrl() };
}

/** Soft-deletes (trashes, never permanently deletes) a Drive file.
 *  Callers must only ever pass the ID of a file *this request itself*
 *  just uploaded (Task 5 §20: cleanup must never touch a pre-existing,
 *  unrelated Drive file) — this function has no way to verify that on
 *  its own, so the caller (SubmitReportService.ts) is the sole trust
 *  boundary for that rule. */
export function deleteUploadedFile(fileId: string): void {
  DriveApp.getFileById(fileId).setTrashed(true);
}
