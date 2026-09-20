import { formatMenuDuration, formatMenuPrice, groupServices } from "@/components/sections/MenuContent";
import type { Service } from "@/types/content";

function makeService(overrides: Partial<Service>): Service {
  return {
    serviceId: "SV000",
    name: "サービス",
    durationMinutes: 60,
    price: 5000,
    ...overrides,
  };
}

describe("groupServices", () => {
  it("does not group when there are 6 or fewer services (Phase 2A §9)", () => {
    const services = Array.from({ length: 6 }, (_, i) =>
      makeService({ serviceId: `SV00${i}`, category: i < 3 ? "A" : "B" }),
    );

    const groups = groupServices(services);

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBeUndefined();
    expect(groups[0].services).toHaveLength(6);
  });

  it("groups by category once there are more than 6 services with more than one category", () => {
    const services = [
      ...Array.from({ length: 4 }, (_, i) => makeService({ serviceId: `A${i}`, category: "ジェルネイル" })),
      ...Array.from({ length: 4 }, (_, i) => makeService({ serviceId: `B${i}`, category: "まつげエクステ" })),
    ];

    const groups = groupServices(services);

    expect(groups.map((g) => g.category)).toEqual(["ジェルネイル", "まつげエクステ"]);
    expect(groups[0].services).toHaveLength(4);
    expect(groups[1].services).toHaveLength(4);
  });

  it("does not group when every service shares the same single category, even above the threshold", () => {
    const services = Array.from({ length: 8 }, (_, i) =>
      makeService({ serviceId: `SV${i}`, category: "ジェルネイル" }),
    );

    const groups = groupServices(services);

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBeUndefined();
  });
});

describe("formatMenuPrice", () => {
  it("formats a price as a yen amount with thousands separators", () => {
    expect(formatMenuPrice(6000)).toBe("¥6,000");
    expect(formatMenuPrice(500)).toBe("¥500");
    expect(formatMenuPrice(12345)).toBe("¥12,345");
  });
});

describe("formatMenuDuration", () => {
  it("formats minutes with the Japanese suffix", () => {
    expect(formatMenuDuration(60)).toBe("60分");
    expect(formatMenuDuration(90)).toBe("90分");
  });
});
