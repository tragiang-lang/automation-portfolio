import { render, screen } from "@testing-library/react";
import { StaffSection } from "@/components/sections/StaffSection";
import type { StaffMember } from "@/types/content";

const staff: StaffMember[] = [
  {
    staffId: "ST001",
    name: "田中 あい",
    role: "店長 / ネイリスト",
    introduction: "丁寧なカウンセリングが得意です。",
    photoSrc: "/images/staff-1.svg",
    photoAlt: "スタッフ写真",
  },
];

describe("StaffSection", () => {
  it("renders nothing at all when disabled (Phase 0 §K — not just visually hidden)", () => {
    const { container } = render(
      <StaffSection enabled={false} staff={staff} anyAvailableOption businessNameInitial="凛" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the 'any available staff' tile as part of the same grid when enabled", () => {
    render(
      <StaffSection enabled staff={staff} anyAvailableOption businessNameInitial="凛" />,
    );
    expect(screen.getByText("田中 あい")).toBeInTheDocument();
    expect(screen.getByText("指名なし（お任せ）")).toBeInTheDocument();
  });

  it("omits the 'any available staff' tile when the config option is off", () => {
    render(
      <StaffSection enabled staff={staff} anyAvailableOption={false} businessNameInitial="凛" />,
    );
    expect(screen.queryByText("指名なし（お任せ）")).not.toBeInTheDocument();
  });

  it("renders a runtime-sourced staff member with no role/introduction/photo without crashing", () => {
    const runtimeStaff: StaffMember[] = [{ staffId: "ST002", name: "鈴木 さくら" }];
    render(
      <StaffSection enabled staff={runtimeStaff} anyAvailableOption={false} businessNameInitial="凛" />,
    );
    expect(screen.getByText("鈴木 さくら")).toBeInTheDocument();
    // Falls back to an initial-letter tile (same convention as
    // AnyAvailableStaffCard) instead of rendering a broken <img>.
    expect(screen.getByText("鈴")).toBeInTheDocument();
  });
});
