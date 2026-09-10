/** Unguessable cancellation-request bearer token (Phase 0 §L) — carried
 *  in the confirmation email's cancellation link, not a display id, so it
 *  is long; an injectable `random` source keeps this deterministic in
 *  tests, matching `ids/ReservationId.ts`'s own convention. */

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 32;

export function generateCancellationToken(random: () => number = Math.random): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_ALPHABET[Math.floor(random() * TOKEN_ALPHABET.length)];
  }
  return token;
}
