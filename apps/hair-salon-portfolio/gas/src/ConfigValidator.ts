import { AppConfig, BUSINESS_HOURS_DAYS } from "./models/Config";

export interface ConfigValidationIssue {
  field: string;
  reason: string;
}

const HOURS_PATTERN = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidCalendarDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidBusinessHoursValue(value: string): boolean {
  return value === "closed" || HOURS_PATTERN.test(value);
}

/** Pure semantic validation of an already-type-correct AppConfig
 *  (Phase 3A §8). Returns an empty array when valid. Never throws — the
 *  goal is a predictable, enumerable failure list, not an exception. */
export function validateAppConfig(config: AppConfig): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  if (config.reservation.timezone !== "Asia/Tokyo") {
    issues.push({
      field: "reservation.timezone",
      reason: 'must be exactly "Asia/Tokyo"',
    });
  }
  if (config.reservation.slotMinutes <= 0) {
    issues.push({
      field: "reservation.slotMinutes",
      reason: "must be a positive number of minutes",
    });
  }
  if (config.reservation.minLeadHours < 0) {
    issues.push({
      field: "reservation.minLeadHours",
      reason: "must not be negative",
    });
  }
  if (config.reservation.maxBookingDays <= 0) {
    issues.push({
      field: "reservation.maxBookingDays",
      reason: "must be a positive number of days",
    });
  }

  for (const day of BUSINESS_HOURS_DAYS) {
    const value = config.hours[day];
    if (!isValidBusinessHoursValue(value)) {
      issues.push({
        field: `hours.${day}`,
        reason: 'must be "closed" or "HH:MM-HH:MM"',
      });
    }
  }

  for (const holiday of config.holidays) {
    if (!DATE_PATTERN.test(holiday) || !isValidCalendarDate(holiday)) {
      issues.push({ field: "holidays", reason: `invalid date "${holiday}"` });
    }
  }

  if (!EMAIL_PATTERN.test(config.business.email)) {
    issues.push({
      field: "business.email",
      reason: "must be a valid email address",
    });
  }
  if (!EMAIL_PATTERN.test(config.emailOwnerNotifyAddress)) {
    issues.push({
      field: "email.ownerNotifyAddress",
      reason: "must be a valid email address",
    });
  }

  if (config.calendarId.length === 0) {
    issues.push({ field: "calendar.id", reason: "must not be empty" });
  }

  // Logically invalid combination (Phase 3A §8): "any available staff"
  // only makes sense when staff selection itself is offered.
  if (config.staffAnyAvailableOption && !config.features.staffSelection) {
    issues.push({
      field: "staff.anyAvailableOption",
      reason: "cannot be true while features.staffSelection is false",
    });
  }

  return issues;
}
