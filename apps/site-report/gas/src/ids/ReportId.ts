/**
 * Report/ReportPhoto ID generation (Task 5). Same style as
 * apps/salon-portfolio/gas/src/ids/ReservationId.ts's
 * generateReservationId — re-implemented, not imported (site-report
 * shares no business logic with salon) — but simpler: no timezone-aware
 * date formatting (site-report has no Utils.ts equivalent yet, and
 * inventing one purely for an ID prefix would be new infrastructure this
 * task does not need). `now`/`random` are injectable for deterministic
 * tests; the ID is never a bare `Date.now()` (collision-prone across a
 * multi-worker LIFF submission burst) and never a Sheet row number.
 */

export const REPORT_ID_PREFIX = "RPT";
export const REPORT_PHOTO_ID_PREFIX = "PHO";

const ID_SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SUFFIX_LENGTH = 10;

/** Generates a random, non-sequential alphanumeric suffix from an
 *  injectable random source (defaults to Math.random). Not
 *  cryptographically secure; adequate for this MVP's submission volume —
 *  same trade-off salon's generateRandomSuffix documents. */
export function generateRandomSuffix(
  random: () => number = Math.random,
  length: number = ID_SUFFIX_LENGTH,
): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += ID_SUFFIX_ALPHABET[Math.floor(random() * ID_SUFFIX_ALPHABET.length)];
  }
  return suffix;
}

/** Generates a report ID in the fixed `RPT-<epoch-ms>-<suffix>` format. */
export function generateReportId(now: Date = new Date(), random: () => number = Math.random): string {
  return `${REPORT_ID_PREFIX}-${now.getTime()}-${generateRandomSuffix(random)}`;
}

/** Generates a report-photo ID in the same style — independent per call
 *  (a fresh random suffix each time), so every photo in one submission
 *  gets a distinct ID even though they share the same `now`. */
export function generatePhotoId(now: Date = new Date(), random: () => number = Math.random): string {
  return `${REPORT_PHOTO_ID_PREFIX}-${now.getTime()}-${generateRandomSuffix(random)}`;
}
