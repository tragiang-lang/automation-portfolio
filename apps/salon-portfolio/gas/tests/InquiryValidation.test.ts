import { normalizeInquiryRequest, validateInquiryRequestShape } from "../src/InquiryValidation";
import { InquiryRequest } from "../src/models/InquiryRequest";

function validRequest(): InquiryRequest {
  return {
    submissionId: "sub-1",
    name: "山田太郎",
    email: "yamada@example.com",
    phone: "09012345678",
    subject: "料金について",
    message: "料金プランについて教えてください。",
  };
}

describe("normalizeInquiryRequest", () => {
  it("trims strings and lowercases the email", () => {
    const normalized = normalizeInquiryRequest({
      ...validRequest(),
      name: "  山田太郎  ",
      email: " Yamada@Example.com ",
      message: "  内容  ",
    });
    expect(normalized.name).toBe("山田太郎");
    expect(normalized.email).toBe("yamada@example.com");
    expect(normalized.message).toBe("内容");
  });

  it("collapses an empty-after-trim optional field to undefined", () => {
    const normalized = normalizeInquiryRequest({ ...validRequest(), phone: "   ", subject: "" });
    expect(normalized.phone).toBeUndefined();
    expect(normalized.subject).toBeUndefined();
  });
});

describe("validateInquiryRequestShape", () => {
  it("accepts a fully valid request with no issues", () => {
    expect(validateInquiryRequestShape(normalizeInquiryRequest(validRequest()))).toEqual([]);
  });

  it("requires name, email, and message", () => {
    const issues = validateInquiryRequestShape(
      normalizeInquiryRequest({ ...validRequest(), name: "", email: "", message: "" }),
    );
    const fields = issues.map((issue) => issue.field);
    expect(fields).toContain("name");
    expect(fields).toContain("email");
    expect(fields).toContain("message");
  });

  it("rejects a malformed email", () => {
    const issues = validateInquiryRequestShape(normalizeInquiryRequest({ ...validRequest(), email: "not-an-email" }));
    expect(issues).toContainEqual(expect.objectContaining({ field: "email", code: "INVALID_FORMAT" }));
  });

  it("does not require phone or subject", () => {
    const issues = validateInquiryRequestShape(
      normalizeInquiryRequest({ ...validRequest(), phone: undefined, subject: undefined }),
    );
    expect(issues).toEqual([]);
  });

  it("rejects a phone with an invalid format when provided", () => {
    const issues = validateInquiryRequestShape(normalizeInquiryRequest({ ...validRequest(), phone: "abc" }));
    expect(issues).toContainEqual(expect.objectContaining({ field: "phone", code: "INVALID_FORMAT" }));
  });

  it("rejects a message over the length cap", () => {
    const issues = validateInquiryRequestShape(
      normalizeInquiryRequest({ ...validRequest(), message: "あ".repeat(2001) }),
    );
    expect(issues).toContainEqual(expect.objectContaining({ field: "message", code: "TOO_LONG" }));
  });
});
