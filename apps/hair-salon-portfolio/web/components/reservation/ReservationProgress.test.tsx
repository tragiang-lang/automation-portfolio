import { render, screen } from "@testing-library/react";
import { ReservationProgress } from "./ReservationProgress";

describe("ReservationProgress", () => {
  it("announces the current step number and total, in Japanese", () => {
    render(<ReservationProgress steps={["service", "staff", "datetime", "customer", "review"]} currentStep="datetime" />);
    expect(screen.getByText("ステップ 3/5")).toBeInTheDocument();
  });

  it("labels the current step visibly", () => {
    render(<ReservationProgress steps={["service", "datetime", "customer", "review"]} currentStep="service" />);
    expect(screen.getByText("メニューを選択")).toBeInTheDocument();
  });
});
