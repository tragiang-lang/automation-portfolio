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
});
