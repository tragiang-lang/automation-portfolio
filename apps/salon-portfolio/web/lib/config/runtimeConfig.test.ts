jest.mock("../api/gasClient", () => ({
  callGasAction: jest.fn(),
}));

import { callGasAction } from "@/lib/api/gasClient";
import { DEMO_RUNTIME_CONFIG, loadRuntimeConfig } from "./runtimeConfig";

const mockedCallGasAction = callGasAction as jest.Mock;
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mockedCallGasAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("loadRuntimeConfig", () => {
  it("returns demo-fallback when GAS_WEBAPP_URL is not set", async () => {
    delete process.env.GAS_WEBAPP_URL;

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "demo-fallback", config: DEMO_RUNTIME_CONFIG });
    expect(mockedCallGasAction).not.toHaveBeenCalled();
  });

  it("returns runtime with the parsed config on success", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: DEMO_RUNTIME_CONFIG });

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime", config: DEMO_RUNTIME_CONFIG });
  });

  it("returns runtime-error when GAS reports ok:false", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
    });

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
  });

  it("returns runtime-error when the response fails shape validation", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: { nonsense: true } });

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
  });

  it("returns runtime-error when callGasAction throws", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockRejectedValueOnce(new Error("GAS_WEBAPP_URL is not configured."));

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
  });

  // Production safety guard — a production deployment must never silently
  // present demo content as if it were real business data (spec: "Add a
  // production safety guard for Salon runtime configuration").
  describe("in production (NODE_ENV=production)", () => {
    it("returns runtime-error (not demo-fallback) when GAS_WEBAPP_URL is not set, and logs why", async () => {
      process.env = { ...process.env, NODE_ENV: "production" }; // NODE_ENV is readonly on process.env itself
      delete process.env.GAS_WEBAPP_URL;
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await loadRuntimeConfig();

      expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
      expect(mockedCallGasAction).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("GAS_WEBAPP_URL"));
    });

    it("returns runtime with the parsed config when GAS_WEBAPP_URL is configured (unaffected by the guard)", async () => {
      process.env = { ...process.env, NODE_ENV: "production" };
      process.env.GAS_WEBAPP_URL = "https://example.com/exec";
      mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: DEMO_RUNTIME_CONFIG });

      const result = await loadRuntimeConfig();

      expect(result).toEqual({ status: "runtime", config: DEMO_RUNTIME_CONFIG });
    });

    it("still returns runtime-error when a configured GAS backend fails (existing behavior unchanged)", async () => {
      process.env = { ...process.env, NODE_ENV: "production" };
      process.env.GAS_WEBAPP_URL = "https://example.com/exec";
      mockedCallGasAction.mockResolvedValueOnce({
        ok: false,
        error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
      });

      const result = await loadRuntimeConfig();

      expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
    });
  });

  describe("in development (NODE_ENV=development)", () => {
    it("still returns demo-fallback when GAS_WEBAPP_URL is not set", async () => {
      process.env = { ...process.env, NODE_ENV: "development" };
      delete process.env.GAS_WEBAPP_URL;

      const result = await loadRuntimeConfig();

      expect(result).toEqual({ status: "demo-fallback", config: DEMO_RUNTIME_CONFIG });
      expect(mockedCallGasAction).not.toHaveBeenCalled();
    });
  });
});
