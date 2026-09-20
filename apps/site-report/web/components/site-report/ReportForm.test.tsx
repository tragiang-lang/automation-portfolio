import { fireEvent, render, screen } from "@testing-library/react";
import { ReportForm } from "./ReportForm";
import type { ReportDraft } from "./reportDraft";
import type { ProgressStatus, WorkType } from "@/types/api";

const WORK_TYPES: WorkType[] = [
  { code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 },
  { code: "CLEANING", name: "清掃", status: "ACTIVE", sortOrder: 20 },
];

const PROGRESS_STATUSES: ProgressStatus[] = [
  { code: "NOT_STARTED", name: "未着手", status: "ACTIVE", sortOrder: 1 },
  { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2 },
  { code: "DONE", name: "完了", status: "ACTIVE", sortOrder: 3 },
];

const VALID_DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "INSPECTION",
  reportDate: "2026-09-12",
  comment: "All clear.",
  progressStatus: "IN_PROGRESS",
  hasIssue: "NO",
  issueDetail: "",
  photos: [],
};

function renderForm(overrides: { draft?: ReportDraft; onChange?: (draft: ReportDraft) => void; showAllErrors?: boolean } = {}) {
  return render(
    <ReportForm
      draft={overrides.draft ?? VALID_DRAFT}
      onChange={overrides.onChange ?? (() => {})}
      workTypes={WORK_TYPES}
      progressStatuses={PROGRESS_STATUSES}
      showAllErrors={overrides.showAllErrors}
    />,
  );
}

describe("ReportForm", () => {
  // F1 — renders required fields
  it("renders a labeled control for every editable report field", () => {
    renderForm();

    expect(screen.getByLabelText(/作業者名/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /作業種別/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/報告日/)).toBeInTheDocument();
    expect(screen.getByLabelText("コメント")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /進捗状況/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "問題なし" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "問題あり" })).toBeInTheDocument();
  });

  // F3 — initial values
  it("shows the given draft's values in each control", () => {
    renderForm();

    expect(screen.getByLabelText(/作業者名/)).toHaveValue("Taro Yamada");
    expect(screen.getByRole("combobox", { name: /作業種別/ })).toHaveValue("INSPECTION");
    expect(screen.getByLabelText(/報告日/)).toHaveValue("2026-09-12");
    expect(screen.getByLabelText("コメント")).toHaveValue("All clear.");
    expect(screen.getByRole("combobox", { name: /進捗状況/ })).toHaveValue("IN_PROGRESS");
    expect(screen.getByRole("radio", { name: "問題なし" })).toBeChecked();
  });

  it("shows every work type and progress status option in Japanese", () => {
    renderForm();

    expect(screen.getByRole("option", { name: "検査" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "清掃" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "未着手" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "進行中" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "完了" })).toBeInTheDocument();
  });

  // F4 — user edits work type
  it("calls onChange with the updated draft when work type is changed", () => {
    const onChange = jest.fn();
    renderForm({ onChange });

    fireEvent.change(screen.getByRole("combobox", { name: /作業種別/ }), { target: { value: "CLEANING" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, workType: "CLEANING" });
  });

  // F5 — user edits report date
  it("calls onChange with the updated draft when the report date is edited", () => {
    const onChange = jest.fn();
    renderForm({ onChange });

    fireEvent.change(screen.getByLabelText(/報告日/), { target: { value: "2026-09-13" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, reportDate: "2026-09-13" });
  });

  // F6 — user edits comment
  it("calls onChange with the updated draft when the comment is edited", () => {
    const onChange = jest.fn();
    renderForm({ onChange });

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Updated comment" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, comment: "Updated comment" });
  });

  it("calls onChange with the updated draft when worker name is edited", () => {
    const onChange = jest.fn();
    renderForm({ onChange });

    fireEvent.change(screen.getByLabelText(/作業者名/), { target: { value: "Jiro Suzuki" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, workerName: "Jiro Suzuki" });
  });

  // Phase 2 — progress status select
  it("calls onChange with the updated draft when progress status is changed", () => {
    const onChange = jest.fn();
    renderForm({ onChange });

    fireEvent.change(screen.getByRole("combobox", { name: /進捗状況/ }), { target: { value: "DONE" } });

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, progressStatus: "DONE" });
  });

  // Phase 2 — issue radio pair
  it("shows no 問題内容 textarea when 問題なし is selected (default)", () => {
    renderForm();

    expect(screen.queryByLabelText(/問題内容/)).not.toBeInTheDocument();
  });

  it("shows the required 問題内容 textarea when 問題あり is selected, and clears any prior issueDetail", () => {
    const onChange = jest.fn();
    renderForm({ onChange });

    fireEvent.click(screen.getByRole("radio", { name: "問題あり" }));

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, hasIssue: "YES", issueDetail: "" });
  });

  it("renders the 問題内容 textarea with its current value once hasIssue is YES", () => {
    renderForm({ draft: { ...VALID_DRAFT, hasIssue: "YES", issueDetail: "足場が不足しています" } });

    expect(screen.getByLabelText(/問題内容/)).toHaveValue("足場が不足しています");
  });

  it("calls onChange with the updated issueDetail when the textarea is edited", () => {
    const onChange = jest.fn();
    const draft = { ...VALID_DRAFT, hasIssue: "YES" as const, issueDetail: "" };
    renderForm({ draft, onChange });

    fireEvent.change(screen.getByLabelText(/問題内容/), { target: { value: "資材が届いていません" } });

    expect(onChange).toHaveBeenCalledWith({ ...draft, issueDetail: "資材が届いていません" });
  });

  it("clears issueDetail to empty string when switching from 問題あり back to 問題なし", () => {
    const onChange = jest.fn();
    renderForm({ draft: { ...VALID_DRAFT, hasIssue: "YES", issueDetail: "足場が不足しています" }, onChange });

    fireEvent.click(screen.getByRole("radio", { name: "問題なし" }));

    expect(onChange).toHaveBeenCalledWith({ ...VALID_DRAFT, hasIssue: "NO", issueDetail: "" });
  });

  // F7 — validation feedback (only after the field has been touched)
  it("does not show an error for an empty required field before it has been touched", () => {
    renderForm({ draft: { ...VALID_DRAFT, workType: "" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a validation error for an empty required field once it has been blurred", () => {
    renderForm({ draft: { ...VALID_DRAFT, workType: "" } });

    fireEvent.blur(screen.getByRole("combobox", { name: /作業種別/ }));

    const workTypeField = screen.getByRole("combobox", { name: /作業種別/ });
    expect(workTypeField).toHaveAccessibleDescription(expect.any(String));
    expect(workTypeField).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows a validation error for an empty progressStatus once blurred", () => {
    renderForm({ draft: { ...VALID_DRAFT, progressStatus: "" } });

    fireEvent.blur(screen.getByRole("combobox", { name: /進捗状況/ }));

    expect(screen.getByRole("combobox", { name: /進捗状況/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows a validation error for an empty issueDetail (hasIssue:YES) once blurred", () => {
    renderForm({ draft: { ...VALID_DRAFT, hasIssue: "YES", issueDetail: "" } });

    fireEvent.blur(screen.getByLabelText(/問題内容/));

    expect(screen.getByLabelText(/問題内容/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // F8 — valid draft shows no errors
  it("shows no validation errors for a fully valid, touched draft", () => {
    renderForm();

    fireEvent.blur(screen.getByLabelText(/作業者名/));
    fireEvent.blur(screen.getByRole("combobox", { name: /作業種別/ }));
    fireEvent.blur(screen.getByLabelText(/報告日/));
    fireEvent.blur(screen.getByRole("combobox", { name: /進捗状況/ }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Required-field markers (Phase 2 spec §13)
  it("shows a visible required marker on every required field's label", () => {
    renderForm();

    expect(screen.getAllByText("（必須）")).toHaveLength(4); // 作業者名, 作業種別, 報告日, 進捗状況
  });

  it("shows a required marker on 問題内容's label only while it is visible (hasIssue:YES)", () => {
    const { rerender } = renderForm();
    expect(screen.queryByText(/問題内容/)).not.toBeInTheDocument();

    rerender(
      <ReportForm
        draft={{ ...VALID_DRAFT, hasIssue: "YES", issueDetail: "x" }}
        onChange={() => {}}
        workTypes={WORK_TYPES}
        progressStatuses={PROGRESS_STATUSES}
      />,
    );
    expect(screen.getAllByText("（必須）")).toHaveLength(5); // + 問題内容
  });

  describe("showAllErrors", () => {
    it("does not show errors when false (default) and no field has been touched", () => {
      renderForm({ draft: { ...VALID_DRAFT, workType: "" }, showAllErrors: false });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows every invalid field's error when true, even with no field touched", () => {
      renderForm({
        draft: { ...VALID_DRAFT, workerName: "", workType: "", reportDate: "", progressStatus: "" },
        showAllErrors: true,
      });

      expect(screen.getAllByRole("alert")).toHaveLength(4);
    });

    it("shows no errors when true but the draft is fully valid", () => {
      renderForm({ showAllErrors: true });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
