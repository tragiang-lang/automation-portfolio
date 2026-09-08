jest.mock("../lib/config/designConfig", () => ({
  getDesignConfig: jest.fn(),
}));
// Keep every real export (DEMO_RUNTIME_CONFIG, loadRuntimeConfig) and
// override only the cached `getRuntimeConfig` entry point `Home` calls —
// mocking the whole module away would make `DEMO_RUNTIME_CONFIG` (used
// below to build test fixtures) undefined.
jest.mock("../lib/config/runtimeConfig", () => ({
  ...jest.requireActual("../lib/config/runtimeConfig"),
  getRuntimeConfig: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import Home from "./page";
import { getDesignConfig } from "@/lib/config/designConfig";
import { getRuntimeConfig, DEMO_RUNTIME_CONFIG } from "@/lib/config/runtimeConfig";
import { DEFAULT_DESIGN_CONFIG } from "@/config/design-presets";
import type { RuntimeConfigResult } from "@/types/runtime-config";

const mockedGetDesignConfig = getDesignConfig as jest.Mock;
const mockedGetRuntimeConfig = getRuntimeConfig as jest.Mock;
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.GAS_WEBAPP_URL; // demo-fallback for the catalog call — no network
  mockedGetDesignConfig.mockReturnValue(DEFAULT_DESIGN_CONFIG);
  mockedGetRuntimeConfig.mockResolvedValue({ status: "demo-fallback", config: DEMO_RUNTIME_CONFIG });
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("Home", () => {
  it("renders every section with the default design config, unchanged from before this task", async () => {
    render(await Home());

    expect(screen.getByRole("heading", { name: "静けさの中で、指先を整える時間を" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "スタッフ紹介" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ギャラリー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "サロンについて" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ご来店の流れ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "よくあるご質問" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アクセス" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
    expect(screen.getAllByText("ご予約はこちら").length).toBeGreaterThanOrEqual(2);
  });

  it("renders every section under a non-default theme preset (Theme Presets task — theme selection is CSS-only, never gates rendering)", async () => {
    mockedGetDesignConfig.mockReturnValue({ ...DEFAULT_DESIGN_CONFIG, preset: "noir", theme: "noir" });

    render(await Home());

    expect(screen.getByRole("heading", { name: "静けさの中で、指先を整える時間を" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "スタッフ紹介" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ギャラリー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
  });

  it("renders every section under a non-default typography preset (Typography Presets task — typography selection is CSS-only, never gates rendering)", async () => {
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      preset: "editorial",
      theme: "editorial",
      typography: "editorial",
    });

    render(await Home());

    expect(screen.getByRole("heading", { name: "静けさの中で、指先を整える時間を" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "スタッフ紹介" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ギャラリー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
  });

  it("hides an optional section when its sectionVisibility flag is false, without touching required sections", async () => {
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      sectionVisibility: { ...DEFAULT_DESIGN_CONFIG.sectionVisibility, concept: false },
    });

    render(await Home());

    expect(
      screen.queryByRole("heading", { name: "静けさの中で、指先を整える時間を" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
  });

  it("never shows staff/reservation/contact when the business feature flag is off, even though design visibility defaults to true", async () => {
    const allFeaturesOff: RuntimeConfigResult = {
      status: "runtime",
      config: {
        ...DEMO_RUNTIME_CONFIG,
        features: { ...DEMO_RUNTIME_CONFIG.features, staffSelection: false, reservation: false, contactForm: false },
      },
    };
    mockedGetRuntimeConfig.mockResolvedValue(allFeaturesOff);

    render(await Home());

    expect(screen.queryByRole("heading", { name: "スタッフ紹介" })).not.toBeInTheDocument();
    expect(screen.queryByText("仕上がりを見て、気持ちが決まったら")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "お問い合わせ" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
  });

  it("also hides staff/reservation/contact when design visibility is false, even though the business feature flag is on — the AND combination, not just the feature flag alone", async () => {
    // Demo runtime config ships all three feature flags on (beforeEach's
    // default mock) — only design visibility is turned off here. Before
    // this task's app/page.tsx change, these three sections read only
    // `siteConfig.features.*` and had no way to be hidden by design at
    // all, so this assertion fails against the pre-Task-6 code.
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      sectionVisibility: {
        ...DEFAULT_DESIGN_CONFIG.sectionVisibility,
        staff: false,
        reservation: false,
        contact: false,
      },
    });

    render(await Home());

    expect(screen.queryByRole("heading", { name: "スタッフ紹介" })).not.toBeInTheDocument();
    expect(screen.queryByText("仕上がりを見て、気持ちが決まったら")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "お問い合わせ" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メニュー" })).toBeInTheDocument();
  });
});
