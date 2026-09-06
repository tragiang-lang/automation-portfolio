## Task 5: Config validator (semantic/business-rule checks)

**Files:**
- Create: `apps/salon-portfolio/gas/src/ConfigValidator.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigValidator.test.ts`

**Interfaces:**
- Consumes: `AppConfig`, `BUSINESS_HOURS_DAYS` from `./models/Config`.
- Produces: `ConfigValidationIssue { field: string; reason: string }`; `validateAppConfig(config: AppConfig): ConfigValidationIssue[]` (empty array = valid).

- [ ] **Step 1: Write the failing test `tests/ConfigValidator.test.ts`**

```ts
import { AppConfig } from "../src/models/Config";
import { validateAppConfig } from "../src/ConfigValidator";

function validConfig(): AppConfig {
  return {
    business: {
      name: "Demo Salon",
      phone: "03-0000-0000",
      email: "owner@example.com",
      address: "東京都千代田区1-1-1",
    },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-18:00",
      sunday: "closed",
    },
    holidays: ["2026-01-01", "2026-01-02"],
    features: {
      contactForm: true,
      reservation: true,
      staffSelection: true,
      calendar: true,
      emailNotification: true,
    },
    staffAnyAvailableOption: true,
    reservation: {
      timezone: "Asia/Tokyo",
      slotMinutes: 30,
      minLeadHours: 1,
      maxBookingDays: 60,
    },
    calendarId: "primary",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo Salon",
  };
}

describe("validateAppConfig", () => {
  it("returns no issues for a fully valid config", () => {
    expect(validateAppConfig(validConfig())).toEqual([]);
  });

  it("rejects a timezone other than Asia/Tokyo", () => {
    const config = validConfig();
    // @ts-expect-error — deliberately invalid for this test
    config.reservation.timezone = "UTC";
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "reservation.timezone" }),
    );
  });

  it("rejects a negative minLeadHours", () => {
    const config = validConfig();
    config.reservation.minLeadHours = -1;
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "reservation.minLeadHours" }),
    );
  });

  it("rejects a non-positive slotMinutes or maxBookingDays", () => {
    const config = validConfig();
    config.reservation.slotMinutes = 0;
    config.reservation.maxBookingDays = 0;
    const issues = validateAppConfig(config);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "reservation.slotMinutes" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "reservation.maxBookingDays" }),
    );
  });

  it("rejects malformed business hours", () => {
    const config = validConfig();
    config.hours.monday = "not-a-range";
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "hours.monday" }),
    );
  });

  it("rejects an invalid holiday date", () => {
    const config = validConfig();
    config.holidays = ["2026-02-30"];
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "holidays" }),
    );
  });

  it("rejects a malformed business or owner-notification email", () => {
    const config = validConfig();
    config.business.email = "not-an-email";
    config.emailOwnerNotifyAddress = "also-not-an-email";
    const issues = validateAppConfig(config);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "business.email" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "email.ownerNotifyAddress" }),
    );
  });

  it("rejects staff.anyAvailableOption=true when features.staffSelection is false", () => {
    const config = validConfig();
    config.features.staffSelection = false;
    config.staffAnyAvailableOption = true;
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "staff.anyAvailableOption" }),
    );
  });

  it("allows staff.anyAvailableOption=false when features.staffSelection is false", () => {
    const config = validConfig();
    config.features.staffSelection = false;
    config.staffAnyAvailableOption = false;
    expect(validateAppConfig(config)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigValidator.test.ts`
Expected: FAIL — `Cannot find module '../src/ConfigValidator'`.

- [ ] **Step 3: Write `ConfigValidator.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigValidator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/ConfigValidator.ts apps/salon-portfolio/gas/tests/ConfigValidator.test.ts
git commit -m "feat(gas): add pure CONFIG business-rule validator"
```

---

