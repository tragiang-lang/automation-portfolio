/**
 * Unit tests for the Task 9 report-draft shape validator. Client-side,
 * UX-only — mirrors only the required-field/format rules `apps/
 * site-report/gas/src/SubmitReportService.ts`'s `parseSubmitReportInput`
 * already enforces for the fields this screen collects. GAS remains
 * authoritative.
 */
import { validateReportDraft } from "./reportValidation";
import type { ReportDraft } from "./reportDraft";

const VALID_DRAFT: ReportDraft = {
  workerName: "Taro Yamada",
  workType: "Inspection",
  reportDate: "2026-09-12",
  comment: "All clear.",
  progressStatus: "IN_PROGRESS",
  hasIssue: "NO",
  issueDetail: "",
  photos: [],
};

describe("validateReportDraft", () => {
  // V1 — valid draft
  it("returns valid:true with no field errors for a fully valid draft", () => {
    const result = validateReportDraft(VALID_DRAFT);

    expect(result).toEqual({ valid: true, errors: {} });
  });

  // V2 — missing work type
  it("returns a workType error when work type is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, workType: "" });

    expect(result.valid).toBe(false);
    expect(result.errors.workType).toBeDefined();
  });

  it("returns a workType error when work type is only whitespace", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, workType: "   " });

    expect(result.valid).toBe(false);
    expect(result.errors.workType).toBeDefined();
  });

  // Phase 2 — missing progress status
  it("returns a progressStatus error when progress status is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, progressStatus: "" });

    expect(result.valid).toBe(false);
    expect(result.errors.progressStatus).toBeDefined();
  });

  // Phase 2 — conditional issueDetail
  it("does not report an issueDetail error when hasIssue is NO, even if issueDetail is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, hasIssue: "NO", issueDetail: "" });

    expect(result.valid).toBe(true);
    expect(result.errors.issueDetail).toBeUndefined();
  });

  it("returns an issueDetail error when hasIssue is YES and issueDetail is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, hasIssue: "YES", issueDetail: "" });

    expect(result.valid).toBe(false);
    expect(result.errors.issueDetail).toBeDefined();
  });

  it("does not report an issueDetail error when hasIssue is YES and issueDetail is non-empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, hasIssue: "YES", issueDetail: "足場が不足しています" });

    expect(result.valid).toBe(true);
    expect(result.errors.issueDetail).toBeUndefined();
  });

  // V3 — missing report date
  it("returns a reportDate error when report date is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, reportDate: "" });

    expect(result.valid).toBe(false);
    expect(result.errors.reportDate).toBeDefined();
  });

  it("returns a reportDate error when report date is not a valid calendar date", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, reportDate: "2026-13-40" });

    expect(result.valid).toBe(false);
    expect(result.errors.reportDate).toBeDefined();
  });

  it("returns a reportDate error when report date is not in YYYY-MM-DD format", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, reportDate: "09/12/2026" });

    expect(result.valid).toBe(false);
    expect(result.errors.reportDate).toBeDefined();
  });

  // workerName is required per the actual SubmitReportInput contract
  // (apps/site-report/gas/src/models/SubmitReportInput.ts), even though
  // it is not one of the three fields the Task 9 brief's example listed.
  it("returns a workerName error when worker name is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, workerName: "" });

    expect(result.valid).toBe(false);
    expect(result.errors.workerName).toBeDefined();
  });

  // V5 — optional comment: empty comment must not invalidate the draft,
  // since SubmitReportInput.comment is optional with no documented
  // minimum/format.
  it("does not report a comment error when comment is empty", () => {
    const result = validateReportDraft({ ...VALID_DRAFT, comment: "" });

    expect(result.valid).toBe(true);
    expect(result.errors).not.toHaveProperty("comment");
  });

  // V6 (contract length limit) intentionally omitted: no maximum length
  // is documented anywhere for `SubmitReportInput.comment`/`workType`/
  // `workerName` (confirmed by inspecting `SubmitReportService.
  // parseSubmitReportInput`, which only checks non-empty), so inventing
  // one here would violate Task 9 §7's "do not invent arbitrary limits".
});
