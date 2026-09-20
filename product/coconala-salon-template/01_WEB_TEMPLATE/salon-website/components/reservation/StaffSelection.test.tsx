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
});
