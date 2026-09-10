import { normalizeReservationRequest, validateReservationRequestShape } from "../src/Validation";
import { ReservationRequest } from "../src/models/ReservationRequest";

const baseRequest: ReservationRequest = {
  submissionId: "sub-1",
  serviceId: "SV001",
  date: "2026-09-15",
  time: "10:00",
  name: "田中太郎",
  email: "customer@example.com",
};

describe("normalizeReservationRequest", () => {
  it("trims strings and lowercases the email", () => {
    const normalized = normalizeReservationRequest({
      ...baseRequest,
      name: "  田中太郎  ",
      email: "  Customer@Example.com ",
      notes: "  よろしくお願いします  ",
    });
    expect(normalized.name).toBe("田中太郎");
    expect(normalized.email).toBe("customer@example.com");
    expect(normalized.notes).toBe("よろしくお願いします");
  });

  it("collapses an empty-after-trim optional field to undefined", () => {
    const normalized = normalizeReservationRequest({ ...baseRequest, phone: "   " });
    expect(normalized.phone).toBeUndefined();
  });
});

describe("validateReservationRequestShape", () => {
  it("accepts a fully valid request with no issues", () => {
    expect(validateReservationRequestShape(baseRequest)).toEqual([]);
  });

  it("flags a missing name", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, name: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "name", code: "REQUIRED_FIELD_MISSING" }));
  });

  it("flags a name over the length limit", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, name: "あ".repeat(101) });
    expect(issues).toContainEqual(expect.objectContaining({ field: "name", code: "TOO_LONG" }));
  });

  it("flags a missing email", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, email: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "email", code: "REQUIRED_FIELD_MISSING" }));
  });

  it("flags a malformed email", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, email: "not-an-email" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "email", code: "INVALID_FORMAT" }));
  });

  it("accepts common Japanese phone formats", () => {
    for (const phone of ["090-1234-5678", "09012345678", "03-1234-5678"]) {
      expect(validateReservationRequestShape({ ...baseRequest, phone })).toEqual([]);
    }
  });

  it("flags an invalid phone", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, phone: "call-me-maybe" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "phone", code: "INVALID_FORMAT" }));
  });

  it("does not require phone at all", () => {
    expect(validateReservationRequestShape({ ...baseRequest, phone: undefined })).toEqual([]);
  });

  it("flags notes over the length limit", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, notes: "a".repeat(501) });
    expect(issues).toContainEqual(expect.objectContaining({ field: "notes", code: "TOO_LONG" }));
  });

  it("flags a malformed date", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, date: "not-a-date" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "date", code: "INVALID_FORMAT" }));
  });

  it("flags an impossible calendar date", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, date: "2026-02-30" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "date", code: "INVALID_DATE" }));
  });

  it("flags a malformed time", () => {
    for (const time of ["25:00", "10:65", "abc"]) {
      const issues = validateReservationRequestShape({ ...baseRequest, time });
      expect(issues).toContainEqual(expect.objectContaining({ field: "time", code: "INVALID_FORMAT" }));
    }
  });

  it("flags a missing submissionId", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, submissionId: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "submissionId", code: "REQUIRED_FIELD_MISSING" }));
  });

  it("flags a missing serviceId", () => {
    const issues = validateReservationRequestShape({ ...baseRequest, serviceId: "" });
    expect(issues).toContainEqual(expect.objectContaining({ field: "serviceId", code: "REQUIRED_FIELD_MISSING" }));
  });
});
