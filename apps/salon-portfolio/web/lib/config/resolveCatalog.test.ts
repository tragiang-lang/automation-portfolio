import { mapPublicServiceToService, mapPublicStaffToStaffMember } from "./resolveCatalog";
import type { PublicService, PublicStaff } from "@/types/reservation";

describe("mapPublicServiceToService", () => {
  it("carries serviceId/name/durationMinutes/price through unchanged", () => {
    const input: PublicService = {
      serviceId: "SV001",
      name: "ジェルネイル",
      durationMinutes: 60,
      price: 6000,
      displayOrder: 1,
    };
    expect(mapPublicServiceToService(input)).toEqual({
      serviceId: "SV001",
      name: "ジェルネイル",
      durationMinutes: 60,
      price: 6000,
    });
  });

  it("does not invent a description or category", () => {
    const input: PublicService = { serviceId: "SV001", name: "x", durationMinutes: 1, price: 1, displayOrder: 1 };
    const result = mapPublicServiceToService(input);
    expect(result.description).toBeUndefined();
    expect(result.category).toBeUndefined();
  });
});

describe("mapPublicStaffToStaffMember", () => {
  it("carries staffId/name through unchanged", () => {
    const input: PublicStaff = { staffId: "ST001", name: "田中 あい", displayOrder: 1 };
    expect(mapPublicStaffToStaffMember(input)).toEqual({ staffId: "ST001", name: "田中 あい" });
  });

  it("does not invent role/introduction/photo fields", () => {
    const input: PublicStaff = { staffId: "ST001", name: "x", displayOrder: 1 };
    const result = mapPublicStaffToStaffMember(input);
    expect(result.role).toBeUndefined();
    expect(result.introduction).toBeUndefined();
    expect(result.photoSrc).toBeUndefined();
    expect(result.photoAlt).toBeUndefined();
  });
});
