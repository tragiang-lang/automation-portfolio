/** Thin Gmail adapter (Phase 0 §T: "wraps GmailApp.sendEmail; does not
 *  decide whether to send or what template beyond simple string
 *  templating passed in"). Not unit tested — a near-literal wrapper over
 *  a Google global; `ReservationEmailTemplates.ts` carries the tested
 *  content logic. */
export function sendEmail(to: string, subject: string, body: string): void {
  GmailApp.sendEmail(to, subject, body);
}
