/**
 * Thin server-only client for calling the GAS backend's single-action
 * endpoint (Phase 0 §H / Phase 3A `Api.ts`). Never import this file from
 * a Client Component — `GAS_WEBAPP_URL` (and any future shared secret)
 * must stay server-side.
 */

export interface GasClientSuccess<T> {
  ok: true;
  data: T;
}

export interface GasClientFailure {
  ok: false;
  error: { code: string; message: string };
}

export type GasClientResult<T> = GasClientSuccess<T> | GasClientFailure;

function failure(code: string, message: string): GasClientFailure {
  return { ok: false, error: { code, message } };
}

/** True only for a plausible `{ ok: boolean, ... }` envelope — the same
 *  shape GAS's `ApiResponse<T>` always produces (Api.ts). Does not
 *  validate `data`'s inner shape; callers validate that themselves. */
function isApiEnvelope(value: unknown): value is { ok: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/**
 * Calls one GAS action via its single-endpoint contract:
 * `POST { action, payload } -> { ok, data } | { ok: false, error }`.
 *
 * Requires `GAS_WEBAPP_URL` to already be set — callers that need a
 * demo/offline fallback (`lib/config/runtimeConfig.ts`) check that env
 * var themselves before calling this, so this function stays a single-
 * responsibility "talk to GAS" primitive.
 */
export async function callGasAction<T>(
  action: string,
  payload: unknown = {},
): Promise<GasClientResult<T>> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    throw new Error("GAS_WEBAPP_URL is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      // Business config (hours/holidays/feature flags) must never go
      // stale behind Next.js's fetch cache.
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    return failure("NETWORK_ERROR", `Failed to reach GAS: ${message}`);
  }

  if (!response.ok) {
    return failure("HTTP_ERROR", `GAS responded with HTTP ${response.status}.`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return failure("INVALID_RESPONSE", "GAS response was not valid JSON.");
  }

  if (!isApiEnvelope(parsed)) {
    return failure("INVALID_RESPONSE", "GAS response did not match the expected envelope.");
  }

  return parsed as GasClientResult<T>;
}
