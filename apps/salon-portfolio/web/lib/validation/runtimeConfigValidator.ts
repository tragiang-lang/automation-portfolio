import { HOURS_DAY_ORDER } from "@/lib/constants/hours";
import type { PublicRuntimeBusinessHours, PublicRuntimeConfig, SocialLink } from "@/types/runtime-config";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Accepts an absent field or a non-empty string — never a wrong-typed
 *  present value. Used for optional presentation fields (V1.1 Task 4). */
function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseBusinessHours(value: unknown): PublicRuntimeBusinessHours | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const hours = {} as PublicRuntimeBusinessHours;
  for (const day of HOURS_DAY_ORDER) {
    const cell = record[day];
    if (!isNonEmptyString(cell)) return null;
    hours[day] = cell as PublicRuntimeBusinessHours[typeof day];
  }
  return hours;
}

/** `undefined` -> valid/absent (V1.1 Task 4: a pre-migration CONFIG sheet
 *  has no social.* keys at all); anything else must be an array of
 *  `{ label, href }` non-empty-string pairs. */
function parseOptionalSocialLinks(value: unknown): SocialLink[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const links: SocialLink[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (!isNonEmptyString(record.label) || !isNonEmptyString(record.href)) return null;
    links.push({ label: record.label, href: record.href });
  }
  return links;
}

/**
 * Structural validation only — checks that a `getConfig` response has the
 * shape the frontend depends on. Business-rule validation (e.g. "is this
 * really a valid time range") already happened in GAS's ConfigValidator
 * before the response was ever sent (Phase 3A); duplicating that here
 * would just be dead code. Returns `null` for anything that doesn't
 * match, so the caller can fall back safely instead of rendering
 * `undefined`/`null` business data.
 */
export function parsePublicRuntimeConfig(value: unknown): PublicRuntimeConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const root = value as Record<string, unknown>;

  const business = root.business;
  if (
    typeof business !== "object" ||
    business === null ||
    !isNonEmptyString((business as Record<string, unknown>).name) ||
    !isNonEmptyString((business as Record<string, unknown>).phone) ||
    !isNonEmptyString((business as Record<string, unknown>).email) ||
    !isNonEmptyString((business as Record<string, unknown>).address) ||
    !isOptionalNonEmptyString((business as Record<string, unknown>).nameLatin) ||
    !isOptionalNonEmptyString((business as Record<string, unknown>).tagline) ||
    !isOptionalNonEmptyString((business as Record<string, unknown>).postalCode)
  ) {
    return null;
  }

  const hours = parseBusinessHours(root.hours);
  if (!hours) return null;

  if (!Array.isArray(root.holidays) || !root.holidays.every((d) => typeof d === "string")) {
    return null;
  }

  const features = root.features;
  if (
    typeof features !== "object" ||
    features === null ||
    !isBoolean((features as Record<string, unknown>).contactForm) ||
    !isBoolean((features as Record<string, unknown>).reservation) ||
    !isBoolean((features as Record<string, unknown>).staffSelection) ||
    !isBoolean((features as Record<string, unknown>).calendar) ||
    !isBoolean((features as Record<string, unknown>).emailNotification)
  ) {
    return null;
  }

  if (!isBoolean(root.staffAnyAvailableOption)) return null;

  const reservation = root.reservation;
  if (
    typeof reservation !== "object" ||
    reservation === null ||
    (reservation as Record<string, unknown>).timezone !== "Asia/Tokyo" ||
    !isFiniteNumber((reservation as Record<string, unknown>).slotMinutes) ||
    !isFiniteNumber((reservation as Record<string, unknown>).minLeadHours) ||
    !isFiniteNumber((reservation as Record<string, unknown>).maxBookingDays)
  ) {
    return null;
  }

  const socialLinks = parseOptionalSocialLinks(root.socialLinks);
  if (socialLinks === null) return null;

  return {
    business: business as PublicRuntimeConfig["business"],
    hours,
    holidays: root.holidays as string[],
    features: features as PublicRuntimeConfig["features"],
    staffAnyAvailableOption: root.staffAnyAvailableOption,
    reservation: reservation as PublicRuntimeConfig["reservation"],
    socialLinks,
  };
}
