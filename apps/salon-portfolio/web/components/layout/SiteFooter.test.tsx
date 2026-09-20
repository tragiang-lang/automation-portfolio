import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { NavItem, SiteConfig } from "@/types/content";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/"),
}));

const mockUsePathname = usePathname as jest.Mock;

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
  labels: { service: "メニュー", bookingCta: "ご予約はこちら", inquiryMessage: "お問い合わせ内容" },
  content: {
    heroSubheadline: "",
    conceptEyebrow: "",
    conceptTitle: "",
    conceptParagraph1: "",
    conceptParagraph2: "",
    serviceSubtitle: "",
    ctaHeading: "",
    ctaMessage: "",
    ctaClosingHeading: "",
    ctaClosingMessage: "",
  },
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

  it("uses config.labels.bookingCta as the button text instead of a hard-coded term", () => {
    render(
      <SiteFooter
        config={{ ...config, labels: { ...config.labels, bookingCta: "参加申込み" } }}
        navItems={navItems}
      />,
    );
    expect(screen.getByRole("link", { name: "参加申込み" })).toBeInTheDocument();
  });
});

describe("SiteFooter nav href resolution (navigation bug fix)", () => {
  const navItemsWithContact: NavItem[] = [
    { label: "メニュー", href: "#menu" },
    { label: "お問い合わせ", href: "#contact" },
  ];

  afterEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("keeps section-anchor hrefs unchanged on the homepage", () => {
    render(<SiteFooter config={config} navItems={navItemsWithContact} />);
    expect(screen.getByRole("link", { name: "メニュー" })).toHaveAttribute("href", "#menu");
    expect(screen.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", "#contact");
  });

  it("prefixes section-anchor hrefs with / when rendered on /reservation", () => {
    mockUsePathname.mockReturnValue("/reservation");
    render(<SiteFooter config={config} navItems={navItemsWithContact} />);
    expect(screen.getByRole("link", { name: "メニュー" })).toHaveAttribute("href", "/#menu");
    expect(screen.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", "/#contact");
  });

  it("leaves the non-fragment /privacy and /terms links unchanged regardless of pathname", () => {
    mockUsePathname.mockReturnValue("/reservation");
    render(<SiteFooter config={config} navItems={navItemsWithContact} />);
    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
  });
});
