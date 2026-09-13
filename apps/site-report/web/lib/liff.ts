/**
 * LIFF (LINE Front-end Framework) foundation for Site Report (Task 6).
 *
 * Boundary: nothing outside this file should call `liff.init()`,
 * `liff.login()`, or `liff.getProfile()` directly, or depend on the raw
 * `@line/liff` SDK response shapes — the rest of the app works only with
 * `LiffState`/`SiteReportLiffUser`/`LiffError` from `@/types/liff`.
 *
 * Scope: LIFF init + LINE profile only. This file never calls
 * `callSiteReportAction`/`GET_SITES`/`SUBMIT_REPORT` — see
 * `lib/api/siteReportClient.ts`'s header comment for why that boundary
 * is separate, and `docs/site-report-architecture-overview.md` for the
 * overall rationale.
 */

import type { LiffError, LiffErrorCode, LiffState, SiteReportLiffUser } from "@/types/liff";

const LIFF_ID_ENV_VAR = "NEXT_PUBLIC_LIFF_ID";

/** Reads the LIFF ID from configuration. Public (`NEXT_PUBLIC_`) is
 *  required here — unlike `GAS_WEBAPP_URL` in `lib/api/siteReportClient.ts`,
 *  `liff.init()` runs in the browser, so this value must be present in
 *  the client bundle. A LIFF ID is not a secret, but it still goes
 *  through this configuration boundary rather than being hard-coded at
 *  any call site. */
export function getLiffConfig(): { liffId: string } | null {
  const liffId = process.env[LIFF_ID_ENV_VAR];
  if (!liffId || liffId.trim().length === 0) {
    return null;
  }
  return { liffId };
}

/** Builds a stable application-level error. `cause`, when given, is
 *  logged here (message only — never a raw profile, never a token) for
 *  debugging, but is never attached to the returned `LiffError` so it
 *  can never leak into UI state. */
export function createLiffError(code: LiffErrorCode, message: string, cause?: unknown): LiffError {
  if (cause !== undefined) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    console.error(`[liff] ${code}: ${message} (cause: ${causeMessage})`);
  }
  return { code, message };
}

/** Normalizes a raw LIFF SDK profile response into the stable
 *  `SiteReportLiffUser` shape. Returns `null` (never throws) when a
 *  required field is missing or the wrong type — callers turn that into
 *  `LIFF_PROFILE_INVALID`. Never mutates the raw object; `userId` is
 *  copied through unchanged (never hashed/transformed/trimmed — Task 6
 *  §15); optional fields are omitted entirely rather than set to `""`
 *  when absent. No access token or other raw-SDK-only field is ever
 *  copied through. */
export function normalizeLiffProfile(raw: unknown): SiteReportLiffUser | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;

  const userId = candidate.userId;
  const displayName = candidate.displayName;
  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }
  if (typeof displayName !== "string" || displayName.length === 0) {
    return null;
  }

  const profile: SiteReportLiffUser = { userId, displayName };
  if (typeof candidate.pictureUrl === "string") {
    profile.pictureUrl = candidate.pictureUrl;
  }
  if (typeof candidate.statusMessage === "string") {
    profile.statusMessage = candidate.statusMessage;
  }
  return profile;
}

async function loadLiffSdk() {
  // Dynamic import: keeps `@line/liff` out of any module evaluated during
  // SSR/build, and out of the bundle path entirely unless this function
  // actually runs in a browser (Task 6 §23).
  const mod = await import("@line/liff");
  return mod.default;
}

async function runInitialization(): Promise<LiffState> {
  if (typeof window === "undefined") {
    return {
      status: "error",
      error: createLiffError("LIFF_UNAVAILABLE_SSR", "LIFF is only available in the browser."),
    };
  }

  const config = getLiffConfig();
  if (!config) {
    return {
      status: "error",
      error: createLiffError(
        "LIFF_CONFIG_MISSING",
        "LIFF is not configured for this deployment.",
      ),
    };
  }

  const liff = await loadLiffSdk();

  try {
    await liff.init({ liffId: config.liffId });
  } catch (error) {
    return {
      status: "error",
      error: createLiffError("LIFF_INIT_FAILED", "Failed to initialize the LINE app.", error),
    };
  }

  let loggedIn: boolean;
  try {
    loggedIn = liff.isLoggedIn();
  } catch (error) {
    return {
      status: "error",
      error: createLiffError(
        "LIFF_LOGIN_STATUS_FAILED",
        "Failed to determine the LINE login status.",
        error,
      ),
    };
  }

  if (!loggedIn) {
    return { status: "login-required" };
  }

  let rawProfile: unknown;
  try {
    rawProfile = await liff.getProfile();
  } catch (error) {
    return {
      status: "error",
      error: createLiffError(
        "LIFF_PROFILE_FAILED",
        "Failed to retrieve the LINE profile.",
        error,
      ),
    };
  }

  const profile = normalizeLiffProfile(rawProfile);
  if (!profile) {
    return {
      status: "error",
      error: createLiffError(
        "LIFF_PROFILE_INVALID",
        "The LINE profile response was missing required fields.",
      ),
    };
  }

  return { status: "ready", profile };
}

/** Cached across repeated calls (module-scoped) so a second/third caller
 *  (e.g. two components both awaiting readiness) never triggers a
 *  duplicate `liff.init()`/`getProfile()` call or produces inconsistent
 *  state (Task 6 §11). Does not itself call `login()` — an
 *  unauthenticated user resolves to `login-required`; only
 *  `loginToSiteReport()` below ever calls `liff.login()`, and only when a
 *  caller (future UI) explicitly invokes it. */
let cachedInitPromise: Promise<LiffState> | null = null;

export function initializeSiteReportLiff(): Promise<LiffState> {
  if (!cachedInitPromise) {
    cachedInitPromise = runInitialization();
  }
  return cachedInitPromise;
}

/** Explicit, UI-triggered login action (Task 6 §14) — never called by
 *  `initializeSiteReportLiff` itself, so there is no automatic-login
 *  loop. Callers only need this after seeing `status: "login-required"`. */
export async function loginToSiteReport(): Promise<void> {
  if (typeof window === "undefined") {
    throw createLiffError(
      "LIFF_UNAVAILABLE_SSR",
      "LIFF login is only available in the browser.",
    );
  }

  const liff = await loadLiffSdk();
  try {
    liff.login();
  } catch (error) {
    throw createLiffError("LIFF_LOGIN_FAILED", "Failed to start LINE login.", error);
  }
}
