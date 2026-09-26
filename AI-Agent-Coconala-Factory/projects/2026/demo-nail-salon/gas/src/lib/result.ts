/**
 * Response envelope + stable error codes shared by every action.
 *
 * Same contract as the salon apps' `models/Api.ts` (see
 * docs/reusable-assets-audit.md): callers only ever see a fixed, safe
 * Japanese message per code — never a raw exception message, never an
 * echoed input value.
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNKNOWN_ACTION: "UNKNOWN_ACTION",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  UNAUTHORIZED: "UNAUTHORIZED",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  SYSTEM_BUSY: "SYSTEM_BUSY",
  CONFIG_INVALID: "CONFIG_INVALID",
  SHEET_ERROR: "SHEET_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES_JA: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "入力内容をご確認ください。",
  UNKNOWN_ACTION: "この操作には対応していません。",
  FEATURE_DISABLED: "現在この機能はご利用いただけません。",
  UNAUTHORIZED: "アクセスが許可されていません。",
  SLOT_UNAVAILABLE: "ご希望の日時はご予約いただけません。別の日時をお選びください。",
  SYSTEM_BUSY: "ただいま混み合っています。少し時間をおいて再度お試しください。",
  CONFIG_INVALID: "設定情報の読み込みに失敗しました。お手数ですが店舗へ直接お問い合わせください。",
  SHEET_ERROR: "データの読み込みに失敗しました。お手数ですが店舗へ直接お問い合わせください。",
  INTERNAL_ERROR: "エラーが発生しました。お手数ですが店舗へ直接お問い合わせください。",
};

/** One field-level problem. `message` is safe to show; it never repeats
 *  the submitted value back. */
export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; issues?: ValidationIssue[] } };

/** Thrown by actions/services for any expected failure. `detail` is for
 *  server-side logs only and is never sent to the caller. */
export class ActionError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly detail: string = code,
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(detail);
    this.name = "ActionError";
  }
}

export function success<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function failure(code: ErrorCode, issues: ValidationIssue[] = []): ApiResponse<never> {
  const error: { code: ErrorCode; message: string; issues?: ValidationIssue[] } = {
    code,
    message: ERROR_MESSAGES_JA[code],
  };
  if (issues.length > 0) {
    error.issues = issues;
  }
  return { ok: false, error };
}

/** Converts anything thrown into a safe response. Unknown errors collapse
 *  to INTERNAL_ERROR so no raw exception text can reach a customer. */
export function toFailure(error: unknown): ApiResponse<never> {
  if (error instanceof ActionError) {
    return failure(error.code, error.code === ERROR_CODES.VALIDATION_ERROR ? error.issues : []);
  }
  return failure(ERROR_CODES.INTERNAL_ERROR);
}
