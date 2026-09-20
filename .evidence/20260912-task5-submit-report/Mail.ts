/** Thin Gmail adapter (Task 5) — wraps GmailApp.sendEmail; does not
 *  decide whether to send or what template. Not unit tested — a
 *  near-literal wrapper over a Google global, same convention (and same
 *  choice of GmailApp over MailApp) as apps/salon-portfolio/gas/src/
 *  Mail.ts — re-implemented, not shared: site-report and salon share no
 *  code. AdminNotification.ts carries the tested content logic. */
export function sendEmail(to: string, subject: string, body: string): void {
  GmailApp.sendEmail(to, subject, body);
}
