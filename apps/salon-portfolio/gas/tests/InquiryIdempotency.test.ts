import { buildInquiryIdempotencyCacheKey, mapInquiryRowToResult } from "../src/InquiryIdempotency";
import { InquiryRow } from "../src/SheetSchemas";

describe("buildInquiryIdempotencyCacheKey", () => {
  it("namespaces the key so it can never collide with a reservation's cache key", () => {
    const key = buildInquiryIdempotencyCacheKey("sub-1");
    expect(key).toBe("inquiry-submission:sub-1");
  });
});

describe("mapInquiryRowToResult", () => {
  it("reconstructs the result shape createInquiry originally returned", () => {
    const row: InquiryRow = {
      InquiryID: "INQ-20260910-ABC123",
      SubmissionID: "sub-1",
      CreatedAt: "2026-09-10T01:00:00.000Z",
      Name: "山田太郎",
      Email: "yamada@example.com",
      Message: "料金プランについて教えてください。",
      Source: "website",
      Status: "受付済",
    };
    expect(mapInquiryRowToResult(row)).toEqual({ inquiryId: "INQ-20260910-ABC123" });
  });
});
