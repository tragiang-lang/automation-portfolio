import { render, screen } from "@testing-library/react";
import { ReservationSuccess } from "./ReservationSuccess";

describe("ReservationSuccess", () => {
  it("shows the plain confirmed message and reservation number", () => {
    render(<ReservationSuccess reservationId="RES-20260910-X8K2MP" />);
    expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument();
    expect(screen.getByText("RES-20260910-X8K2MP")).toBeInTheDocument();
    expect(screen.getByText(/確認メールをお送りしました/)).toBeInTheDocument();
  });

  it("shows a distinct needsConfirmation message without claiming an email was sent to the customer", () => {
    render(<ReservationSuccess reservationId="RES-20260910-X8K2MP" needsConfirmation />);
    expect(screen.getByText("RES-20260910-X8K2MP")).toBeInTheDocument();
    expect(screen.queryByText(/確認メールをお送りしました/)).not.toBeInTheDocument();
    expect(screen.getByText(/担当より必要に応じてご連絡いたします/)).toBeInTheDocument();
  });
});
