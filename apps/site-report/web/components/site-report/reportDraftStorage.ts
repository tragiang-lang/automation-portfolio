import type { ReportDraft } from "./reportDraft";

/**
 * Phase 2 spec §17-24 — single-slot localStorage draft persistence.
 * `siteId` is ownership/context metadata only, never a storage-key
 * dimension (spec §17.2) and never a substitute for server-side site
 * validation on submit. Photos are deliberately never included (spec
 * §24). Every function that touches `window.localStorage` isolates its
 * own failure — a private-browsing/quota/disabled-storage error must
 * never propagate to the caller.
 */

export const DRAFT_STORAGE_KEY = "site-report:draft:v1";

const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SiteReportDraftV1 {
  version: 1;
  lineUserId: string;
  siteId: string;
  savedAt: string;
  workerName: string;
  workType: string;
  reportDate: string;
  comment: string;
  progressStatus: string;
  hasIssue: "YES" | "NO";
  issueDetail: string;
}

/** Builds the JSON string written to localStorage. `now` is injectable
 *  for deterministic tests (same convention as reportDraft.ts's
 *  getTodayLocalDateString). */
export function serializeDraft(
  input: { lineUserId: string; siteId: string; draft: ReportDraft },
  now: Date = new Date(),
): string {
  const payload: SiteReportDraftV1 = {
    version: 1,
    lineUserId: input.lineUserId,
    siteId: input.siteId,
    savedAt: now.toISOString(),
    workerName: input.draft.workerName,
    workType: input.draft.workType,
    reportDate: input.draft.reportDate,
    comment: input.draft.comment,
    progressStatus: input.draft.progressStatus,
    hasIssue: input.draft.hasIssue,
    issueDetail: input.draft.issueDetail,
  };
  return JSON.stringify(payload);
}

/** Parses and shape-validates a raw stored value. Returns null (never
 *  throws) for anything that is not a well-formed SiteReportDraftV1 —
 *  corrupt JSON, wrong version, or missing/malformed required metadata.
 *  Does not check expiry — that is isDraftExpired's job, kept separate so
 *  a caller can distinguish "not a draft at all" from "a draft, but
 *  stale" if it ever needs to. */
export function parseDraft(raw: string | null): SiteReportDraftV1 | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (candidate.version !== 1) return null;
  if (typeof candidate.lineUserId !== "string" || candidate.lineUserId.length === 0) return null;
  if (typeof candidate.siteId !== "string" || candidate.siteId.length === 0) return null;
  if (typeof candidate.savedAt !== "string" || Number.isNaN(Date.parse(candidate.savedAt))) return null;
  if (typeof candidate.workerName !== "string") return null;
  if (typeof candidate.workType !== "string") return null;
  if (typeof candidate.reportDate !== "string") return null;
  if (typeof candidate.comment !== "string") return null;
  if (typeof candidate.progressStatus !== "string") return null;
  if (candidate.hasIssue !== "YES" && candidate.hasIssue !== "NO") return null;
  if (typeof candidate.issueDetail !== "string") return null;
  return candidate as unknown as SiteReportDraftV1;
}

export function isDraftExpired(draft: SiteReportDraftV1, now: Date = new Date()): boolean {
  return now.getTime() - Date.parse(draft.savedAt) > DRAFT_MAX_AGE_MS;
}

/** Best-effort write, isolated from every localStorage failure mode
 *  (private browsing, quota exceeded, storage disabled). */
export function saveDraft(input: { lineUserId: string; siteId: string; draft: ReportDraft }, now: Date = new Date()): void {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(input, now));
  } catch {
    // Storage failure must never block the form.
  }
}

export function loadRawDraft(): string | null {
  try {
    return window.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Same isolation policy as saveDraft/loadRawDraft.
  }
}

export type DraftRestoreDecision =
  | { action: "none" }
  | { action: "auto-restore"; draft: SiteReportDraftV1 }
  | { action: "offer-cross-site-restore"; draft: SiteReportDraftV1 }
  | { action: "discard" };

/** The full restore decision matrix (spec §21). Pure — takes the raw
 *  stored string directly (not `loadRawDraft()`'s return value coupled
 *  internally) so it stays independently testable without touching
 *  `window.localStorage` at all. */
export function decideDraftRestore(input: {
  raw: string | null;
  currentLineUserId: string;
  currentSiteId: string;
  activeSiteIds: ReadonlySet<string>;
  now?: Date;
}): DraftRestoreDecision {
  const now = input.now ?? new Date();
  if (!input.raw) {
    return { action: "none" };
  }
  const draft = parseDraft(input.raw);
  if (!draft) {
    return { action: "discard" };
  }
  if (isDraftExpired(draft, now)) {
    return { action: "discard" };
  }
  if (draft.lineUserId !== input.currentLineUserId) {
    return { action: "discard" };
  }
  if (draft.siteId === input.currentSiteId) {
    return { action: "auto-restore", draft };
  }
  if (input.activeSiteIds.has(draft.siteId)) {
    return { action: "offer-cross-site-restore", draft };
  }
  return { action: "discard" };
}

/** Picks out only the form-content fields a stored draft carries —
 *  never the ownership/context metadata (version/lineUserId/siteId/
 *  savedAt), which the caller (SiteReportScreen) handles separately. */
export function draftToReportDraftFields(
  draft: SiteReportDraftV1,
): Pick<ReportDraft, "workerName" | "workType" | "reportDate" | "comment" | "progressStatus" | "hasIssue" | "issueDetail"> {
  return {
    workerName: draft.workerName,
    workType: draft.workType,
    reportDate: draft.reportDate,
    comment: draft.comment,
    progressStatus: draft.progressStatus,
    hasIssue: draft.hasIssue,
    issueDetail: draft.issueDetail,
  };
}
