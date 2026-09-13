/**
 * Typed CONFIG shape for site-report. Mirrors the salon project's
 * models/Config.ts convention: a small typed surface plus the raw sheet
 * key names, with no Sheets-reading logic here — reading CONFIG from a
 * real spreadsheet, parsing, and validating is a later task's "GAS
 * Config + Sheets Schema Foundation" deliverable, not this one's.
 */
export interface SiteReportConfig {
  businessName: string;
  adminEmail: string;
  driveRootFolderId: string;
  timezone: string;
}

/** Raw CONFIG-sheet key names — the `Key` column values a future
 *  ConfigStore reads, in the same style as
 *  apps/salon-portfolio/gas/src/models/Config.ts's RawConfigMap keys. */
export const SITE_REPORT_CONFIG_KEYS = {
  BUSINESS_NAME: "BUSINESS_NAME",
  ADMIN_EMAIL: "ADMIN_EMAIL",
  DRIVE_ROOT_FOLDER_ID: "DRIVE_ROOT_FOLDER_ID",
  TIMEZONE: "TIMEZONE",
} as const;

export type SiteReportConfigKey =
  (typeof SITE_REPORT_CONFIG_KEYS)[keyof typeof SITE_REPORT_CONFIG_KEYS];
