import { render, screen } from "@testing-library/react";
import { RequiredLabel } from "./RequiredLabel";

describe("RequiredLabel", () => {
  it("renders the label text associated with the given control via htmlFor", () => {
    render(
      <>
        <RequiredLabel htmlFor="x">作業者名</RequiredLabel>
        <input id="x" />
      </>,
    );

    expect(screen.getByLabelText(/作業者名/)).toBeInTheDocument();
  });

  it("shows a visible * marker", () => {
    render(<RequiredLabel htmlFor="x">作業者名</RequiredLabel>);

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("marks the visible * as aria-hidden (decorative, not read twice by a screen reader)", () => {
    render(<RequiredLabel htmlFor="x">作業者名</RequiredLabel>);

    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("includes a visually-hidden （必須） string for assistive technology", () => {
    render(<RequiredLabel htmlFor="x">作業者名</RequiredLabel>);

    expect(screen.getByText("（必須）")).toBeInTheDocument();
  });
});
