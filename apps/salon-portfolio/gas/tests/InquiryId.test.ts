import { INQUIRY_ID_PREFIX, generateInquiryId } from "../src/ids/InquiryId";

describe("generateInquiryId", () => {
  it("matches the INQ-YYYYMMDD-XXXXXX format", () => {
    const id = generateInquiryId(new Date("2026-09-10T01:00:00.000Z"));
    expect(id).toMatch(/^INQ-\d{8}-[A-Z0-9]{6}$/);
  });

  it("uses the Asia/Tokyo date, not the UTC date", () => {
    // 2026-09-09T15:30:00Z = 2026-09-10T00:30:00 JST
    const id = generateInquiryId(new Date("2026-09-09T15:30:00.000Z"));
    expect(id.startsWith(`${INQUIRY_ID_PREFIX}-20260910-`)).toBe(true);
  });

  it("is not sequential — two calls with different random sources produce different suffixes", () => {
    const now = new Date("2026-09-10T01:00:00.000Z");
    const idA = generateInquiryId(now, () => 0.1);
    const idB = generateInquiryId(now, () => 0.9);
    expect(idA).not.toBe(idB);
  });
});
