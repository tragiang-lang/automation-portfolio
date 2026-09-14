import { fireEvent, render, screen } from "@testing-library/react";
import { ReportForm } from "./ReportForm";
import type { ReportDraft } from "./reportDraft";
import type { WorkType } from "@/types/api";

const WORK_TYPES: WorkType[] = [
  { code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 },
  { code: "CLEANING", name: "清掃", status: "ACTIVE", sortOrder: 20 },
];

const VALID_DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "INSPECTION",
  reportDate: "2026-09-12",
  comment: "All clear.",
  photos: [],
};

describe("ReportForm", () => {
  // F1 — renders required fields
  it("renders a labeled control for every editable report field", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.getByLabelText("作業者名")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "作業種別" })).toBeInTheDocument();
    expect(screen.getByLabelText("報告日")).toBeInTheDocument();
    expect(screen.getByLabelText("コメント")).toBeInTheDocument();
  });

  // F3 — initial values
  it("shows the given draft's values in each control", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.getByLabelText("作業者名")).toHaveValue("Taro Yamada");
    expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveValue("INSPECTION");
    expect(screen.getByLabelText("報告日")).toHaveValue("2026-09-12");
    expect(screen.getByLabelText("コメント")).toHaveValue("All clear.");
  });

  it("shows every work type option in Japanese", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.getByRole("option", { name: "検査" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "清掃" })).toBeInTheDocument();
  });

  // F4 — user edits work type
  it("calls onChange with the updated draft when work type is changed", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByRole("combobox", { name: "作業種別" }), { target: { value: "CLEANING" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, workType: "CLEANING" });
  });

  // F5 — user edits report date
  it("calls onChange with the updated draft when the report date is edited", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByLabelText("報告日"), { target: { value: "2026-09-13" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, reportDate: "2026-09-13" });
  });

  // F6 — user edits comment
  it("calls onChange with the updated draft when the comment is edited", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Updated comment" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, comment: "Updated comment" });
  });

  it("calls onChange with the updated draft when worker name is edited", () => {
    const onChange = jest.fn();
    render(<ReportForm draft={VALID_DRAFT} onChange={onChange} workTypes={WORK_TYPES} />);

    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Jiro Suzuki" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, workerName: "Jiro Suzuki" });
  });

  // F7 — validation feedback (only after the field has been touched)
  it("does not show an error for an empty required field before it has been touched", () => {
    render(<ReportForm draft={{ ...VALID_DRAFT, workType: "" }} onChange={() => {}} workTypes={WORK_TYPES} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a validation error for an empty required field once it has been blurred", () => {
    render(<ReportForm draft={{ ...VALID_DRAFT, workType: "" }} onChange={() => {}} workTypes={WORK_TYPES} />);

    fireEvent.blur(screen.getByRole("combobox", { name: "作業種別" }));

    const workTypeField = screen.getByRole("combobox", { name: "作業種別" });
    expect(workTypeField).toHaveAccessibleDescription(expect.any(String));
    expect(workTypeField).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // F8 — valid draft shows no errors
  it("shows no validation errors for a fully valid, touched draft", () => {
    render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} />);

    fireEvent.blur(screen.getByLabelText("作業者名"));
    fireEvent.blur(screen.getByRole("combobox", { name: "作業種別" }));
    fireEvent.blur(screen.getByLabelText("報告日"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Task 11 — showAllErrors lets a submit attempt reveal every field's
  // errors at once, without requiring the user to have blurred each one
  // first (reuses validateReportDraft; no new validation rule added).
  describe("showAllErrors", () => {
    it("does not show errors when false (default) and no field has been touched", () => {
      render(
        <ReportForm draft={{ ...VALID_DRAFT, workType: "" }} onChange={() => {}} workTypes={WORK_TYPES} showAllErrors={false} />,
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows every invalid field's error when true, even with no field touched", () => {
      render(
        <ReportForm
          draft={{ ...VALID_DRAFT, workerName: "", workType: "", reportDate: "" }}
          onChange={() => {}}
          workTypes={WORK_TYPES}
          showAllErrors
        />,
      );

      expect(screen.getAllByRole("alert")).toHaveLength(3);
      expect(screen.getByLabelText("作業者名")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("combobox", { name: "作業種別" })).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("報告日")).toHaveAttribute("aria-invalid", "true");
    });

    it("shows no errors when true but the draft is fully valid", () => {
      render(<ReportForm draft={VALID_DRAFT} onChange={() => {}} workTypes={WORK_TYPES} showAllErrors />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
