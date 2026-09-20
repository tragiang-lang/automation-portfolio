import { buildSubmitReportInput } from "./submitReportMapper";
import type { ReportDraft, ReportDraftPhoto } from "./reportDraft";
import type { Site } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";

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
  comment: "All clear.",
  progressStatus: "IN_PROGRESS",
  hasIssue: "NO",
  issueDetail: "",
  photos: [],
};

function makePhoto(id: string): ReportDraftPhoto {
  return {
    id,
    fileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    base64Data: `DATA_${id}`,
    size: 3,
    previewUrl: `data:image/jpeg;base64,DATA_${id}`,
  };
}

describe("buildSubmitReportInput", () => {
  // M1 — complete draft without photos
  it("maps a complete draft with no photos to the exact SubmitReportInput shape", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: DRAFT });

    expect(result).toEqual({
      siteId: "SITE-1",
      lineUserId: "U1234567890",
      workerName: "Taro Yamada",
      reportDate: "2026-09-12",
      workType: "Inspection",
      comment: "All clear.",
      progressStatus: "IN_PROGRESS",
      hasIssue: "NO",
      issueDetail: undefined,
      photos: [],
    });
  });

  // M2 — draft with multiple photos, exact order preserved
  it("maps draft.photos to payload.photos in exactly the same order", () => {
    const draft = { ...DRAFT, photos: [makePhoto("A"), makePhoto("B"), makePhoto("C")] };

    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft });

    expect(result.photos.map((p) => p.fileName)).toEqual(["A.jpg", "B.jpg", "C.jpg"]);
  });

  // M3 — UI-only photo fields excluded
  it("excludes UI-only photo fields (id, previewUrl, size) from the mapped payload", () => {
    const draft = { ...DRAFT, photos: [makePhoto("A")] };

    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft });

    expect(result.photos[0]).toEqual({
      fileName: "A.jpg",
      mimeType: "image/jpeg",
      base64Data: "DATA_A",
    });
    expect(result.photos[0]).not.toHaveProperty("id");
    expect(result.photos[0]).not.toHaveProperty("previewUrl");
    expect(result.photos[0]).not.toHaveProperty("size");
  });

  // M4 — site mapping
  it("maps selectedSite.siteId to payload.siteId", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: DRAFT });

    expect(result.siteId).toBe(SITE.siteId);
  });

  // M5 — LIFF mapping
  it("maps profile.userId to payload.lineUserId", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: DRAFT });

    expect(result.lineUserId).toBe(PROFILE.userId);
  });

  // M6 — workerId: never collected by the UI (ReportDraft has no
  // workerId field — Task 9's own contract inspection), so the mapper
  // must omit it entirely rather than inventing one.
  it("omits workerId from the payload (ReportDraft never collects it)", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: DRAFT });

    expect(result.workerId).toBeUndefined();
    expect("workerId" in result).toBe(false);
  });

  // M7 — comment: optional in the contract; GAS's own
  // parseSubmitReportInput already treats "" the same as undefined, so
  // the mapper passes the draft's comment through unchanged rather than
  // duplicating that normalization.
  it("preserves a non-empty comment", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: { ...DRAFT, comment: "Notes" } });

    expect(result.comment).toBe("Notes");
  });

  it("passes an empty comment through as an empty string", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: { ...DRAFT, comment: "" } });

    expect(result.comment).toBe("");
  });

  it("maps progressStatus and hasIssue through unchanged", () => {
    const result = buildSubmitReportInput({ site: SITE, profile: PROFILE, draft: { ...DRAFT, progressStatus: "DONE", hasIssue: "NO" } });

    expect(result.progressStatus).toBe("DONE");
    expect(result.hasIssue).toBe("NO");
  });

  it("maps a non-empty issueDetail through when hasIssue is YES", () => {
    const result = buildSubmitReportInput({
      site: SITE,
      profile: PROFILE,
      draft: { ...DRAFT, hasIssue: "YES", issueDetail: "足場が不足しています" },
    });

    expect(result.hasIssue).toBe("YES");
    expect(result.issueDetail).toBe("足場が不足しています");
  });

  it("strips issueDetail to undefined when hasIssue is NO, even if the draft still holds stale text", () => {
    const result = buildSubmitReportInput({
      site: SITE,
      profile: PROFILE,
      draft: { ...DRAFT, hasIssue: "NO", issueDetail: "stale text from a prior YES state" },
    });

    expect(result.hasIssue).toBe("NO");
    expect(result.issueDetail).toBeUndefined();
  });

  // M8 — no mutation
  it("does not mutate site, profile, draft, or draft.photos", () => {
    const site = { ...SITE };
    const profile = { ...PROFILE };
    const photos = [makePhoto("A"), makePhoto("B")];
    const draft = { ...DRAFT, photos };
    const siteSnapshot = { ...site };
    const profileSnapshot = { ...profile };
    const draftSnapshot = { ...draft, photos: [...photos] };

    buildSubmitReportInput({ site, profile, draft });

    expect(site).toEqual(siteSnapshot);
    expect(profile).toEqual(profileSnapshot);
    expect(draft).toEqual(draftSnapshot);
    expect(draft.photos).toBe(photos); // same array reference, untouched
    expect(draft.photos).toEqual([makePhoto("A"), makePhoto("B")]);
  });
});
