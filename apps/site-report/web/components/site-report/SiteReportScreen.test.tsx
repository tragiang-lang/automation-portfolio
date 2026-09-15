/**
 * @jest-environment jsdom
 *
 * Orchestration tests for the Task 8 LIFF site-selection screen. Mocks
 * `lib/liff.ts` and `lib/api/siteReportWorkflows.ts` entirely — no real
 * LIFF SDK, no real HTTP call to GAS. Focuses on state transitions and
 * rendering, not implementation details of the mocked modules (Task 8
 * §16).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SiteReportScreen } from "./SiteReportScreen";
import type { ProgressStatus, Site, WorkType } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";
import { DRAFT_STORAGE_KEY, serializeDraft } from "./reportDraftStorage";
import type { ReportDraft } from "./reportDraft";

// Mocked by relative path, not the `@/` alias — matching lib/liff.test.ts
// and lib/api/siteReportWorkflows.test.ts's existing convention. `jest.mock`'s
// string argument is not rewritten by the SWC path-alias transform the way a
// normal `import ... from "@/..."` is, so an alias here fails to resolve.
jest.mock("../../lib/liff", () => ({
  initializeSiteReportLiff: jest.fn(),
  loginToSiteReport: jest.fn(),
}));
jest.mock("../../lib/api/siteReportWorkflows", () => ({
  getSites: jest.fn(),
  getWorkTypes: jest.fn(),
  getProgressStatuses: jest.fn(),
  submitReport: jest.fn(),
}));
// The real compressor uses FileReader/Image/canvas — jsdom has no native
// canvas backend. Mocking keeps these tests deterministic (Task 10).
jest.mock("./photoCompression", () => ({
  ...jest.requireActual("./photoCompression"),
  compressPhotoFile: jest
    .fn()
    .mockResolvedValue({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1, width: 1, height: 1 }),
}));

const { initializeSiteReportLiff, loginToSiteReport } = jest.requireMock("../../lib/liff") as {
  initializeSiteReportLiff: jest.Mock;
  loginToSiteReport: jest.Mock;
};
const { getSites, getWorkTypes, getProgressStatuses, submitReport } = jest.requireMock("../../lib/api/siteReportWorkflows") as {
  getSites: jest.Mock;
  getWorkTypes: jest.Mock;
  getProgressStatuses: jest.Mock;
  submitReport: jest.Mock;
};

const PROFILE: SiteReportLiffUser = { userId: "U1234567890", displayName: "Taro Yamada" };

const SITE_A: Site = {
  siteId: "SITE-1",
  siteCode: "S001",
  name: "Shibuya Tower",
  address: "Shibuya, Tokyo",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SITE_B: Site = {
  siteId: "SITE-2",
  siteCode: "S002",
  name: "Shinjuku Plaza",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const WORK_TYPE_A: WorkType = { code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 };

const PROGRESS_STATUS_A: ProgressStatus = { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2 };

function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

function mockOneSiteOneWorkType() {
  getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });
  getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
  getProgressStatuses.mockResolvedValue({ ok: true, data: { progressStatuses: [PROGRESS_STATUS_A] } });
}

function mockTwoSitesOneWorkType() {
  getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A, SITE_B] } });
  getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
  getProgressStatuses.mockResolvedValue({ ok: true, data: { progressStatuses: [PROGRESS_STATUS_A] } });
}

beforeEach(() => {
  initializeSiteReportLiff.mockReset();
  loginToSiteReport.mockReset().mockResolvedValue(undefined);
  getSites.mockReset();
  getWorkTypes.mockReset();
  getProgressStatuses.mockReset();
  submitReport.mockReset();
});

describe("SiteReportScreen — LIFF orchestration", () => {
  it("calls initializeSiteReportLiff and shows a loading state on mount", () => {
    initializeSiteReportLiff.mockReturnValue(neverResolves());

    render(<SiteReportScreen />);

    expect(initializeSiteReportLiff).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/読み込んでいます/)).toBeInTheDocument();
  });

  it("shows a login-required state and never calls loginToSiteReport automatically", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "login-required" });

    render(<SiteReportScreen />);

    expect(await screen.findByRole("button", { name: /ログイン/ })).toBeInTheDocument();
    expect(loginToSiteReport).not.toHaveBeenCalled();
  });

  it("calls loginToSiteReport when the user activates the login action", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "login-required" });

    render(<SiteReportScreen />);
    const loginButton = await screen.findByRole("button", { name: /ログイン/ });
    fireEvent.click(loginButton);

    expect(loginToSiteReport).toHaveBeenCalledTimes(1);
  });

  it("shows a LIFF error state", async () => {
    initializeSiteReportLiff.mockResolvedValue({
      status: "error",
      error: { code: "LIFF_INIT_FAILED", message: "Failed to initialize the LINE app." },
    });

    render(<SiteReportScreen />);

    expect(await screen.findByText("Failed to initialize the LINE app.")).toBeInTheDocument();
  });
});

describe("SiteReportScreen — GET_SITES/GET_WORK_TYPES orchestration", () => {
  it("calls getSites, getWorkTypes, and getProgressStatuses in parallel, all with no arguments, once LIFF is ready", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockReturnValue(neverResolves());
    getWorkTypes.mockReturnValue(neverResolves());
    getProgressStatuses.mockReturnValue(neverResolves());

    render(<SiteReportScreen />);

    await waitFor(() => {
      expect(getSites).toHaveBeenCalledTimes(1);
      expect(getWorkTypes).toHaveBeenCalledTimes(1);
      expect(getProgressStatuses).toHaveBeenCalledTimes(1);
    });
    expect(getSites.mock.calls[0]).toEqual([]);
    expect(getWorkTypes.mock.calls[0]).toEqual([]);
    expect(getProgressStatuses.mock.calls[0]).toEqual([]);
  });

  it("renders the site dropdown with every ACTIVE site once both loads succeed", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);

    expect(await screen.findByRole("option", { name: "Shibuya Tower" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shinjuku Plaza" })).toBeInTheDocument();
  });

  it("shows an empty state when the site list is empty", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [] } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
    getProgressStatuses.mockResolvedValue({ ok: true, data: { progressStatuses: [] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText(/現在、利用できる現場がありません/)).toBeInTheDocument();
  });

  it("shows an error state when getSites resolves ok:false", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: false, error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
    getProgressStatuses.mockResolvedValue({ ok: true, data: { progressStatuses: [PROGRESS_STATUS_A] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText("The Sites sheet could not be read.")).toBeInTheDocument();
  });

  it("shows an error state when getWorkTypes resolves ok:false", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });
    getWorkTypes.mockResolvedValue({ ok: false, error: { code: "DATA_INVALID", message: "Work type data failed validation." } });

    render(<SiteReportScreen />);

    expect(await screen.findByText("Work type data failed validation.")).toBeInTheDocument();
  });

  it("shows an error state when getProgressStatuses resolves ok:false", async () => {
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
    getProgressStatuses.mockResolvedValue({
      ok: false,
      error: { code: "DATA_INVALID", message: "Progress status data failed validation." },
    });
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);

    expect(await screen.findByText("Progress status data failed validation.")).toBeInTheDocument();
  });

  it("shows an error state when either call rejects", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockRejectedValue(new Error("network down"));
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText(/現場一覧の取得に失敗しました/)).toBeInTheDocument();
  });

  it("retries both getSites and getWorkTypes when retry is activated after a failure", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValueOnce({ ok: false, error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." } });
    getWorkTypes.mockResolvedValue({ ok: true, data: { workTypes: [WORK_TYPE_A] } });
    getProgressStatuses.mockResolvedValue({ ok: true, data: { progressStatuses: [PROGRESS_STATUS_A] } });

    render(<SiteReportScreen />);
    const retryButton = await screen.findByRole("button", { name: /再試行/ });

    getSites.mockResolvedValueOnce({ ok: true, data: { sites: [SITE_A, SITE_B] } });
    fireEvent.click(retryButton);

    expect(await screen.findByRole("option", { name: "Shibuya Tower" })).toBeInTheDocument();
    expect(getSites).toHaveBeenCalledTimes(2);
    expect(getWorkTypes).toHaveBeenCalledTimes(2);
  });
});

describe("SiteReportScreen — site selection", () => {
  it("shows the dropdown and waits for a choice when more than one ACTIVE site exists", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);
    await screen.findByRole("option", { name: "Shibuya Tower" });

    expect(screen.queryByRole("heading", { name: "現場報告" })).not.toBeInTheDocument();
  });

  it("transitions to the report-entry shell showing the chosen site after a dropdown selection", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);
    const select = await screen.findByRole("combobox", { name: /現場名/ });
    fireEvent.change(select, { target: { value: SITE_A.siteId } });

    expect(await screen.findByRole("heading", { name: "現場報告" })).toBeInTheDocument();
    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
  });

  it("auto-advances straight to report-entry when exactly one ACTIVE site exists", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();

    render(<SiteReportScreen />);

    expect(await screen.findByRole("heading", { name: "現場報告" })).toBeInTheDocument();
    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
  });

  it("returns to the dropdown, without refetching, when 現場を変更 is activated", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockTwoSitesOneWorkType();

    render(<SiteReportScreen />);
    fireEvent.change(await screen.findByRole("combobox", { name: /現場名/ }), { target: { value: SITE_A.siteId } });
    await screen.findByRole("heading", { name: "現場報告" });

    fireEvent.click(screen.getByRole("button", { name: "現場を変更" }));

    expect(await screen.findByRole("combobox", { name: /現場名/ })).toBeInTheDocument();
    expect(getSites).toHaveBeenCalledTimes(1);
    expect(getWorkTypes).toHaveBeenCalledTimes(1);
  });

  it("never calls submitReport just from selecting a site", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();

    render(<SiteReportScreen />);

    await screen.findByRole("heading", { name: "現場報告" });
    expect(submitReport).not.toHaveBeenCalled();
  });
});

describe("SiteReportScreen — report entry form (Task 9/Phase 1 P0)", () => {
  async function reachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();
    render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  it("shows the real report form fields after reaching report entry", async () => {
    await reachReportEntry();

    expect(screen.getByRole("combobox", { name: /作業種別/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/報告日/)).toBeInTheDocument();
    expect(screen.getByLabelText("コメント")).toBeInTheDocument();
  });

  it("pre-fills the worker name field from the authenticated LIFF profile", async () => {
    await reachReportEntry();

    expect(screen.getByLabelText(/作業者名/)).toHaveValue(PROFILE.displayName);
  });

  it("reflects a user edit to a field in the rendered input", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByRole("combobox", { name: /作業種別/ }), { target: { value: WORK_TYPE_A.code } });

    expect(screen.getByRole("combobox", { name: /作業種別/ })).toHaveValue(WORK_TYPE_A.code);
  });

  it("never calls submitReport while editing report fields", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });

    expect(submitReport).not.toHaveBeenCalled();
  });

  it("renders exactly one real file input for adding photos on the report-entry screen", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();

    const { container } = render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });

    expect(container.querySelectorAll('input[type="file"]').length).toBe(1);
  });
});

describe("SiteReportScreen — photo pipeline (Task 10)", () => {
  async function reachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();
    render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  it("adds a selected photo to the draft without resetting other report fields", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByRole("combobox", { name: /作業種別/ }), { target: { value: WORK_TYPE_A.code } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    expect(screen.getByRole("combobox", { name: /作業種別/ })).toHaveValue(WORK_TYPE_A.code);
  });

  it("keeps an added photo when an unrelated report field is edited afterward", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Updated notes" } });

    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("removes a photo without resetting report fields", async () => {
    await reachReportEntry();
    fireEvent.change(screen.getByLabelText(/作業者名/), { target: { value: "Custom Name" } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByLabelText(/作業者名/)).toHaveValue("Custom Name");
  });

  it("never calls submitReport while adding or removing photos", async () => {
    await reachReportEntry();

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));

    expect(submitReport).not.toHaveBeenCalled();
  });
});

describe("SiteReportScreen — submission (Task 11)", () => {
  async function reachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    mockOneSiteOneWorkType();
    render(<SiteReportScreen />);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  function fillValidDraft() {
    fireEvent.change(screen.getByRole("combobox", { name: /作業種別/ }), { target: { value: WORK_TYPE_A.code } });
    fireEvent.change(screen.getByRole("combobox", { name: /進捗状況/ }), {
      target: { value: PROGRESS_STATUS_A.code },
    });
  }

  const SUCCESS_RESULT = { ok: true, data: { reportId: "RPT-1", photoCount: 0, notificationSent: true } } as const;

  // S1 — valid submission: exact payload built from site + profile + draft
  it("builds the payload from site/profile/draft and calls submitReport when the submit control is activated", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    expect(submitReport).toHaveBeenCalledWith({
      siteId: SITE_A.siteId,
      lineUserId: PROFILE.userId,
      workerName: PROFILE.displayName,
      reportDate: expect.any(String),
      workType: WORK_TYPE_A.code,
      comment: "",
      progressStatus: PROGRESS_STATUS_A.code,
      hasIssue: "NO",
      issueDetail: undefined,
      photos: [],
    });
  });

  // S2 — no photos: still submits successfully
  it("submits successfully with an empty photos array", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(submitReport.mock.calls[0][0].photos).toEqual([]);
  });

  // S5 — validation failure: submitReport not called, errors shown
  it("does not call submitReport and shows validation errors for an invalid draft", async () => {
    await reachReportEntry();

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(submitReport).not.toHaveBeenCalled();
    expect((await screen.findAllByRole("alert")).length).toBeGreaterThan(0);
  });

  // S6 — loading state
  it("disables the submit control while submission is pending", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockReturnValue(neverResolves());

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /送信/ })).toBeDisabled());
  });

  // S7 — double click: submitReport called exactly once
  it("calls submitReport only once for two rapid submit clicks", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockReturnValue(neverResolves());

    const submitButton = screen.getByRole("button", { name: /送信/ });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(submitReport).toHaveBeenCalledTimes(1);
  });

  // S8 — API error: draft preserved, error shown, retry available
  it("shows the server error message and keeps the draft when submitReport resolves ok:false", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "The submitted report failed validation." },
    });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText("The submitted report failed validation.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /作業種別/ })).toHaveValue(WORK_TYPE_A.code);
    expect(screen.getByRole("button", { name: /送信/ })).not.toBeDisabled();
  });

  // S9 — unexpected rejection: recovers to an error state, retry succeeds
  it("recovers to an error state and allows a successful retry when submitReport rejects unexpectedly", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockRejectedValueOnce(new Error("network down"));

    const submitButton = screen.getByRole("button", { name: /送信/ });
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    expect(screen.getByRole("alert")).toBeInTheDocument();

    submitReport.mockResolvedValueOnce(SUCCESS_RESULT);
    fireEvent.click(submitButton);

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(submitReport).toHaveBeenCalledTimes(2);
  });

  // S10 — success: no automatic second submission
  it("shows a success state and does not call submitReport again automatically", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(submitReport).toHaveBeenCalledTimes(1);
  });

  // S13 — report fields preserved after a submission error
  it("preserves report fields after a submission error", async () => {
    await reachReportEntry();
    fireEvent.change(screen.getByLabelText(/作業者名/), { target: { value: "Custom Name" } });
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });
    submitReport.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." },
    });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await screen.findByRole("alert");
    expect(screen.getByLabelText(/作業者名/)).toHaveValue("Custom Name");
    expect(screen.getByRole("combobox", { name: /作業種別/ })).toHaveValue(WORK_TYPE_A.code);
    expect(screen.getByLabelText("コメント")).toHaveValue("Some notes");
  });

  // S14 — photo removed before submit: payload reflects current photos
  it("submits the current photos, not stale state, after a photo is removed", async () => {
    await reachReportEntry();
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: {
        files: [
          new File(["x"], "a.jpg", { type: "image/jpeg" }),
          new File(["x"], "b.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    submitReport.mockResolvedValue({ ok: true, data: { reportId: "RPT-1", photoCount: 1, notificationSent: true } });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    const payload = submitReport.mock.calls[0][0];
    expect(payload.photos).toHaveLength(1);
    expect(payload.photos[0].fileName).toBe("b.jpg");
  });

  // S15 — editing a field right before submit: payload has the latest value
  it("submits the latest field value after an edit made just before submit", async () => {
    await reachReportEntry();
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Final notes" } });
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    expect(submitReport.mock.calls[0][0].comment).toBe("Final notes");
  });

  // Task 12 §7 (Option A) — after success, the form is reset only when the
  // user explicitly chooses to create another report; it is never reset
  // or resubmitted automatically.
  it("resets to a fresh draft and idle submission when creating another report after success", async () => {
    await reachReportEntry();
    fireEvent.change(screen.getByLabelText(/作業者名/), { target: { value: "Custom Name" } });
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    submitReport.mockResolvedValue(SUCCESS_RESULT);
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    await screen.findByRole("button", { name: /別のレポートを作成/ });

    fireEvent.click(screen.getByRole("button", { name: /別のレポートを作成/ }));

    expect(screen.getByLabelText(/作業者名/)).toHaveValue(PROFILE.displayName);
    expect(screen.getByRole("combobox", { name: /作業種別/ })).toHaveValue("");
    expect(screen.getByLabelText("コメント")).toHaveValue("");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.queryByText(/送信しました/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^レポートを送信$/ })).not.toBeDisabled();
  });

  it("does not call submitReport again just from creating another report", async () => {
    await reachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    await screen.findByRole("button", { name: /別のレポートを作成/ });

    fireEvent.click(screen.getByRole("button", { name: /別のレポートを作成/ }));

    expect(submitReport).toHaveBeenCalledTimes(1);
  });
});

describe("SiteReportScreen — draft persistence", () => {
  const RESTORABLE_DRAFT: ReportDraft = {
    workerName: "Restored Name",
    workType: "INSPECTION",
    reportDate: "2026-09-14",
    comment: "restored comment",
    progressStatus: "IN_PROGRESS",
    hasIssue: "NO",
    issueDetail: "",
    photos: [],
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("auto-restores a same-user, same-site draft and shows the restored notice (single-site auto-advance)", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: PROFILE.userId, siteId: SITE_A.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockOneSiteOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);

    expect(await screen.findByDisplayValue("Restored Name")).toBeInTheDocument();
    expect(screen.getByText("前回の入力内容を復元しました。")).toBeInTheDocument();
  });

  it("does not restore a draft belonging to a different LINE user", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: "SOMEONE-ELSE", siteId: SITE_A.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockOneSiteOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);

    expect(await screen.findByLabelText(/作業者名/)).toHaveValue(PROFILE.displayName);
    expect(screen.queryByText(/前回の/)).not.toBeInTheDocument();
  });

  it("offers a cross-site restore instead of auto-restoring when the draft belongs to a different, still-active site", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: PROFILE.userId, siteId: SITE_B.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockTwoSitesOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);

    // Two sites -> site-selection screen first; pick SITE_A (not the draft's site).
    const picker = await screen.findByRole("combobox", { name: /現場名/ });
    fireEvent.change(picker, { target: { value: SITE_A.siteId } });

    expect(await screen.findByText("前回の下書きがあります")).toBeInTheDocument();
    expect(screen.getByText(`現場：${SITE_B.name}`)).toBeInTheDocument();
    // Form must stay untouched (SITE_A's fresh draft), not silently show SITE_B's content.
    expect(screen.getByLabelText(/作業者名/)).toHaveValue(PROFILE.displayName);
  });

  it("switches to the draft's site and restores its fields when the user confirms a cross-site restore", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: PROFILE.userId, siteId: SITE_B.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockTwoSitesOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);

    fireEvent.change(await screen.findByRole("combobox", { name: /現場名/ }), { target: { value: SITE_A.siteId } });
    fireEvent.click(await screen.findByRole("button", { name: "この下書きを復元" }));

    expect(await screen.findByText(SITE_B.name)).toBeInTheDocument(); // site switched to SITE_B
    expect(screen.getByLabelText(/作業者名/)).toHaveValue("Restored Name");
    expect(screen.getByText("前回の入力内容を復元しました。")).toBeInTheDocument();
  });

  it("discards the offered cross-site draft and leaves the current site/form untouched on 破棄", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: PROFILE.userId, siteId: SITE_B.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockTwoSitesOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);

    fireEvent.change(await screen.findByRole("combobox", { name: /現場名/ }), { target: { value: SITE_A.siteId } });
    fireEvent.click(await screen.findByRole("button", { name: "破棄" }));

    expect(await screen.findByText(SITE_A.name)).toBeInTheDocument(); // still on SITE_A
    expect(screen.getByLabelText(/作業者名/)).toHaveValue(PROFILE.displayName); // fresh draft, not SITE_B's
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("clears the stored draft after a successful submit", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: PROFILE.userId, siteId: SITE_A.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockOneSiteOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    submitReport.mockResolvedValue({ ok: true, data: { reportId: "RPT-1", photoCount: 0, notificationSent: true } });

    render(<SiteReportScreen />);

    fireEvent.click(await screen.findByRole("button", { name: "レポートを送信" }));

    await waitFor(() => expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull());
  });

  it("keeps the stored draft when a submit fails", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeDraft({ lineUserId: PROFILE.userId, siteId: SITE_A.siteId, draft: RESTORABLE_DRAFT }),
    );
    mockOneSiteOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    submitReport.mockResolvedValue({ ok: false, error: { code: "SITE_NOT_FOUND", message: "現場が見つかりません。" } });

    render(<SiteReportScreen />);

    fireEvent.click(await screen.findByRole("button", { name: "レポートを送信" }));

    await screen.findByText("現場が見つかりません。");
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  // Spec §27 Basic-10 — debounced persistence occurs correctly.
  it("debounces localStorage writes as the user types, saving only after inactivity", async () => {
    mockOneSiteOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);
    const nameInput = await screen.findByLabelText(/作業者名/);

    fireEvent.change(nameInput, { target: { value: "New Worker Name" } });
    // Nothing written yet — the debounce window has not elapsed.
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    await waitFor(
      () => {
        const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw as string).workerName).toBe("New Worker Name");
      },
      { timeout: 1000 },
    );
  });

  // Spec §27 Site-18 — site change updates subsequent draft siteId.
  it("tags subsequent draft writes with the new site's id after an explicit 現場を変更 site change", async () => {
    mockTwoSitesOneWorkType();
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });

    render(<SiteReportScreen />);
    fireEvent.change(await screen.findByRole("combobox", { name: /現場名/ }), { target: { value: SITE_A.siteId } });

    // Draft is untouched, so 現場を変更 navigates straight back to the
    // picker without the confirm panel (ReportEntryShell's own logic).
    fireEvent.click(await screen.findByRole("button", { name: "現場を変更" }));
    fireEvent.change(await screen.findByRole("combobox", { name: /現場名/ }), { target: { value: SITE_B.siteId } });

    fireEvent.change(await screen.findByLabelText(/作業者名/), { target: { value: "Updated For B" } });

    await waitFor(() => {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string);
      expect(parsed.siteId).toBe(SITE_B.siteId);
      expect(parsed.workerName).toBe("Updated For B");
    });
  });
});
