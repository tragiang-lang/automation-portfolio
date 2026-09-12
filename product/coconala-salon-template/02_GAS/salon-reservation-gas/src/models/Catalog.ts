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
  /** Presentation-only (V1.1 Task 4) — undefined when the SERVICES sheet
   *  has no Description/Category column yet, or the cell is blank. Never
   *  read by reservation eligibility/pricing logic. */
  description?: string;
  category?: string;
}

export interface PublicStaff {
  staffId: string;
  name: string;
  displayOrder: number;
  /** Presentation-only (V1.1 Task 4) — undefined when the STAFF sheet has
   *  no Role/Bio/ImagePath column yet, or the cell is blank. Never read by
   *  reservation eligibility logic. `photoSrc` is `ImagePath`'s sheet
   *  value verbatim (a local `public/images/staff/...`-style path). */
  role?: string;
  introduction?: string;
  photoSrc?: string;
}
