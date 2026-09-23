import { describe, expect, it } from "vitest";
import { designRichMenu } from "../src/agents/designAgent";
import { analyzeIndustry } from "../src/agents/industrySpecialist";
import { runPipeline } from "../src/agents/orchestrator";
import { planWorkflows } from "../src/agents/workflowPlanner";
import { contrastRatio } from "../src/lib/contrast";
import { hairSalonBrief, realRegistry, restaurantBrief } from "./helpers";

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
