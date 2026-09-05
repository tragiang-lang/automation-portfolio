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
  const configRows = rowsToObjects(
    configHeaderMap,
    readRawRows(configSheet),
    CONFIG_HEADERS,
  ) as unknown as ConfigRow[];

  const holidaysSheet = getSheet(SHEET_NAMES.HOLIDAYS);
  const holidaysHeaderMap = getHeaderMap(holidaysSheet);
  const holidayRows = rowsToObjects(
    holidaysHeaderMap,
    readRawRows(holidaysSheet),
    HOLIDAYS_HEADERS,
  ) as unknown as HolidayRow[];
  const holidayDates = holidayRows
    .map((row) => String(row.Date ?? "").trim())
    .filter((date) => date.length > 0);

  return buildAppConfigFromRawRows(configRows, holidayDates);
}
