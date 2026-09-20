import type { SiteReportLiffUser } from "@/types/liff";

/**
 * Local, editable report-content state (Task 9, `photos` added Task 10).
 * Field names/types match the subset of `SubmitReportInput` (`types/
 * api.ts`, mirrored from `apps/site-report/gas/src/models/
 * SubmitReportInput.ts`) that this screen actually collects from the
 * user:
 *   - `workerName`/`workType`/`reportDate`/`comment` are user-editable.
 *   - `siteId` comes from the selected `Site` (already carried in
 *     `SiteReportScreen`'s `report-entry` state), `lineUserId` from the
 *     LIFF profile, and neither is duplicated into this type.
 *   - `workerId` is deliberately never collected here at all — per
 *     `SubmitReportInput.ts`'s own comment, it is only ever present once
 *     an admin has linked the submitting LINE user to a registered
 *     Worker record, so there is nothing for a UI form to fill in.
 *   - `photos` (Task 10) is the client-side photo pipeline's output —
 *     see `ReportDraftPhoto` below.
 * A future task maps this (plus `selectedSite.siteId` and
 * `profile.userId`) into a real `SubmitReportInput` — this type is never
 * exported as, or confused with, that one.
 */
export interface ReportDraft {
  workerName: string;
  workType: string;
  /** Calendar date only, `YYYY-MM-DD` — the same representation
   *  `SubmitReportInput.reportDate` expects, taken directly from a native
   *  `<input type="date">`'s `value`. Never round-tripped through
   *  `new Date(...)`, which can shift by a day depending on the viewer's
   *  timezone and time of day (Task 9 §5). */
  reportDate: string;
  comment: string;
  /** Phase 2: 進捗状況 code, empty until chosen — same "no invented
   *  default" reasoning as workType. */
  progressStatus: string;
  /** Phase 2: always "YES" or "NO" — a radio pair always has a selected
   *  value, so this is never empty, unlike progressStatus/workType. */
  hasIssue: "YES" | "NO";
  /** Phase 2: free text, meaningful only when hasIssue is "YES" —
   *  reportValidation.ts requires it non-empty only in that case, and
   *  submitReportMapper.ts strips it to undefined whenever hasIssue is
   *  "NO" so a stale value from a prior YES state can never be
   *  submitted as an active issue. */
  issueDetail: string;
  /** In selection/insertion order — never re-sorted (Task 10 §10). Empty
   *  until the user adds a photo; `SubmitReportInput.photos` already
   *  treats zero photos as valid (Task 5), so nothing here requires at
   *  least one. */
  photos: ReportDraftPhoto[];
}

/**
 * One photo in the draft (Task 10). Deliberately carries the exact three
 * fields `SubmitReportPhotoInput` (`types/api.ts`) expects —
 * `fileName`/`mimeType`/`base64Data`, same wire format, no `data:` URI
 * prefix on `base64Data` — plus what the UI needs that the wire format
 * does not: a stable local `id` (never sent to GAS; unrelated to any
 * Drive `fileId`/`ReportPhoto.photoId`, both server-generated) and a
 * `previewUrl` for rendering. A future Task 11 mapping to
 * `SubmitReportPhotoInput` is therefore a straight
 * `{ fileName, mimeType, base64Data }` pick, no transformation.
 */
export interface ReportDraftPhoto {
  id: string;
  fileName: string;
  mimeType: string;
  /** Base64-encoded, no `data:` URI prefix — same wire format
   *  `SubmitReportPhotoInput.base64Data` expects. Already the
   *  client-compressed output (`photoCompression.ts`), not the original
   *  file's bytes. */
  base64Data: string;
  /** Compressed byte size — client-side informational only. GAS enforces
   *  no size limit (Task 10 contract inspection), so nothing here is a
   *  contract requirement. */
  size: number;
  /** A `data:` URI built from `mimeType`/`base64Data`, used directly as
   *  an `<img src>`. Chosen over `URL.createObjectURL` specifically to
   *  avoid a manual revoke lifecycle — see `docs/
   *  site-report-architecture-overview.md`'s Task 10 section for the
   *  documented trade-off (a small, bounded memory duplication per photo
   *  vs. object-URL revocation bugs). */
  previewUrl: string;
}

/** Immutable append, preserving both the existing and the new photos'
 *  order (Task 10 §10: never re-sorted, never reordered by anything
 *  async). Every other `ReportDraft` field passes through unchanged. */
export function addPhotosToDraft(draft: ReportDraft, photos: ReportDraftPhoto[]): ReportDraft {
  return { ...draft, photos: [...draft.photos, ...photos] };
}

/** Immutable removal by `id`. Removing an id that is not present leaves
 *  `photos` unchanged (still a new array, per this module's "always
 *  return a new object" convention) rather than throwing. Every other
 *  `ReportDraft` field passes through unchanged. */
export function removePhotoFromDraft(draft: ReportDraft, photoId: string): ReportDraft {
  return { ...draft, photos: draft.photos.filter((photo) => photo.id !== photoId) };
}

/** Local calendar date as `YYYY-MM-DD`, built from the `Date`'s local
 *  fields (`getFullYear`/`getMonth`/`getDate`) rather than
 *  `toISOString()` (UTC-based — can land on the wrong calendar day near
 *  local midnight depending on the viewer's timezone). */
export function getTodayLocalDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Initial draft for a freshly selected site (Task 9 §6, extended Phase
 *  2). `workerName` is pre-filled from the LIFF profile's `displayName`
 *  as a convenience default only — it stays a plain editable text field.
 *  `workType`/`progressStatus`/`comment`/`issueDetail` start empty; no
 *  enum value exists anywhere in the actual contract to default them to,
 *  so none is invented. `hasIssue` defaults to "NO" — the common case
 *  (no problem to report) costs the user zero taps. */
export function createInitialReportDraft(profile: SiteReportLiffUser): ReportDraft {
  return {
    workerName: profile.displayName,
    workType: "",
    reportDate: getTodayLocalDateString(),
    comment: "",
    progressStatus: "",
    hasIssue: "NO",
    issueDetail: "",
    photos: [],
  };
}
