import { render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { NavItem, SiteConfig } from "@/types/content";

const config: SiteConfig = {
  business: {
    name: "凛",
    nameLatin: "Rin Nail & Eyelash",
    tagline: "静けさの中で、指先とまなざしを整える。",
    phone: "03-1234-5678",
    email: "info@example.com",
    address: "東京都中央区銀座1-2-3",
    postalCode: "〒104-0061",
  },
  hours: {
    monday: "10:00-19:00",
    tuesday: "10:00-19:00",
    wednesday: "closed",
    thursday: "10:00-19:00",
    friday: "10:00-20:00",
    saturday: "10:00-20:00",
    sunday: "10:00-18:00",
  },
  features: { contactForm: true, reservation: true, staffSelection: true },
  staffAnyAvailableOption: true,
  socialLinks: [],
};

const navItems: NavItem[] = [{ label: "コンセプト", href: "#concept" }];

describe("SiteFooter reservation flag", () => {
  it("shows the reservation button when features.reservation is true", () => {
    render(<SiteFooter config={config} navItems={navItems} />);
    expect(screen.getByRole("link", { name: "ご予約はこちら" })).toBeInTheDocument();
  });

  it("hides the reservation button when features.reservation is false", () => {
    render(
      <SiteFooter
        config={{ ...config, features: { ...config.features, reservation: false } }}
        navItems={navItems}
      />,
    );
    expect(screen.queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
  });
});
