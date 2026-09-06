import { ServiceRow, StaffRow } from "./SheetSchemas";

/**
 * Pure coercion of one raw SERVICES/STAFF row (Google Sheets may hand back
 * an already-typed boolean/number for a checkbox/number-formatted column,
 * or a string for a text-formatted one) into the strictly-typed row shape
 * — mirrors the `ConfigParser`/`ConfigStore` split (Phase 3A) so
 * `Catalog.ts` (thin) stays a near-literal Sheets wrapper.
 */

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TRUE" || normalized === "1" || normalized === "YES";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  const trimmed = String(value ?? "").trim();
  // Number("") is 0, not NaN — that would make a genuinely missing cell
  // look like a valid "0" duration/price/order instead of a detectable
  // NaN, so the empty case is handled explicitly.
  return trimmed.length === 0 ? NaN : Number(trimmed);
}

function toTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseServiceRow(raw: Record<string, unknown>): ServiceRow {
  return {
    ServiceID: toTrimmedString(raw.ServiceID),
    Name: toTrimmedString(raw.Name),
    DurationMinutes: toNumber(raw.DurationMinutes),
    Price: toNumber(raw.Price),
    Active: toBoolean(raw.Active),
    StaffRequired: toBoolean(raw.StaffRequired),
    DisplayOrder: toNumber(raw.DisplayOrder),
  };
}

export function parseStaffRow(raw: Record<string, unknown>): StaffRow {
  return {
    StaffID: toTrimmedString(raw.StaffID),
    Name: toTrimmedString(raw.Name),
    Active: toBoolean(raw.Active),
    CalendarID: toTrimmedString(raw.CalendarID) || undefined,
    DisplayOrder: toNumber(raw.DisplayOrder),
  };
}
