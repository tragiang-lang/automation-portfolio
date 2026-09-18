/**
 * Maps the canonical GAS-backed catalog wire types — the same
 * `PublicService`/`PublicStaff` the Reservation Wizard already consumes
 * (`lib/api/reservationClient.ts`) — onto the homepage's presentation
 * types (`types/content.ts`). `description`/`category` (Service) and
 * `role`/`introduction`/`photoSrc` (StaffMember) are optional on the wire
 * (V1.1 Task 4: SERVICES/STAFF sheet columns `Description`/`Category`/
 * `Role`/`Bio`/`ImagePath`) — passed through unchanged when present, left
 * `undefined` when the buyer's sheet doesn't have them yet, never
 * invented. `photoAlt` still has no sheet-backed source at all;
 * `StaffCard.tsx` already falls back to the staff member's name as alt
 * text when it's absent.
 */
import type { PublicService, PublicStaff } from "@/types/reservation";
import type { Service, StaffMember } from "@/types/content";

export function mapPublicServiceToService(service: PublicService): Service {
  return {
    serviceId: service.serviceId,
    name: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
    description: service.description,
    category: service.category,
  };
}

export function mapPublicStaffToStaffMember(staff: PublicStaff): StaffMember {
  return {
    staffId: staff.staffId,
    name: staff.name,
    role: staff.role,
    introduction: staff.introduction,
    photoSrc: staff.photoSrc,
  };
}
