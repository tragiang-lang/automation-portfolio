import { render, screen } from "@testing-library/react";
import { STAFF_ANY_AVAILABLE, StaffPhotoFallback, staffPhotoAlt } from "@/components/sections/StaffContent";
import type { StaffMember } from "@/types/content";

describe("staffPhotoAlt", () => {
  it("uses photoAlt when present", () => {
    const staff: StaffMember = { staffId: "ST001", name: "田中 あい", photoAlt: "スタッフ写真" };
    expect(staffPhotoAlt(staff)).toBe("スタッフ写真");
  });

  it("falls back to the staff member's name when photoAlt is absent (a runtime-sourced member never has it)", () => {
    const staff: StaffMember = { staffId: "ST002", name: "鈴木 さくら" };
    expect(staffPhotoAlt(staff)).toBe("鈴木 さくら");
  });
});

describe("STAFF_ANY_AVAILABLE", () => {
  it("carries the same 'no preference' copy every variant renders", () => {
    expect(STAFF_ANY_AVAILABLE.label).toBe("指名なし（お任せ）");
    expect(STAFF_ANY_AVAILABLE.description).toBe("空いているスタッフが対応いたします。");
  });
});

describe("StaffPhotoFallback", () => {
  it("renders the first character of the given name/initial as a decorative tile", () => {
    render(<StaffPhotoFallback initial="鈴木 さくら" aspectRatio="1 / 1" textClassName="text-[32px]" />);
    expect(screen.getByText("鈴")).toBeInTheDocument();
  });

  it("marks the tile as decorative (aria-hidden) — the sibling name text carries the identity", () => {
    const { container } = render(
      <StaffPhotoFallback initial="ア" aspectRatio="800 / 1000" textClassName="text-[56px]" />,
    );
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
