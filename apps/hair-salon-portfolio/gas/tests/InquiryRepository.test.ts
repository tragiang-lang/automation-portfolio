import { buildPendingInquiryRow } from "../src/InquiryRepository";
import { InquiryRequest } from "../src/models/InquiryRequest";

describe("buildPendingInquiryRow", () => {
  it("builds an INQUIRIES row from a normalized request", () => {
    const request: InquiryRequest = {
      submissionId: "sub-1",
      name: "山田太郎",
      email: "yamada@example.com",
      phone: "09012345678",
      subject: "料金について",
      message: "料金プランについて教えてください。",
    };
    const now = new Date("2026-09-10T01:00:00.000Z");

    const row = buildPendingInquiryRow(request, "INQ-20260910-ABC123", now);

    expect(row).toEqual({
      InquiryID: "INQ-20260910-ABC123",
      SubmissionID: "sub-1",
      CreatedAt: now.toISOString(),
      Name: "山田太郎",
      Email: "yamada@example.com",
      Phone: "09012345678",
      Subject: "料金について",
      Message: "料金プランについて教えてください。",
      Source: "website",
      Status: "受付済",
    });
  });

  it("carries an undefined optional phone/subject through unchanged", () => {
    const request: InquiryRequest = {
      submissionId: "sub-2",
      name: "鈴木花子",
      email: "suzuki@example.com",
      message: "見学は可能ですか？",
    };
    const row = buildPendingInquiryRow(request, "INQ-20260910-XYZ789", new Date("2026-09-10T01:00:00.000Z"));
    expect(row.Phone).toBeUndefined();
    expect(row.Subject).toBeUndefined();
  });
});
