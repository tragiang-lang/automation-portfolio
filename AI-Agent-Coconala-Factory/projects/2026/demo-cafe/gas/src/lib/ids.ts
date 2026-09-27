import { formatCompactDate } from "./time";

const SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SUFFIX_LENGTH = 6;

/** `PREFIX-YYYYMMDD-XXXXXX` (Tokyo date + 6 random chars). Never derived
 *  from a row number. `now`/`random` are injectable for deterministic
 *  tests. Not cryptographically secure — adequate for small-business
 *  volumes, same trade-off as the salon apps' ReservationId.ts. */
export function generateId(prefix: string, now: Date, random: () => number): string {
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(random() * SUFFIX_ALPHABET.length)];
  }
  return `${prefix}-${formatCompactDate(now)}-${suffix}`;
}
