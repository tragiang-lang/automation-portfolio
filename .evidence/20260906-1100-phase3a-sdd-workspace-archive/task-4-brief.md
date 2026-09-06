## Task 4: Config domain types and pure parser

**Files:**
- Create: `apps/salon-portfolio/gas/src/models/Config.ts` (replaces the empty `.gitkeep` scaffold in `src/models/`)
- Create: `apps/salon-portfolio/gas/src/ConfigParser.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigParser.test.ts`

**Interfaces:**
- Produces (`models/Config.ts`): `BusinessHours`, `BUSINESS_HOURS_DAYS` (readonly 7-day tuple), `FeatureFlags`, `ReservationSettings`, `AppConfig`, `PublicConfig`, `RawConfigMap`.
- Produces (`ConfigParser.ts`): `ConfigFieldIssue { field: string; reason: string }`; `ConfigParseResult = { ok: true; config: AppConfig } | { ok: false; issues: ConfigFieldIssue[] }`; `buildRawConfigMap(rows: { Key: unknown; Value: unknown }[]): RawConfigMap`; `parseStrictBoolean(raw: unknown): boolean | undefined`; `parseStrictNumber(raw: unknown): number | undefined`; `parseNonEmptyString(raw: unknown): string | undefined`; `parseJsonSafely<T>(raw: unknown): T | undefined`; `parseAppConfig(rawConfig: RawConfigMap, holidayDates: string[]): ConfigParseResult`.

- [ ] **Step 1: Write `models/Config.ts`** (delete the sibling `.gitkeep`)

```ts
/**
 * Typed runtime configuration shape (Phase 0 spec §D). ConfigStore.ts
 * produces this from the CONFIG + HOLIDAYS sheets; Api.ts's `getConfig`
 * action returns a PublicConfig projection of it (§20/§V — calendarId
 * and the owner-facing email settings are never sent to the frontend).
 */

export interface BusinessHours {
  monday: string | "closed";
  tuesday: string | "closed";
  wednesday: string | "closed";
  thursday: string | "closed";
  friday: string | "closed";
  saturday: string | "closed";
  sunday: string | "closed";
}

export const BUSINESS_HOURS_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export interface FeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface ReservationSettings {
  timezone: "Asia/Tokyo";
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

export interface AppConfig {
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  hours: BusinessHours;
  holidays: string[];
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: ReservationSettings;
  /** Fallback/shared Calendar ID — internal only, never exposed via
   *  getConfig (Phase 3A §20). */
  calendarId: string;
  /** Internal only, never exposed via getConfig. */
  emailOwnerNotifyAddress: string;
  emailFromName: string;
}

/** The subset of AppConfig safe to return to the frontend (Phase 3A
 *  §20; matches the example response body in phase0-specification.md
 *  §H). Excludes calendarId and the owner-facing email settings. */
export type PublicConfig = Omit<
  AppConfig,
  "calendarId" | "emailOwnerNotifyAddress" | "emailFromName"
>;

/** Raw CONFIG-sheet values, keyed by the sheet's `Key` column, before
 *  type coercion. Values may already be native boolean/number if Google
 *  Sheets auto-typed the cell. */
export type RawConfigMap = Record<string, unknown>;
```

- [ ] **Step 2: Write the failing test `tests/ConfigParser.test.ts`**

```ts
import {
  buildRawConfigMap,
  parseAppConfig,
  parseJsonSafely,
  parseNonEmptyString,
  parseStrictBoolean,
  parseStrictNumber,
} from "../src/ConfigParser";

describe("buildRawConfigMap", () => {
  it("trims keys and keeps values as-is", () => {
    const map = buildRawConfigMap([
      { Key: " business.name ", Value: "Demo Salon" },
      { Key: "reservation.slotMinutes", Value: 30 },
    ]);
    expect(map).toEqual({
      "business.name": "Demo Salon",
      "reservation.slotMinutes": 30,
    });
  });

  it("first occurrence of a duplicate key wins", () => {
    const map = buildRawConfigMap([
      { Key: "calendar.id", Value: "first" },
      { Key: "calendar.id", Value: "second" },
    ]);
    expect(map["calendar.id"]).toBe("first");
  });

  it("ignores rows with an empty key", () => {
    const map = buildRawConfigMap([{ Key: "", Value: "ignored" }]);
    expect(map).toEqual({});
  });
});

describe("parseStrictBoolean", () => {
  it("accepts a native boolean", () => {
    expect(parseStrictBoolean(true)).toBe(true);
    expect(parseStrictBoolean(false)).toBe(false);
  });

  it("accepts the exact strings true/false, any case, trimmed", () => {
    expect(parseStrictBoolean(" TRUE ")).toBe(true);
    expect(parseStrictBoolean("false")).toBe(false);
  });

  it("rejects ambiguous values", () => {
    expect(parseStrictBoolean("yes")).toBeUndefined();
    expect(parseStrictBoolean("no")).toBeUndefined();
    expect(parseStrictBoolean("1")).toBeUndefined();
    expect(parseStrictBoolean("0")).toBeUndefined();
    expect(parseStrictBoolean("")).toBeUndefined();
  });
});

describe("parseStrictNumber", () => {
  it("accepts a native finite number", () => {
    expect(parseStrictNumber(30)).toBe(30);
  });

  it("accepts a strict numeric string", () => {
    expect(parseStrictNumber(" 60 ")).toBe(60);
    expect(parseStrictNumber("1.5")).toBe(1.5);
  });

  it("rejects non-numeric or malformed strings", () => {
    expect(parseStrictNumber("abc")).toBeUndefined();
    expect(parseStrictNumber("Infinity")).toBeUndefined();
    expect(parseStrictNumber("1,000")).toBeUndefined();
    expect(parseStrictNumber("")).toBeUndefined();
  });
});

describe("parseNonEmptyString", () => {
  it("trims and accepts a non-empty string", () => {
    expect(parseNonEmptyString("  Demo Salon  ")).toBe("Demo Salon");
  });

  it("treats whitespace-only and non-string values as missing", () => {
    expect(parseNonEmptyString("   ")).toBeUndefined();
    expect(parseNonEmptyString(undefined)).toBeUndefined();
    expect(parseNonEmptyString(42)).toBeUndefined();
  });
});

describe("parseJsonSafely", () => {
  it("parses valid JSON", () => {
    expect(parseJsonSafely<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns undefined for malformed JSON instead of throwing", () => {
    expect(parseJsonSafely("{not json")).toBeUndefined();
  });

  it("returns undefined for empty or non-string input", () => {
    expect(parseJsonSafely("")).toBeUndefined();
    expect(parseJsonSafely(undefined)).toBeUndefined();
  });
});

function validRawConfig(): Record<string, unknown> {
  return {
    "business.name": "Demo Salon",
    "business.phone": "03-0000-0000",
    "business.email": "owner@example.com",
    "business.address": "東京都千代田区1-1-1",
    "hours.monday": "10:00-19:00",
    "hours.tuesday": "10:00-19:00",
    "hours.wednesday": "10:00-19:00",
    "hours.thursday": "10:00-19:00",
    "hours.friday": "10:00-19:00",
    "hours.saturday": "10:00-18:00",
    "hours.sunday": "closed",
    "reservation.timezone": "Asia/Tokyo",
    "reservation.slotMinutes": 30,
    "reservation.minLeadHours": 1,
    "reservation.maxBookingDays": 60,
    "features.contactForm": true,
    "features.reservation": true,
    "features.staffSelection": true,
    "features.calendar": true,
    "features.emailNotification": true,
    "staff.anyAvailableOption": true,
    "calendar.id": "primary",
    "email.ownerNotifyAddress": "owner@example.com",
    "email.fromName": "Demo Salon",
  };
}

describe("parseAppConfig", () => {
  it("parses a complete, well-typed raw config", () => {
    const result = parseAppConfig(validRawConfig(), ["2026-01-01"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.name).toBe("Demo Salon");
      expect(result.config.reservation.slotMinutes).toBe(30);
      expect(result.config.holidays).toEqual(["2026-01-01"]);
      expect(result.config.features.staffSelection).toBe(true);
    }
  });

  it("reports every missing required key as an issue", () => {
    const raw = validRawConfig();
    delete raw["business.name"];
    delete raw["calendar.id"];
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.issues.map((issue) => issue.field);
      expect(fields).toContain("business.name");
      expect(fields).toContain("calendar.id");
    }
  });

  it("reports a malformed boolean as an issue instead of coercing it", () => {
    const raw = validRawConfig();
    raw["features.reservation"] = "yes";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: "features.reservation" }),
      );
    }
  });

  it("reports a malformed number as an issue instead of coercing it", () => {
    const raw = validRawConfig();
    raw["reservation.slotMinutes"] = "thirty";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: "reservation.slotMinutes" }),
      );
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigParser.test.ts`
Expected: FAIL — `Cannot find module '../src/ConfigParser'`.

- [ ] **Step 4: Write `ConfigParser.ts`**

```ts
import { AppConfig, BUSINESS_HOURS_DAYS, RawConfigMap } from "./models/Config";

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

  const business = {
    name: requireString("business.name"),
    phone: requireString("business.phone"),
    email: requireString("business.email"),
    address: requireString("business.address"),
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

  const reservation: AppConfig["reservation"] = {
    timezone: "Asia/Tokyo",
    slotMinutes: requireNumber("reservation.slotMinutes"),
    minLeadHours: requireNumber("reservation.minLeadHours"),
    maxBookingDays: requireNumber("reservation.maxBookingDays"),
  };
  requireString("reservation.timezone");

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
      calendarId,
      emailOwnerNotifyAddress,
      emailFromName,
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigParser.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 6: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/salon-portfolio/gas/src/models/Config.ts apps/salon-portfolio/gas/src/ConfigParser.ts apps/salon-portfolio/gas/tests/ConfigParser.test.ts
git rm apps/salon-portfolio/gas/src/models/.gitkeep
git commit -m "feat(gas): add AppConfig types and pure CONFIG parser"
```

---

