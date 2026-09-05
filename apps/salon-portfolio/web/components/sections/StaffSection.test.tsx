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
});
