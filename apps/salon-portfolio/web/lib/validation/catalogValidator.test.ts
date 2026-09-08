import { parsePublicServices, parsePublicStaff } from "./catalogValidator";

describe("parsePublicServices", () => {
  it("returns the array unchanged when every item has the expected shape", () => {
    const input = [
      { serviceId: "SV001", name: "ジェルネイル", durationMinutes: 60, price: 6000, displayOrder: 1 },
      { serviceId: "SV002", name: "フットジェル", durationMinutes: 90, price: 8000, displayOrder: 2 },
    ];
    expect(parsePublicServices(input)).toEqual(input);
  });

  it("returns null when the value is not an array", () => {
    expect(parsePublicServices({ not: "an array" })).toBeNull();
  });

  it("returns null when an item is missing a required field", () => {
    expect(parsePublicServices([{ serviceId: "SV001", name: "ジェルネイル" }])).toBeNull();
  });

  it("returns null when a numeric field has the wrong type", () => {
    const input = [{ serviceId: "SV001", name: "ジェルネイル", durationMinutes: "60", price: 6000, displayOrder: 1 }];
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
