import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { BusinessInfo, NavItem } from "@/types/content";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const business: BusinessInfo = {
  name: "アトリエ イト",
  nameLatin: "atelier ito",
  tagline: "髪と向き合う、静かな時間。",
  phone: "03-2345-6789",
  email: "info@atelier-ito.example.com",
  address: "東京都渋谷区神宮前3-4-5",
  postalCode: "〒150-0001",
};

const navItems: NavItem[] = [
  { label: "コンセプト", href: "#concept" },
  { label: "メニュー", href: "#menu" },
];

describe("SiteHeader / MobileNav", () => {
  it("opens the mobile nav panel and moves focus into it", async () => {
    const user = userEvent.setup();
    render(<SiteHeader business={business} navItems={navItems} />);

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));

    const dialog = await screen.findByRole("dialog", { name: "サイト内メニュー" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "メニューを閉じる" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the toggle button", async () => {
    const user = userEvent.setup();
    render(<SiteHeader business={business} navItems={navItems} />);

    const toggle = screen.getByRole("button", { name: "メニューを開く" });
    await user.click(toggle);
    await screen.findByRole("dialog", { name: "サイト内メニュー" });

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("lists every nav item inside the open panel", async () => {
    const user = userEvent.setup();
    render(<SiteHeader business={business} navItems={navItems} />);
    await user.click(screen.getByRole("button", { name: "メニューを開く" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "コンセプト" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "メニュー" })).toBeInTheDocument();
  });
});

describe("SiteHeader reservation flag", () => {
  it("shows the reservation buttons by default", () => {
    render(<SiteHeader business={business} navItems={navItems} />);
    // getAllByRole (not getByRole): the desktop button's visible text and
    // the mobile button's aria-label both compute to the same accessible
    // name "ご予約はこちら", and jsdom has no real Tailwind CSS loaded
    // (jest.config.ts / next/jest stub out CSS imports), so the `hidden`
    // / `sm:block` responsive classes that make only one of them visible
    // in a real browser have no effect here — both stay in the tree.
    expect(screen.getAllByRole("link", { name: "ご予約はこちら" }).length).toBeGreaterThan(0);
  });

  it("hides the header and mobile-nav reservation buttons when reservationEnabled is false", async () => {
    const user = userEvent.setup();
    render(<SiteHeader business={business} navItems={navItems} reservationEnabled={false} />);

    expect(screen.queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "予約" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
  });
});

describe("SiteHeader overDarkHeroImage (V1.1 Task 5 — Hero Layout Variants)", () => {
  it("renders transparent/text-on-primary over the homepage by default (HeroFullscreen's dark photo)", () => {
    render(<SiteHeader business={business} navItems={navItems} />);

    expect(screen.getByRole("banner")).toHaveClass("bg-transparent");
    expect(screen.getByRole("navigation", { name: "メインナビゲーション" })).toHaveClass("text-on-primary");
  });

  it("renders a solid, text-primary header on the homepage when overDarkHeroImage is false (HeroSplit/HeroEditorial's light top section)", () => {
    render(<SiteHeader business={business} navItems={navItems} overDarkHeroImage={false} />);

    const header = screen.getByRole("banner");
    expect(header).not.toHaveClass("bg-transparent");
    expect(header).toHaveClass("bg-background/95");
    expect(screen.getByRole("navigation", { name: "メインナビゲーション" })).toHaveClass("text-primary");
  });
});
