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
import { formatDateYYYYMMDDDashedInTokyo } from "./Utils";

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

/** Normalizes HOLIDAYS.Date cells into `YYYY-MM-DD` strings. Google
 *  Sheets auto-types a written date string (e.g. "2026-01-01") into a
 *  native `Date` object when read back via `Range.getValues()` —
 *  `String(dateObject)` would produce a locale-formatted, non-ISO string
 *  that fails ConfigValidator's date pattern (Phase 3A final review
 *  finding 1). A `Date` cell is reformatted via the Tokyo-calendar
 *  helper; anything else (e.g. an already text-formatted date column)
 *  falls back to the previous trim-to-string behavior. Pure and
 *  Jest-testable — exported for that reason. */
export function normalizeHolidayDates(rows: HolidayRow[]): string[] {
  return rows
    .map((row) =>
      row.Date instanceof Date
        ? formatDateYYYYMMDDDashedInTokyo(row.Date)
        : String(row.Date ?? "").trim(),
    )
    .filter((date) => date.length > 0);
}

/** Reads CONFIG + HOLIDAYS from the real spreadsheet and returns the
 *  typed AppConfig. Thin orchestration only — not unit tested by Jest;
 *  buildAppConfigFromRawRows above carries all the tested logic (Phase 0
 *  §Q: "ConfigStore's parsing logic fed a plain 2D array ... not a real
 *  Sheet"). */
export function getConfig(): AppConfig {
  const configSheet = getSheet(SHEET_NAMES.CONFIG);
  const configHeaderMap = getHeaderMap(configSheet);
  // rowsToObjects<T> requires T to satisfy Record<string, unknown>, but
  // ConfigRow declares concrete field types (not an index signature) —
  // the double cast is the standard TS escape hatch for "structurally
  // compatible but not assignable" generic constraints here.
  const configRows = rowsToObjects(
    configHeaderMap,
    readRawRows(configSheet),
    CONFIG_HEADERS,
  ) as unknown as ConfigRow[];

  const holidaysSheet = getSheet(SHEET_NAMES.HOLIDAYS);
  const holidaysHeaderMap = getHeaderMap(holidaysSheet);
  // Same reasoning as the ConfigRow cast above: HolidayRow has no index
  // signature, so it isn't directly assignable from rowsToObjects<T>'s
  // generic constraint despite being structurally compatible.
  const holidayRows = rowsToObjects(
    holidaysHeaderMap,
    readRawRows(holidaysSheet),
    HOLIDAYS_HEADERS,
  ) as unknown as HolidayRow[];
  const holidayDates = normalizeHolidayDates(holidayRows);

  return buildAppConfigFromRawRows(configRows, holidayDates);
}
