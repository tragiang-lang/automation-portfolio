import { render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { NavItem, SiteConfig } from "@/types/content";

const config: SiteConfig = {
  business: {
    name: "アトリエ イト",
    nameLatin: "atelier ito",
    tagline: "髪と向き合う、静かな時間。",
    phone: "03-2345-6789",
    email: "info@atelier-ito.example.com",
    address: "東京都渋谷区神宮前3-4-5",
    postalCode: "〒150-0001",
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
