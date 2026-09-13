/**
 * @jest-environment node
 *
 * Mirrors apps/salon-portfolio/web/lib/api/gasClient.test.ts exactly —
 * same env var, same fetch mocking approach, same error-code assertions
 * — because `callSiteReportAction` is a deliberate port of
 * `callGasAction`'s established behavior (Task 6 design).
 */
import { callSiteReportAction } from "./siteReportClient";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, GAS_WEBAPP_URL: "https://example.com/exec" };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
}

describe("callSiteReportAction", () => {
  it("returns the parsed success envelope on a 200 ok response", async () => {
    mockFetchOnce({ ok: true, data: { sites: [] } });

    const result = await callSiteReportAction<{ sites: unknown[] }>("GET_SITES", {});

    expect(result).toEqual({ ok: true, data: { sites: [] } });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/exec",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "GET_SITES", payload: {} }),
      }),
    );
  });

  it("returns the parsed error envelope when GAS reports ok:false", async () => {
    mockFetchOnce({
      ok: false,
      error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
    });

    const result = await callSiteReportAction("GET_SITES", {});

    expect(result).toEqual({
      ok: false,
      error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
    });
  });

  it("returns a NETWORK_ERROR result when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const result = await callSiteReportAction("GET_SITES", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("returns an HTTP_ERROR result for a non-2xx response without parsing its body", async () => {
    mockFetchOnce({ irrelevant: true }, { ok: false, status: 500 });

    const result = await callSiteReportAction("GET_SITES", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HTTP_ERROR");
    }
  });

  it("returns an INVALID_RESPONSE result when the response body is not valid JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    });

    const result = await callSiteReportAction("GET_SITES", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_RESPONSE");
    }
  });

  it("returns an INVALID_RESPONSE result when the body doesn't match the envelope shape", async () => {
    mockFetchOnce({ nonsense: true });

    const result = await callSiteReportAction("GET_SITES", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_RESPONSE");
    }
  });

  it("throws when GAS_WEBAPP_URL is not configured", async () => {
    delete process.env.GAS_WEBAPP_URL;

    await expect(callSiteReportAction("GET_SITES", {})).rejects.toThrow(
      "GAS_WEBAPP_URL is not configured.",
    );
  });
});
