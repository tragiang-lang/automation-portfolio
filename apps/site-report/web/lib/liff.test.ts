/**
 * @jest-environment jsdom
 *
 * Mocks the `@line/liff` SDK entirely — no real LINE account, channel,
 * browser login, or network access. Each test resets the module
 * registry so `lib/liff.ts`'s module-level init cache never leaks
 * between tests (Task 6 §11/§21).
 */

const LIFF_ID_ENV = "NEXT_PUBLIC_LIFF_ID";
const VALID_LIFF_ID = "1234567890-abcdefgh";

const VALID_RAW_PROFILE = {
  userId: "U1234567890",
  displayName: "Taro Yamada",
  pictureUrl: "https://example.com/pic.png",
  statusMessage: "Hello!",
};

const NORMALIZED_PROFILE = {
  userId: "U1234567890",
  displayName: "Taro Yamada",
  pictureUrl: "https://example.com/pic.png",
  statusMessage: "Hello!",
};

interface LiffMockOverrides {
  init?: jest.Mock;
  isLoggedIn?: jest.Mock;
  login?: jest.Mock;
  getProfile?: jest.Mock;
}

function mockLiffModule(overrides: LiffMockOverrides = {}) {
  const liffMock = {
    init: overrides.init ?? jest.fn().mockResolvedValue(undefined),
    isLoggedIn: overrides.isLoggedIn ?? jest.fn().mockReturnValue(true),
    login: overrides.login ?? jest.fn(),
    getProfile: overrides.getProfile ?? jest.fn().mockResolvedValue(VALID_RAW_PROFILE),
  };
  jest.doMock("@line/liff", () => ({ __esModule: true, default: liffMock }));
  return liffMock;
}

async function loadLiffLib() {
  return import("./liff");
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, [LIFF_ID_ENV]: VALID_LIFF_ID };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
  jest.dontMock("@line/liff");
});

describe("initializeSiteReportLiff", () => {
  // 1. successful initialization
  it("resolves to ready with a normalized profile when init/login/profile all succeed", async () => {
    const liffMock = mockLiffModule();
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state).toEqual({ status: "ready", profile: NORMALIZED_PROFILE });
    expect(liffMock.init).toHaveBeenCalledWith({ liffId: VALID_LIFF_ID });
  });

  // 2. missing LIFF ID
  it("resolves to error(LIFF_CONFIG_MISSING) and never calls liff.init when the LIFF ID is missing", async () => {
    delete process.env[LIFF_ID_ENV];
    const liffMock = mockLiffModule();
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("LIFF_CONFIG_MISSING");
    }
    expect(liffMock.init).not.toHaveBeenCalled();
  });

  // 3. liff.init() failure
  it("resolves to error(LIFF_INIT_FAILED) when liff.init rejects", async () => {
    mockLiffModule({ init: jest.fn().mockRejectedValue(new Error("network down")) });
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("LIFF_INIT_FAILED");
    }
  });

  // 4. user not logged in
  it("resolves to login-required and never calls getProfile when the user is not logged in", async () => {
    const liffMock = mockLiffModule({ isLoggedIn: jest.fn().mockReturnValue(false) });
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state).toEqual({ status: "login-required" });
    expect(liffMock.getProfile).not.toHaveBeenCalled();
  });

  it("resolves to error(LIFF_LOGIN_STATUS_FAILED) when isLoggedIn throws", async () => {
    mockLiffModule({
      isLoggedIn: jest.fn().mockImplementation(() => {
        throw new Error("cannot determine login state");
      }),
    });
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("LIFF_LOGIN_STATUS_FAILED");
    }
  });

  // 6. profile retrieval success is covered by test 1 above.

  // 7. profile retrieval failure
  it("resolves to error(LIFF_PROFILE_FAILED) when getProfile rejects", async () => {
    mockLiffModule({ getProfile: jest.fn().mockRejectedValue(new Error("boom")) });
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("LIFF_PROFILE_FAILED");
    }
  });

  // 8. malformed profile
  it("resolves to error(LIFF_PROFILE_INVALID) when the profile is missing a required field", async () => {
    mockLiffModule({
      getProfile: jest.fn().mockResolvedValue({ displayName: "Taro Yamada" }),
    });
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("LIFF_PROFILE_INVALID");
    }
  });

  it("never leaks the raw SDK profile object into the ready state", async () => {
    mockLiffModule({
      getProfile: jest.fn().mockResolvedValue({ ...VALID_RAW_PROFILE, statusToken: "secret" }),
    });
    const { initializeSiteReportLiff } = await loadLiffLib();

    const state = await initializeSiteReportLiff();

    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.profile).toEqual(NORMALIZED_PROFILE);
      expect(state.profile).not.toHaveProperty("statusToken");
    }
  });

  // 9. repeated initialization
  it("does not call liff.init or getProfile more than once across repeated/concurrent calls", async () => {
    const liffMock = mockLiffModule();
    const { initializeSiteReportLiff } = await loadLiffLib();

    const [first, second] = await Promise.all([
      initializeSiteReportLiff(),
      initializeSiteReportLiff(),
    ]);
    const third = await initializeSiteReportLiff();

    expect(first).toEqual({ status: "ready", profile: NORMALIZED_PROFILE });
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(liffMock.init).toHaveBeenCalledTimes(1);
    expect(liffMock.getProfile).toHaveBeenCalledTimes(1);
  });

  // 10. GET_SITES / SUBMIT_REPORT are not automatically called
  it("never calls callSiteReportAction during initialization", async () => {
    mockLiffModule();
    jest.doMock("./api/siteReportClient", () => ({
      callSiteReportAction: jest.fn(),
    }));
    const { initializeSiteReportLiff } = await loadLiffLib();
    const { callSiteReportAction } = await import("./api/siteReportClient");

    await initializeSiteReportLiff();

    expect(callSiteReportAction).not.toHaveBeenCalled();
  });
});

describe("loginToSiteReport", () => {
  // 5. explicit login flow
  it("calls liff.login exactly once and is not invoked automatically by initialization", async () => {
    const liffMock = mockLiffModule({ isLoggedIn: jest.fn().mockReturnValue(false) });
    const { initializeSiteReportLiff, loginToSiteReport } = await loadLiffLib();

    const state = await initializeSiteReportLiff();
    expect(state).toEqual({ status: "login-required" });
    expect(liffMock.login).not.toHaveBeenCalled();

    await loginToSiteReport();

    expect(liffMock.login).toHaveBeenCalledTimes(1);
  });
});

describe("normalizeLiffProfile", () => {
  it("returns a stable application-level profile from a valid raw profile, dropping unknown fields", async () => {
    const { normalizeLiffProfile } = await loadLiffLib();

    const result = normalizeLiffProfile({ ...VALID_RAW_PROFILE, extra: "ignored" });

    expect(result).toEqual(NORMALIZED_PROFILE);
  });

  it("keeps optional fields undefined (not fabricated) when absent", async () => {
    const { normalizeLiffProfile } = await loadLiffLib();

    const result = normalizeLiffProfile({ userId: "U1", displayName: "No Picture" });

    expect(result).toEqual({ userId: "U1", displayName: "No Picture" });
  });

  it("returns null when userId is missing", async () => {
    const { normalizeLiffProfile } = await loadLiffLib();

    expect(normalizeLiffProfile({ displayName: "No Id" })).toBeNull();
  });
});

describe("getLiffConfig", () => {
  it("returns null when the LIFF ID env var is unset", async () => {
    delete process.env[LIFF_ID_ENV];
    const { getLiffConfig } = await loadLiffLib();

    expect(getLiffConfig()).toBeNull();
  });

  it("returns the configured LIFF ID when set", async () => {
    const { getLiffConfig } = await loadLiffLib();

    expect(getLiffConfig()).toEqual({ liffId: VALID_LIFF_ID });
  });
});
