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

/** REPORTS: persisted site report records. Schema only — no code path
 *  writes to this sheet yet (Task 1 scope rule). */
export const REPORTS_HEADERS = [
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
  [SHEET_NAMES.REPORTS]: REPORTS_HEADERS,
  [SHEET_NAMES.REPORT_PHOTOS]: REPORT_PHOTOS_HEADERS,
};
