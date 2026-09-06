import { ApiRequest, ApiResponse } from "./models/Api";
import { ERROR_CODES, ErrorCode } from "./models/ErrorCodes";
import { ConfigError, getConfig } from "./ConfigStore";
import { buildPublicConfig } from "./PublicConfig";
import { PublicConfig } from "./models/Config";
import { MissingHeadersError } from "./RowMapper";

/** Parses and shape-checks the raw POST body. Pure — never touches GAS
 *  globals — so the dispatch logic is Jest-testable independent of
 *  Sheets access (Decision 3: no DI seam manufactured — this is a plain
 *  function over a plain string, not an injected interface). */
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
    return {
      ok: false,
      message: 'Request body must include a non-empty "action" field.',
    };
  }
  return { ok: true, request: parsed as ApiRequest };
}

export function buildSuccessResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function buildErrorResponse(
  code: ErrorCode,
  message: string,
): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}

/** Maps a caught ConfigError to the stable public error contract — never
 *  forwards `issues` (server-side diagnostic detail only) to the caller
 *  (Phase 3A §9). The issues are logged to the execution transcript
 *  (Phase 0 §O layer 1) for the developer to inspect manually; ERROR_LOG
 *  sheet persistence is Phase 3B+ (Phase 3A §34: establish the schema,
 *  don't wire every function into it yet). */
export function mapConfigErrorToResponse(
  error: ConfigError,
): ApiResponse<never> {
  console.error("[getConfig] CONFIG_INVALID:", JSON.stringify(error.issues));
  return buildErrorResponse(
    ERROR_CODES.CONFIG_INVALID,
    "設定情報の読み込みに失敗しました。管理者にお問い合わせください。",
  );
}

/** Maps a caught MissingHeadersError (RowMapper.ts — a required sheet
 *  column is missing/renamed) to the stable public error contract — an
 *  operator-fixable condition distinct from CONFIG_INVALID/INTERNAL_ERROR,
 *  which is exactly what SHEET_ERROR exists to represent. The specific
 *  missing header names are logged server-side only (console.error) and
 *  never included in the client-facing message (Phase 3A §9, mirroring
 *  mapConfigErrorToResponse above). */
export function mapMissingHeadersErrorToResponse(
  error: MissingHeadersError,
): ApiResponse<never> {
  console.error("[getConfig] SHEET_ERROR: missing headers:", error.missing.join(", "));
  return buildErrorResponse(
    ERROR_CODES.SHEET_ERROR,
    "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。",
  );
}

/** `getConfig` action handler (Phase 0 §G/§H, Phase 3A §19). Thin: reads
 *  real CONFIG/HOLIDAYS sheets via ConfigStore, maps to the public
 *  projection, and translates a ConfigError into the stable error
 *  envelope. Not unit tested directly (it touches SpreadsheetApp through
 *  ConfigStore.getConfig) — ConfigStore's own parsing/validation logic
 *  and mapConfigErrorToResponse above carry the tested behavior. */
export function getConfigAction(): ApiResponse<PublicConfig> {
  try {
    const config = getConfig();
    return buildSuccessResponse(buildPublicConfig(config));
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[getConfig] unexpected error:", error);
    return buildErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "サーバーエラーが発生しました。",
    );
  }
}

/** Single POST entrypoint's dispatch logic (Phase 0 §G: "all actions
 *  share one endpoint, routed by an `action` field"). Only `getConfig`
 *  is implemented in Phase 3A (§2 scope rule) — every other action name
 *  is rejected as a validation error; there is nothing else to route to
 *  yet (getServices/getStaff/createReservation/etc. are Phase 3B+). */
export function handleApiRequest(rawBody: string | undefined): ApiResponse {
  const parsed = parseApiRequest(rawBody);
  if (!parsed.ok) {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, parsed.message);
  }
  switch (parsed.request.action) {
    case "getConfig":
      return getConfigAction();
    default:
      return buildErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported action: "${parsed.request.action}".`,
      );
  }
}
