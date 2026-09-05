import { render, screen } from "@testing-library/react";
import { groupServices, MenuSection } from "@/components/sections/MenuSection";
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

describe("MenuSection", () => {
  it("renders every service name and price", () => {
    render(
      <MenuSection
        services={[
          makeService({ serviceId: "SV001", name: "ジェルネイル", price: 6000 }),
          makeService({ serviceId: "SV002", name: "フットジェル", price: 8000 }),
        ]}
      />,
    );

    expect(screen.getByText("ジェルネイル")).toBeInTheDocument();
    expect(screen.getByText("フットジェル")).toBeInTheDocument();
    expect(screen.getByText("¥6,000")).toBeInTheDocument();
    expect(screen.getByText("¥8,000")).toBeInTheDocument();
  });
});
