import type { ActionContext } from "./context";

export const OWNER_EMAIL_KEY = "notification.ownerEmail";

/**
 * Sends the owner an email notification if `notification.ownerEmail` is
 * set. A notification failure must never undo or fail the customer's
 * already-saved request, so errors are logged and swallowed.
 */
export function notifyOwner(ctx: ActionContext, subject: string, body: string, relatedId: string): boolean {
  let to: string | undefined;
  try {
    to = ctx.config().optionalString(OWNER_EMAIL_KEY);
  } catch {
    to = undefined;
  }
  if (!to) {
    ctx.logger.info("notify.skipped", { relatedId, reason: "no owner email configured" });
    return false;
  }
  try {
    ctx.mailer.send(to, subject, body);
    return true;
  } catch (error) {
    ctx.logger.error("notify.failed", error instanceof Error ? error.message : String(error), { relatedId });
    return false;
  }
}
