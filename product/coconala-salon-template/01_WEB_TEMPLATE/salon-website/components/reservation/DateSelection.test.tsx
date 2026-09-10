import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateSelection } from "./DateSelection";

describe("DateSelection", () => {
  it("renders a labeled native date input bounded by min/max", () => {
    render(<DateSelection value={null} minDate="2026-09-02" maxDate="2026-11-01" onChange={jest.fn()} />);
    const input = screen.getByLabelText("日付");
    expect(input).toHaveAttribute("min", "2026-09-02");
    expect(input).toHaveAttribute("max", "2026-11-01");
  });

  it("calls onChange with the chosen date", async () => {
    const onChange = jest.fn();
    render(<DateSelection value={null} minDate="2026-09-02" maxDate="2026-11-01" onChange={onChange} />);
    const input = screen.getByLabelText("日付");
    await userEvent.type(input, "2026-09-10");
    expect(onChange).toHaveBeenCalledWith("2026-09-10");
  });
});
