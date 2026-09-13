/**
 * Application-level LIFF types (Task 6). The rest of the app must never
 * depend on the raw `@line/liff` SDK's response shapes directly — every
 * boundary in `lib/liff.ts` produces/consumes only these types.
 */

/** Normalized LINE profile. Deliberately smaller than the raw LIFF SDK
 *  profile response — only the fields Site Report actually needs, and
 *  never an access token (see `lib/liff.ts`'s `normalizeLiffProfile`). */
export interface SiteReportLiffUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/** Stable, machine-readable error codes for every documented LIFF
 *  failure path (Task 6 §12). Not the same set as `apps/site-report/gas`'s
 *  `ErrorCode` (`Api.ts`) — this is a client-side SDK/profile boundary,
 *  not the backend API envelope. */
export type LiffErrorCode =
  | "LIFF_CONFIG_MISSING"
  | "LIFF_INIT_FAILED"
  | "LIFF_LOGIN_STATUS_FAILED"
  | "LIFF_LOGIN_FAILED"
  | "LIFF_PROFILE_FAILED"
  | "LIFF_PROFILE_INVALID"
  | "LIFF_UNAVAILABLE_SSR";

/** Application-level error shape. `message` is safe to show a user;
 *  the original thrown error (if any) is never attached here — see
 *  `createLiffError` in `lib/liff.ts`. */
export interface LiffError {
  code: LiffErrorCode;
  message: string;
}

/** Discriminated LIFF state. A UI branches on `status` alone — `ready`
 *  is the only variant carrying `profile`, `error` the only one carrying
 *  `error`, so there is never a need to infer state from combinations of
 *  optional fields. */
export type LiffState =
  | { status: "loading" }
  | { status: "login-required" }
  | { status: "ready"; profile: SiteReportLiffUser }
  | { status: "error"; error: LiffError };
