import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { designRichMenu } from "../src/agents/designAgent";
import { analyzeIndustry } from "../src/agents/industrySpecialist";
import { runPipeline } from "../src/agents/orchestrator";
import { planWorkflows } from "../src/agents/workflowPlanner";
import { contrastRatio } from "../src/lib/contrast";
import { FACTORY_ROOT } from "../src/lib/fsx";
import { validateAssets } from "../src/validation/validateAssets";
import { editJson, hairSalonBrief, realEstateBrief, realRegistry, registryWith, restaurantBrief } from "./helpers";

describe("Industry Specialist", () => {
  it("maps the hair-salon requirement lines to intents and workflows", () => {
    const { profile, issues } = analyzeIndustry(hairSalonBrief(), realRegistry());
    expect(issues).toEqual([]);
    expect(profile!.customerIntents.map((i) => i.id)).toEqual(["view_menu", "book", "ask_question", "find_access"]);
    expect(profile!.recommendedWorkflows).toEqual(["reservation-basic-v1", "service-menu-v1", "inquiry-basic-v1", "business-info-v1"]);
    expect(profile!.recommendedActions).toContain("createReservation@1");
    expect(profile!.industryAsset).toBe("hair-salon-v1@1.0.0");
  });

  it("records unmatched requirements as assumptions instead of guessing", () => {
    const brief = { ...hairSalonBrief(), requirements: ["Customer should be able to see menu", "Show loyalty points"] };
    const { profile } = analyzeIndustry(brief, realRegistry());
    expect(profile!.recommendedWorkflows).toEqual(["service-menu-v1"]);
    expect(profile!.assumptions.join()).toMatch(/Show loyalty points/);
  });

  it("fails clearly for an industry without a profile", () => {
    const { profile, issues } = analyzeIndustry({ ...hairSalonBrief(), industry: "spaceport" }, realRegistry());
    expect(profile).toBeNull();
    expect(issues[0].message).toMatch(/no industry profile for "spaceport"/);
  });
});

describe("industry-scoped intent aliases (F1)", () => {
  const intentsFor = (brief: ReturnType<typeof hairSalonBrief>, requirements: string[], registry = realRegistry()) =>
    analyzeIndustry({ ...brief, requirements }, registry).profile!.customerIntents.map((i) => i.id);

  it("keeps matching common keywords for every industry", () => {
    for (const brief of [hairSalonBrief(), restaurantBrief(), realEstateBrief()]) expect(intentsFor(brief, ["予約したい"])).toEqual(["book"]);
  });

  it("maps real_estate words to intents through the industry's own aliases", () => {
    expect(intentsFor(realEstateBrief(), ["内見を申し込みたい"])).toEqual(["book"]);
    expect(intentsFor(realEstateBrief(), ["内覧を予約したい"])).toEqual(["book"]);
    expect(intentsFor(realEstateBrief(), ["見学を申し込みたい"])).toEqual(["book"]);
  });

  it("does not leak real_estate aliases into hair_salon or restaurant", () => {
    for (const brief of [hairSalonBrief(), restaurantBrief()]) {
      const { profile } = analyzeIndustry({ ...brief, requirements: ["内見を申し込みたい", "問い合わせしたい"] }, realRegistry());
      expect(profile!.customerIntents.map((i) => i.id)).toEqual(["ask_question"]);
      expect(profile!.assumptions.join()).toMatch(/内見を申し込みたい/);
    }
  });

  it("behaves as before when an industry has no aliases", () => {
    const registry = registryWith((dir) => editJson(dir, "industries/real-estate/real-estate-v1.json", (a) => delete a.intentAliases));
    expect(intentsFor(realEstateBrief(), ["内見を申し込みたい", "問い合わせしたい"], registry)).toEqual(["ask_question"]);
    expect(intentsFor(realEstateBrief(), ["予約したい"], registry)).toEqual(["book"]);
  });

  it("rejects aliases for an intent that is not in the catalog", () => {
    const registry = registryWith((dir) => editJson(dir, "industries/real-estate/real-estate-v1.json", (a) => (a.intentAliases.teleport = ["転送"])));
    const messages = validateAssets(registry).filter((i) => i.severity === "error").map((i) => i.message);
    expect(messages).toContain("intentAliases refers to unknown intent teleport");
  });
});

describe("generic delivery wording (F2)", () => {
  const setupFor = (brief: ReturnType<typeof hairSalonBrief>) => runPipeline(brief, realRegistry(), { createdOn: "2026-09-23" }).files["delivery/SETUP.md"];

  it("does not assume every industry has a menu / service catalog", () => {
    for (const brief of [hairSalonBrief(), restaurantBrief(), realEstateBrief()]) {
      const setup = setupFor(brief);
      const line = setup.split("\n").find((l) => l.includes("各ワークフローで使用する情報"));
      expect(line).toBe("- 必要に応じて、各ワークフローで使用する情報を該当するシートに入力します。`active` を設定できる項目は、TRUE にした行のみが使用されます。");
      expect(setup).not.toMatch(/メニューを入力|`SERVICES` シート/);
    }
  });

  it("keeps the delivery generator free of industry and sheet-name branches", () => {
    const source = fs.readFileSync(path.join(FACTORY_ROOT, "src/generators/delivery.ts"), "utf8");
    expect(source).not.toMatch(/hair_salon|restaurant|real_estate|SERVICES/);
  });
});

describe("industry assumptions and extensionPoints (F3)", () => {
  const source = JSON.parse(fs.readFileSync(path.join(FACTORY_ROOT, "core-assets/industries/real-estate/real-estate-v1.json"), "utf8"));
  const generate = (brief: ReturnType<typeof hairSalonBrief>) => runPipeline(brief, realRegistry(), { createdOn: "2026-09-23" });

  it("keeps both fields through load and validation", () => {
    const asset = realRegistry().industryFor("real_estate")!;
    expect(asset.assumptions).toEqual(source.assumptions);
    expect(asset.extensionPoints).toEqual(source.extensionPoints);
  });

  it("copies the source values into analysis/industry-profile.json", () => {
    const profile = JSON.parse(generate(realEstateBrief()).files["analysis/industry-profile.json"]);
    expect(profile.assumptions.slice(0, source.assumptions.length)).toEqual(source.assumptions);
    expect(profile.extensionPoints).toEqual(source.extensionPoints);
  });

  it("shows them in DELIVERY.md when present", () => {
    const delivery = generate(realEstateBrief()).files["delivery/DELIVERY.md"];
    const [assumptionsSection, extensionsSection] = [delivery.split("## 前提・注意事項")[1].split("##")[0], delivery.split("## 今後の拡張候補")[1]];
    for (const text of source.assumptions) expect(assumptionsSection).toContain(text);
    for (const point of source.extensionPoints.planned) expect(extensionsSection).toContain(`${point.id}: ${point.description}`);
  });

  it("does not change industries that declare neither field", () => {
    for (const brief of [hairSalonBrief(), restaurantBrief()]) {
      const result = generate(brief);
      expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(JSON.parse(result.files["analysis/industry-profile.json"])).not.toHaveProperty("extensionPoints");
    }
  });
});

describe("Workflow Planner", () => {
  it("rejects a menu whose buttons need workflows that were not selected", () => {
    const registry = realRegistry();
    const brief = { ...hairSalonBrief(), requirements: ["Customer should be able to send inquiry"] };
    const { profile } = analyzeIndustry(brief, registry);
    const { issues } = planWorkflows(brief, profile!, registry);
    expect(issues.some((i) => i.rule === "RM_ACTIONS_VALID" && /not selected/.test(i.message))).toBe(true);
  });
});

describe("Design Agent", () => {
  it("applies brand overrides and keeps every label readable", () => {
    const registry = realRegistry();
    const brief = hairSalonBrief();
    brief.brand.colors = { primary: "#3A2F4B" };
    const { profile } = analyzeIndustry(brief, registry);
    const { plan } = planWorkflows(brief, profile!, registry);
    const spec = designRichMenu(brief, profile!, plan, registry);
    expect(spec.canvas).toEqual({ width: 2500, height: 1686 });
    expect(spec.ctaHierarchy[0]).toBe("ご予約");
    expect(spec.cells.find((c) => c.role === "primary")!.fill).toBe("#3A2F4B");
    for (const c of spec.cells) expect(contrastRatio(c.labelColor, c.fill)).toBeGreaterThanOrEqual(4.5);
    expect(spec.designNotes.join()).toMatch(/overrides applied: primary/);
  });
});

describe("second industry: restaurant", () => {
  it("runs the same pipeline with only industry/menu data, no core changes", () => {
    const result = runPipeline(restaurantBrief(), realRegistry(), { createdOn: "2026-09-23" });
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(result.plan!.richMenu).toBe("restaurant-basic-v1");
    expect(result.plan!.selected.map((w) => w.id).sort()).toEqual(["business-info-v1", "inquiry-basic-v1", "reservation-basic-v1", "service-menu-v1"]);
    const design = JSON.parse(result.files["rich-menu/design-spec.json"]);
    expect(design.layout).toBe("hero-1-plus-3-v1");
    expect(design.cells[0]).toMatchObject({ label: "席のご予約", emphasis: "hero" });
  });
});

describe("Orchestrator", () => {
  it("is deterministic: the same brief gives byte-identical artifacts", () => {
    const a = runPipeline(hairSalonBrief(), realRegistry(), { createdOn: "2026-09-23" }).files;
    const b = runPipeline(hairSalonBrief(), realRegistry(), { createdOn: "2026-09-23" }).files;
    expect(Object.keys(a)).toEqual(Object.keys(b));
    for (const key of Object.keys(a)) expect(a[key], key).toBe(b[key]);
  });

  it("stamps traceability on every generated JSON artifact", () => {
    const { files } = runPipeline(hairSalonBrief(), realRegistry(), { createdOn: "2026-09-23" });
    for (const [rel, content] of Object.entries(files)) {
      if (!rel.endsWith(".json") || rel.startsWith("gas/") || rel === "brief/brief.json") continue;
      const meta = JSON.parse(content)._meta;
      expect(meta, rel).toMatchObject({ project: "2026/demo-hair-salon", industry: "hair_salon" });
      expect(meta.workflows, rel).toContain("inquiry-basic-v1@1.0.0");
      expect(meta.assets["createInquiry@1"], rel).toBe("1.0.0");
    }
    expect(files["gas/src/generated/registry.ts"]).toMatch(/workflows: reservation-basic-v1@1\.0\.0/);
  });
});
