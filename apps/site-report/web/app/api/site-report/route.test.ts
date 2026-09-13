/**
 * @jest-environment node
 *
 * Mirrors apps/salon-portfolio/web/app/api/gas/route.test.ts's structure —
 * same mocking approach (mock `siteReportClient` entirely, no real HTTP
 * call), same assertions shape — adapted to the Site Report GAS contract
 * (`GET_SITES`/`SUBMIT_REPORT`, confirmed against `apps/site-report/gas/
 * src/Api.ts`).
 *
 * This is the test that proves the missing P0 boundary: browser code must
 * be able to reach GAS through this route without ever knowing
 * `GAS_WEBAPP_URL` — everything here mocks `callSiteReportAction`, so no
 * assertion here depends on a real deployed GAS endpoint.
 */
jest.mock("../../../lib/api/siteReportClient", () => ({
  callSiteReportAction: jest.fn(),
}));

import { callSiteReportAction } from "@/lib/api/siteReportClient";
import { POST } from "./route";

const mockedCallSiteReportAction = callSiteReportAction as jest.Mock;

beforeEach(() => {
  mockedCallSiteReportAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/site-report", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/site-report", () => {
  it("forwards a GET_SITES request to callSiteReportAction and returns its result", async () => {
    mockedCallSiteReportAction.mockResolvedValueOnce({ ok: true, data: { sites: [] } });

    const response = await POST(postRequest({ action: "GET_SITES", payload: {} }));
    const responseBody = await response.json();

    expect(mockedCallSiteReportAction).toHaveBeenCalledWith("GET_SITES", {});
    expect(responseBody).toEqual({ ok: true, data: { sites: [] } });
  });

  it("defaults payload to {} when omitted", async () => {
    mockedCallSiteReportAction.mockResolvedValueOnce({ ok: true, data: { sites: [] } });

    await POST(postRequest({ action: "GET_SITES" }));

    expect(mockedCallSiteReportAction).toHaveBeenCalledWith("GET_SITES", {});
  });

  it("forwards a SUBMIT_REPORT request's payload to callSiteReportAction unchanged", async () => {
    const submitPayload = {
      siteId: "SITE-1",
      lineUserId: "U1234567890",
      workerName: "Taro Yamada",
      reportDate: "2026-09-12",
      workType: "Inspection",
      comment: "All clear.",
      photos: [{ fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "ZmFrZQ==" }],
    };
    mockedCallSiteReportAction.mockResolvedValueOnce({
      ok: true,
      data: { reportId: "RPT-1", photoCount: 1, notificationSent: true },
    });

    const response = await POST(postRequest({ action: "SUBMIT_REPORT", payload: submitPayload }));
    const responseBody = await response.json();

    expect(mockedCallSiteReportAction).toHaveBeenCalledWith("SUBMIT_REPORT", submitPayload);
    expect(responseBody).toEqual({
      ok: true,
      data: { reportId: "RPT-1", photoCount: 1, notificationSent: true },
    });
  });

  it("returns a VALIDATION_ERROR envelope for malformed JSON without calling GAS", async () => {
    const response = await POST(postRequest("{not json"));
    const responseBody = await response.json();

    expect(mockedCallSiteReportAction).not.toHaveBeenCalled();
    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a VALIDATION_ERROR envelope when action is missing or empty, without calling GAS", async () => {
    const response = await POST(postRequest({ action: "" }));
    const responseBody = await response.json();

    expect(mockedCallSiteReportAction).not.toHaveBeenCalled();
    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a VALIDATION_ERROR envelope for a non-object body, without calling GAS", async () => {
    const response = await POST(postRequest([1, 2, 3]));
    const responseBody = await response.json();

    expect(mockedCallSiteReportAction).not.toHaveBeenCalled();
    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns an INTERNAL_ERROR envelope, never a raw error, when callSiteReportAction throws (e.g. missing GAS_WEBAPP_URL)", async () => {
    mockedCallSiteReportAction.mockRejectedValueOnce(new Error("GAS_WEBAPP_URL is not configured."));

    const response = await POST(postRequest({ action: "GET_SITES" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(responseBody)).not.toContain("GAS_WEBAPP_URL");
  });

  it("sanitizes NETWORK_ERROR message and does not leak secrets/URLs to the client", async () => {
    mockedCallSiteReportAction.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Failed to reach GAS: request to https://script.google.com/macros/s/SECRET123/exec failed",
      },
    });

    const response = await POST(postRequest({ action: "GET_SITES" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("NETWORK_ERROR");
    expect(JSON.stringify(responseBody)).not.toContain("SECRET123");
    expect(JSON.stringify(responseBody)).not.toContain("https://script.google.com");
  });

  it("sanitizes HTTP_ERROR message", async () => {
    mockedCallSiteReportAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "HTTP_ERROR", message: "GAS responded with HTTP 500." },
    });

    const response = await POST(postRequest({ action: "GET_SITES" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("HTTP_ERROR");
    expect(responseBody.error.message).not.toBe("GAS responded with HTTP 500.");
  });

  it("sanitizes INVALID_RESPONSE message", async () => {
    mockedCallSiteReportAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INVALID_RESPONSE", message: "GAS response was not valid JSON." },
    });

    const response = await POST(postRequest({ action: "GET_SITES" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("INVALID_RESPONSE");
    expect(responseBody.error.message).not.toBe("GAS response was not valid JSON.");
  });

  it("forwards GAS-originated failure responses unchanged (e.g., SITE_NOT_FOUND from SUBMIT_REPORT)", async () => {
    const gasOriginatedError = {
      ok: false,
      error: { code: "SITE_NOT_FOUND", message: "The referenced site could not be found." },
    };
    mockedCallSiteReportAction.mockResolvedValueOnce(gasOriginatedError);

    const response = await POST(postRequest({ action: "SUBMIT_REPORT", payload: {} }));
    const responseBody = await response.json();

    expect(responseBody).toEqual(gasOriginatedError);
  });

  it("forwards a GAS-originated VALIDATION_ERROR (from GAS's own SUBMIT_REPORT parsing) unchanged", async () => {
    const gasOriginatedError = {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted report failed validation. Please check the required fields and try again.",
      },
    };
    mockedCallSiteReportAction.mockResolvedValueOnce(gasOriginatedError);

    const response = await POST(postRequest({ action: "SUBMIT_REPORT", payload: {} }));
    const responseBody = await response.json();

    expect(responseBody).toEqual(gasOriginatedError);
  });
});
