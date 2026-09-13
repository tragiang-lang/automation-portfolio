import { submitReportDraft } from "./submission";
import type { ReportDraft } from "./reportDraft";
import type { Site, SubmitReportInput, SubmitReportResponseData } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";
import type { SiteReportClientResult } from "@/lib/api/siteReportClient";

/**
 * Unit tests for the submission orchestration layer (Task 11) —
 * `submitReportDraft` combines the pure mapper (`submitReportMapper.ts`,
 * tested separately for payload correctness) with a caller-supplied
 * `submit` function (the real one is `lib/api/siteReportWorkflows.ts`'s
 * `submitReport`, injected here as a fake) and maps the outcome to a
 * `SubmissionState`. Kept independent of React/rendering entirely, so
 * S1/S2/S4/S8/S9/S10/S11/S12 from Task 11's test matrix are covered here
 * directly rather than only through a full component render.
 */

const SITE: Site = {
  siteId: "SITE-1",
  siteCode: "S001",
  name: "Shibuya Tower",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const PROFILE: SiteReportLiffUser = { userId: "U1234567890", displayName: "Taro Yamada" };

const DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "Inspection",
  reportDate: "2026-09-12",
  comment: "",
  photos: [],
};

const SUCCESS_DATA: SubmitReportResponseData = { reportId: "RPT-1", photoCount: 0, notificationSent: true };

describe("submitReportDraft", () => {
  it("builds the payload from site/profile/draft and calls submit with it", async () => {
    const submit = jest.fn<Promise<SiteReportClientResult<SubmitReportResponseData>>, [SubmitReportInput]>();
    submit.mockResolvedValue({ ok: true, data: SUCCESS_DATA });

    await submitReportDraft({ site: SITE, profile: PROFILE, draft: DRAFT, submit });

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({
      siteId: "SITE-1",
      lineUserId: "U1234567890",
      workerName: "Taro Yamada",
      reportDate: "2026-09-12",
      workType: "Inspection",
      comment: "",
      photos: [],
    });
  });

  it("resolves to a success state carrying the response data on ok:true", async () => {
    const submit = jest.fn().mockResolvedValue({ ok: true, data: SUCCESS_DATA });

    const result = await submitReportDraft({ site: SITE, profile: PROFILE, draft: DRAFT, submit });

    expect(result).toEqual({ status: "success", result: SUCCESS_DATA });
  });

  it("resolves to an error state carrying the server message on ok:false", async () => {
    const submit = jest
      .fn()
      .mockResolvedValue({ ok: false, error: { code: "VALIDATION_ERROR", message: "The submitted report failed validation." } });

    const result = await submitReportDraft({ site: SITE, profile: PROFILE, draft: DRAFT, submit });

    expect(result).toEqual({ status: "error", message: "The submitted report failed validation." });
  });

  it("resolves to a generic error state (never an unhandled rejection) when submit rejects unexpectedly", async () => {
    const submit = jest.fn().mockRejectedValue(new Error("network down"));

    const result = await submitReportDraft({ site: SITE, profile: PROFILE, draft: DRAFT, submit });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      // Never exposes the raw error/stack to the user.
      expect(result.message).not.toContain("network down");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("resolves to an error state and never calls submit when the site is missing", async () => {
    const submit = jest.fn();

    const result = await submitReportDraft({ site: undefined, profile: PROFILE, draft: DRAFT, submit });

    expect(submit).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("resolves to an error state and never calls submit when the LIFF profile is missing", async () => {
    const submit = jest.fn();

    const result = await submitReportDraft({ site: SITE, profile: undefined, draft: DRAFT, submit });

    expect(submit).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("maps multiple photos to the payload in exactly the given order", async () => {
    const submit = jest.fn().mockResolvedValue({ ok: true, data: SUCCESS_DATA });
    const photos = ["A", "B", "C"].map((id) => ({
      id,
      fileName: `${id}.jpg`,
      mimeType: "image/jpeg",
      base64Data: `DATA_${id}`,
      size: 3,
      previewUrl: `data:image/jpeg;base64,DATA_${id}`,
    }));

    await submitReportDraft({ site: SITE, profile: PROFILE, draft: { ...DRAFT, photos }, submit });

    const payload = submit.mock.calls[0][0] as SubmitReportInput;
    expect(payload.photos.map((p) => p.fileName)).toEqual(["A.jpg", "B.jpg", "C.jpg"]);
    expect(payload.photos[0]).toEqual({ fileName: "A.jpg", mimeType: "image/jpeg", base64Data: "DATA_A" });
  });
});
