import { fireEvent, render, screen } from "@testing-library/react";
import { ReportConfirmation } from "./ReportConfirmation";
import type { ReportDraft, ReportDraftPhoto } from "./reportDraft";
import type { ProgressStatus, Site, WorkType } from "@/types/api";

const site: Site = {
  siteId: "site-1",
  siteCode: "S001",
  name: "第一現場",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const workTypes: WorkType[] = [
  { code: "ELECTRICAL", name: "電気工事", status: "ACTIVE", sortOrder: 1 },
  { code: "PLUMBING", name: "配管工事", status: "ACTIVE", sortOrder: 2 },
];

const progressStatuses: ProgressStatus[] = [
  { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2 },
  { code: "DONE", name: "完了", status: "ACTIVE", sortOrder: 3 },
];

const photo: ReportDraftPhoto = {
  id: "photo-1",
  fileName: "site.jpg",
  mimeType: "image/jpeg",
  base64Data: "AAAA",
  size: 100,
  previewUrl: "data:image/jpeg;base64,AAAA",
};

function buildDraft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return {
    workerName: "山田太郎",
    workType: "ELECTRICAL",
    reportDate: "2026-09-16",
    comment: "特になし",
    progressStatus: "IN_PROGRESS",
    hasIssue: "NO",
    issueDetail: "",
    photos: [photo],
    ...overrides,
  };
}

describe("ReportConfirmation", () => {
  it("renders all important submission fields with resolved display names", () => {
    render(
      <ReportConfirmation
        site={site}
        draft={buildDraft()}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={false}
        onBack={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByText("第一現場")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("電気工事")).toBeInTheDocument();
    expect(screen.getByText("2026-09-16")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("問題なし")).toBeInTheDocument();
    expect(screen.getByText("特になし")).toBeInTheDocument();
    expect(screen.getByAltText(/site\.jpg/)).toBeInTheDocument();
  });

  it("shows 問題内容 only when hasIssue is YES", () => {
    const { rerender } = render(
      <ReportConfirmation
        site={site}
        draft={buildDraft({ hasIssue: "NO", issueDetail: "" })}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={false}
        onBack={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.queryByText("水漏れがあります")).not.toBeInTheDocument();

    rerender(
      <ReportConfirmation
        site={site}
        draft={buildDraft({ hasIssue: "YES", issueDetail: "水漏れがあります" })}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={false}
        onBack={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("問題あり")).toBeInTheDocument();
    expect(screen.getByText("水漏れがあります")).toBeInTheDocument();
  });

  it("never renders an editable form control", () => {
    render(
      <ReportConfirmation
        site={site}
        draft={buildDraft()}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={false}
        onBack={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    // Photo is shown without its usual remove control (read-only reuse of PhotoPreviewList).
    expect(screen.queryByRole("button", { name: /削除/ })).not.toBeInTheDocument();
  });

  it("calls onBack when 戻って修正 is clicked", () => {
    const onBack = jest.fn();
    render(
      <ReportConfirmation
        site={site}
        draft={buildDraft()}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={false}
        onBack={onBack}
        onSubmit={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "戻って修正" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onSubmit when この内容で送信 is clicked", () => {
    const onSubmit = jest.fn();
    render(
      <ReportConfirmation
        site={site}
        draft={buildDraft()}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={false}
        onBack={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "この内容で送信" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables both actions and shows 送信中... while isSubmitting", () => {
    render(
      <ReportConfirmation
        site={site}
        draft={buildDraft()}
        workTypes={workTypes}
        progressStatuses={progressStatuses}
        isSubmitting={true}
        onBack={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "戻って修正" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "送信中..." })).toBeDisabled();
  });
});
