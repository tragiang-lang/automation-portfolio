import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationErrorNotice } from "./ReservationErrorNotice";

describe("ReservationErrorNotice", () => {
  it("renders the given message as an alert", () => {
    render(<ReservationErrorNotice message="選択された時間帯はご利用いただけません。" />);
    expect(screen.getByRole("alert")).toHaveTextContent("選択された時間帯はご利用いただけません。");
  });

  it("shows a retry button only when onRetry is given", async () => {
    const onRetry = jest.fn();
    render(<ReservationErrorNotice message="エラー" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "もう一度お試しください" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders no button when onRetry is omitted", () => {
    render(<ReservationErrorNotice message="エラー" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
