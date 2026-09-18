import { render, screen } from "@testing-library/react";
import { ReservationDisabledNotice } from "./ReservationDisabledNotice";

describe("ReservationDisabledNotice", () => {
  it("shows a customer-safe, non-technical unavailable message", () => {
    render(<ReservationDisabledNotice />);
    expect(screen.getByText(/現在、ご予約の受付を停止しております/)).toBeInTheDocument();
  });
});
