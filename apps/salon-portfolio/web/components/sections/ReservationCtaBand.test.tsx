import { render, screen } from "@testing-library/react";
import { ReservationCtaBand } from "./ReservationCtaBand";

describe("ReservationCtaBand", () => {
  it("renders the given heading and message, with a default CTA label", () => {
    render(<ReservationCtaBand heading="見出し" message="本文" />);

    expect(screen.getByRole("heading", { name: "見出し" })).toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "ご予約はこちら" });
    expect(link).toHaveAttribute("href", "/reservation");
  });

  it("uses ctaLabel instead of the default term when provided (Starter MVP reusability)", () => {
    render(<ReservationCtaBand heading="見出し" message="本文" ctaLabel="参加申込み" />);

    expect(screen.getByRole("link", { name: "参加申込み" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
  });
});
