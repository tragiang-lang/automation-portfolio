import { render, screen, within } from "@testing-library/react";
import { MenuSection } from "./MenuSection";
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

const RUNTIME_SERVICES: Service[] = [
  makeService({
    serviceId: "SV001",
    name: "カット",
    price: 5500,
    durationMinutes: 60,
    description: "丁寧なカウンセリングから仕上げまで。",
    category: "ヘアケア",
  }),
  makeService({
    serviceId: "SV002",
    name: "カラー",
    price: 7700,
    durationMinutes: 90,
    // No description — must not be invented (Task 6 §2/§15).
  }),
  makeService({
    serviceId: "SV003",
    name: "ヘッドスパ",
    price: 3300,
    durationMinutes: 30,
    // No category — must not be invented.
  }),
];

const MENU_VARIANTS = ["editorial-list", "card-grid", "minimal-price-list"] as const;

describe("MenuSection", () => {
  it("defaults to the editorial-list variant when menuVariant is not passed", () => {
    render(<MenuSection services={RUNTIME_SERVICES} />);

    expect(screen.getByTestId("menu-editorial-list")).toBeInTheDocument();
    expect(screen.queryByTestId("menu-card-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("menu-minimal-price-list")).not.toBeInTheDocument();
  });

  it("falls back to editorial-list for an invalid menuVariant value instead of crashing", () => {
    render(<MenuSection services={RUNTIME_SERVICES} menuVariant={"not-a-real-variant" as never} />);

    expect(screen.getByTestId("menu-editorial-list")).toBeInTheDocument();
  });

  it("always renders the #menu anchor section regardless of variant (Hero's secondary CTA and site nav both link to #menu)", () => {
    const { container } = render(<MenuSection services={RUNTIME_SERVICES} menuVariant="card-grid" />);

    expect(container.querySelector("#menu")).toBeInTheDocument();
  });

  it.each(MENU_VARIANTS)("renders the %s variant with runtime service name, price, and duration", (variant) => {
    render(<MenuSection services={RUNTIME_SERVICES} menuVariant={variant} />);

    expect(screen.getByTestId(`menu-${variant}`)).toBeInTheDocument();
    expect(screen.getByText("カット")).toBeInTheDocument();
    expect(screen.getByText("¥5,500")).toBeInTheDocument();
    expect(screen.getByText("カラー")).toBeInTheDocument();
    expect(screen.getByText("¥7,700")).toBeInTheDocument();
    // Exactly one section heading (h2) — one Menu heading regardless of variant.
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "メニュー" })).toBeInTheDocument();
    // Reservation CTA remains a real link, not a styled div, in every variant.
    const reservationLink = screen.getByRole("link", { name: "ご予約はこちら" });
    expect(reservationLink).toHaveAttribute("href", "/reservation");
  });

  it.each(["editorial-list", "card-grid"] as const)(
    "shows the description in %s when present, and omits it (no invented copy) when absent",
    (variant) => {
      render(<MenuSection services={RUNTIME_SERVICES} menuVariant={variant} />);

      // SV001 has a real description.
      expect(screen.getByText("丁寧なカウンセリングから仕上げまで。")).toBeInTheDocument();
      // SV002/SV003 have no description — nothing invented in their place.
      expect(screen.queryByText(/This is our/)).not.toBeInTheDocument();
    },
  );

  it("never renders a description in minimal-price-list, by design (Task 6 §8: description must not dominate this variant)", () => {
    render(<MenuSection services={RUNTIME_SERVICES} menuVariant="minimal-price-list" />);

    expect(screen.queryByText("丁寧なカウンセリングから仕上げまで。")).not.toBeInTheDocument();
  });

  it("uses title/subtitle/ctaLabel props instead of hard-coded salon terminology when provided (Starter MVP reusability)", () => {
    render(
      <MenuSection
        services={RUNTIME_SERVICES}
        title="ワークショップ"
        subtitle="開催時間は目安です。"
        ctaLabel="参加申込み"
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "ワークショップ" })).toBeInTheDocument();
    expect(screen.getByText("開催時間は目安です。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "参加申込み" })).toBeInTheDocument();
  });

  it("groups editorial-list services by category once grouping threshold is exceeded (Phase 2A §9, reused unchanged)", () => {
    const grouped: Service[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        makeService({ serviceId: `A${i}`, name: `カットA${i}`, category: "カラー" }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        makeService({ serviceId: `B${i}`, name: `カラーB${i}`, category: "パーマ" }),
      ),
    ];

    render(<MenuSection services={grouped} menuVariant="editorial-list" />);

    expect(screen.getByText("カラー")).toBeInTheDocument();
    expect(screen.getByText("パーマ")).toBeInTheDocument();
  });

  it("shows each service's category as a per-card label in card-grid, independent of the grouping threshold", () => {
    render(<MenuSection services={RUNTIME_SERVICES} menuVariant="card-grid" />);

    const card = screen.getByTestId("menu-card-grid");
    expect(within(card).getByText("カット")).toBeInTheDocument();
  });

  it("renders a usable single-column list in card-grid on narrow viewports without a dedicated media query test (class-driven responsive grid)", () => {
    render(<MenuSection services={RUNTIME_SERVICES} menuVariant="card-grid" />);

    const grid = screen.getByTestId("menu-card-grid");
    expect(grid.className).toMatch(/grid-cols-1/);
  });

  it("renders minimal-price-list as a compact, distinct composition from editorial-list (no category grouping)", () => {
    const grouped: Service[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        makeService({ serviceId: `A${i}`, name: `カットA${i}`, category: "カラー" }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        makeService({ serviceId: `B${i}`, name: `カラーB${i}`, category: "パーマ" }),
      ),
    ];

    render(<MenuSection services={grouped} menuVariant="minimal-price-list" />);

    // Every service name/price still renders...
    expect(screen.getByText("カットA0")).toBeInTheDocument();
    // ...but minimal-price-list never renders a category-group heading, unlike editorial-list.
    expect(screen.queryByText("カラー")).not.toBeInTheDocument();
  });
});
