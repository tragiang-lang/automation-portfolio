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
});
