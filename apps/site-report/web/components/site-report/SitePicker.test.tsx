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
  it("renders every site's name, code, and address when available", () => {
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={() => {}} />);

    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
    expect(screen.getByText("S001")).toBeInTheDocument();
    expect(screen.getByText("Shibuya, Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Shinjuku Plaza")).toBeInTheDocument();
    expect(screen.getByText("S002")).toBeInTheDocument();
  });

  it("calls onSelect with the full Site object for the activated site", () => {
    const onSelect = jest.fn();
    render(<SitePicker sites={[SITE_A, SITE_B]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Shinjuku Plaza/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SITE_B);
  });
});
