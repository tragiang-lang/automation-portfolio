/**
 * Site Report backend API contract, hand-mirrored (Task 6) from
 * `apps/site-report/gas/src/Api.ts` and `apps/site-report/gas/src/models/
 * SubmitReportInput.ts`. There is no shared `packages/` between `web` and
 * `gas` yet (see docs/site-report-architecture-overview.md — "Why there
 * is no shared `packages/` yet"), so these types are copied, not
 * imported, and must be kept in sync by hand if the GAS contract changes.
 *
 * Nothing here is invented: every field name/shape matches the GAS side
 * exactly. No `idempotencyKey`/`submissionId` field is added — Task 5
 * explicitly identified client-side double-submit as a known, deferred
 * limitation, not something this task fixes. The photo wire format
 * (`fileName`/`mimeType`/`base64Data`) is reproduced as-is.
 */

/** Same envelope shape as GAS `Api.ts`'s `ApiRequest`. */
export interface SiteReportApiRequest {
  action: string;
  payload?: unknown;
}

/** Same envelope shape as GAS `Api.ts`'s `ApiResponse<T>`. */
export type SiteReportApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/** The two actions `apps/site-report/gas/src/index.ts`'s `handleApiRequest`
 *  currently dispatches. Kept as named constants (not just literal
 *  strings scattered at call sites) so a future caller can't typo an
 *  action name. */
export const SITE_REPORT_ACTIONS = {
  GET_SITES: "GET_SITES",
  GET_WORK_TYPES: "GET_WORK_TYPES",
  SUBMIT_REPORT: "SUBMIT_REPORT",
} as const;

export type SiteReportAction = (typeof SITE_REPORT_ACTIONS)[keyof typeof SITE_REPORT_ACTIONS];

/** Mirrors GAS `models/Site.ts`'s `Site` exactly. */
export interface Site {
  siteId: string;
  siteCode: string;
  name: string;
  address?: string;
  clientName?: string;
  status: "ACTIVE" | "INACTIVE";
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors GAS `Api.ts`'s `GetSitesResponseData` — the `GET_SITES`
 *  success payload. */
export interface GetSitesResponseData {
  sites: Site[];
}

/** Mirrors GAS `models/WorkType.ts`'s `WorkType` exactly. */
export interface WorkType {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}

/** Mirrors GAS `Api.ts`'s `GetWorkTypesResponseData` — the
 *  `GET_WORK_TYPES` success payload. */
export interface GetWorkTypesResponseData {
  workTypes: WorkType[];
}

/** Mirrors GAS `models/SubmitReportInput.ts`'s `SubmitReportPhotoInput`.
 *  Base64-encoded file content, no `data:` URI prefix — the existing wire
 *  format, not redesigned here. */
export interface SubmitReportPhotoInput {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

/** Mirrors GAS `models/SubmitReportInput.ts`'s `SubmitReportInput` — the
 *  `SUBMIT_REPORT` request payload. Never carries server-generated
 *  fields (`reportId`, `photoCount`, `status`, `createdAt`/`updatedAt`). */
export interface SubmitReportInput {
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photos: SubmitReportPhotoInput[];
}

/** Mirrors GAS `Api.ts`'s `SubmitReportResponseData` — the `SUBMIT_REPORT`
 *  success payload. */
export interface SubmitReportResponseData {
  reportId: string;
  photoCount: number;
  notificationSent: boolean;
}
