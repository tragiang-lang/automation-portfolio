import { ActionError, ERROR_CODES, ValidationIssue } from "../lib/result";

/**
 * Small field validators shared by every action. Messages are generic
 * Japanese strings. They never repeat the submitted value.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_PATTERN = /^\d{9,11}$/;

export type Payload = Record<string, unknown>;

export function asPayload(raw: unknown): Payload {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ActionError(ERROR_CODES.VALIDATION_ERROR, "payload must be an object", [
      { field: "payload", code: "INVALID_TYPE", message: "入力形式が正しくありません" },
    ]);
  }
  return raw as Payload;
}

export class FieldCollector {
  readonly issues: ValidationIssue[] = [];

  constructor(private readonly payload: Payload) {}

  string(field: string, options: { required?: boolean; maxLength?: number; label?: string } = {}): string | undefined {
    const raw = this.payload[field];
    if (raw !== undefined && raw !== null && typeof raw !== "string" && typeof raw !== "number") {
      this.issues.push({ field, code: "INVALID_TYPE", message: `${options.label ?? field}の形式が正しくありません` });
      return undefined;
    }
    const value = raw === undefined || raw === null ? "" : String(raw).trim();
    if (value === "") {
      if (options.required) {
        this.issues.push({ field, code: "REQUIRED", message: `${options.label ?? field}を入力してください` });
      }
      return undefined;
    }
    if (options.maxLength !== undefined && value.length > options.maxLength) {
      this.issues.push({ field, code: "TOO_LONG", message: `${options.label ?? field}は${options.maxLength}文字以内で入力してください` });
      return undefined;
    }
    return value;
  }

  email(field: string, options: { required?: boolean } = {}): string | undefined {
    const value = this.string(field, { required: options.required, maxLength: 200, label: "メールアドレス" });
    if (value !== undefined && !EMAIL_PATTERN.test(value)) {
      this.issues.push({ field, code: "INVALID_FORMAT", message: "メールアドレスの形式が正しくありません" });
      return undefined;
    }
    return value?.toLowerCase();
  }

  phone(field: string): string | undefined {
    const value = this.string(field, { maxLength: 20, label: "電話番号" });
    if (value !== undefined && !PHONE_DIGITS_PATTERN.test(value.replace(/[-\s()]/g, ""))) {
      this.issues.push({ field, code: "INVALID_FORMAT", message: "電話番号の形式が正しくありません" });
      return undefined;
    }
    return value;
  }

  integer(field: string, options: { min?: number; max?: number; label?: string } = {}): number | undefined {
    const raw = this.payload[field];
    if (raw === undefined || raw === null || raw === "") {
      return undefined;
    }
    const value = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isInteger(value) || (options.min !== undefined && value < options.min) || (options.max !== undefined && value > options.max)) {
      this.issues.push({ field, code: "OUT_OF_RANGE", message: `${options.label ?? field}の値が正しくありません` });
      return undefined;
    }
    return value;
  }

  require(condition: boolean, issue: ValidationIssue): void {
    if (!condition) {
      this.issues.push(issue);
    }
  }

  /** Throws VALIDATION_ERROR with every collected issue, if any. */
  finish(): void {
    if (this.issues.length > 0) {
      throw new ActionError(ERROR_CODES.VALIDATION_ERROR, `validation failed: ${this.issues.map((i) => i.field).join(",")}`, this.issues);
    }
  }
}
