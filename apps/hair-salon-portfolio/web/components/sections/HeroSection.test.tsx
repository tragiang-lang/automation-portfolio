import { render, screen } from "@testing-library/react";
import { HeroSection } from "./HeroSection";

const RUNTIME_CONTENT = {
  headline: "自然体の美しさを引き出す、静かなヘアサロン。",
  subheadline: "テスト用の説明文です。",
  name: "アトリエ イト 神宮前店",
  nameLatin: "atelier ito Jingumae",
};

describe("HeroSection", () => {
  it("defaults to the fullscreen variant when heroVariant is not passed", () => {
    render(<HeroSection {...RUNTIME_CONTENT} />);

    expect(screen.getByTestId("hero-fullscreen")).toBeInTheDocument();
    expect(screen.queryByTestId("hero-split")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-editorial")).not.toBeInTheDocument();
  });

  it("falls back to fullscreen for an invalid heroVariant value instead of crashing", () => {
    render(<HeroSection {...RUNTIME_CONTENT} heroVariant={"not-a-real-variant" as never} />);

    expect(screen.getByTestId("hero-fullscreen")).toBeInTheDocument();
  });

  it.each(["fullscreen", "split", "editorial"] as const)("renders the %s variant", (variant) => {
    render(<HeroSection {...RUNTIME_CONTENT} heroVariant={variant} />);

    expect(screen.getByTestId(`hero-${variant}`)).toBeInTheDocument();
    // Runtime headline/subheadline reach every variant, not a hard-coded
    // demo string.
    expect(screen.getByRole("heading", { name: RUNTIME_CONTENT.headline })).toBeInTheDocument();
    expect(screen.getByText(RUNTIME_CONTENT.subheadline)).toBeInTheDocument();
    // Exactly one h1 per variant — heading hierarchy stays valid.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    // Reservation CTA remains a real link, not a styled div.
    const reservationLink = screen.getByRole("link", { name: "予約する" });
    expect(reservationLink).toHaveAttribute("href", "/reservation");
  });

  it("shows the runtime salon name/nameLatin in the split variant", () => {
    render(<HeroSection {...RUNTIME_CONTENT} heroVariant="split" />);

    expect(screen.getByText(RUNTIME_CONTENT.name)).toBeInTheDocument();
    expect(screen.getByText(RUNTIME_CONTENT.nameLatin)).toBeInTheDocument();
  });

  it("shows the runtime salon name/nameLatin in the editorial variant", () => {
    render(<HeroSection {...RUNTIME_CONTENT} heroVariant="editorial" />);

    expect(screen.getByText(RUNTIME_CONTENT.name)).toBeInTheDocument();
    expect(screen.getByText(RUNTIME_CONTENT.nameLatin)).toBeInTheDocument();
  });

  it("does not render the runtime name/nameLatin as visible text in the fullscreen variant (unchanged legacy look)", () => {
    render(<HeroSection {...RUNTIME_CONTENT} heroVariant="fullscreen" />);

    expect(screen.queryByText(RUNTIME_CONTENT.name)).not.toBeInTheDocument();
    expect(screen.queryByText(RUNTIME_CONTENT.nameLatin)).not.toBeInTheDocument();
  });

  it.each(["fullscreen", "split", "editorial"] as const)(
    "uses primaryCtaLabel instead of a hard-coded term when provided (Starter MVP reusability, %s variant)",
    (variant) => {
      render(<HeroSection {...RUNTIME_CONTENT} heroVariant={variant} primaryCtaLabel="参加申込み" />);

      const link = screen.getByRole("link", { name: "参加申込み" });
      expect(link).toHaveAttribute("href", "/reservation");
      expect(screen.queryByRole("link", { name: "予約する" })).not.toBeInTheDocument();
    },
  );
});
