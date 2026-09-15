import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReportEntryShell } from "./ReportEntryShell";
import type { ProgressStatus, Site, SubmitReportResponseData, WorkType } from "@/types/api";
import type { ReportDraft, ReportDraftPhoto } from "./reportDraft";
import { IDLE_SUBMISSION_STATE, type SubmissionState } from "./submission";
import type { DraftNoticeState } from "./ReportEntryShell";

// The real compressor uses FileReader/Image/canvas — jsdom has no native
// canvas backend. Mocking keeps these integration tests deterministic and
// focused on ReportEntryShell's own wiring (Task 10 §18), not on
// photoCompression.ts's browser-adapter internals (covered separately in
// photoCompression.test.ts).
jest.mock("./photoCompression", () => ({
  ...jest.requireActual("./photoCompression"),
  compressPhotoFile: jest
    .fn()
    .mockResolvedValue({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1, width: 1, height: 1 }),
}));

const SELECTED_SITE: Site = {
  siteId: "SITE-1",
  siteCode: "S001",
  name: "Shibuya Tower",
  address: "Shibuya, Tokyo",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "Inspection",
  reportDate: "2026-09-12",
  comment: "",
  progressStatus: "IN_PROGRESS",
  hasIssue: "NO",
  issueDetail: "",
  photos: [],
};

const EMPTY_DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "",
  reportDate: "2026-09-12",
  comment: "",
  progressStatus: "",
  hasIssue: "NO",
  issueDetail: "",
  photos: [],
};

const WORK_TYPES: WorkType[] = [{ code: "Inspection", name: "検査", status: "ACTIVE", sortOrder: 1 }];

const PROGRESS_STATUSES: ProgressStatus[] = [
  { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2 },
];

const SUCCESS_DATA: SubmitReportResponseData = { reportId: "RPT-1", photoCount: 0, notificationSent: true };

function makePhoto(id: string): ReportDraftPhoto {
  return {
    id,
    fileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    base64Data: "QQ==",
    size: 1,
    previewUrl: "data:image/jpeg;base64,QQ==",
  };
}

function renderShell(overrides: {
  draft?: ReportDraft;
  onDraftChange?: (draft: ReportDraft) => void;
  workTypes?: WorkType[];
  progressStatuses?: ProgressStatus[];
  submission?: SubmissionState;
  submitAttempted?: boolean;
  onSubmit?: () => void;
  onCreateAnother?: () => void;
  onChangeSite?: () => void;
  draftNotice?: DraftNoticeState;
  onRestoreCrossSiteDraft?: () => void;
  onDismissDraftNotice?: () => void;
} = {}) {
  return render(
    <ReportEntryShell
      selectedSite={SELECTED_SITE}
      draft={overrides.draft ?? DRAFT}
      onDraftChange={overrides.onDraftChange ?? (() => {})}
      workTypes={overrides.workTypes ?? WORK_TYPES}
      progressStatuses={overrides.progressStatuses ?? PROGRESS_STATUSES}
      submission={overrides.submission ?? IDLE_SUBMISSION_STATE}
      submitAttempted={overrides.submitAttempted ?? false}
      onSubmit={overrides.onSubmit ?? (() => {})}
      onCreateAnother={overrides.onCreateAnother ?? (() => {})}
      onChangeSite={overrides.onChangeSite ?? (() => {})}
      draftNotice={overrides.draftNotice ?? { kind: "none" }}
      onRestoreCrossSiteDraft={overrides.onRestoreCrossSiteDraft ?? (() => {})}
      onDismissDraftNotice={overrides.onDismissDraftNotice ?? (() => {})}
    />,
  );
}

describe("ReportEntryShell", () => {
  it("shows the selected site's name and code", () => {
    renderShell();

    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
    expect(screen.getByText("S001")).toBeInTheDocument();
  });

  it("renders the real report form fields, not a placeholder", () => {
    renderShell();

    expect(screen.getByLabelText(/作業種別/)).toHaveValue("Inspection");
    expect(screen.getByLabelText(/報告日/)).toHaveValue("2026-09-12");
  });

  it("passes progressStatuses through to ReportForm's 進捗状況 dropdown", () => {
    renderShell();

    expect(screen.getByRole("option", { name: "進行中" })).toBeInTheDocument();
  });

  // Task 11 — the submit control is now real: enabled while idle, so a
  // click can trigger client-side validation and reveal field errors
  // (Task 11 §13); it is no longer permanently disabled as it was in
  // Task 8/9/10.
  it("renders an enabled submit control while idle", () => {
    renderShell();

    const submitControl = screen.getByRole("button", { name: /送信/ });
    expect(submitControl).not.toBeDisabled();
  });

  it("calls onSubmit when the submit control is activated", () => {
    const onSubmit = jest.fn();
    renderShell({ onSubmit });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables the submit control and shows a loading indication while submitting", () => {
    renderShell({ submission: { status: "submitting" } });

    const submitControl = screen.getByRole("button", { name: /送信/ });
    expect(submitControl).toBeDisabled();
  });

  it("shows a readable error message and keeps the draft's fields when submission fails", () => {
    renderShell({ submission: { status: "error", message: "The submitted report failed validation." } });

    expect(screen.getByRole("alert")).toHaveTextContent("The submitted report failed validation.");
    expect(screen.getByLabelText(/作業種別/)).toHaveValue("Inspection");
  });

  // Task 12 §7 (Option A): after success, the form/photo pipeline is
  // replaced by a confirmation + "create another" action rather than
  // staying editable with a re-clickable submit button (which would
  // otherwise let the exact same draft be submitted again).
  it("shows a success message with the reportId after a successful submission", () => {
    renderShell({ submission: { status: "success", result: SUCCESS_DATA } });

    expect(screen.getByText(/送信しました/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(SUCCESS_DATA.reportId))).toBeInTheDocument();
  });

  it("hides the report form and photo pipeline after a successful submission", () => {
    renderShell({ submission: { status: "success", result: SUCCESS_DATA } });

    expect(screen.queryByLabelText("作業種別")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("写真を追加")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^レポートを送信$/ })).not.toBeInTheDocument();
  });

  it("shows a create-another action after a successful submission", () => {
    renderShell({ submission: { status: "success", result: SUCCESS_DATA } });

    expect(screen.getByRole("button", { name: /別のレポートを作成/ })).toBeInTheDocument();
  });

  it("calls onCreateAnother when the create-another action is activated", () => {
    const onCreateAnother = jest.fn();
    renderShell({ submission: { status: "success", result: SUCCESS_DATA }, onCreateAnother });

    fireEvent.click(screen.getByRole("button", { name: /別のレポートを作成/ }));

    expect(onCreateAnother).toHaveBeenCalledTimes(1);
  });

  it("still shows the selected site after a successful submission", () => {
    renderShell({ submission: { status: "success", result: SUCCESS_DATA } });

    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
  });

  it("forces field errors to show when submitAttempted is true, even unblurred", () => {
    renderShell({ draft: { ...DRAFT, workType: "" }, submitAttempted: true });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // Task 10 — the photo section is real, not a placeholder.
  it("renders a photo section with a real, accessible file input", () => {
    renderShell();

    expect(screen.getByText("写真")).toBeInTheDocument();
    const input = screen.getByLabelText("写真を追加") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "file");
  });

  it("renders every photo already present in the draft", () => {
    renderShell({ draft: { ...DRAFT, photos: [makePhoto("1"), makePhoto("2")] } });

    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("calls onDraftChange with the new photo appended, keeping other fields intact", async () => {
    const onDraftChange = jest.fn();
    renderShell({ onDraftChange });

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => expect(onDraftChange).toHaveBeenCalled());
    const updated = onDraftChange.mock.calls[0][0] as ReportDraft;
    expect(updated.photos).toHaveLength(1);
    expect(updated.workerName).toBe(DRAFT.workerName);
    expect(updated.workType).toBe(DRAFT.workType);
    expect(updated.reportDate).toBe(DRAFT.reportDate);
  });

  it("calls onDraftChange with the photo removed when its remove button is activated", () => {
    const onDraftChange = jest.fn();
    const draftWithPhotos = { ...DRAFT, photos: [makePhoto("1"), makePhoto("2")] };
    renderShell({ draft: draftWithPhotos, onDraftChange });

    fireEvent.click(screen.getByRole("button", { name: /1\.jpg/ }));

    expect(onDraftChange).toHaveBeenCalledWith({ ...draftWithPhotos, photos: [makePhoto("2")] });
  });

  describe("draft notice", () => {
    it("shows nothing when draftNotice is none", () => {
      renderShell({ draftNotice: { kind: "none" } });

      expect(screen.queryByText(/前回の/)).not.toBeInTheDocument();
    });

    it("shows a restored message with a discard button when draftNotice is restored", () => {
      const onDismissDraftNotice = jest.fn();
      renderShell({ draftNotice: { kind: "restored" }, onDismissDraftNotice });

      expect(screen.getByText("前回の入力内容を復元しました。")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "破棄" }));
      expect(onDismissDraftNotice).toHaveBeenCalledTimes(1);
    });

    it("shows the cross-site offer with the saved site's name and two actions", () => {
      const onRestoreCrossSiteDraft = jest.fn();
      const onDismissDraftNotice = jest.fn();
      renderShell({
        draftNotice: { kind: "cross-site", siteName: "Shinjuku Plaza" },
        onRestoreCrossSiteDraft,
        onDismissDraftNotice,
      });

      expect(screen.getByText("前回の下書きがあります")).toBeInTheDocument();
      expect(screen.getByText("現場：Shinjuku Plaza")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "この下書きを復元" }));
      expect(onRestoreCrossSiteDraft).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "破棄" }));
      expect(onDismissDraftNotice).toHaveBeenCalledTimes(1);
    });
  });
});

describe("ReportEntryShell — change site (Phase 1 P0)", () => {
  it("renders a 現場を変更 button while the form is editable", () => {
    renderShell({ draft: EMPTY_DRAFT });

    expect(screen.getByRole("button", { name: "現場を変更" })).toBeInTheDocument();
  });

  it("calls onChangeSite immediately when the draft is still untouched", () => {
    const onChangeSite = jest.fn();
    renderShell({ draft: EMPTY_DRAFT, onChangeSite });

    fireEvent.click(screen.getByRole("button", { name: "現場を変更" }));

    expect(onChangeSite).toHaveBeenCalledTimes(1);
  });

  it("shows a confirmation instead of navigating immediately once a field has been edited", () => {
    const onChangeSite = jest.fn();
    renderShell({ draft: { ...EMPTY_DRAFT, comment: "some notes" }, onChangeSite });

    fireEvent.click(screen.getByRole("button", { name: "現場を変更" }));

    expect(onChangeSite).not.toHaveBeenCalled();
    expect(screen.getByText(/現在入力中の内容は失われます/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "現場を変更する" }));
    expect(onChangeSite).toHaveBeenCalledTimes(1);
  });

  it("does not show the 現場を変更 button after a successful submission", () => {
    renderShell({ submission: { status: "success", result: SUCCESS_DATA } });

    expect(screen.queryByRole("button", { name: "現場を変更" })).not.toBeInTheDocument();
  });
});
