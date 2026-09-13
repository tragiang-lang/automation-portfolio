/**
 * @jest-environment node
 *
 * Task 6 §23: LIFF must never be accessed at module-evaluation time in a
 * server environment. This file runs under Jest's `node` environment
 * (no `window`) to prove `lib/liff.ts` degrades to a safe error instead
 * of crashing, and never imports `@line/liff` in that environment.
 */

describe("initializeSiteReportLiff (server environment)", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("resolves to error(LIFF_UNAVAILABLE_SSR) without importing the LIFF SDK", async () => {
    const liffSdkFactory = jest.fn(() => ({
      __esModule: true,
      default: { init: jest.fn(), isLoggedIn: jest.fn(), login: jest.fn(), getProfile: jest.fn() },
    }));
    jest.doMock("@line/liff", liffSdkFactory);

    const { initializeSiteReportLiff } = await import("./liff");
    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("LIFF_UNAVAILABLE_SSR");
    }
    expect(liffSdkFactory).not.toHaveBeenCalled();
  });
});
