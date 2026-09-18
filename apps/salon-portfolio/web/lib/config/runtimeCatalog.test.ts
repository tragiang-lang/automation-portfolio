jest.mock("../api/gasClient", () => ({
  callGasAction: jest.fn(),
}));

import { callGasAction } from "@/lib/api/gasClient";
import { loadRuntimeCatalog } from "./runtimeCatalog";
import { SERVICES, STAFF } from "@/config/demo-content";

const mockedCallGasAction = callGasAction as jest.Mock;
const ORIGINAL_ENV = process.env;

const RUNTIME_SERVICES = [
  { serviceId: "SV001", name: "ジェルネイル", durationMinutes: 60, price: 6000, displayOrder: 1 },
];
const RUNTIME_STAFF = [{ staffId: "ST001", name: "田中 あい", displayOrder: 1 }];

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mockedCallGasAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("loadRuntimeCatalog", () => {
  it("returns demo-fallback with the demo SERVICES/STAFF when GAS_WEBAPP_URL is not set", async () => {
    delete process.env.GAS_WEBAPP_URL;

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "demo-fallback", services: SERVICES, staff: STAFF });
    expect(mockedCallGasAction).not.toHaveBeenCalled();
  });

  it("returns runtime with mapped services/staff on success", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
        : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
    );

    const result = await loadRuntimeCatalog();

    expect(result.status).toBe("runtime");
    expect(result.services).toEqual([
      { serviceId: "SV001", name: "ジェルネイル", durationMinutes: 60, price: 6000 },
    ]);
    expect(result.staff).toEqual([{ staffId: "ST001", name: "田中 あい" }]);
  });

  it("returns runtime with an empty staff list when staffSelection is off upstream (not an error)", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
        : Promise.resolve({ ok: true, data: [] }),
    );

    const result = await loadRuntimeCatalog();

    expect(result.status).toBe("runtime");
    expect(result.staff).toEqual([]);
  });

  it("falls back to demo-content for both when getServices reports ok:false", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: false, error: { code: "SHEET_ERROR", message: "x" } })
        : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
    );

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  it("falls back to demo-content for both when getStaff reports ok:false", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
        : Promise.resolve({ ok: false, error: { code: "SHEET_ERROR", message: "x" } }),
    );

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  it("falls back to demo-content when a response fails shape validation", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockImplementation((action: string) =>
      action === "getServices"
        ? Promise.resolve({ ok: true, data: { nonsense: true } })
        : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
    );

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  it("falls back to demo-content when callGasAction throws", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockRejectedValue(new Error("network down"));

    const result = await loadRuntimeCatalog();

    expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
  });

  // Production safety guard — same rationale as runtimeConfig.test.ts.
  describe("in production (NODE_ENV=production)", () => {
    it("returns runtime-error (not demo-fallback) when GAS_WEBAPP_URL is not set, and logs why", async () => {
      process.env = { ...process.env, NODE_ENV: "production" };
      delete process.env.GAS_WEBAPP_URL;
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await loadRuntimeCatalog();

      expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
      expect(mockedCallGasAction).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("GAS_WEBAPP_URL"));
    });

    it("returns runtime with mapped services/staff when GAS_WEBAPP_URL is configured (unaffected by the guard)", async () => {
      process.env = { ...process.env, NODE_ENV: "production" };
      process.env.GAS_WEBAPP_URL = "https://example.com/exec";
      mockedCallGasAction.mockImplementation((action: string) =>
        action === "getServices"
          ? Promise.resolve({ ok: true, data: RUNTIME_SERVICES })
          : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
      );

      const result = await loadRuntimeCatalog();

      expect(result.status).toBe("runtime");
    });

    it("still falls back to demo-content when a configured GAS backend fails (existing behavior unchanged)", async () => {
      process.env = { ...process.env, NODE_ENV: "production" };
      process.env.GAS_WEBAPP_URL = "https://example.com/exec";
      mockedCallGasAction.mockImplementation((action: string) =>
        action === "getServices"
          ? Promise.resolve({ ok: false, error: { code: "SHEET_ERROR", message: "x" } })
          : Promise.resolve({ ok: true, data: RUNTIME_STAFF }),
      );

      const result = await loadRuntimeCatalog();

      expect(result).toEqual({ status: "runtime-error", services: SERVICES, staff: STAFF });
    });
  });

  describe("in development (NODE_ENV=development)", () => {
    it("still returns demo-fallback when GAS_WEBAPP_URL is not set", async () => {
      process.env = { ...process.env, NODE_ENV: "development" };
      delete process.env.GAS_WEBAPP_URL;

      const result = await loadRuntimeCatalog();

      expect(result).toEqual({ status: "demo-fallback", services: SERVICES, staff: STAFF });
      expect(mockedCallGasAction).not.toHaveBeenCalled();
    });
  });
});
