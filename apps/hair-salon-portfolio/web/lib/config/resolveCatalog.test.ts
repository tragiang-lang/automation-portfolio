import {
  mapPublicServiceToService,
  mapPublicStaffToStaffMember,
  mapServiceToPublicService,
  mapStaffMemberToPublicStaff,
} from "./resolveCatalog";
import type { PublicService, PublicStaff } from "@/types/reservation";
import type { Service, StaffMember } from "@/types/content";

describe("mapPublicServiceToService", () => {
  it("carries serviceId/name/durationMinutes/price through unchanged", () => {
    const input: PublicService = {
      serviceId: "SV001",
      name: "カラー",
      durationMinutes: 60,
      price: 6000,
      displayOrder: 1,
    };
    expect(mapPublicServiceToService(input)).toEqual({
      serviceId: "SV001",
      name: "カラー",
      durationMinutes: 60,
      price: 6000,
    });
  });

  it("passes description/category through when the wire payload has them (V1.1 Task 4)", () => {
    const input: PublicService = { serviceId: "SV001", name: "x", durationMinutes: 1, price: 1, displayOrder: 1, description: "説明", category: "カラー" };
    const result = mapPublicServiceToService(input);
    expect(result.description).toBe("説明");
    expect(result.category).toBe("カラー");
  });

  it("leaves description/category undefined when the wire payload has none (never invents content)", () => {
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

  it("passes role/introduction/photoSrc through when the wire payload has them (V1.1 Task 4)", () => {
    const input: PublicStaff = { staffId: "ST001", name: "田中", displayOrder: 1, role: "店長", introduction: "紹介文", photoSrc: "/images/staff/st001.jpg" };
    const result = mapPublicStaffToStaffMember(input);
    expect(result.role).toBe("店長");
    expect(result.introduction).toBe("紹介文");
    expect(result.photoSrc).toBe("/images/staff/st001.jpg");
  });

  it("leaves role/introduction/photoSrc/photoAlt undefined when the wire payload has none (never invents content)", () => {
    const input: PublicStaff = { staffId: "ST001", name: "x", displayOrder: 1 };
    const result = mapPublicStaffToStaffMember(input);
    expect(result.role).toBeUndefined();
    expect(result.introduction).toBeUndefined();
    expect(result.photoSrc).toBeUndefined();
    expect(result.photoAlt).toBeUndefined();
  });
});

describe("mapServiceToPublicService", () => {
  it("carries serviceId/name/durationMinutes/price through and sets the given displayOrder", () => {
    const input: Service = { serviceId: "SV001", name: "カラー", durationMinutes: 60, price: 6000 };
    expect(mapServiceToPublicService(input, 3)).toEqual({
      serviceId: "SV001",
      name: "カラー",
      durationMinutes: 60,
      price: 6000,
      displayOrder: 3,
      description: undefined,
      category: undefined,
    });
  });

  it("passes description/category through when present", () => {
    const input: Service = { serviceId: "SV001", name: "x", durationMinutes: 1, price: 1, description: "説明", category: "カラー" };
    const result = mapServiceToPublicService(input, 1);
    expect(result.description).toBe("説明");
    expect(result.category).toBe("カラー");
  });
});

describe("mapStaffMemberToPublicStaff", () => {
  it("carries staffId/name through and sets the given displayOrder", () => {
    const input: StaffMember = { staffId: "ST001", name: "田中 あい" };
    expect(mapStaffMemberToPublicStaff(input, 2)).toEqual({
      staffId: "ST001",
      name: "田中 あい",
      displayOrder: 2,
      role: undefined,
      introduction: undefined,
      photoSrc: undefined,
    });
  });

  it("passes role/introduction/photoSrc through when present", () => {
    const input: StaffMember = { staffId: "ST001", name: "田中", role: "店長", introduction: "紹介文", photoSrc: "/x.svg", photoAlt: "alt" };
    const result = mapStaffMemberToPublicStaff(input, 1);
    expect(result.role).toBe("店長");
    expect(result.introduction).toBe("紹介文");
    expect(result.photoSrc).toBe("/x.svg");
  });
});
