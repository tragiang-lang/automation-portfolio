import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceSelection } from "./ServiceSelection";

const services = [
  { serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 },
  { serviceId: "SV002", name: "ジェルネイル", durationMinutes: 90, price: 8800, displayOrder: 2 },
];

describe("ServiceSelection", () => {
  it("renders each service as a selectable option with duration and price", () => {
    render(<ServiceSelection services={services} selectedServiceId={null} onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument();
    expect(screen.getByText("60分")).toBeInTheDocument();
    expect(screen.getByText("¥6,600")).toBeInTheDocument();
  });

  it("marks the selected service as checked", () => {
    render(<ServiceSelection services={services} selectedServiceId="SV002" onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /ジェルネイル/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /まつげパーマ/ })).not.toBeChecked();
  });

  it("gives the selected service a visible highlighted background", () => {
    render(<ServiceSelection services={services} selectedServiceId="SV002" onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /ジェルネイル/ }).closest("label")).toHaveClass("bg-surface-sunken");
    expect(screen.getByRole("radio", { name: /まつげパーマ/ }).closest("label")).not.toHaveClass("bg-surface-sunken");
  });

  it("calls onSelect with the serviceId when chosen", async () => {
    const onSelect = jest.fn();
    render(<ServiceSelection services={services} selectedServiceId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    expect(onSelect).toHaveBeenCalledWith("SV001");
  });

  it("shows a customer-friendly empty state when there are no services", () => {
    render(<ServiceSelection services={[]} selectedServiceId={null} onSelect={jest.fn()} />);
    expect(screen.getByText(/現在ご案内できるメニューがありません/)).toBeInTheDocument();
  });
});
