/**
 * @jest-environment node
 *
 * Mocks `lib/api/siteReportClient.ts` entirely — no real HTTP request,
 * no deployed GAS. Verifies the workflow layer is a thin, correctly
 * typed pass-through onto `callSiteReportAction`, nothing more.
 */
import { getSites, submitReport } from "./siteReportWorkflows";
import type { GetSitesResponseData, SubmitReportInput, SubmitReportResponseData } from "@/types/api";

jest.mock("./siteReportClient", () => ({
  callSiteReportAction: jest.fn(),
}));

const { callSiteReportAction } = jest.requireMock("./siteReportClient") as {
  callSiteReportAction: jest.Mock;
};

beforeEach(() => {
  callSiteReportAction.mockReset();
});

describe("getSites", () => {
  // Test 1 — calls correct action
  it("calls callSiteReportAction with GET_SITES and an empty payload", async () => {
    callSiteReportAction.mockResolvedValue({ ok: true, data: { sites: [] } });

    await getSites();

    expect(callSiteReportAction).toHaveBeenCalledWith("GET_SITES", {});
    expect(callSiteReportAction).toHaveBeenCalledTimes(1);
  });

  // Test 2 — returns typed response unchanged
  it("returns the typed GetSitesResponseData result unchanged", async () => {
    const data: GetSitesResponseData = {
      sites: [
        {
          siteId: "SITE-1",
          siteCode: "S001",
          name: "Test Site",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    callSiteReportAction.mockResolvedValue({ ok: true, data });

    const result = await getSites();

    expect(result).toEqual({ ok: true, data });
  });

  it("returns the error envelope unchanged when callSiteReportAction reports ok:false", async () => {
    callSiteReportAction.mockResolvedValue({
      ok: false,
      error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." },
    });

    const result = await getSites();

    expect(result).toEqual({
      ok: false,
      error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." },
    });
  });

  // Test 3 — propagates client rejection (does not swallow)
  it("propagates a callSiteReportAction rejection instead of swallowing it", async () => {
    callSiteReportAction.mockRejectedValue(new Error("GAS_WEBAPP_URL is not configured."));

    await expect(getSites()).rejects.toThrow("GAS_WEBAPP_URL is not configured.");
  });

  // Test 4 (original spec) intentionally omitted: the actual GAS contract
  // (`apps/site-report/gas/src/Api.ts`'s `getSitesAction()`) takes no
  // parameters and never reads a payload at all — GET_SITES accepts no
  // userId/authentication field to validate. Adding a client-side check
  // for a "missing userId" would invent a requirement the GAS contract
  // does not have (Task 7's Step 0/1 inspection confirmed this; see the
  // Task 7 design discussion in chat and the architecture doc update).
});

describe("submitReport", () => {
  const validInput: SubmitReportInput = {
    siteId: "SITE-1",
    lineUserId: "U1234567890",
    workerName: "Taro Yamada",
    reportDate: "2026-09-12",
    workType: "Inspection",
    comment: "All clear.",
    photos: [
      {
        fileName: "photo1.jpg",
        mimeType: "image/jpeg",
        base64Data: "ZmFrZS1iYXNlNjQtZGF0YQ==",
      },
    ],
  };

  // Test 5 — calls correct action
  it("calls callSiteReportAction with SUBMIT_REPORT", async () => {
    callSiteReportAction.mockResolvedValue({
      ok: true,
      data: { reportId: "RPT-1", photoCount: 1, notificationSent: true },
    });

    await submitReport(validInput);

    expect(callSiteReportAction).toHaveBeenCalledWith("SUBMIT_REPORT", validInput);
    expect(callSiteReportAction).toHaveBeenCalledTimes(1);
  });

  // Test 6 — preserves the report payload unchanged (deep equality, same
  // object reference not required, but no field added/removed/renamed)
  it("passes the SubmitReportInput payload through unchanged, including photos", async () => {
    callSiteReportAction.mockResolvedValue({
      ok: true,
      data: { reportId: "RPT-1", photoCount: 1, notificationSent: true },
    });

    await submitReport(validInput);

    const [, payloadArg] = callSiteReportAction.mock.calls[0];
    expect(payloadArg).toEqual(validInput);
  });

  it("passes a report with zero photos through unchanged", async () => {
    const noPhotoInput: SubmitReportInput = { ...validInput, comment: undefined, photos: [] };
    callSiteReportAction.mockResolvedValue({
      ok: true,
      data: { reportId: "RPT-2", photoCount: 0, notificationSent: true },
    });

    await submitReport(noPhotoInput);

    expect(callSiteReportAction).toHaveBeenCalledWith("SUBMIT_REPORT", noPhotoInput);
  });

  // Test 7 — returns typed response
  it("returns the typed SubmitReportResponseData result unchanged", async () => {
    const data: SubmitReportResponseData = {
      reportId: "RPT-99",
      photoCount: 1,
      notificationSent: false,
    };
    callSiteReportAction.mockResolvedValue({ ok: true, data });

    const result = await submitReport(validInput);

    expect(result).toEqual({ ok: true, data });
  });

  it("returns the error envelope unchanged when callSiteReportAction reports ok:false", async () => {
    callSiteReportAction.mockResolvedValue({
      ok: false,
      error: { code: "SITE_NOT_FOUND", message: "The selected site could not be found." },
    });

    const result = await submitReport(validInput);

    expect(result).toEqual({
      ok: false,
      error: { code: "SITE_NOT_FOUND", message: "The selected site could not be found." },
    });
  });

  // Test 8 — propagates client rejection (does not swallow)
  it("propagates a callSiteReportAction rejection instead of swallowing it", async () => {
    callSiteReportAction.mockRejectedValue(new Error("GAS_WEBAPP_URL is not configured."));

    await expect(submitReport(validInput)).rejects.toThrow(
      "GAS_WEBAPP_URL is not configured.",
    );
  });
});
