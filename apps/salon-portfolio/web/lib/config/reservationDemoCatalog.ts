import { SERVICES, STAFF } from "@/config/demo-content";
import { mapServiceToPublicService, mapStaffMemberToPublicStaff } from "@/lib/config/resolveCatalog";
import type { PublicService, PublicStaff } from "@/types/reservation";

/**
 * Reservation-wizard demo catalog (explicit demo mode — see
 * `lib/config/reservationDemoMode.ts`). Reuses the exact `SERVICES`/`STAFF`
 * every other demo-mode section already renders from
 * (`lib/config/runtimeCatalog.ts`'s `DEMO_CATALOG`) — this file adds only
 * the missing `displayOrder` (array position, 1-based, matching how a real
 * GAS sheet's row order becomes `PublicService.displayOrder`/
 * `PublicStaff.displayOrder`) and the `Service`/`StaffMember` ->
 * `PublicService`/`PublicStaff` field mapping the Reservation Wizard's
 * `getServices`/`getStaff` normally return.
 */
export function getDemoPublicServices(): PublicService[] {
  return SERVICES.map((service, index) => mapServiceToPublicService(service, index + 1));
}

export function getDemoPublicStaff(): PublicStaff[] {
  return STAFF.map((staff, index) => mapStaffMemberToPublicStaff(staff, index + 1));
}
