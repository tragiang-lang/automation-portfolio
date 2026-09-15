import {
  DRAFT_STORAGE_KEY,
  clearDraft,
  decideDraftRestore,
  draftToReportDraftFields,
  isDraftExpired,
  loadRawDraft,
  parseDraft,
  saveDraft,
  serializeDraft,
  type SiteReportDraftV1,
} from "./reportDraftStorage";
import type { ReportDraft } from "./reportDraft";

const NOW = new Date("2026-09-15T12:00:00.000Z");

const DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "INSPECTION",
  reportDate: "2026-09-15",
  comment: "notes",
  progressStatus: "IN_PROGRESS",
  hasIssue: "NO",
  issueDetail: "",
  photos: [],
};

const VALID_STORED: SiteReportDraftV1 = {
  version: 1,
  lineUserId: "U1",
  siteId: "SITE-A",
  savedAt: NOW.toISOString(),
  workerName: "Taro Yamada",
  workType: "INSPECTION",
  reportDate: "2026-09-15",
  comment: "notes",
  progressStatus: "IN_PROGRESS",
  hasIssue: "NO",
  issueDetail: "",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("serializeDraft / parseDraft round-trip", () => {
  // Basic 1 — valid draft serializes/deserializes
  it("round-trips every field exactly", () => {
    const raw = serializeDraft({ lineUserId: "U1", siteId: "SITE-A", draft: DRAFT }, NOW);
    const parsed = parseDraft(raw);
    expect(parsed).toEqual(VALID_STORED);
  });

  // Basic 2 — version is validated
  it("rejects a payload with an unsupported version", () => {
    expect(parseDraft(JSON.stringify({ ...VALID_STORED, version: 2 }))).toBeNull();
  });

  // Basic 3 — corrupt JSON is safely discarded
  it("returns null for corrupt JSON rather than throwing", () => {
    expect(parseDraft("{not json")).toBeNull();
  });

  // Basic 4 — unsupported version already covered above; also cover a
  // completely non-object JSON value.
  it("returns null for a JSON value that is not an object", () => {
    expect(parseDraft("42")).toBeNull();
    expect(parseDraft('"a string"')).toBeNull();
    expect(parseDraft("null")).toBeNull();
  });

  // Basic 5 — missing lineUserId is rejected
  it("returns null when lineUserId is missing or empty", () => {
    expect(parseDraft(JSON.stringify({ ...VALID_STORED, lineUserId: "" }))).toBeNull();
    const { lineUserId, ...withoutLineUserId } = VALID_STORED;
    expect(parseDraft(JSON.stringify(withoutLineUserId))).toBeNull();
  });

  // Basic 6 — missing siteId is rejected
  it("returns null when siteId is missing or empty", () => {
    expect(parseDraft(JSON.stringify({ ...VALID_STORED, siteId: "" }))).toBeNull();
  });

  it("returns null for an unparseable savedAt", () => {
    expect(parseDraft(JSON.stringify({ ...VALID_STORED, savedAt: "not-a-date" }))).toBeNull();
  });

  it("returns null for a hasIssue value outside YES/NO", () => {
    expect(parseDraft(JSON.stringify({ ...VALID_STORED, hasIssue: "MAYBE" }))).toBeNull();
  });

  it("returns null for a raw value of null (no stored draft)", () => {
    expect(parseDraft(null)).toBeNull();
  });
});

describe("isDraftExpired", () => {
  // Basic 7 — expired draft is discarded
  it("is false exactly at the 24h boundary and true just past it", () => {
    const savedAt = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    const draft = { ...VALID_STORED, savedAt: savedAt.toISOString() };
    expect(isDraftExpired(draft, NOW)).toBe(false);

    const justPast = new Date(NOW.getTime() - 24 * 60 * 60 * 1000 - 1);
    expect(isDraftExpired({ ...VALID_STORED, savedAt: justPast.toISOString() }, NOW)).toBe(true);
  });

  it("is false for a draft saved seconds ago", () => {
    const savedAt = new Date(NOW.getTime() - 1000);
    expect(isDraftExpired({ ...VALID_STORED, savedAt: savedAt.toISOString() }, NOW)).toBe(false);
  });
});

describe("saveDraft / loadRawDraft / clearDraft", () => {
  it("saveDraft then loadRawDraft round-trips through real localStorage", () => {
    saveDraft({ lineUserId: "U1", siteId: "SITE-A", draft: DRAFT }, NOW);
    const raw = loadRawDraft();
    expect(parseDraft(raw)).toEqual(VALID_STORED);
  });

  it("saves under the exact DRAFT_STORAGE_KEY", () => {
    saveDraft({ lineUserId: "U1", siteId: "SITE-A", draft: DRAFT }, NOW);
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it("clearDraft removes the stored draft", () => {
    saveDraft({ lineUserId: "U1", siteId: "SITE-A", draft: DRAFT }, NOW);
    clearDraft();
    expect(loadRawDraft()).toBeNull();
  });

  // Basic 8/9 — storage failure never breaks the caller
  it("saveDraft does not throw when localStorage.setItem throws", () => {
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveDraft({ lineUserId: "U1", siteId: "SITE-A", draft: DRAFT }, NOW)).not.toThrow();
    spy.mockRestore();
  });

  it("loadRawDraft returns null (not throw) when localStorage.getItem throws", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadRawDraft()).toBeNull();
    spy.mockRestore();
  });

  it("clearDraft does not throw when localStorage.removeItem throws", () => {
    const spy = jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => clearDraft()).not.toThrow();
    spy.mockRestore();
  });
});

describe("decideDraftRestore", () => {
  const activeSiteIds = new Set(["SITE-A", "SITE-B"]);

  // Case 1 — no draft
  it("returns none when no draft is stored", () => {
    expect(
      decideDraftRestore({ raw: null, currentLineUserId: "U1", currentSiteId: "SITE-A", activeSiteIds, now: NOW }),
    ).toEqual({ action: "none" });
  });

  // Case 2 — invalid draft (corrupt JSON, unsupported version, missing metadata, expired)
  it("returns discard for corrupt JSON", () => {
    expect(
      decideDraftRestore({ raw: "{not json", currentLineUserId: "U1", currentSiteId: "SITE-A", activeSiteIds, now: NOW }),
    ).toEqual({ action: "discard" });
  });

  it("returns discard for an expired draft even when siteId matches", () => {
    const expired = { ...VALID_STORED, savedAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString() };
    expect(
      decideDraftRestore({
        raw: JSON.stringify(expired),
        currentLineUserId: "U1",
        currentSiteId: "SITE-A",
        activeSiteIds,
        now: NOW,
      }),
    ).toEqual({ action: "discard" });
  });

  // Case 3 — different user
  it("returns discard when lineUserId does not match the current LIFF user", () => {
    expect(
      decideDraftRestore({
        raw: JSON.stringify(VALID_STORED),
        currentLineUserId: "U-DIFFERENT",
        currentSiteId: "SITE-A",
        activeSiteIds,
        now: NOW,
      }),
    ).toEqual({ action: "discard" });
  });

  // Case 4 — same site
  it("returns auto-restore when siteId matches the current site", () => {
    const result = decideDraftRestore({
      raw: JSON.stringify(VALID_STORED),
      currentLineUserId: "U1",
      currentSiteId: "SITE-A",
      activeSiteIds,
      now: NOW,
    });
    expect(result).toEqual({ action: "auto-restore", draft: VALID_STORED });
  });

  // Case 5 — different site, saved site still ACTIVE
  it("returns offer-cross-site-restore when siteId differs but the saved site is still active", () => {
    const result = decideDraftRestore({
      raw: JSON.stringify(VALID_STORED),
      currentLineUserId: "U1",
      currentSiteId: "SITE-B",
      activeSiteIds,
      now: NOW,
    });
    expect(result).toEqual({ action: "offer-cross-site-restore", draft: VALID_STORED });
  });

  // Case 6 — different site, saved site inactive/deleted
  it("returns discard when siteId differs and the saved site is no longer active", () => {
    const result = decideDraftRestore({
      raw: JSON.stringify(VALID_STORED),
      currentLineUserId: "U1",
      currentSiteId: "SITE-B",
      activeSiteIds: new Set(["SITE-B"]), // SITE-A (the draft's site) is absent
      now: NOW,
    });
    expect(result).toEqual({ action: "discard" });
  });
});

describe("draftToReportDraftFields", () => {
  it("maps every SiteReportDraftV1 content field to the matching ReportDraft field", () => {
    expect(draftToReportDraftFields(VALID_STORED)).toEqual({
      workerName: "Taro Yamada",
      workType: "INSPECTION",
      reportDate: "2026-09-15",
      comment: "notes",
      progressStatus: "IN_PROGRESS",
      hasIssue: "NO",
      issueDetail: "",
    });
  });

  it("never includes version/lineUserId/siteId/savedAt (ownership metadata, not form fields)", () => {
    const result = draftToReportDraftFields(VALID_STORED);
    expect(result).not.toHaveProperty("version");
    expect(result).not.toHaveProperty("lineUserId");
    expect(result).not.toHaveProperty("siteId");
    expect(result).not.toHaveProperty("savedAt");
  });
});
