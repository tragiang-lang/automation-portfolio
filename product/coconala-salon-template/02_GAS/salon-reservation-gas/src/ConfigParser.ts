import { AppConfig, BUSINESS_HOURS_DAYS, RawConfigMap, SocialLink } from "./models/Config";

/** One field-level parsing failure — used to build a single, stable
 *  CONFIG_INVALID error without ever repeating the raw sheet value back
 *  to the caller (Phase 3A §9). */
export interface ConfigFieldIssue {
  field: string;
  reason: string;
}

export type ConfigParseResult =
  | { ok: true; config: AppConfig }
  | { ok: false; issues: ConfigFieldIssue[] };

const BOOLEAN_PATTERN = /^(true|false)$/i;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/** Builds a Key -> raw Value map from CONFIG sheet data rows. Trims
 *  string keys; the first occurrence of a duplicate key wins (later
 *  duplicate rows are ignored) — deterministic per Phase 3A §7. */
export function buildRawConfigMap(
  rows: { Key: unknown; Value: unknown }[],
): RawConfigMap {
  const map: RawConfigMap = {};
  for (const row of rows) {
    const key = String(row.Key ?? "").trim();
    if (key.length === 0 || key in map) {
      continue;
    }
    map[key] = row.Value;
  }
  return map;
}

/** Parses a raw cell value into a strict boolean. Accepts a native
 *  boolean (Sheets auto-types TRUE/FALSE checkboxes) or the exact string
 *  "true"/"false" (any case), trimmed. Rejects "yes"/"no"/"1"/"0" and
 *  everything else (Phase 3A §7). */
export function parseStrictBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (BOOLEAN_PATTERN.test(trimmed)) {
      return trimmed.toLowerCase() === "true";
    }
  }
  return undefined;
}

/** Parses a raw cell value into a finite number. Accepts a native number
 *  or a string matching a strict decimal pattern (no "Infinity", no hex,
 *  no thousands separators) — Phase 3A §7. */
export function parseStrictNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (NUMBER_PATTERN.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return undefined;
}

/** Parses a raw cell value as a trimmed, non-empty string. A missing key
 *  (undefined) and a whitespace-only string both resolve to undefined
 *  here — callers report both as the same "required field missing"
 *  issue (Phase 3A §7). */
export function parseNonEmptyString(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Generic safe JSON parser — reusable for a future vertical/CONFIG key
 *  that does need a JSON-shaped value. Project 1's CONFIG has no JSON
 *  fields today (business hours and holidays use discrete keys / their
 *  own sheet, per phase0-specification.md §C/§D), but this stays as a
 *  generic parsing primitive per the Phase 3A reusability requirement
 *  (§33). Never throws. */
export function parseJsonSafely<T>(raw: unknown): T | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Fixed, curated set of CONFIG keys that can build a SocialLink (V1.1
 *  Task 4) — a flat key per platform, matching this sheet's existing
 *  "discrete keys, no JSON cell values" convention (see
 *  parseJsonSafely's own comment: "Project 1's CONFIG has no JSON fields
 *  today"). List order is the resulting display order, independent of
 *  CONFIG row order. Add a platform later by adding one entry here plus a
 *  matching row in the CSV template / config-and-sheets-guide.md — no
 *  other code change needed. */
export const SOCIAL_LINK_DEFINITIONS: ReadonlyArray<{ configKey: string; label: string }> = [
  { configKey: "social.instagram", label: "Instagram" },
  { configKey: "social.line", label: "LINE" },
  { configKey: "social.x", label: "X" },
  { configKey: "social.facebook", label: "Facebook" },
];

/** Builds the socialLinks array from whichever SOCIAL_LINK_DEFINITIONS
 *  keys are actually present (non-empty) in the raw CONFIG map — returns
 *  `undefined`, never `[]`, when none are set, so a pre-V1.1-Task-4
 *  CONFIG sheet produces exactly the "no socialLinks field" shape it
 *  always has. */
function parseSocialLinks(rawConfig: RawConfigMap): SocialLink[] | undefined {
  const links: SocialLink[] = [];
  for (const { configKey, label } of SOCIAL_LINK_DEFINITIONS) {
    const href = parseNonEmptyString(rawConfig[configKey]);
    if (href !== undefined) {
      links.push({ label, href });
    }
  }
  return links.length > 0 ? links : undefined;
}

/** Pure CONFIG parser: raw Key/Value map + HOLIDAYS date strings -> typed
 *  AppConfig, or a list of field-level issues. Never throws — malformed
 *  input always produces `{ ok: false }`, never a partially-built,
 *  dangerous config object (Phase 3A §7). This checks *type* correctness
 *  and presence only; semantic/range/logical-combination checks live in
 *  ConfigValidator.ts. */
export function parseAppConfig(
  rawConfig: RawConfigMap,
  holidayDates: string[],
): ConfigParseResult {
  const issues: ConfigFieldIssue[] = [];

  const requireString = (key: string): string => {
    const value = parseNonEmptyString(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "missing or empty string" });
      return "";
    }
    return value;
  };

  const requireBoolean = (key: string): boolean => {
    const value = parseStrictBoolean(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "must be boolean true/false" });
      return false;
    }
    return value;
  };

  const requireNumber = (key: string): number => {
    const value = parseStrictNumber(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "must be a number" });
      return 0;
    }
    return value;
  };

  const business: AppConfig["business"] = {
    name: requireString("business.name"),
    phone: requireString("business.phone"),
    email: requireString("business.email"),
    address: requireString("business.address"),
    // Optional presentation fields (V1.1 Task 4) — parseNonEmptyString
    // returns undefined (never pushes an `issues` entry) when the key is
    // absent or blank, unlike requireString above.
    nameLatin: parseNonEmptyString(rawConfig["business.nameLatin"]),
    tagline: parseNonEmptyString(rawConfig["business.tagline"]),
    postalCode: parseNonEmptyString(rawConfig["business.postalCode"]),
  };

  const hours = {} as AppConfig["hours"];
  for (const day of BUSINESS_HOURS_DAYS) {
    const key = `hours.${day}`;
    const raw = parseNonEmptyString(rawConfig[key]);
    if (raw === undefined) {
      issues.push({ field: key, reason: "missing or empty string" });
    }
    hours[day] = (raw ?? "closed") as AppConfig["hours"][typeof day];
  }

  const timezone = requireString("reservation.timezone");
  const reservation: AppConfig["reservation"] = {
    // requireString returns a plain string, but AppConfig's reservation
    // timezone is typed as the literal "Asia/Tokyo" — the cast keeps the
    // typed shape here while ConfigValidator.ts is what actually enforces
    // the value is really "Asia/Tokyo" at runtime (Phase 3A final review
    // finding 2: parsing must not silently discard/hard-code this field).
    timezone: timezone as AppConfig["reservation"]["timezone"],
    slotMinutes: requireNumber("reservation.slotMinutes"),
    minLeadHours: requireNumber("reservation.minLeadHours"),
    maxBookingDays: requireNumber("reservation.maxBookingDays"),
  };

  const features: AppConfig["features"] = {
    contactForm: requireBoolean("features.contactForm"),
    reservation: requireBoolean("features.reservation"),
    staffSelection: requireBoolean("features.staffSelection"),
    calendar: requireBoolean("features.calendar"),
    emailNotification: requireBoolean("features.emailNotification"),
  };

  const staffAnyAvailableOption = requireBoolean("staff.anyAvailableOption");
  const calendarId = requireString("calendar.id");
  const emailOwnerNotifyAddress = requireString("email.ownerNotifyAddress");
  const emailFromName = requireString("email.fromName");
  const socialLinks = parseSocialLinks(rawConfig);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      business,
      hours,
      holidays: holidayDates,
      features,
      staffAnyAvailableOption,
      reservation,
      socialLinks,
      calendarId,
      emailOwnerNotifyAddress,
      emailFromName,
    },
  };
}
