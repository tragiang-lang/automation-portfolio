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
import { ALL_HOME_SECTIONS } from "@/lib/constants/design-sections";
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
    expect(screen.getByRole("heading", { name: "お客様の声" })).toBeInTheDocument();
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

/**
 * One heading marker per `HomeSection`, used only to locate each section's
 * element for the document-order assertions below — not a duplicate of any
 * accessibility assertion above. Every section renders its marker as a
 * heading, so `sectionHeadingElement` below (via `getByRole("heading", ...)`)
 * finds exactly one element per section — critically, scoped to
 * `role: "heading"` this cannot false-match `HERO_CTA_SECONDARY`'s
 * "メニューを見る" button text, which contains the "menu" marker as a raw
 * substring but is not a heading (see `components/sections/HeroContent.tsx`).
 * `hero`'s value is documentation only (its own accessible name gets a
 * space inserted around `renderHeroHeadline`'s `<span>` — see
 * `sectionHeadingElement` below); lookup uses heading level 1 instead.
 */
const SECTION_MARKERS: Record<(typeof ALL_HOME_SECTIONS)[number], string> = {
  hero: "静けさの中で、指先とまなざしを整える。",
  concept: "静けさの中で、指先を整える時間を",
  menu: "メニュー",
  staff: "スタッフ紹介",
  gallery: "ギャラリー",
  testimonials: "お客様の声",
  reservation: "仕上がりを見て、気持ちが決まったら",
  "salon-features": "サロンについて",
  "customer-flow": "ご来店の流れ",
  faq: "よくあるご質問",
  access: "アクセス",
  contact: "お問い合わせ",
};

const CLOSING_RESERVATION_CTA_TEXT = "最後まで読んでくださり、ありがとうございます";

/** Resolves one section's heading element. Hero is matched by `level: 1`
 *  rather than `name` — the accessible-name algorithm inserts a space
 *  around `renderHeroHeadline`'s internal `<span>` contribution (per the
 *  W3C accname spec's name-from-content join rule), so its computed name
 *  doesn't literally equal `SECTION_MARKERS.hero`; `level: 1` sidesteps
 *  that since the page has exactly one `<h1>`. */
function sectionHeadingElement(section: (typeof ALL_HOME_SECTIONS)[number]) {
  if (section === "hero") return screen.getByRole("heading", { level: 1 });
  return screen.getByRole("heading", { name: SECTION_MARKERS[section] });
}

/** Index of each section's heading element within the full ordered list of
 *  headings on the page — `getByRole` throws if a marker isn't a unique
 *  heading, so this doubles as an every-section-rendered-exactly-once
 *  check. */
function headingOrderIndices(sections: readonly (typeof ALL_HOME_SECTIONS)[number][]): number[] {
  const allHeadings = screen.getAllByRole("heading");
  return sections.map((section) => allHeadings.indexOf(sectionHeadingElement(section)));
}

describe("Home — section ordering (V1.1 Task 9)", () => {
  it("renders sections in DEFAULT_SECTION_ORDER by default — same heading order as the pre-Task-9 literal JSX sequence", async () => {
    render(await Home());

    const indices = headingOrderIndices(ALL_HOME_SECTIONS);
    expect(indices.every((index) => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("re-renders sections in a custom sectionOrder, with the closing reservation CTA band still fixed after everything else", async () => {
    const reversedOrder = [...ALL_HOME_SECTIONS].reverse();
    mockedGetDesignConfig.mockReturnValue({ ...DEFAULT_DESIGN_CONFIG, sectionOrder: reversedOrder });

    render(await Home());

    const indices = headingOrderIndices(reversedOrder);
    expect(indices.every((index) => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));

    const allHeadings = screen.getAllByRole("heading");
    const closingIndex = allHeadings.indexOf(screen.getByRole("heading", { name: CLOSING_RESERVATION_CTA_TEXT }));
    expect(closingIndex).toBeGreaterThan(Math.max(...indices));
  });

  it("moves gallery ahead of concept for an editorial-style order while every section still renders exactly once", async () => {
    const editorialOrder = [
      "hero",
      "gallery",
      "concept",
      "menu",
      "staff",
      "testimonials",
      "reservation",
      "salon-features",
      "customer-flow",
      "faq",
      "access",
      "contact",
    ] as typeof ALL_HOME_SECTIONS;
    mockedGetDesignConfig.mockReturnValue({ ...DEFAULT_DESIGN_CONFIG, sectionOrder: editorialOrder });

    render(await Home());

    const indices = headingOrderIndices(editorialOrder);
    expect(indices.every((index) => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));

    const galleryIndex = screen.getAllByRole("heading").indexOf(screen.getByRole("heading", { name: SECTION_MARKERS.gallery }));
    const conceptIndex = screen.getAllByRole("heading").indexOf(screen.getByRole("heading", { name: SECTION_MARKERS.concept }));
    expect(galleryIndex).toBeLessThan(conceptIndex);
  });

  it("falls back to DEFAULT_SECTION_ORDER (never crashes, never drops a section) when sectionOrder is malformed", async () => {
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      sectionOrder: ["hero", "menu"] as unknown as (typeof ALL_HOME_SECTIONS)[number][],
    });

    render(await Home());

    for (const section of ALL_HOME_SECTIONS) {
      expect(sectionHeadingElement(section)).toBeInTheDocument();
    }
  });

  it("keeps both reservation CTA bands hidden together under a reordered sectionOrder when design visibility is off", async () => {
    mockedGetDesignConfig.mockReturnValue({
      ...DEFAULT_DESIGN_CONFIG,
      sectionOrder: [...ALL_HOME_SECTIONS].reverse(),
      sectionVisibility: { ...DEFAULT_DESIGN_CONFIG.sectionVisibility, reservation: false },
    });

    render(await Home());

    expect(screen.queryByText("仕上がりを見て、気持ちが決まったら")).not.toBeInTheDocument();
    expect(screen.queryByText(CLOSING_RESERVATION_CTA_TEXT)).not.toBeInTheDocument();
  });
});
