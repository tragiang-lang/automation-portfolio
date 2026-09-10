import type { BusinessHours } from "@/types/content";

/** Presentation-only day-label mapping (not business content) — reused by
 * the footer and the Access section so both render hours identically. */
export const HOURS_DAY_ORDER: Array<keyof BusinessHours> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const HOURS_DAY_LABELS: Record<keyof BusinessHours, string> = {
  monday: "月曜日",
  tuesday: "火曜日",
  wednesday: "水曜日",
  thursday: "木曜日",
  friday: "金曜日",
  saturday: "土曜日",
  sunday: "日曜日",
};

export function formatHours(value: string | "closed"): string {
  return value === "closed" ? "定休日" : value;
}
