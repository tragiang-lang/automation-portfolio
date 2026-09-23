import { describe, expect, it } from "vitest";
import { planWorkflows } from "../src/agents/workflowPlanner";
import { analyzeIndustry } from "../src/agents/industrySpecialist";
import { generateRichMenuConfig, buildLineRoutes } from "../src/generators/richMenuConfig";
import { validateLayoutGeometry } from "../src/validation/rules";
import { validateAssets } from "../src/validation/validateAssets";
import { editJson, hairSalonBrief, realRegistry, registryWith } from "./helpers";

const cell = (id: string, x: number, y: number, width: number, height: number) => ({ id, bounds: { x, y, width, height } });

describe("rich menu layout geometry", () => {
  it("accepts every shipped layout", () => {
    for (const { asset } of realRegistry().layouts.values()) expect(validateLayoutGeometry(asset.size, asset.slots, asset.id)).toEqual([]);
  });

  it("accepts a valid custom layout", () => {
    expect(validateLayoutGeometry({ width: 2500, height: 843 }, [cell("a", 0, 0, 1250, 843), cell("b", 1250, 0, 1250, 843)], "t")).toEqual([]);
  });

  it("rejects out-of-canvas, overlapping, and LINE-size violations", () => {
    const issues = validateLayoutGeometry({ width: 3000, height: 2500 }, [cell("a", 0, 0, 2000, 900), cell("b", 1500, 0, 1600, 900)], "t");
    const text = issues.map((i) => i.message).join("\n");
    expect(text).toMatch(/width 3000 must be 800-2500/);
    expect(text).toMatch(/aspect ratio/);
    expect(text).toMatch(/slots "a" and "b" overlap/);
    expect(text).toMatch(/slot "b" extends outside/);
  });

  it("rejects an invalid layout asset and a menu that leaves a slot empty", () => {
    const registry = registryWith((dir) => {
      editJson(dir, "rich-menu/layouts/grid-2x2-v1.json", (l) => (l.slots[3].bounds.width = 1300));
      editJson(dir, "rich-menu/menus/salon-basic-v1.json", (m) => m.items.pop());
    });
    const messages = validateAssets(registry).map((i) => i.message);
    expect(messages).toContain('slot "d" extends outside the 2500x1686 canvas');
    expect(messages).toContain('layout slot "f" has no button');
  });
});

describe("rich menu references", () => {
  it("detects a button pointing at a missing workflow", () => {
    const registry = registryWith((dir) => editJson(dir, "rich-menu/menus/salon-basic-v1.json", (m) => (m.items[1].action.workflowId = "gallery-v1")));
    expect(validateAssets(registry).some((i) => i.rule === "RM_ACTIONS_VALID" && /unknown workflow "gallery-v1"/.test(i.message))).toBe(true);
  });

  it("detects an invalid entry reference", () => {
    const registry = registryWith((dir) => editJson(dir, "rich-menu/menus/salon-basic-v1.json", (m) => (m.items[3].action.entry = "parking")));
    expect(validateAssets(registry).some((i) => /has no entry "parking"/.test(i.message))).toBe(true);
  });

  it("builds LINE actions from workflow entries and routes that match them", () => {
    const registry = realRegistry();
    const brief = hairSalonBrief();
    const { profile } = analyzeIndustry(brief, registry);
    const { plan } = planWorkflows(brief, profile!, registry);
    const { menuConfig, issues } = generateRichMenuConfig(plan, registry, brief);
    expect(issues).toEqual([]);
    const types = menuConfig.areas.map((a) => a.action.type);
    expect(types).toEqual(["datetimepicker", "postback", "postback", "postback", "postback", "uri"]);
    const routes = buildLineRoutes(plan, registry);
    for (const area of menuConfig.areas.filter((a) => a.action.data)) {
      const [wf, e] = area.action.data.split("&").map((p) => p.split("=")[1]);
      expect(routes.find((r) => r.workflowId === wf && r.entry === e), area.action.data).toBeDefined();
    }
    expect(menuConfig.areas[5].action.uri).toBe(brief.config["social.instagramUrl"]);
  });

  it("reports a URI button whose URL is missing from the brief", () => {
    const registry = realRegistry();
    const brief = hairSalonBrief();
    delete brief.config["social.instagramUrl"];
    const { profile } = analyzeIndustry(brief, registry);
    const { plan } = planWorkflows(brief, profile!, registry);
    expect(generateRichMenuConfig(plan, registry, brief).issues[0].message).toMatch(/social\.instagramUrl/);
  });
});
