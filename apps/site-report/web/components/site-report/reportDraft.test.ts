import {
  addPhotosToDraft,
  createInitialReportDraft,
  getTodayLocalDateString,
  removePhotoFromDraft,
} from "./reportDraft";
import type { ReportDraft, ReportDraftPhoto } from "./reportDraft";
import type { SiteReportLiffUser } from "@/types/liff";

const PROFILE: SiteReportLiffUser = { userId: "U1234567890", displayName: "Taro Yamada" };

const BASE_DRAFT: ReportDraft = {
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
    base64Data: "QQ==",
    size: 1,
    previewUrl: "data:image/jpeg;base64,QQ==",
  };
}

describe("getTodayLocalDateString", () => {
  it("formats a local date as YYYY-MM-DD without a UTC day shift", () => {
    // 23:30 local time — a UTC-based formatter (toISOString) would roll
    // this over to the next calendar day depending on the machine's
    // timezone offset; the local-field-based formatter must not.
    const localLateNight = new Date(2026, 0, 15, 23, 30);

    expect(getTodayLocalDateString(localLateNight)).toBe("2026-01-15");
  });

  it("zero-pads single-digit months and days", () => {
    const earlyInYear = new Date(2026, 2, 5, 9, 0);

    expect(getTodayLocalDateString(earlyInYear)).toBe("2026-03-05");
  });
});

describe("createInitialReportDraft", () => {
  it("pre-fills workerName from the LIFF profile's displayName", () => {
    const draft = createInitialReportDraft(PROFILE);

    expect(draft.workerName).toBe("Taro Yamada");
  });

  it("defaults workType and comment to empty strings", () => {
    const draft = createInitialReportDraft(PROFILE);

    expect(draft.workType).toBe("");
    expect(draft.comment).toBe("");
  });

  it("defaults reportDate to today's local calendar date", () => {
    const draft = createInitialReportDraft(PROFILE);

    expect(draft.reportDate).toBe(getTodayLocalDateString());
  });

  it("defaults photos to an empty array", () => {
    const draft = createInitialReportDraft(PROFILE);

    expect(draft.photos).toEqual([]);
  });

  it("defaults progressStatus and issueDetail to empty strings, and hasIssue to NO", () => {
    const draft = createInitialReportDraft(PROFILE);

    expect(draft.progressStatus).toBe("");
    expect(draft.hasIssue).toBe("NO");
    expect(draft.issueDetail).toBe("");
  });
});

describe("addPhotosToDraft", () => {
  it("appends new photos after existing ones, preserving order", () => {
    const draft = { ...BASE_DRAFT, photos: [makePhoto("A"), makePhoto("B")] };

    const result = addPhotosToDraft(draft, [makePhoto("C"), makePhoto("D")]);

    expect(result.photos.map((p) => p.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("does not mutate the original draft's photos array", () => {
    const draft = { ...BASE_DRAFT, photos: [makePhoto("A")] };
    const originalPhotos = draft.photos;

    addPhotosToDraft(draft, [makePhoto("B")]);

    expect(draft.photos).toBe(originalPhotos);
    expect(draft.photos.map((p) => p.id)).toEqual(["A"]);
  });

  it("preserves the report's other fields unchanged", () => {
    const draft = { ...BASE_DRAFT, photos: [] };

    const result = addPhotosToDraft(draft, [makePhoto("A")]);

    expect(result.workerName).toBe(draft.workerName);
    expect(result.workType).toBe(draft.workType);
    expect(result.reportDate).toBe(draft.reportDate);
    expect(result.comment).toBe(draft.comment);
  });
});

describe("removePhotoFromDraft", () => {
  const draft = { ...BASE_DRAFT, photos: [makePhoto("A"), makePhoto("B"), makePhoto("C")] };

  it("removes the first photo", () => {
    expect(removePhotoFromDraft(draft, "A").photos.map((p) => p.id)).toEqual(["B", "C"]);
  });

  it("removes a middle photo", () => {
    expect(removePhotoFromDraft(draft, "B").photos.map((p) => p.id)).toEqual(["A", "C"]);
  });

  it("removes the last photo", () => {
    expect(removePhotoFromDraft(draft, "C").photos.map((p) => p.id)).toEqual(["A", "B"]);
  });

  it("leaves photos unchanged when the given id does not exist", () => {
    expect(removePhotoFromDraft(draft, "does-not-exist").photos.map((p) => p.id)).toEqual(["A", "B", "C"]);
  });

  it("does not mutate the original draft's photos array", () => {
    const originalPhotos = draft.photos;

    removePhotoFromDraft(draft, "B");

    expect(draft.photos).toBe(originalPhotos);
    expect(draft.photos.map((p) => p.id)).toEqual(["A", "B", "C"]);
  });

  it("preserves the report's other fields unchanged", () => {
    const result = removePhotoFromDraft(draft, "B");

    expect(result.workerName).toBe(draft.workerName);
    expect(result.workType).toBe(draft.workType);
    expect(result.reportDate).toBe(draft.reportDate);
    expect(result.comment).toBe(draft.comment);
  });
});
