/**
 * Public-safe SERVICES/STAFF projections (Phase 5) — the fields a
 * customer-facing reservation UI may see. Mirrors the `PublicConfig`
 * pattern (`models/Config.ts`): excludes `Active` (only active rows are
 * ever included in the first place), `CalendarID` (internal routing,
 * never exposed), and `StaffRequired` (unused by any business rule yet —
 * not invented behavior for this phase to introduce).
 */
export interface PublicService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
}
