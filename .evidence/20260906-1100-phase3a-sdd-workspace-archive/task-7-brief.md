## Task 7: ConfigStore repository

**Files:**
- Create: `apps/salon-portfolio/gas/src/ConfigStore.ts`
- Test: `apps/salon-portfolio/gas/tests/ConfigStore.test.ts`

**Interfaces:**
- Consumes: `SHEET_NAMES` from `./SheetNames`; `CONFIG_HEADERS`, `HOLIDAYS_HEADERS`, `ConfigRow`, `HolidayRow` from `./SheetSchemas`; `getHeaderMap`, `getSheet`, `readRawRows` from `./Sheets`; `rowsToObjects` from `./RowMapper`; `buildRawConfigMap`, `parseAppConfig`, `ConfigFieldIssue` from `./ConfigParser`; `validateAppConfig`, `ConfigValidationIssue` from `./ConfigValidator`; `AppConfig` from `./models/Config`.
- Produces: `class ConfigError extends Error { issues: (ConfigFieldIssue | ConfigValidationIssue)[] }`; `buildAppConfigFromRawRows(configRows: ConfigRow[], holidayDates: string[]): AppConfig` (pure, throws `ConfigError`); `getConfig(): AppConfig` (thin, touches `SpreadsheetApp` via `Sheets.ts`).

- [ ] **Step 1: Write the failing test `tests/ConfigStore.test.ts`**

```ts
import { ConfigRow } from "../src/SheetSchemas";
import { buildAppConfigFromRawRows, ConfigError } from "../src/ConfigStore";

function validConfigRows(): ConfigRow[] {
  return [
    { Key: "business.name", Value: "Demo Salon", Description: "店舗名" },
    { Key: "business.phone", Value: "03-0000-0000", Description: "電話番号" },
    { Key: "business.email", Value: "owner@example.com", Description: "店舗メール" },
    { Key: "business.address", Value: "東京都千代田区1-1-1", Description: "住所" },
    { Key: "hours.monday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.tuesday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.wednesday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.thursday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.friday", Value: "10:00-19:00", Description: "" },
    { Key: "hours.saturday", Value: "10:00-18:00", Description: "" },
    { Key: "hours.sunday", Value: "closed", Description: "" },
    { Key: "reservation.timezone", Value: "Asia/Tokyo", Description: "" },
    { Key: "reservation.slotMinutes", Value: 30, Description: "" },
    { Key: "reservation.minLeadHours", Value: 1, Description: "" },
    { Key: "reservation.maxBookingDays", Value: 60, Description: "" },
    { Key: "features.contactForm", Value: true, Description: "" },
    { Key: "features.reservation", Value: true, Description: "" },
    { Key: "features.staffSelection", Value: true, Description: "" },
    { Key: "features.calendar", Value: true, Description: "" },
    { Key: "features.emailNotification", Value: true, Description: "" },
    { Key: "staff.anyAvailableOption", Value: true, Description: "" },
    { Key: "calendar.id", Value: "primary", Description: "" },
    { Key: "email.ownerNotifyAddress", Value: "owner@example.com", Description: "" },
    { Key: "email.fromName", Value: "Demo Salon", Description: "" },
  ];
}

describe("buildAppConfigFromRawRows", () => {
  it("builds a valid AppConfig from valid rows", () => {
    const config = buildAppConfigFromRawRows(validConfigRows(), ["2026-01-01"]);
    expect(config.business.name).toBe("Demo Salon");
    expect(config.holidays).toEqual(["2026-01-01"]);
  });

  it("throws ConfigError when a required key is missing (parse-level)", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "calendar.id");
    expect(() => buildAppConfigFromRawRows(rows, [])).toThrow(ConfigError);
  });

  it("throws ConfigError carrying the field issues, for server-side logging only", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "calendar.id");
    try {
      buildAppConfigFromRawRows(rows, []);
      throw new Error("expected buildAppConfigFromRawRows to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toContainEqual(
        expect.objectContaining({ field: "calendar.id" }),
      );
    }
  });

  it("throws ConfigError when a value is well-typed but semantically invalid (validation-level)", () => {
    const rows = validConfigRows().map((row) =>
      row.Key === "reservation.slotMinutes" ? { ...row, Value: -5 } : row,
    );
    expect(() => buildAppConfigFromRawRows(rows, [])).toThrow(ConfigError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigStore.test.ts`
Expected: FAIL — `Cannot find module '../src/ConfigStore'`.

- [ ] **Step 3: Write `ConfigStore.ts`**

```ts
import { SHEET_NAMES } from "./SheetNames";
import {
  CONFIG_HEADERS,
  ConfigRow,
  HOLIDAYS_HEADERS,
  HolidayRow,
} from "./SheetSchemas";
import { getHeaderMap, getSheet, readRawRows } from "./Sheets";
import { rowsToObjects } from "./RowMapper";
import {
  buildRawConfigMap,
  ConfigFieldIssue,
  parseAppConfig,
} from "./ConfigParser";
import { ConfigValidationIssue, validateAppConfig } from "./ConfigValidator";
import { AppConfig } from "./models/Config";

/** Thrown whenever CONFIG/HOLIDAYS data fails parsing or validation.
 *  `issues` is for server-side diagnostics only (console.error) — Api.ts
 *  must never forward it to the client (Phase 3A §9). */
export class ConfigError extends Error {
  constructor(
    public readonly issues: (ConfigFieldIssue | ConfigValidationIssue)[],
  ) {
    super("CONFIG_INVALID");
    this.name = "ConfigError";
  }
}

/** Pure core of the repository: given already-read raw CONFIG rows and
 *  HOLIDAYS date strings, parses and validates them into an AppConfig or
 *  throws ConfigError. Fed plain arrays in tests — never touches
 *  SpreadsheetApp (Phase 0 §Q, Phase 3A §26). */
export function buildAppConfigFromRawRows(
  configRows: ConfigRow[],
  holidayDates: string[],
): AppConfig {
  const rawMap = buildRawConfigMap(
    configRows.map((row) => ({ Key: row.Key, Value: row.Value })),
  );
  const parseResult = parseAppConfig(rawMap, holidayDates);
  if (!parseResult.ok) {
    throw new ConfigError(parseResult.issues);
  }
  const validationIssues = validateAppConfig(parseResult.config);
  if (validationIssues.length > 0) {
    throw new ConfigError(validationIssues);
  }
  return parseResult.config;
}

/** Reads CONFIG + HOLIDAYS from the real spreadsheet and returns the
 *  typed AppConfig. Thin orchestration only — not unit tested by Jest;
 *  buildAppConfigFromRawRows above carries all the tested logic (Phase 0
 *  §Q: "ConfigStore's parsing logic fed a plain 2D array ... not a real
 *  Sheet"). */
export function getConfig(): AppConfig {
  const configSheet = getSheet(SHEET_NAMES.CONFIG);
  const configHeaderMap = getHeaderMap(configSheet);
  const configRows = rowsToObjects<ConfigRow>(
    configHeaderMap,
    readRawRows(configSheet),
    CONFIG_HEADERS,
  );

  const holidaysSheet = getSheet(SHEET_NAMES.HOLIDAYS);
  const holidaysHeaderMap = getHeaderMap(holidaysSheet);
  const holidayRows = rowsToObjects<HolidayRow>(
    holidaysHeaderMap,
    readRawRows(holidaysSheet),
    HOLIDAYS_HEADERS,
  );
  const holidayDates = holidayRows
    .map((row) => String(row.Date ?? "").trim())
    .filter((date) => date.length > 0);

  return buildAppConfigFromRawRows(configRows, holidayDates);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ConfigStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/salon-portfolio/gas/src/ConfigStore.ts apps/salon-portfolio/gas/tests/ConfigStore.test.ts
git commit -m "feat(gas): add ConfigStore repository tying Sheets + parser + validator together"
```

---

