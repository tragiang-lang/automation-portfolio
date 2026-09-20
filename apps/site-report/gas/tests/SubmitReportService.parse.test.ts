import { parseSubmitReportInput } from "../src/SubmitReportService";

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    siteId: "STE-1",
    lineUserId: "U123",
    workerName: "Taro",
    reportDate: "2026-09-12",
    workType: "wiring",
    comment: "done",
    progressStatus: "IN_PROGRESS",
    hasIssue: "NO",
    photos: [{ fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "aGVsbG8=" }],
    ...overrides,
  };
}

describe("parseSubmitReportInput", () => {
  it("parses a well-formed payload", () => {
    const result = parseSubmitReportInput(validPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input).toEqual({
        siteId: "STE-1",
        workerId: undefined,
        lineUserId: "U123",
        workerName: "Taro",
        reportDate: "2026-09-12",
        workType: "wiring",
        comment: "done",
        progressStatus: "IN_PROGRESS",
        hasIssue: "NO",
        issueDetail: undefined,
        photos: [{ fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "aGVsbG8=" }],
      });
    }
  });

  it("accepts a workerId when present", () => {
    const result = parseSubmitReportInput(validPayload({ workerId: "WRK-1" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.workerId).toBe("WRK-1");
    }
  });

  it("defaults to an empty photo list when photos is omitted (zero photos is a valid report)", () => {
    const payload = validPayload();
    delete payload.photos;
    const result = parseSubmitReportInput(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.photos).toEqual([]);
    }
  });

  it("rejects a non-object payload", () => {
    expect(parseSubmitReportInput(null).ok).toBe(false);
    expect(parseSubmitReportInput("x").ok).toBe(false);
    expect(parseSubmitReportInput([1, 2]).ok).toBe(false);
  });

  it("reports a missing siteId", () => {
    const payload = validPayload({ siteId: "" });
    const result = parseSubmitReportInput(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "siteId", reason: "is required" });
    }
  });

  it("reports a missing required report field (workType)", () => {
    const result = parseSubmitReportInput(validPayload({ workType: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "workType", reason: "is required" });
    }
  });

  it("reports a missing progressStatus", () => {
    const result = parseSubmitReportInput(validPayload({ progressStatus: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "progressStatus", reason: "is required" });
    }
  });

  it("rejects a hasIssue value outside YES/NO", () => {
    const result = parseSubmitReportInput(validPayload({ hasIssue: "MAYBE" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "hasIssue", reason: 'must be "YES" or "NO"' });
    }
  });

  it("reports a missing hasIssue", () => {
    const payload = validPayload();
    delete payload.hasIssue;
    const result = parseSubmitReportInput(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "hasIssue", reason: "is required" });
    }
  });

  it("requires issueDetail when hasIssue is YES", () => {
    const result = parseSubmitReportInput(validPayload({ hasIssue: "YES" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "issueDetail", reason: "is required" });
    }
  });

  it("accepts hasIssue:YES with a non-empty issueDetail", () => {
    const result = parseSubmitReportInput(validPayload({ hasIssue: "YES", issueDetail: "足場が不足しています" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.hasIssue).toBe("YES");
      expect(result.input.issueDetail).toBe("足場が不足しています");
    }
  });

  it("does not require issueDetail when hasIssue is NO, even if empty/omitted", () => {
    const withoutKey = validPayload({ hasIssue: "NO" });
    delete withoutKey.issueDetail;
    expect(parseSubmitReportInput(withoutKey).ok).toBe(true);

    const withEmptyString = validPayload({ hasIssue: "NO", issueDetail: "" });
    const result = parseSubmitReportInput(withEmptyString);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.issueDetail).toBeUndefined();
    }
  });

  it("ignores a stray issueDetail value when hasIssue is NO rather than rejecting it (server does not persist it either — SubmitReportService.submitReport only ever reads issueDetail via input.issueDetail, which parseSubmitReportInput already normalizes)", () => {
    const result = parseSubmitReportInput(validPayload({ hasIssue: "NO", issueDetail: "stale leftover text" }));
    expect(result.ok).toBe(true);
  });

  it("reports an invalid reportDate format", () => {
    const result = parseSubmitReportInput(validPayload({ reportDate: "2026/09/12" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        field: "reportDate",
        reason: "must be a valid calendar date in YYYY-MM-DD format",
      });
    }
  });

  it("reports an impossible calendar date", () => {
    const result = parseSubmitReportInput(validPayload({ reportDate: "2026-13-40" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        field: "reportDate",
        reason: "must be a valid calendar date in YYYY-MM-DD format",
      });
    }
  });

  it("reports invalid photo metadata (missing fileName)", () => {
    const result = parseSubmitReportInput(
      validPayload({ photos: [{ mimeType: "image/jpeg", base64Data: "aGVsbG8=" }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "photos[0].fileName", reason: "is required" });
    }
  });

  it("reports invalid photo metadata (missing mimeType)", () => {
    const result = parseSubmitReportInput(
      validPayload({ photos: [{ fileName: "a.jpg", base64Data: "aGVsbG8=" }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "photos[0].mimeType", reason: "is required" });
    }
  });

  it("reports an invalid photo payload (not valid base64)", () => {
    const result = parseSubmitReportInput(
      validPayload({ photos: [{ fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "not base64!!" }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        field: "photos[0].base64Data",
        reason: "must be valid base64-encoded data",
      });
    }
  });

  it("rejects photos that is not an array", () => {
    const result = parseSubmitReportInput(validPayload({ photos: "not-an-array" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({ field: "photos", reason: "must be an array" });
    }
  });

  it("accumulates every issue in one pass rather than stopping at the first", () => {
    const result = parseSubmitReportInput(validPayload({ siteId: "", workType: "", lineUserId: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
