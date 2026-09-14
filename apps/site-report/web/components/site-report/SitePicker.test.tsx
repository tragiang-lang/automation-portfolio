import { fireEvent, render, screen } from "@testing-library/react";
import { SitePicker } from "./SitePicker";
import type { Site } from "@/types/api";

const SITE_A: Site = {
  siteId: "SITE-1",
  siteCode: "S001",
  name: "Shibuya Tower",
  address: "Shibuya, Tokyo",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SITE_B: Site = {
  siteId: "SITE-2",
  siteCode: "S002",
  name: "Shinjuku Plaza",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SitePicker", () => {
  it("renders a labeled dropdown with a placeholder plus one option per site", () => {
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={() => {}} />);

    const select = screen.getByRole("combobox", { name: "現場名" });
    expect(select).toBeInTheDocument();
    expect(screen.getByText("現場を選択してください")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shibuya Tower" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shinjuku Plaza" })).toBeInTheDocument();
  });

  it("starts with no site selected (the placeholder option)", () => {
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={() => {}} />);

    expect(screen.getByRole("combobox", { name: "現場名" })).toHaveValue("");
  });

  it("calls onSelect with the full Site object when a site is chosen", () => {
    const onSelect = jest.fn();
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("combobox", { name: "現場名" }), { target: { value: SITE_B.siteId } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SITE_B);
  });

  it("never calls onSelect for the placeholder option itself", () => {
    const onSelect = jest.fn();
    render(<SitePicker sites={[SITE_A]} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("combobox", { name: "現場名" }), { target: { value: SITE_A.siteId } });
    fireEvent.change(screen.getByRole("combobox", { name: "現場名" }), { target: { value: "" } });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
