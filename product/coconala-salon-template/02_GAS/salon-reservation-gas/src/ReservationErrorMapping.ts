import { ReservationIssueCode, ValidationIssue } from "./models/ReservationDomain";
import { ERROR_CODES, ErrorCode } from "./models/ErrorCodes";

/**
 * Maps one fine-grained domain `ValidationIssue` (`models/ReservationDomain.ts`)
 * onto the coarse public `ErrorCode` envelope (`models/ErrorCodes.ts`) —
 * the two are intentionally separate unions (Phase 3C), this is the one
 * place they meet. Never forwards the issue's own `message`/`field` —
 * always a fixed, safe Japanese string per code (Phase 0 §H/§N).
 */

const SLOT_UNAVAILABLE_CODES: ReadonlySet<ReservationIssueCode> = new Set([
  "CALENDAR_CONFLICT",
  "STAFF_NOT_AVAILABLE",
  "NO_STAFF_AVAILABLE",
]);

const SAFE_MESSAGES: Record<ReservationIssueCode, string> = {
  REQUIRED_FIELD_MISSING: "入力内容に不備があります。必須項目をご確認ください。",
  INVALID_FORMAT: "入力内容の形式が正しくありません。",
  INVALID_DATE: "日付が正しくありません。",
  TOO_LONG: "入力内容が長すぎます。",
  MENU_NOT_FOUND: "選択されたメニューが見つかりません。",
  MENU_NOT_BOOKABLE: "選択されたメニューは現在ご予約いただけません。",
  STAFF_NOT_FOUND: "選択されたスタッフが見つかりません。",
  STAFF_NOT_AVAILABLE: "選択された時間帯はご利用いただけません。",
  STAFF_SELECTION_NOT_SUPPORTED: "スタッフのご指定は現在承っておりません。",
  OUTSIDE_BUSINESS_HOURS: "選択された時間は営業時間外です。",
  HOLIDAY: "選択された日は休業日です。",
  PAST_DATE: "選択された日時は既に過ぎているか、受付可能な時間帯ではありません。",
  OUTSIDE_BOOKING_WINDOW: "選択された日付はご予約可能な期間を超えています。",
  CALENDAR_CONFLICT: "選択された時間帯はご利用いただけません。",
  NO_STAFF_AVAILABLE: "選択された時間帯にご案内できるスタッフがおりません。",
};

export function mapReservationIssueToErrorResponse(
  issue: ValidationIssue,
): { code: ErrorCode; message: string } {
  const code: ErrorCode = SLOT_UNAVAILABLE_CODES.has(issue.code)
    ? ERROR_CODES.SLOT_UNAVAILABLE
    : ERROR_CODES.VALIDATION_ERROR;
  return { code, message: SAFE_MESSAGES[issue.code] };
}
