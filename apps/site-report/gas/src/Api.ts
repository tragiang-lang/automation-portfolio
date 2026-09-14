import { getSiteReportConfig, SiteReportConfigError } from "./ConfigStore";
import { buildSitesResult, getSiteRows, SitesResult } from "./SitesRepository";
import { buildWorkTypesResult, getWorkTypeRows } from "./WorkTypesRepository";
import { MissingHeadersError } from "./RowMapper";
import { Site } from "./models/Site";
import { WorkType } from "./models/WorkType";
import { parseSubmitReportInput, submitReport, SubmitReportOutcome } from "./SubmitReportService";

// Re-exported unchanged for backward compatibility: buildSitesResult/
// SitesResult moved to SitesRepository.ts in Task 5 so
// SubmitReportService.ts's site-existence check can reuse it without
// importing Api.ts (would be circular — Api.ts imports SubmitReportService
// for the SUBMIT_REPORT action). Pure relocation, no behavior change;
// Api.test.ts's Task 4 tests still import both names from "./Api"
// unmodified.
export { buildSitesResult };
export type { SitesResult };

/** Shared request/response envelope for every action — same shape as
 *  apps/salon-portfolio/gas/src/models/Api.ts's ApiRequest/ApiResponse
 *  (generic, no salon coupling). Task 4 wired the first real action
 *  (GET_SITES); Task 5 adds SUBMIT_REPORT. */
export interface ApiRequest {
  action: string;
  payload?: unknown;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

/** Application-level API error codes (Task 4, extended Task 5) — every
 *  code maps to a fixed, safe-to-show message in this file, never a raw
 *  exception message (same boundary rule as salon's ERROR_CODES/Api.ts).
 *  Minimal set: only what GET_SITES/SUBMIT_REPORT actually need. */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFIG_INVALID: "CONFIG_INVALID",
  SHEET_ERROR: "SHEET_ERROR",
  DATA_INVALID: "DATA_INVALID",
  /** Task 5: SUBMIT_REPORT references a siteId that GET_SITES-equivalent
   *  lookup could not find — distinct from DATA_INVALID (that means the
   *  SITES sheet's *own* data is broken; this means the sheet is fine but
   *  the given siteId isn't in it). */
  SITE_NOT_FOUND: "SITE_NOT_FOUND",
  /** Task 5: a Drive upload failed for one of the submitted photos. */
  DRIVE_ERROR: "DRIVE_ERROR",
  /** Phase 1 P0: SUBMIT_REPORT references a workType code that
   *  GET_WORK_TYPES-equivalent lookup could not find — same relationship
   *  to DATA_INVALID as SITE_NOT_FOUND has (this means the sheet is fine
   *  but the given code isn't in it). */
  WORK_TYPE_NOT_FOUND: "WORK_TYPE_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Parses and shape-checks the raw POST body. Pure — never touches GAS
 *  globals — so dispatch logic is Jest-testable independent of Sheets
 *  access (same convention as salon's Api.ts parseApiRequest). */
export function parseApiRequest(
  rawBody: string | undefined,
): { ok: true; request: ApiRequest } | { ok: false; message: string } {
  if (!rawBody || rawBody.trim().length === 0) {
    return { ok: false, message: "Request body is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, message: "Request body is not valid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as { action?: unknown }).action !== "string" ||
    (parsed as { action: string }).action.trim().length === 0
  ) {
    return { ok: false, message: 'Request body must include a non-empty "action" field.' };
  }
  return { ok: true, request: parsed as ApiRequest };
}

export function buildSuccessResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function buildErrorResponse(code: ErrorCode, message: string): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}

/** Maps a caught SiteReportConfigError to the stable public error
 *  contract — never forwards `issues` (server-side diagnostic detail
 *  only) to the caller. The issues are logged to the execution
 *  transcript for the developer to inspect manually (same convention as
 *  salon's mapConfigErrorToResponse). */
export function mapConfigErrorToResponse(error: SiteReportConfigError): ApiResponse<never> {
  console.error("[GET_SITES] CONFIG_INVALID:", JSON.stringify(error.issues));
  return buildErrorResponse(
    ERROR_CODES.CONFIG_INVALID,
    "Site Report configuration could not be loaded. Please contact the administrator.",
  );
}

/** Maps a caught MissingHeadersError (RowMapper.ts — a required sheet
 *  column is missing/renamed) to the stable public error contract. The
 *  specific missing header names are logged server-side only and never
 *  included in the client-facing message (same convention as salon's
 *  mapMissingHeadersErrorToResponse). */
export function mapMissingHeadersErrorToResponse(error: MissingHeadersError): ApiResponse<never> {
  console.error("[GET_SITES] SHEET_ERROR: missing headers:", error.missing.join(", "));
  return buildErrorResponse(
    ERROR_CODES.SHEET_ERROR,
    "The Sites sheet could not be read. Please contact the administrator.",
  );
}

export interface GetSitesResponseData {
  sites: Site[];
}

function getSitesActionInner(): ApiResponse<GetSitesResponseData> {
  // Task 4 §8: GET_SITES must not bypass Task 2's CONFIG validation, even
  // though SiteReportConfig itself carries no per-sheet toggle — an
  // invalid CONFIG means the whole app is unhealthy, so every action
  // refuses the same way (same "read config first" shape as salon's
  // action handlers).
  getSiteReportConfig();

  const rows = getSiteRows();
  const result = buildSitesResult(rows);
  if (!result.ok) {
    if (result.kind === "malformed") {
      console.error(
        `[GET_SITES] malformed row at index ${result.index}, field "${result.field}": ${result.reason}`,
      );
    } else {
      console.error(`[GET_SITES] invalid row at index ${result.index}:`, JSON.stringify(result.issues));
    }
    return buildErrorResponse(
      ERROR_CODES.DATA_INVALID,
      "Site data failed validation. Please contact the administrator.",
    );
  }
  return buildSuccessResponse({ sites: result.sites });
}

/** `GET_SITES` action handler (Task 4). Thin: reads the real SITES sheet
 *  via SitesRepository.getSiteRows, maps+validates through
 *  buildSitesResult, and translates any thrown infrastructure error into
 *  the stable error envelope. Not unit tested directly with a real
 *  spreadsheet — getSiteReportConfig/getSiteRows are mocked in Api.test.ts
 *  the same way salon's Api.test.ts mocks getConfig/Catalog; buildSitesResult
 *  above and Validation.ts/RowMapper.ts carry the tested row-level logic. */
export function getSitesAction(): ApiResponse<GetSitesResponseData> {
  try {
    return getSitesActionInner();
  } catch (error) {
    if (error instanceof SiteReportConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[GET_SITES] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected server error occurred.");
  }
}

export interface GetWorkTypesResponseData {
  workTypes: WorkType[];
}

function getWorkTypesActionInner(): ApiResponse<GetWorkTypesResponseData> {
  getSiteReportConfig();
  const rows = getWorkTypeRows();
  const result = buildWorkTypesResult(rows);
  if (!result.ok) {
    if (result.kind === "malformed") {
      console.error(
        `[GET_WORK_TYPES] malformed row at index ${result.index}, field "${result.field}": ${result.reason}`,
      );
    } else {
      console.error(`[GET_WORK_TYPES] invalid row at index ${result.index}:`, JSON.stringify(result.issues));
    }
    return buildErrorResponse(
      ERROR_CODES.DATA_INVALID,
      "Work type data failed validation. Please contact the administrator.",
    );
  }
  return buildSuccessResponse({ workTypes: result.workTypes });
}

/** `GET_WORK_TYPES` action handler (Phase 1 P0) — mirrors getSitesAction
 *  exactly. Independently callable from GET_SITES (no shared state, no
 *  ordering requirement between the two). */
export function getWorkTypesAction(): ApiResponse<GetWorkTypesResponseData> {
  try {
    return getWorkTypesActionInner();
  } catch (error) {
    if (error instanceof SiteReportConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[GET_WORK_TYPES] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected server error occurred.");
  }
}

export interface SubmitReportResponseData {
  reportId: string;
  photoCount: number;
  /** Task 5 §19's chosen policy: a notification failure never fails an
   *  already-persisted submission. This flag is how the client learns the
   *  admin email may not have gone out, without the submission itself
   *  being reported as an error. */
  notificationSent: boolean;
}

/** Maps a SubmitReportService.SubmitReportOutcome to the stable public
 *  error contract. Every branch besides "success" logs the internal
 *  reason server-side only (never forwarded to the client) — same
 *  boundary rule as mapConfigErrorToResponse/mapMissingHeadersErrorToResponse
 *  above. */
function mapSubmitReportOutcomeToResponse(outcome: SubmitReportOutcome): ApiResponse<SubmitReportResponseData> {
  switch (outcome.kind) {
    case "success":
      return buildSuccessResponse({
        reportId: outcome.report.reportId,
        photoCount: outcome.report.photoCount,
        notificationSent: outcome.notificationSent,
      });
    case "site_not_found":
      return buildErrorResponse(ERROR_CODES.SITE_NOT_FOUND, "The referenced site could not be found.");
    case "sites_unavailable":
      // The SITES sheet's own data failed the same mapping/validation
      // GET_SITES uses (SitesRepository.buildSitesResult) — same public
      // code GET_SITES itself would return for that condition.
      console.error("[SUBMIT_REPORT] SITES sheet unavailable while resolving site.");
      return buildErrorResponse(
        ERROR_CODES.DATA_INVALID,
        "Site data could not be validated. Please contact the administrator.",
      );
    case "work_type_not_found":
      return buildErrorResponse(ERROR_CODES.WORK_TYPE_NOT_FOUND, "The referenced work type could not be found.");
    case "work_types_unavailable":
      console.error("[SUBMIT_REPORT] WORK_TYPES sheet unavailable while resolving work type.");
      return buildErrorResponse(
        ERROR_CODES.DATA_INVALID,
        "Work type data could not be validated. Please contact the administrator.",
      );
    case "drive_upload_failed":
      console.error("[SUBMIT_REPORT] Drive upload failed:", outcome.reason);
      return buildErrorResponse(
        ERROR_CODES.DRIVE_ERROR,
        "One or more report photos could not be uploaded. Please try again.",
      );
    case "reports_write_failed":
      console.error("[SUBMIT_REPORT] REPORTS write failed:", outcome.reason);
      return buildErrorResponse(ERROR_CODES.SHEET_ERROR, "The report could not be saved. Please try again.");
    case "report_photos_write_failed":
      console.error("[SUBMIT_REPORT] REPORT_PHOTOS write failed:", outcome.reason);
      return buildErrorResponse(
        ERROR_CODES.SHEET_ERROR,
        "The report could not be fully saved. Please contact the administrator.",
      );
  }
}

function submitReportActionInner(rawPayload: unknown): ApiResponse<SubmitReportResponseData> {
  const parsed = parseSubmitReportInput(rawPayload);
  if (!parsed.ok) {
    console.error("[SUBMIT_REPORT] request validation failed:", JSON.stringify(parsed.issues));
    return buildErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      "The submitted report failed validation. Please check the required fields and try again.",
    );
  }
  return mapSubmitReportOutcomeToResponse(submitReport(parsed.input));
}

/** `SUBMIT_REPORT` action handler (Task 5). Thin: parses/validates the
 *  request (SubmitReportService.parseSubmitReportInput — nothing is
 *  written before this succeeds), then delegates the entire
 *  validate→upload→persist→notify workflow to
 *  SubmitReportService.submitReport, translating both its result and any
 *  thrown infrastructure error (SiteReportConfigError/MissingHeadersError
 *  — same as getSitesAction) into the stable envelope. All business
 *  workflow logic lives in SubmitReportService.ts, not here (Task 5
 *  §36). */
export function submitReportAction(rawPayload: unknown): ApiResponse<SubmitReportResponseData> {
  try {
    return submitReportActionInner(rawPayload);
  } catch (error) {
    if (error instanceof SiteReportConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[SUBMIT_REPORT] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected server error occurred.");
  }
}

/** Single POST entrypoint's dispatch logic (same "all actions share one
 *  endpoint, routed by an `action` field" shape as salon's
 *  handleApiRequest). `GET_SITES` (Task 4) and `SUBMIT_REPORT` (Task 5)
 *  are the only implemented actions — every other action name is
 *  rejected as a validation error. */
export function handleApiRequest(rawBody: string | undefined): ApiResponse {
  const parsed = parseApiRequest(rawBody);
  if (!parsed.ok) {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, parsed.message);
  }
  switch (parsed.request.action) {
    case "GET_SITES":
      return getSitesAction();
    case "GET_WORK_TYPES":
      return getWorkTypesAction();
    case "SUBMIT_REPORT":
      return submitReportAction(parsed.request.payload);
    default:
      return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, `Unsupported action: "${parsed.request.action}".`);
  }
}
