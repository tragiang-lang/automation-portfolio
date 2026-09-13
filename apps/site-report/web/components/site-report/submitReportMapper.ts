import type { Site, SubmitReportInput, SubmitReportPhotoInput } from "@/types/api";
import type { SiteReportLiffUser } from "@/types/liff";
import type { ReportDraft, ReportDraftPhoto } from "./reportDraft";

/**
 * Pure mapping from UI/application state into the exact `SubmitReportInput`
 * shape (Task 11). Contract re-confirmed by re-reading `apps/site-report/
 * gas/src/models/SubmitReportInput.ts` and `SubmitReportService.
 * parseSubmitReportInput` before writing this — no discrepancy from
 * `types/api.ts`'s existing mirror was found (see `docs/
 * site-report-architecture-overview.md`'s Task 11 section for the
 * inspection notes).
 *
 * Deliberately does no validation of its own (Task 11 §10) —
 * `reportValidation.ts`'s `validateReportDraft` already covers the
 * required-field/format rules this screen enforces client-side, and GAS's
 * `parseSubmitReportInput` stays the authoritative check. This function
 * assumes it is only ever called with a draft that has already passed
 * `validateReportDraft`, and performs no API calls, no React state
 * changes, and no file/photo processing of its own — only field mapping.
 */

/** `ReportDraftPhoto` carries three extra UI-only fields
 *  (`id`/`size`/`previewUrl`) beyond what `SubmitReportPhotoInput` wants —
 *  this picks out only the three the wire format actually defines. */
function toSubmitReportPhotoInput(photo: ReportDraftPhoto): SubmitReportPhotoInput {
  return {
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    base64Data: photo.base64Data,
  };
}

export function buildSubmitReportInput({
  site,
  profile,
  draft,
}: {
  site: Site;
  profile: SiteReportLiffUser;
  draft: ReportDraft;
}): SubmitReportInput {
  return {
    siteId: site.siteId,
    // `workerId` is deliberately omitted, not set to `undefined` — Task 9's
    // contract inspection found it is only ever populated once an admin
    // has linked the submitting LINE user to a registered Worker record,
    // and `ReportDraft` never collects one; no worker lookup is added here
    // (Task 11 §7). `SubmitReportInput.workerId` being optional means
    // omitting the key entirely is contract-valid.
    lineUserId: profile.userId,
    workerName: draft.workerName,
    reportDate: draft.reportDate,
    workType: draft.workType,
    // Passed through unchanged, empty string included — GAS's own
    // `parseSubmitReportInput` already treats `""` identically to
    // `undefined` (Task 11 §8), so no client-side normalization is
    // duplicated here.
    comment: draft.comment,
    // `.map` returns a new array of new objects — `draft.photos` itself
    // (and each `ReportDraftPhoto` in it) is never mutated or reused by
    // reference in the result.
    photos: draft.photos.map(toSubmitReportPhotoInput),
  };
}
