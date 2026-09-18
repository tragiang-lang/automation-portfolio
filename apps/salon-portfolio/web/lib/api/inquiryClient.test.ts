import { submitInquiry } from "./inquiryClient";
import { InquirySubmission } from "@/types/inquiry";

const submission: InquirySubmission = {
  submissionId: "sub-1",
  name: "山田太郎",
  email: "yamada@example.com",
  message: "見学は可能ですか？",
};

describe("submitInquiry", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs to /api/gas with the createInquiry action and the submission as payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { inquiryId: "INQ-20260910-ABC123" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await submitInquiry(submission);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "createInquiry", payload: submission }),
      }),
    );
    expect(result).toEqual({ ok: true, data: { inquiryId: "INQ-20260910-ABC123" } });
  });

  it("returns a controlled NETWORK_ERROR when fetch itself throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const result = await submitInquiry(submission);
    expect(result).toEqual({ ok: false, error: { code: "NETWORK_ERROR", message: expect.any(String) } });
  });

  it("forwards a GAS-originated failure envelope unchanged", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "VALIDATION_ERROR", message: "メールアドレスを入力してください" } }),
    }) as unknown as typeof fetch;
    const result = await submitInquiry(submission);
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: "メールアドレスを入力してください" } });
  });
});
