import { generateId } from "../lib/ids";
import type { ActionContext, Row } from "../services/context";

export const CUSTOMERS_SHEET = "CUSTOMERS";

export interface CustomerContact {
  lineUserId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Finds a customer by LINE user id (preferred) or email, creating one if
 * none exists. Blank fields in `contact` never overwrite stored values.
 * Callers must already hold the script lock (it runs inside claimOnce).
 */
export function upsertCustomer(ctx: ActionContext, contact: CustomerContact): string {
  const rows = ctx.tables.readAll(CUSTOMERS_SHEET);
  const match = findCustomer(rows, contact);
  const now = ctx.now().toISOString();
  if (match) {
    const customerId = String(match.customerId);
    const patch: Row = { updatedAt: now };
    for (const field of ["lineUserId", "name", "email", "phone"] as const) {
      if (contact[field] && !match[field]) {
        patch[field] = contact[field];
      }
    }
    ctx.tables.update(CUSTOMERS_SHEET, "customerId", customerId, patch);
    return customerId;
  }
  const customerId = generateId("CUS", ctx.now(), () => ctx.random());
  ctx.tables.append(CUSTOMERS_SHEET, {
    customerId,
    lineUserId: contact.lineUserId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    createdAt: now,
    updatedAt: now,
  });
  return customerId;
}

function findCustomer(rows: Row[], contact: CustomerContact): Row | undefined {
  if (contact.lineUserId) {
    const byLine = rows.find((row) => String(row.lineUserId ?? "") === contact.lineUserId);
    if (byLine) {
      return byLine;
    }
  }
  if (contact.email) {
    return rows.find((row) => String(row.email ?? "").toLowerCase() === contact.email);
  }
  return undefined;
}
