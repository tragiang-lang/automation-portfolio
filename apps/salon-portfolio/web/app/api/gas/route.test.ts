/**
 * @jest-environment node
 */
jest.mock("../../../lib/api/gasClient", () => ({
  callGasAction: jest.fn(),
}));

import { callGasAction } from "@/lib/api/gasClient";
import { POST } from "./route";

const mockedCallGasAction = callGasAction as jest.Mock;

beforeEach(() => {
  mockedCallGasAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/gas", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/gas", () => {
  it("forwards a well-formed request to callGasAction and returns its result", async () => {
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: { hello: "world" } });

    const response = await POST(postRequest({ action: "getConfig", payload: {} }));
    const responseBody = await response.json();

    expect(mockedCallGasAction).toHaveBeenCalledWith("getConfig", {});
    expect(responseBody).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("defaults payload to {} when omitted", async () => {
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: {} });

    await POST(postRequest({ action: "getConfig" }));

    expect(mockedCallGasAction).toHaveBeenCalledWith("getConfig", {});
  });

  it("returns a VALIDATION_ERROR envelope for malformed JSON", async () => {
    const response = await POST(postRequest("{not json"));
    const responseBody = await response.json();

    expect(mockedCallGasAction).not.toHaveBeenCalled();
    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a VALIDATION_ERROR envelope when action is missing or empty", async () => {
    const response = await POST(postRequest({ action: "" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns an INTERNAL_ERROR envelope, never a raw error, when callGasAction throws", async () => {
    mockedCallGasAction.mockRejectedValueOnce(new Error("GAS_WEBAPP_URL is not configured."));

    const response = await POST(postRequest({ action: "getConfig" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(responseBody)).not.toContain("GAS_WEBAPP_URL");
  });

  it("sanitizes NETWORK_ERROR message and does not leak secrets/URLs to client", async () => {
    mockedCallGasAction.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Failed to reach GAS: request to https://script.google.com/macros/s/SECRET123/exec failed",
      },
    });

    const response = await POST(postRequest({ action: "getConfig" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("NETWORK_ERROR");
    expect(responseBody.error.message).toBe("サーバーエラーが発生しました。");
    expect(JSON.stringify(responseBody)).not.toContain("SECRET123");
    expect(JSON.stringify(responseBody)).not.toContain("https://script.google.com");
  });

  it("sanitizes HTTP_ERROR message", async () => {
    mockedCallGasAction.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "HTTP_ERROR",
        message: "GAS responded with HTTP 500.",
      },
    });

    const response = await POST(postRequest({ action: "getConfig" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("HTTP_ERROR");
    expect(responseBody.error.message).toBe("サーバーエラーが発生しました。");
  });

  it("sanitizes INVALID_RESPONSE message", async () => {
    mockedCallGasAction.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "GAS response was not valid JSON.",
      },
    });

    const response = await POST(postRequest({ action: "getConfig" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("INVALID_RESPONSE");
    expect(responseBody.error.message).toBe("サーバーエラーが発生しました。");
  });

  it("forwards GAS-originated failure responses unchanged (e.g., CONFIG_INVALID)", async () => {
    const gasOriginatedError = {
      ok: false,
      error: {
        code: "CONFIG_INVALID",
        message: "設定情報の読み込みに失敗しました。管理者にお問い合わせください。",
      },
    };
    mockedCallGasAction.mockResolvedValueOnce(gasOriginatedError);

    const response = await POST(postRequest({ action: "getConfig" }));
    const responseBody = await response.json();

    expect(responseBody).toEqual(gasOriginatedError);
    expect(responseBody.error.code).toBe("CONFIG_INVALID");
    expect(responseBody.error.message).toBe("設定情報の読み込みに失敗しました。管理者にお問い合わせください。");
  });
});
