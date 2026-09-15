import { SHEET_NAMES, SheetName } from "./SheetNames";

/** CONFIG: human-editable key/value rows. */
export const CONFIG_HEADERS = ["Key", "Value"] as const;
export interface ConfigRow {
  Key: unknown;
  Value: unknown;
}

/** SITES: construction site master. */
export const SITES_HEADERS = [
  "siteId",
  "siteCode",
  "name",
  "address",
  "clientName",
  "status",
  "startDate",
  "endDate",
  "createdAt",
  "updatedAt",
] as const;
export interface SiteRow {
  siteId: string;
  siteCode: string;
  name: string;
  address?: string;
  clientName?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** WORKERS: LINE-linked field worker master. */
export const WORKERS_HEADERS = [
  "workerId",
  "lineUserId",
  "displayName",
  "email",
  "role",
  "status",
  "createdAt",
  "updatedAt",
] as const;
export interface WorkerRow {
  workerId: string;
  lineUserId: string;
  displayName: string;
  email?: string;
  role?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** REPORTS: persisted site report records. The original 12 columns, in
 *  their original order — never reordered (Phase 1 P0 constraint). */
const REPORTS_BASE_HEADERS = [
  "reportId",
  "siteId",
  "workerId",
  "lineUserId",
  "workerName",
  "reportDate",
  "workType",
  "comment",
  "photoCount",
  "status",
  "createdAt",
  "updatedAt",
] as const;

/** Full write-time column order, base + the Phase 1 P0 addition +
 *  Phase 2's four additions. `workTypeName`/`progressStatus`/
 *  `progressStatusName`/`hasIssue`/`issueDetail` are all resolved/
 *  validated server-side (SubmitReportService), never trusted from client
 *  input. Deliberately NOT used as REQUIRED_HEADERS[REPORTS] below — see
 *  that constant's own comment for why. */
export const REPORTS_HEADERS = [
  ...REPORTS_BASE_HEADERS,
  "workTypeName",
  "progressStatus",
  "progressStatusName",
  "hasIssue",
  "issueDetail",
] as const;

export interface ReportRow {
  reportId: string;
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photoCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  /** Phase 1 P0: Japanese label resolved from WORK_TYPES at submission
   *  time. Optional — absent on every report row written before this
   *  column existed. */
  workTypeName?: string;
  /** Phase 2: 進捗状況 code, validated against PROGRESS_STATUS at
   *  submission time. Optional — absent on every pre-Phase-2 row. */
  progressStatus?: string;
  /** Phase 2: Japanese label resolved from PROGRESS_STATUS at submission
   *  time, same "?? code" fallback pattern as workTypeName. */
  progressStatusName?: string;
  /** Phase 2: raw sheet cell, "YES" | "NO" | "" — RowMapper coerces this
   *  to a real "YES"|"NO"|undefined union; kept as a loose string here so
   *  an empty/pre-Phase-2 cell never breaks header mapping. */
  hasIssue?: string;
  /** Phase 2: free text, required only when hasIssue is "YES" — that
   *  conditional rule is enforced by SubmitReportService, not this
   *  row-shape type. */
  issueDetail?: string;
}

/** WORK_TYPES: 作業種別 master data (Phase 1 P0). `status`/`sortOrder`
 *  mirror the SITES/WORKERS `status` convention and REPORTS's
 *  `photoCount` non-negative-integer convention respectively — no new
 *  representational idea introduced. */
export const WORK_TYPES_HEADERS = ["code", "name", "status", "sortOrder"] as const;
export interface WorkTypeRow {
  code: string;
  name: string;
  status: string;
  sortOrder: number;
}

/** PROGRESS_STATUS: 進捗状況 master data (Phase 2). Exact same shape as
 *  WORK_TYPES — same status/sortOrder convention. */
export const PROGRESS_STATUS_HEADERS = ["code", "name", "status", "sortOrder"] as const;
export interface ProgressStatusRow {
  code: string;
  name: string;
  status: string;
  sortOrder: number;
}

/** REPORT_PHOTOS: photos attached to a report. Schema only. */
export const REPORT_PHOTOS_HEADERS = [
  "photoId",
  "reportId",
  "fileId",
  "fileUrl",
  "fileName",
  "mimeType",
  "createdAt",
] as const;
export interface ReportPhotoRow {
  photoId: string;
  reportId: string;
  fileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

/** Required headers per sheet, keyed by canonical sheet name — used for
 *  missing-header detection before any row mapping (same convention as
 *  apps/salon-portfolio/gas/src/SheetSchemas.ts's REQUIRED_HEADERS). */
export const REQUIRED_HEADERS: Record<SheetName, readonly string[]> = {
  [SHEET_NAMES.CONFIG]: CONFIG_HEADERS,
  [SHEET_NAMES.SITES]: SITES_HEADERS,
  [SHEET_NAMES.WORKERS]: WORKERS_HEADERS,
  // Deliberately the 12-column base, not the 17-column REPORTS_HEADERS —
  // Setup.ts's dedicated workTypeName/Phase-2-columns backfill steps
  // handle columns 13-17 additively so an existing production sheet
  // never fails this required-header check (spec §7).
  [SHEET_NAMES.REPORTS]: REPORTS_BASE_HEADERS,
  [SHEET_NAMES.REPORT_PHOTOS]: REPORT_PHOTOS_HEADERS,
  [SHEET_NAMES.WORK_TYPES]: WORK_TYPES_HEADERS,
  [SHEET_NAMES.PROGRESS_STATUS]: PROGRESS_STATUS_HEADERS,
};
