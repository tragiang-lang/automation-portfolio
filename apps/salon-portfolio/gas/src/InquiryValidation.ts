import { InquiryRequest } from "./models/InquiryRequest";
import { ValidationIssue } from "./models/ReservationDomain";

/**
 * Inquiry request validation (Starter MVP §2) — mirrors Validation.ts's
 * normalize/validate split for reservations. Contains no salon-specific
 * knowledge, same reusability goal as that module.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_PATTERN = /^\d{9,11}$/;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 200;
const MESSAGE_MAX_LENGTH = 2000;
const SUBJECT_MAX_LENGTH = 200;

export function normalizeInquiryRequest(request: InquiryRequest): InquiryRequest {
  return {
    ...request,
    submissionId: request.submissionId?.trim() ?? "",
    name: request.name?.trim() ?? "",
    email: request.email?.trim().toLowerCase() ?? "",
    phone: request.phone?.trim() || undefined,
    subject: request.subject?.trim() || undefined,
    message: request.message?.trim() ?? "",
  };
}

export function validateInquiryRequestShape(request: InquiryRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!request.submissionId) {
    issues.push({ field: "submissionId", code: "REQUIRED_FIELD_MISSING", message: "submissionId is required" });
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

  if (request.subject && request.subject.length > SUBJECT_MAX_LENGTH) {
    issues.push({ field: "subject", code: "TOO_LONG", message: `Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer` });
  }

  if (!request.message) {
    issues.push({ field: "message", code: "REQUIRED_FIELD_MISSING", message: "お問い合わせ内容を入力してください" });
  } else if (request.message.length > MESSAGE_MAX_LENGTH) {
    issues.push({ field: "message", code: "TOO_LONG", message: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer` });
  }

  return issues;
}
