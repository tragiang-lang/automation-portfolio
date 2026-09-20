import { getDemoPublicServices, getDemoPublicStaff } from "./reservationDemoCatalog";
import { SERVICES, STAFF } from "@/config/demo-content";

describe("getDemoPublicServices", () => {
  it("maps every demo service to a PublicService with the demo content's own field values", () => {
    const result = getDemoPublicServices();
    expect(result).toHaveLength(SERVICES.length);
    result.forEach((service, index) => {
      expect(service.serviceId).toBe(SERVICES[index].serviceId);
      expect(service.name).toBe(SERVICES[index].name);
      expect(service.durationMinutes).toBe(SERVICES[index].durationMinutes);
      expect(service.price).toBe(SERVICES[index].price);
    });
  });

  it("assigns a deterministic 1-based displayOrder matching array position", () => {
    const result = getDemoPublicServices();
    result.forEach((service, index) => {
      expect(service.displayOrder).toBe(index + 1);
    });
    // Calling it again produces the exact same displayOrder assignment.
    expect(getDemoPublicServices().map((s) => s.displayOrder)).toEqual(result.map((s) => s.displayOrder));
  });
});

describe("getDemoPublicStaff", () => {
  it("maps every demo staff member to a PublicStaff with the demo content's own field values", () => {
    const result = getDemoPublicStaff();
    expect(result).toHaveLength(STAFF.length);
    result.forEach((staff, index) => {
      expect(staff.staffId).toBe(STAFF[index].staffId);
      expect(staff.name).toBe(STAFF[index].name);
    });
  });

  it("assigns a deterministic 1-based displayOrder matching array position", () => {
    const result = getDemoPublicStaff();
    result.forEach((staff, index) => {
      expect(staff.displayOrder).toBe(index + 1);
    });
  });
});
