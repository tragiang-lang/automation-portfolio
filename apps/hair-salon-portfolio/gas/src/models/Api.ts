import { ErrorCode } from "./ErrorCodes";

/** Shared request/response envelope for every action (Phase 0 §H). */
export interface ApiRequest {
  action: string;
  payload?: unknown;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
