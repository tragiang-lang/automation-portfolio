import { SITE_REPORT_CONFIG_KEYS, SiteReportConfig } from "./Config";

/** One field-level parsing failure — mirrors
 *  apps/salon-portfolio/gas/src/ConfigParser.ts's ConfigFieldIssue shape
 *  (field + reason), the project's existing error-reporting style. */
export interface ConfigFieldIssue {
  field: string;
  reason: string;
}

export type SiteReportConfigParseResult =
  | { ok: true; config: SiteReportConfig }
  | { ok: false; issues: ConfigFieldIssue[] };

/** Builds a Key -> raw Value map from CONFIG sheet data rows. Trims
 *  string keys; the first occurrence of a duplicate key wins (later
 *  duplicate rows are ignored) — same documented, deterministic policy as
 *  apps/salon-portfolio/gas/src/ConfigParser.ts's buildRawConfigMap. */
export function buildRawConfigMap(
  rows: { Key: unknown; Value: unknown }[],
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row.Key ?? "").trim();
    if (key.length === 0 || key in map) {
      continue;
    }
    map[key] = row.Value;
  }
  return map;
}

/** Parses a raw cell value as a trimmed, non-empty string — undefined for
 *  a missing key or a whitespace-only value (same convention as salon's
 *  parseNonEmptyString). */
function parseNonEmptyString(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Pure CONFIG parser: raw Key/Value map -> typed SiteReportConfig, or a
 *  list of field-level issues. Never throws — malformed input always
 *  produces `{ ok: false }` (same contract as salon's parseAppConfig).
 *  Any raw-map key outside SITE_REPORT_CONFIG_KEYS is silently ignored —
 *  documented decision (Task 2): unrecognized CONFIG rows never break
 *  parsing, so a future key/description column stays backward
 *  compatible. Every one of the four required keys is checked, and every
 *  missing/empty one is reported (not just the first), so a caller sees
 *  the full picture in one pass. */
export function parseSiteReportConfig(
  rawConfig: Record<string, unknown>,
): SiteReportConfigParseResult {
  const issues: ConfigFieldIssue[] = [];

  const requireString = (key: string): string => {
    const value = parseNonEmptyString(rawConfig[key]);
    if (value === undefined) {
      issues.push({ field: key, reason: "missing or empty string" });
      return "";
    }
    return value;
  };

  const businessName = requireString(SITE_REPORT_CONFIG_KEYS.BUSINESS_NAME);
  const adminEmail = requireString(SITE_REPORT_CONFIG_KEYS.ADMIN_EMAIL);
  const driveRootFolderId = requireString(SITE_REPORT_CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID);
  const timezone = requireString(SITE_REPORT_CONFIG_KEYS.TIMEZONE);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, config: { businessName, adminEmail, driveRootFolderId, timezone } };
}
