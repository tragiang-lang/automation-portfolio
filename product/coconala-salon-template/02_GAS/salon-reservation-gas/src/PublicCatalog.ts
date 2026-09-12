import { ServiceRow, StaffRow } from "./SheetSchemas";
import { PublicService, PublicStaff } from "./models/Catalog";

/** Strips internal-only fields and orders by DisplayOrder before a
 *  catalog is ever sent to the frontend (Phase 5, mirrors
 *  `PublicConfig.ts::buildPublicConfig`). Only active rows are included —
 *  an inactive service/staff member is not currently bookable and must
 *  never appear in a customer-facing picker. */
export function buildPublicServices(services: ServiceRow[]): PublicService[] {
  return services
    .filter((service) => service.Active)
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map((service) => ({
      serviceId: service.ServiceID,
      name: service.Name,
      durationMinutes: service.DurationMinutes,
      price: service.Price,
      displayOrder: service.DisplayOrder,
      description: service.Description,
      category: service.Category,
    }));
}

export function buildPublicStaff(staff: StaffRow[]): PublicStaff[] {
  return staff
    .filter((member) => member.Active)
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map((member) => ({
      staffId: member.StaffID,
      name: member.Name,
      displayOrder: member.DisplayOrder,
      role: member.Role,
      introduction: member.Bio,
      photoSrc: member.ImagePath,
    }));
}
