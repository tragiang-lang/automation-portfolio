/**
 * Maps the canonical GAS-backed catalog wire types — the same
 * `PublicService`/`PublicStaff` the Reservation Wizard already consumes
 * (`lib/api/reservationClient.ts`) — onto the homepage's presentation
 * types (`types/content.ts`). `description`/`category` (Service) and
 * `role`/`introduction`/`photoSrc`/`photoAlt` (StaffMember) have no
 * equivalent column in the SERVICES/STAFF sheets
 * (`apps/salon-portfolio/gas/src/SheetSchemas.ts`), so they are left
 * `undefined` here rather than invented — `MenuRow`/`StaffCard` already
 * render those fields conditionally (see their own files).
 */
import type { PublicService, PublicStaff } from "@/types/reservation";
import type { Service, StaffMember } from "@/types/content";

export function mapPublicServiceToService(service: PublicService): Service {
  return {
    serviceId: service.serviceId,
    name: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
  };
}

export function mapPublicStaffToStaffMember(staff: PublicStaff): StaffMember {
  return {
    staffId: staff.staffId,
    name: staff.name,
  };
}
