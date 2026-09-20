import { formatDateYYYYMMDDInTokyo } from "../Utils";
import { generateRandomSuffix } from "./ReservationId";

/** Inquiry ID prefix — mirrors ReservationId.ts's RESERVATION_ID_PREFIX
 *  convention for the Inquiry flow (Starter MVP §2). */
export const INQUIRY_ID_PREFIX = "INQ";

/** Generates an inquiry ID in the fixed `INQ-YYYYMMDD-XXXXXX` format,
 *  reusing ReservationId.ts's random-suffix generator (identical shape/
 *  entropy requirements — no reason to duplicate it). */
export function generateInquiryId(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  const datePart = formatDateYYYYMMDDInTokyo(now);
  const suffix = generateRandomSuffix(random);
  return `${INQUIRY_ID_PREFIX}-${datePart}-${suffix}`;
}
