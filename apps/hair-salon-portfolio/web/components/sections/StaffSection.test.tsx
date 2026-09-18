import { render, screen, within } from "@testing-library/react";
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

const STAFF_VARIANTS = ["portrait-grid", "horizontal-profile"] as const;

describe("StaffSection", () => {
  it("renders nothing at all when disabled (Phase 0 §K — not just visually hidden)", () => {
    const { container } = render(
      <StaffSection enabled={false} staff={staff} anyAvailableOption businessNameInitial="凛" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing at all when disabled, even with an explicit staffVariant", () => {
    const { container } = render(
      <StaffSection
        enabled={false}
        staff={staff}
        anyAvailableOption
        businessNameInitial="凛"
        staffVariant="horizontal-profile"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the 'any available staff' tile as part of the same list when enabled", () => {
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

  it("always renders the #staff anchor section regardless of variant", () => {
    const { container } = render(
      <StaffSection enabled staff={staff} anyAvailableOption businessNameInitial="凛" staffVariant="horizontal-profile" />,
    );
    expect(container.querySelector("#staff")).toBeInTheDocument();
  });

  it("defaults to the portrait-grid variant when staffVariant is not passed", () => {
    render(<StaffSection enabled staff={staff} anyAvailableOption businessNameInitial="凛" />);

    expect(screen.getByTestId("staff-portrait-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("staff-horizontal-profile")).not.toBeInTheDocument();
  });

  it("falls back to portrait-grid for an invalid staffVariant value instead of crashing", () => {
    render(
      <StaffSection
        enabled
        staff={staff}
        anyAvailableOption
        businessNameInitial="凛"
        staffVariant={"not-a-real-variant" as never}
      />,
    );

    expect(screen.getByTestId("staff-portrait-grid")).toBeInTheDocument();
  });

  it.each(STAFF_VARIANTS)(
    "renders the %s variant with runtime staff name, role, and bio",
    (variant) => {
      render(
        <StaffSection enabled staff={staff} anyAvailableOption businessNameInitial="凛" staffVariant={variant} />,
      );

      expect(screen.getByTestId(`staff-${variant}`)).toBeInTheDocument();
      expect(screen.getByText("田中 あい")).toBeInTheDocument();
      expect(screen.getByText("店長 / ネイリスト")).toBeInTheDocument();
      expect(screen.getByText("丁寧なカウンセリングが得意です。")).toBeInTheDocument();
      // Exactly one section heading (h2) — one Staff heading regardless of variant.
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 2, name: "スタッフ紹介" })).toBeInTheDocument();
    },
  );

  it.each(STAFF_VARIANTS)(
    "omits role/bio (no invented copy) for a runtime staff member missing them, in %s",
    (variant) => {
      const runtimeStaff: StaffMember[] = [{ staffId: "ST002", name: "鈴木 さくら" }];
      render(
        <StaffSection
          enabled
          staff={runtimeStaff}
          anyAvailableOption={false}
          businessNameInitial="凛"
          staffVariant={variant}
        />,
      );

      const list = screen.getByTestId(`staff-${variant}`);
      expect(within(list).getByText("鈴木 さくら")).toBeInTheDocument();
      expect(within(list).queryByText(/店長|ネイリスト/)).not.toBeInTheDocument();
      // Falls back to an initial-letter tile instead of a broken <img> or invented photo.
      expect(within(list).getByText("鈴")).toBeInTheDocument();
    },
  );

  it("shows a usable single-column staff list in horizontal-profile, distinct from portrait-grid's multi-column grid", () => {
    render(
      <StaffSection enabled staff={staff} anyAvailableOption businessNameInitial="凛" staffVariant="horizontal-profile" />,
    );

    const list = screen.getByTestId("staff-horizontal-profile");
    expect(list.className).not.toMatch(/grid-cols-2/);
  });

  it("preserves runtime staff order (no re-sorting) in every variant", () => {
    const orderedStaff: StaffMember[] = [
      { staffId: "ST010", name: "第一 スタッフ" },
      { staffId: "ST011", name: "第二 スタッフ" },
    ];

    for (const variant of STAFF_VARIANTS) {
      const { unmount } = render(
        <StaffSection
          enabled
          staff={orderedStaff}
          anyAvailableOption={false}
          businessNameInitial="凛"
          staffVariant={variant}
        />,
      );
      const list = screen.getByTestId(`staff-${variant}`);
      const names = within(list)
        .getAllByText(/第一 スタッフ|第二 スタッフ/)
        .map((el) => el.textContent);
      expect(names).toEqual(["第一 スタッフ", "第二 スタッフ"]);
      unmount();
    }
  });
});
