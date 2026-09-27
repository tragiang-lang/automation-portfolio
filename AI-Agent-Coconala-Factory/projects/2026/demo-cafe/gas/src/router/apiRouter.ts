import type { ActionRegistry } from "../actions/types";
import { ApiResponse, ERROR_CODES, failure, success, toFailure } from "../lib/result";
import { MissingHeadersError } from "../lib/rowMapper";
import type { ActionContext } from "../services/context";

/**
 * JSON API: `{ "action": "<id>", "payload": { ... } }`. Only actions whose
 * definition includes the "api" exposure are listed in `apiActions`
 * (generated from the Action Registry). The API is off unless the
 * `API_ENABLED` Script Property is "true". Phase 1 has no web front end,
 * so the API stays closed by default.
 */

export function parseApiBody(rawBody: string | undefined): { action: string; payload: unknown } | null {
  if (!rawBody || rawBody.trim() === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(rawBody) as { action?: unknown; payload?: unknown };
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    if (typeof parsed.action !== "string" || parsed.action.trim() === "") return null;
    return { action: parsed.action.trim(), payload: parsed.payload };
  } catch {
    return null;
  }
}

export function handleApiRequest(
  rawBody: string | undefined,
  options: { apiEnabled: boolean; registry: ActionRegistry; apiActions: readonly string[]; ctx: () => ActionContext },
): ApiResponse {
  if (!options.apiEnabled) {
    return failure(ERROR_CODES.FEATURE_DISABLED);
  }
  const request = parseApiBody(rawBody);
  if (!request) {
    return failure(ERROR_CODES.VALIDATION_ERROR, [{ field: "action", code: "REQUIRED", message: "action を指定してください" }]);
  }
  const handler = options.registry[request.action];
  if (!handler || !options.apiActions.includes(request.action)) {
    return failure(ERROR_CODES.UNKNOWN_ACTION);
  }
  let ctx: ActionContext | undefined;
  try {
    ctx = options.ctx();
    const input = handler.parse(request.payload);
    return success(handler.run(input, ctx));
  } catch (error) {
    if (error instanceof MissingHeadersError) {
      ctx?.logger.error("api.sheet_headers", error.message, { action: request.action });
      return failure(ERROR_CODES.SHEET_ERROR);
    }
    ctx?.logger.error("api.failed", error instanceof Error ? error.message : String(error), { action: request.action });
    return toFailure(error);
  }
}
