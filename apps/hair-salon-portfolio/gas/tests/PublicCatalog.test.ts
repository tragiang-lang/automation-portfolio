import { buildPublicServices, buildPublicStaff } from "../src/PublicCatalog";
import { ServiceRow, StaffRow } from "../src/SheetSchemas";

const services: ServiceRow[] = [
  { ServiceID: "SV002", Name: "カット＋カラー", DurationMinutes: 90, Price: 8800, Active: true, StaffRequired: false, DisplayOrder: 2 },
  { ServiceID: "SV001", Name: "カット", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  { ServiceID: "SV003", Name: "廃止メニュー", DurationMinutes: 30, Price: 3300, Active: false, StaffRequired: false, DisplayOrder: 3 },
];

const staff: StaffRow[] = [
  { StaffID: "ST002", Name: "佐藤", Active: true, CalendarID: "cal-2@example.com", DisplayOrder: 2 },
  { StaffID: "ST001", Name: "鈴木", Active: true, DisplayOrder: 1 },
  { StaffID: "ST003", Name: "退職済み", Active: false, DisplayOrder: 3 },
];

describe("buildPublicServices", () => {
  it("excludes inactive services and sorts by DisplayOrder", () => {
    expect(buildPublicServices(services)).toEqual([
      { serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 },
      { serviceId: "SV002", name: "カット＋カラー", durationMinutes: 90, price: 8800, displayOrder: 2 },
    ]);
  });

  it("never includes Active/StaffRequired fields", () => {
    const result = buildPublicServices(services);
    for (const service of result) {
      expect(service).not.toHaveProperty("Active");
      expect(service).not.toHaveProperty("StaffRequired");
    }
  });

  it("returns an empty array when given no services", () => {
    expect(buildPublicServices([])).toEqual([]);
  });
});

describe("buildPublicStaff", () => {
  it("excludes inactive staff and sorts by DisplayOrder", () => {
    expect(buildPublicStaff(staff)).toEqual([
      { staffId: "ST001", name: "鈴木", displayOrder: 1 },
      { staffId: "ST002", name: "佐藤", displayOrder: 2 },
    ]);
  });

  it("never includes CalendarID/Active fields", () => {
    const result = buildPublicStaff(staff);
    for (const member of result) {
      expect(member).not.toHaveProperty("CalendarID");
      expect(member).not.toHaveProperty("Active");
    }
  });
});

const servicesWithPresentation: ServiceRow[] = [
  {
    ServiceID: "SV001",
    Name: "カット",
    DurationMinutes: 60,
    Price: 6000,
    Active: true,
    StaffRequired: false,
    DisplayOrder: 1,
    Description: "説明文",
    Category: "カット",
  },
  { ServiceID: "SV002", Name: "オフのみ", DurationMinutes: 30, Price: 3000, Active: true, StaffRequired: false, DisplayOrder: 2 },
];

const staffWithPresentation: StaffRow[] = [
  { StaffID: "ST001", Name: "田中", Active: true, DisplayOrder: 1, Role: "店長", Bio: "紹介文", ImagePath: "/images/staff/st001.jpg" },
  { StaffID: "ST002", Name: "鈴木", Active: true, DisplayOrder: 2 },
];

describe("buildPublicServices optional presentation fields (V1.1 Task 4)", () => {
  it("carries description/category through when present", () => {
    const result = buildPublicServices(servicesWithPresentation);
    expect(result[0]).toMatchObject({ description: "説明文", category: "カット" });
  });

  it("leaves description/category undefined when the row has none", () => {
    const result = buildPublicServices(servicesWithPresentation);
    expect(result[1].description).toBeUndefined();
    expect(result[1].category).toBeUndefined();
  });
});

describe("buildPublicStaff optional presentation fields (V1.1 Task 4)", () => {
  it("carries role/introduction/photoSrc through when present (ImagePath -> photoSrc)", () => {
    const result = buildPublicStaff(staffWithPresentation);
    expect(result[0]).toMatchObject({ role: "店長", introduction: "紹介文", photoSrc: "/images/staff/st001.jpg" });
  });

  it("leaves role/introduction/photoSrc undefined when the row has none", () => {
    const result = buildPublicStaff(staffWithPresentation);
    expect(result[1].role).toBeUndefined();
    expect(result[1].introduction).toBeUndefined();
    expect(result[1].photoSrc).toBeUndefined();
  });
});
