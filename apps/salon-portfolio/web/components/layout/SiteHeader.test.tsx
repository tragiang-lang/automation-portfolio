import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { BusinessInfo, NavItem } from "@/types/content";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const business: BusinessInfo = {
  name: "凛",
  nameLatin: "Rin Nail & Eyelash",
  tagline: "静けさの中で、指先とまなざしを整える。",
  phone: "03-1234-5678",
  email: "info@example.com",
  address: "東京都中央区銀座1-2-3",
  postalCode: "〒104-0061",
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
