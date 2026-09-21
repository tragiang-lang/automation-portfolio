import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffSelection } from "./StaffSelection";
import { ANY_STAFF } from "@/types/reservation";

const staff = [
  { staffId: "ST001", name: "鈴木", displayOrder: 1 },
  { staffId: "ST002", name: "佐藤", displayOrder: 2 },
];

describe("StaffSelection", () => {
  it("renders each staff member plus the 指名なし option", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /鈴木/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /佐藤/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /指名なし/ })).toBeInTheDocument();
  });

  it("calls onSelect with ANY_STAFF for the no-preference option", async () => {
    const onSelect = jest.fn();
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /指名なし/ }));
    expect(onSelect).toHaveBeenCalledWith(ANY_STAFF);
  });

  it("calls onSelect with the staffId for a named staff member", async () => {
    const onSelect = jest.fn();
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /鈴木/ }));
    expect(onSelect).toHaveBeenCalledWith("ST001");
  });

  it("never renders an internal staffId as visible text", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} />);
    expect(screen.queryByText("ST001")).not.toBeInTheDocument();
  });

  it("marks the selected staff member as checked with a visible highlighted background", () => {
    render(<StaffSelection staff={staff} selectedStaffId="ST002" onSelect={jest.fn()} />);
    const selected = screen.getByRole("radio", { name: /佐藤/ });
    expect(selected).toBeChecked();
    expect(selected.closest("label")).toHaveClass("bg-surface-sunken");

    const notSelected = screen.getByRole("radio", { name: /鈴木/ });
    expect(notSelected).not.toBeChecked();
    expect(notSelected.closest("label")).not.toHaveClass("bg-surface-sunken");
  });

  it("marks the 指名なし option as checked with a visible highlighted background when selected", () => {
    render(<StaffSelection staff={staff} selectedStaffId={ANY_STAFF} onSelect={jest.fn()} />);
    const selected = screen.getByRole("radio", { name: /指名なし/ });
    expect(selected).toBeChecked();
    expect(selected.closest("label")).toHaveClass("bg-surface-sunken");
  });
});

describe("StaffSelection — availability display", () => {
  const availability = [
    { staffId: "ST001", name: "鈴木", available: true, conflicts: [] },
    { staffId: "ST002", name: "佐藤", available: false, conflicts: [{ startTime: "10:00", endTime: "11:30" }] },
  ];

  it("shows an available staff member as selectable with an 空き indicator", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} staffAvailability={availability} />);
    const radio = screen.getByRole("radio", { name: /鈴木/ });
    expect(radio).not.toBeDisabled();
    expect(screen.getByText(/空き/)).toBeInTheDocument();
  });

  it("disables an unavailable staff member and shows the conflicting time period, not just a color", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} staffAvailability={availability} />);
    const radio = screen.getByRole("radio", { name: /佐藤/ });
    expect(radio).toBeDisabled();
    expect(screen.getByText(/10:00.*11:30/)).toBeInTheDocument();
    expect(screen.getByText(/予約あり/)).toBeInTheDocument();
  });

  it("does not call onSelect when clicking a disabled, unavailable staff member", async () => {
    const onSelect = jest.fn();
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={onSelect} staffAvailability={availability} />);
    await userEvent.click(screen.getByRole("radio", { name: /佐藤/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("still renders an unavailable staff member (not hidden)", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} staffAvailability={availability} />);
    expect(screen.getByRole("radio", { name: /佐藤/ })).toBeInTheDocument();
  });

  it("shows a clear message and disables 指名なし when every staff member is unavailable", () => {
    const allBusy = [
      { staffId: "ST001", name: "鈴木", available: false, conflicts: [{ startTime: "10:00", endTime: "11:00" }] },
      { staffId: "ST002", name: "佐藤", available: false, conflicts: [{ startTime: "10:00", endTime: "11:00" }] },
    ];
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} staffAvailability={allBusy} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/空いていません/);
    expect(screen.getByRole("radio", { name: /指名なし/ })).toBeDisabled();
  });

  it("without staffAvailability data, behaves exactly as before (everyone selectable)", () => {
    render(<StaffSelection staff={staff} selectedStaffId={null} onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /鈴木/ })).not.toBeDisabled();
    expect(screen.getByRole("radio", { name: /佐藤/ })).not.toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
