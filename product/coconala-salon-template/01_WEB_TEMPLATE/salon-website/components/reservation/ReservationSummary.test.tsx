import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationSummary } from "./ReservationSummary";

const service = { serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 };
const customer = { name: "山田太郎", email: "yamada@example.com", phone: "09012345678", notes: "" };

describe("ReservationSummary", () => {
  it("shows menu, duration, price, date/time, and customer info", () => {
    render(
      <ReservationSummary
        service={service}
        staffName="指名なし（お任せ）"
        date="2026-09-10"
        time="14:00"
        customer={customer}
        onConfirm={jest.fn()}
        onBack={jest.fn()}
        confirming={false}
      />,
    );
    expect(screen.getByText("まつげパーマ")).toBeInTheDocument();
    expect(screen.getByText("60分")).toBeInTheDocument();
    expect(screen.getByText("¥6,600")).toBeInTheDocument();
    expect(screen.getByText("指名なし（お任せ）")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
  });

  it("disables the confirm button while confirming", () => {
    render(
      <ReservationSummary service={service} staffName={null} date="2026-09-10" time="14:00" customer={customer} onConfirm={jest.fn()} onBack={jest.fn()} confirming />,
    );
    expect(screen.getByRole("button", { name: /予約を受け付けています/ })).toBeDisabled();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = jest.fn();
    render(
      <ReservationSummary service={service} staffName={null} date="2026-09-10" time="14:00" customer={customer} onConfirm={onConfirm} onBack={jest.fn()} confirming={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
