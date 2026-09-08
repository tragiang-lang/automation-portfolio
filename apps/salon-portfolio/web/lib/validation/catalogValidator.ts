/**
 * Structural validation for `getServices`/`getStaff` GAS responses —
 * mirrors `lib/validation/runtimeConfigValidator.ts::parsePublicRuntimeConfig`
 * exactly (same "return null on any shape mismatch, let the caller fall
 * back safely" contract). Business-rule validation (Active filtering,
 * DisplayOrder sorting) already happened in GAS
 * (`gas/src/PublicCatalog.ts`) before the response was ever sent —
 * duplicating that here would be dead code.
 */
import type { PublicService, PublicStaff } from "@/types/reservation";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parsePublicServices(value: unknown): PublicService[] | null {
  if (!Array.isArray(value)) return null;
  const services: PublicService[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      !isNonEmptyString(record.serviceId) ||
      !isNonEmptyString(record.name) ||
      !isFiniteNumber(record.durationMinutes) ||
      !isFiniteNumber(record.price) ||
      !isFiniteNumber(record.displayOrder)
    ) {
      return null;
    }
    services.push({
      serviceId: record.serviceId,
      name: record.name,
      durationMinutes: record.durationMinutes,
      price: record.price,
      displayOrder: record.displayOrder,
    });
  }
  return services;
}

export function parsePublicStaff(value: unknown): PublicStaff[] | null {
  if (!Array.isArray(value)) return null;
  const staff: PublicStaff[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      !isNonEmptyString(record.staffId) ||
      !isNonEmptyString(record.name) ||
      !isFiniteNumber(record.displayOrder)
    ) {
      return null;
    }
    staff.push({
      staffId: record.staffId,
      name: record.name,
      displayOrder: record.displayOrder,
    });
  }
  return staff;
}
