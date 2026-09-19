import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeSlotSelection } from "./TimeSlotSelection";

describe("TimeSlotSelection", () => {
  it("shows a loading state", () => {
    render(<TimeSlotSelection status="loading" slots={[]} selectedTime={null} onSelect={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("空き状況を確認しています");
  });

  it("renders each available slot as a selectable button", async () => {
    const onSelect = jest.fn();
    render(
      <TimeSlotSelection
        status="ready"
        slots={[{ time: "10:00" }, { time: "10:30" }]}
        selectedTime={null}
        onSelect={onSelect}
        onRetry={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    expect(onSelect).toHaveBeenCalledWith("10:00");
  });

  it("shows the customer-safe empty-slots message", () => {
    render(<TimeSlotSelection status="ready" slots={[]} selectedTime={null} onSelect={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByText(/この日は予約可能な時間がありません/)).toBeInTheDocument();
  });

  it("shows an error state with a retry action", async () => {
    const onRetry = jest.fn();
    render(<TimeSlotSelection status="error" slots={[]} selectedTime={null} onSelect={jest.fn()} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("marks the selected time visually and via aria-pressed", () => {
    render(
      <TimeSlotSelection
        status="ready"
        slots={[{ time: "10:00" }, { time: "10:30" }]}
        selectedTime="10:00"
        onSelect={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    const selected = screen.getByRole("button", { name: "10:00" });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected).toHaveClass("border-accent", "bg-surface-sunken", "font-medium");

    const notSelected = screen.getByRole("button", { name: "10:30" });
    expect(notSelected).toHaveAttribute("aria-pressed", "false");
    expect(notSelected).not.toHaveClass("bg-surface-sunken");
  });
});
