import { asPayload } from "../validation/validators";
import { ActionHandler, textMessage } from "./types";

export const SERVICES_SHEET = "SERVICES";

export interface ServiceItem {
  serviceId: string;
  name: string;
  category?: string;
  durationMinutes?: number;
  price?: number;
  description?: string;
}

function isActive(value: unknown): boolean {
  return value === true || String(value).trim().toLowerCase() === "true";
}

function toNumber(value: unknown): number | undefined {
  if (value === "" || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Active rows of SERVICES, sorted by displayOrder. Industry-neutral: a
 *  salon's "メニュー" and a restaurant's "お料理" use the same sheet shape. */
export const getServiceList: ActionHandler<Record<string, never>, { title: string; services: ServiceItem[] }> = {
  id: "getServiceList",

  parse(payload) {
    asPayload(payload);
    return {};
  },

  run(_input, ctx) {
    const rows = ctx.tables
      .readAll(SERVICES_SHEET)
      .filter((row) => String(row.serviceId ?? "").trim() !== "" && isActive(row.active));
    rows.sort((a, b) => (toNumber(a.displayOrder) ?? 9999) - (toNumber(b.displayOrder) ?? 9999));
    return {
      title: ctx.config().optionalString("labels.serviceList") ?? "メニュー・料金",
      services: rows.map((row) => ({
        serviceId: String(row.serviceId),
        name: String(row.name ?? ""),
        category: row.category ? String(row.category) : undefined,
        durationMinutes: toNumber(row.durationMinutes),
        price: toNumber(row.price),
        description: row.description ? String(row.description) : undefined,
      })),
    };
  },

  fromLine() {
    return {};
  },

  toLineMessages(output) {
    if (output.services.length === 0) {
      return [textMessage(`${output.title}\n\n現在ご案内できるメニューはありません。`)];
    }
    const lines = output.services.map((service) => {
      const parts = [`・${service.name}`];
      if (service.durationMinutes) parts.push(`${service.durationMinutes}分`);
      if (service.price !== undefined) parts.push(`¥${service.price.toLocaleString("ja-JP")}`);
      return parts.join(" ");
    });
    return [textMessage(`${output.title}\n\n${lines.join("\n")}`)];
  },
};
