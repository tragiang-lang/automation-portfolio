import { formatDateYYYYMMDDInTokyo } from "../Utils";

/** Reservation ID prefix (Phase 0 §E Decision 4). */
export const RESERVATION_ID_PREFIX = "RES";

const ID_SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SUFFIX_LENGTH = 6;

/** Generates a random, non-sequential six-character alphanumeric suffix
 *  from an injectable random source (defaults to Math.random) — Phase 3A
 *  §17. Not cryptographically secure; adequate for this v1 scale
 *  (collision probability is negligible against a single salon's daily
 *  reservation volume). */
export function generateRandomSuffix(
  random: () => number = Math.random,
): string {
  let suffix = "";
  for (let i = 0; i < ID_SUFFIX_LENGTH; i++) {
    const index = Math.floor(random() * ID_SUFFIX_ALPHABET.length);
    suffix += ID_SUFFIX_ALPHABET[index];
  }
  return suffix;
}

/** Generates a reservation ID in the fixed `RES-YYYYMMDD-XXXXXX` format
 *  (Phase 0 §E Decision 4): the date portion is today's date in
 *  Asia/Tokyo, and the suffix is six random alphanumeric characters —
 *  never derived from a sheet row number, never sequential. `now` and
 *  `random` are injectable for deterministic tests (Phase 3A §17). Only
 *  the generator is implemented here — no reservation row is created by
 *  this module or anywhere else in Phase 3A. */
export function generateReservationId(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  const datePart = formatDateYYYYMMDDInTokyo(now);
  const suffix = generateRandomSuffix(random);
  return `${RESERVATION_ID_PREFIX}-${datePart}-${suffix}`;
}
