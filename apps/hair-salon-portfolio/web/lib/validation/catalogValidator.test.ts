import { parsePublicServices, parsePublicStaff } from "./catalogValidator";

describe("parsePublicServices", () => {
  it("returns the array unchanged when every item has the expected shape", () => {
    const input = [
      { serviceId: "SV001", name: "カラー", durationMinutes: 60, price: 6000, displayOrder: 1 },
      { serviceId: "SV002", name: "トリートメント", durationMinutes: 90, price: 8000, displayOrder: 2 },
    ];
    expect(parsePublicServices(input)).toEqual(input);
  });

  it("returns null when the value is not an array", () => {
    expect(parsePublicServices({ not: "an array" })).toBeNull();
  });

  it("returns null when an item is missing a required field", () => {
    expect(parsePublicServices([{ serviceId: "SV001", name: "カラー" }])).toBeNull();
  });

  it("returns null when a numeric field has the wrong type", () => {
    const input = [{ serviceId: "SV001", name: "カラー", durationMinutes: "60", price: 6000, displayOrder: 1 }];
    expect(parsePublicServices(input)).toBeNull();
  });

  it("returns an empty array unchanged (valid empty catalog)", () => {
    expect(parsePublicServices([])).toEqual([]);
  });
});

describe("parsePublicStaff", () => {
  it("returns the array unchanged when every item has the expected shape", () => {
    const input = [{ staffId: "ST001", name: "田中 あい", displayOrder: 1 }];
    expect(parsePublicStaff(input)).toEqual(input);
  });

  it("returns null when the value is not an array", () => {
    expect(parsePublicStaff("nope")).toBeNull();
  });

  it("returns null when an item is missing a required field", () => {
    expect(parsePublicStaff([{ staffId: "ST001" }])).toBeNull();
  });

  it("returns an empty array unchanged (staffSelection disabled upstream)", () => {
    expect(parsePublicStaff([])).toEqual([]);
  });
});

describe("parsePublicServices optional presentation fields (V1.1 Task 4)", () => {
  it("passes through description/category when present", () => {
    const input = [
      { serviceId: "SV001", name: "x", durationMinutes: 60, price: 6000, displayOrder: 1, description: "説明", category: "カラー" },
    ];
    expect(parsePublicServices(input)).toEqual(input);
  });

  it("leaves description/category undefined when absent", () => {
    const input = [{ serviceId: "SV001", name: "x", durationMinutes: 60, price: 6000, displayOrder: 1 }];
    const result = parsePublicServices(input);
    expect(result?.[0].description).toBeUndefined();
    expect(result?.[0].category).toBeUndefined();
  });

  it("rejects a present description/category with the wrong type", () => {
    const input = [{ serviceId: "SV001", name: "x", durationMinutes: 60, price: 6000, displayOrder: 1, description: 123 }];
    expect(parsePublicServices(input)).toBeNull();
  });
});

describe("parsePublicStaff optional presentation fields (V1.1 Task 4)", () => {
  it("passes through role/introduction/photoSrc when present", () => {
    const input = [
      { staffId: "ST001", name: "田中", displayOrder: 1, role: "店長", introduction: "紹介文", photoSrc: "/images/staff/st001.jpg" },
    ];
    expect(parsePublicStaff(input)).toEqual(input);
  });

  it("leaves role/introduction/photoSrc undefined when absent", () => {
    const input = [{ staffId: "ST001", name: "田中", displayOrder: 1 }];
    const result = parsePublicStaff(input);
    expect(result?.[0].role).toBeUndefined();
    expect(result?.[0].introduction).toBeUndefined();
    expect(result?.[0].photoSrc).toBeUndefined();
  });

  it("rejects a present role/introduction/photoSrc with the wrong type", () => {
    const input = [{ staffId: "ST001", name: "田中", displayOrder: 1, photoSrc: 42 }];
    expect(parsePublicStaff(input)).toBeNull();
  });
});
