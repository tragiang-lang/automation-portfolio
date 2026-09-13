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
import type { Site } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";

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
const { getSites, submitReport } = jest.requireMock("../../lib/api/siteReportWorkflows") as {
  getSites: jest.Mock;
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

function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

beforeEach(() => {
  initializeSiteReportLiff.mockReset();
  loginToSiteReport.mockReset().mockResolvedValue(undefined);
  getSites.mockReset();
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

describe("SiteReportScreen — GET_SITES orchestration", () => {
  it("calls getSites with no arguments once LIFF is ready", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockReturnValue(neverResolves());

    render(<SiteReportScreen />);

    await waitFor(() => expect(getSites).toHaveBeenCalledTimes(1));
    expect(getSites.mock.calls[0]).toEqual([]);
  });

  it("renders the site list on successful loading", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A, SITE_B] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText("Shibuya Tower")).toBeInTheDocument();
    expect(screen.getByText("Shinjuku Plaza")).toBeInTheDocument();
  });

  it("shows an empty state when the site list is empty", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [] } });

    render(<SiteReportScreen />);

    expect(await screen.findByText(/現在、利用できる現場がありません/)).toBeInTheDocument();
  });

  it("shows an error state when getSites resolves ok:false", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({
      ok: false,
      error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." },
    });

    render(<SiteReportScreen />);

    expect(await screen.findByText("The Sites sheet could not be read.")).toBeInTheDocument();
  });

  it("shows an error state when getSites rejects", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockRejectedValue(new Error("network down"));

    render(<SiteReportScreen />);

    expect(await screen.findByText(/現場一覧の取得に失敗しました/)).toBeInTheDocument();
  });

  it("calls getSites again when retry is activated after a failure", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValueOnce({
      ok: false,
      error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." },
    });

    render(<SiteReportScreen />);
    const retryButton = await screen.findByRole("button", { name: /再試行/ });

    getSites.mockResolvedValueOnce({ ok: true, data: { sites: [SITE_A] } });
    fireEvent.click(retryButton);

    expect(await screen.findByText("Shibuya Tower")).toBeInTheDocument();
    expect(getSites).toHaveBeenCalledTimes(2);
  });
});

describe("SiteReportScreen — site selection", () => {
  it("transitions to the report-entry shell showing the selected site after selection", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A, SITE_B] } });

    render(<SiteReportScreen />);
    const siteButton = await screen.findByRole("button", { name: /Shibuya Tower/ });
    fireEvent.click(siteButton);

    expect(await screen.findByRole("heading", { name: "現場報告" })).toBeInTheDocument();
    expect(screen.getByText("Shibuya Tower")).toBeInTheDocument();
    expect(screen.queryByText("Shinjuku Plaza")).not.toBeInTheDocument();
  });

  it("never calls submitReport just from selecting a site", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });

    render(<SiteReportScreen />);
    const siteButton = await screen.findByRole("button", { name: /Shibuya Tower/ });
    fireEvent.click(siteButton);

    await screen.findByRole("heading", { name: "現場報告" });
    expect(submitReport).not.toHaveBeenCalled();
  });
});

describe("SiteReportScreen — report entry form (Task 9)", () => {
  async function selectSiteAndReachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });

    render(<SiteReportScreen />);
    const siteButton = await screen.findByRole("button", { name: /Shibuya Tower/ });
    fireEvent.click(siteButton);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  // S1 — selected site opens the real report form
  it("shows the real report form fields after selecting a site", async () => {
    await selectSiteAndReachReportEntry();

    expect(screen.getByLabelText("作業種別")).toBeInTheDocument();
    expect(screen.getByLabelText("報告日")).toBeInTheDocument();
    expect(screen.getByLabelText("コメント")).toBeInTheDocument();
  });

  // S2 — the LIFF profile remains available and pre-fills the draft
  it("pre-fills the worker name field from the authenticated LIFF profile", async () => {
    await selectSiteAndReachReportEntry();

    expect(screen.getByLabelText("作業者名")).toHaveValue(PROFILE.displayName);
  });

  // S3 — draft updates flow through the screen's state
  it("reflects a user edit to a field in the rendered input", async () => {
    await selectSiteAndReachReportEntry();

    const workTypeInput = screen.getByLabelText("作業種別") as HTMLInputElement;
    fireEvent.change(workTypeInput, { target: { value: "Cleaning" } });

    expect(screen.getByLabelText("作業種別")).toHaveValue("Cleaning");
  });

  // S4 — no submission
  it("never calls submitReport while editing report fields", async () => {
    await selectSiteAndReachReportEntry();

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });

    expect(submitReport).not.toHaveBeenCalled();
  });

  // S5 — photo pipeline is real (Task 10): exactly one file input, no
  // camera-specific native API usage anywhere in this component tree.
  it("renders exactly one real file input for adding photos on the report-entry screen", async () => {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });

    const { container } = render(<SiteReportScreen />);
    const siteButton = await screen.findByRole("button", { name: /Shibuya Tower/ });
    fireEvent.click(siteButton);
    await screen.findByRole("heading", { name: "現場報告" });

    expect(container.querySelectorAll('input[type="file"]').length).toBe(1);
  });
});

describe("SiteReportScreen — photo pipeline (Task 10)", () => {
  async function selectSiteAndReachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });

    render(<SiteReportScreen />);
    const siteButton = await screen.findByRole("button", { name: /Shibuya Tower/ });
    fireEvent.click(siteButton);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  it("adds a selected photo to the draft without resetting other report fields", async () => {
    await selectSiteAndReachReportEntry();

    fireEvent.change(screen.getByLabelText("作業種別"), { target: { value: "Cleaning" } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    expect(screen.getByLabelText("作業種別")).toHaveValue("Cleaning");
  });

  it("keeps an added photo when an unrelated report field is edited afterward", async () => {
    await selectSiteAndReachReportEntry();

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Updated notes" } });

    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("removes a photo without resetting report fields", async () => {
    await selectSiteAndReachReportEntry();
    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Custom Name" } });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByLabelText("作業者名")).toHaveValue("Custom Name");
  });

  it("never calls submitReport while adding or removing photos", async () => {
    await selectSiteAndReachReportEntry();

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: /a\.jpg/ }));

    expect(submitReport).not.toHaveBeenCalled();
  });
});

describe("SiteReportScreen — submission (Task 11)", () => {
  async function selectSiteAndReachReportEntry() {
    initializeSiteReportLiff.mockResolvedValue({ status: "ready", profile: PROFILE });
    getSites.mockResolvedValue({ ok: true, data: { sites: [SITE_A] } });

    render(<SiteReportScreen />);
    const siteButton = await screen.findByRole("button", { name: /Shibuya Tower/ });
    fireEvent.click(siteButton);
    await screen.findByRole("heading", { name: "現場報告" });
  }

  function fillValidDraft() {
    fireEvent.change(screen.getByLabelText("作業種別"), { target: { value: "Inspection" } });
  }

  const SUCCESS_RESULT = { ok: true, data: { reportId: "RPT-1", photoCount: 0, notificationSent: true } } as const;

  // S1 — valid submission: exact payload built from site + profile + draft
  it("builds the payload from site/profile/draft and calls submitReport when the submit control is activated", async () => {
    await selectSiteAndReachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
    expect(submitReport).toHaveBeenCalledWith({
      siteId: SITE_A.siteId,
      lineUserId: PROFILE.userId,
      workerName: PROFILE.displayName,
      reportDate: expect.any(String),
      workType: "Inspection",
      comment: "",
      photos: [],
    });
  });

  // S2 — no photos: still submits successfully
  it("submits successfully with an empty photos array", async () => {
    await selectSiteAndReachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(submitReport.mock.calls[0][0].photos).toEqual([]);
  });

  // S5 — validation failure: submitReport not called, errors shown
  it("does not call submitReport and shows validation errors for an invalid draft", async () => {
    await selectSiteAndReachReportEntry();
    fireEvent.change(screen.getByLabelText("作業種別"), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(submitReport).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  // S6 — loading state
  it("disables the submit control while submission is pending", async () => {
    await selectSiteAndReachReportEntry();
    fillValidDraft();
    submitReport.mockReturnValue(neverResolves());

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /送信/ })).toBeDisabled());
  });

  // S7 — double click: submitReport called exactly once
  it("calls submitReport only once for two rapid submit clicks", async () => {
    await selectSiteAndReachReportEntry();
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
    await selectSiteAndReachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "The submitted report failed validation." },
    });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText("The submitted report failed validation.")).toBeInTheDocument();
    expect(screen.getByLabelText("作業種別")).toHaveValue("Inspection");
    expect(screen.getByRole("button", { name: /送信/ })).not.toBeDisabled();
  });

  // S9 — unexpected rejection: recovers to an error state, retry succeeds
  it("recovers to an error state and allows a successful retry when submitReport rejects unexpectedly", async () => {
    await selectSiteAndReachReportEntry();
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
    await selectSiteAndReachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(submitReport).toHaveBeenCalledTimes(1);
  });

  // S13 — report fields preserved after a submission error
  it("preserves report fields after a submission error", async () => {
    await selectSiteAndReachReportEntry();
    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Custom Name" } });
    fillValidDraft();
    fireEvent.change(screen.getByLabelText("コメント"), { target: { value: "Some notes" } });
    submitReport.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." },
    });

    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await screen.findByRole("alert");
    expect(screen.getByLabelText("作業者名")).toHaveValue("Custom Name");
    expect(screen.getByLabelText("作業種別")).toHaveValue("Inspection");
    expect(screen.getByLabelText("コメント")).toHaveValue("Some notes");
  });

  // S14 — photo removed before submit: payload reflects current photos
  it("submits the current photos, not stale state, after a photo is removed", async () => {
    await selectSiteAndReachReportEntry();
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
    await selectSiteAndReachReportEntry();
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
    await selectSiteAndReachReportEntry();
    fireEvent.change(screen.getByLabelText("作業者名"), { target: { value: "Custom Name" } });
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

    expect(screen.getByLabelText("作業者名")).toHaveValue(PROFILE.displayName);
    expect(screen.getByLabelText("作業種別")).toHaveValue("");
    expect(screen.getByLabelText("コメント")).toHaveValue("");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.queryByText(/送信しました/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^レポートを送信$/ })).not.toBeDisabled();
  });

  it("does not call submitReport again just from creating another report", async () => {
    await selectSiteAndReachReportEntry();
    fillValidDraft();
    submitReport.mockResolvedValue(SUCCESS_RESULT);
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    await screen.findByRole("button", { name: /別のレポートを作成/ });

    fireEvent.click(screen.getByRole("button", { name: /別のレポートを作成/ }));

    expect(submitReport).toHaveBeenCalledTimes(1);
  });
});
