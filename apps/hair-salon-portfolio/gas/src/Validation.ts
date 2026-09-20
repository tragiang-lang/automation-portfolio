import { ReservationRequest } from "./models/ReservationRequest";
import { ValidationIssue } from "./models/ReservationDomain";
import { isValidCalendarDateString } from "./Utils";

/**
 * Common (Layer A) reservation validation — required fields, formats,
 * length caps. Contains no salon-specific knowledge (menu/staff/business
 * hours) so a future non-salon vertical can reuse it unchanged (Phase 3C
 * §45/§79). Salon-specific rules live in `ReservationRules.ts`.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_FORMAT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_DIGITS_PATTERN = /^\d{9,11}$/;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 200;
const NOTES_MAX_LENGTH = 500;

/** Trims every string field and lowercases the email — never changes
 *  business semantics (Phase 3C §46). An empty-after-trim optional field
 *  collapses to `undefined` rather than `""` so downstream checks can use
 *  a single falsy test. */
export function normalizeReservationRequest(request: ReservationRequest): ReservationRequest {
  return {
    ...request,
    submissionId: request.submissionId?.trim() ?? "",
    serviceId: request.serviceId?.trim() ?? "",
    staffId: typeof request.staffId === "string" ? request.staffId.trim() : request.staffId,
    date: request.date?.trim() ?? "",
    time: request.time?.trim() ?? "",
    name: request.name?.trim() ?? "",
    email: request.email?.trim().toLowerCase() ?? "",
    phone: request.phone?.trim() || undefined,
    notes: request.notes?.trim() || undefined,
  };
}

/** Validates an already-normalized request's shape. Pure, never throws —
 *  an empty array means "no structural issues" (Phase 3C §44). Does not
 *  check menu/staff existence, business hours, or past-date/booking
 *  window — those need CONFIG/catalog data and live in
 *  `ReservationRules.ts`. */
export function validateReservationRequestShape(request: ReservationRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!request.submissionId) {
    issues.push({ field: "submissionId", code: "REQUIRED_FIELD_MISSING", message: "submissionId is required" });
  }
  if (!request.serviceId) {
    issues.push({ field: "serviceId", code: "REQUIRED_FIELD_MISSING", message: "serviceId is required" });
  }

  if (!request.name) {
    issues.push({ field: "name", code: "REQUIRED_FIELD_MISSING", message: "お名前を入力してください" });
  } else if (request.name.length > NAME_MAX_LENGTH) {
    issues.push({ field: "name", code: "TOO_LONG", message: `Name must be ${NAME_MAX_LENGTH} characters or fewer` });
  }

  if (!request.email) {
    issues.push({ field: "email", code: "REQUIRED_FIELD_MISSING", message: "メールアドレスを入力してください" });
  } else if (!EMAIL_PATTERN.test(request.email)) {
    issues.push({ field: "email", code: "INVALID_FORMAT", message: "メールアドレスの形式が正しくありません" });
  } else if (request.email.length > EMAIL_MAX_LENGTH) {
    issues.push({ field: "email", code: "TOO_LONG", message: `Email must be ${EMAIL_MAX_LENGTH} characters or fewer` });
  }

  if (request.phone && !PHONE_DIGITS_PATTERN.test(request.phone.replace(/[-\s()]/g, ""))) {
    issues.push({ field: "phone", code: "INVALID_FORMAT", message: "電話番号の形式が正しくありません" });
  }

  if (!request.date) {
    issues.push({ field: "date", code: "REQUIRED_FIELD_MISSING", message: "date is required" });
  } else if (!DATE_FORMAT_PATTERN.test(request.date)) {
    issues.push({ field: "date", code: "INVALID_FORMAT", message: "date must be YYYY-MM-DD" });
  } else if (!isValidCalendarDateString(request.date)) {
    issues.push({ field: "date", code: "INVALID_DATE", message: "date is not a real calendar date" });
  }

  if (!request.time) {
    issues.push({ field: "time", code: "REQUIRED_FIELD_MISSING", message: "time is required" });
  } else if (!TIME_FORMAT_PATTERN.test(request.time)) {
    issues.push({ field: "time", code: "INVALID_FORMAT", message: "time must be HH:mm (00:00-23:59)" });
  }

  if (request.notes && request.notes.length > NOTES_MAX_LENGTH) {
    issues.push({ field: "notes", code: "TOO_LONG", message: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer` });
  }

  return issues;
}
