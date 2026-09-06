/** Thin Script Properties reader for deployment-environment values that
 *  are not business rules — same rationale as `Sheets.ts`'s
 *  `SPREADSHEET_ID`: `SITE_BASE_URL` varies per Vercel/GAS deployment
 *  (dev/staging/prod), not something a business owner edits via CONFIG
 *  (Phase 0 §R). Not unit tested — a Google global. */
export function getSiteBaseUrl(): string {
  const url = PropertiesService.getScriptProperties().getProperty("SITE_BASE_URL");
  if (!url) {
    throw new Error('Script Property "SITE_BASE_URL" is not set.');
  }
  return url.replace(/\/$/, "");
}
