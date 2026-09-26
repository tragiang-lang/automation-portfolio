import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeIndustry } from "../src/agents/industrySpecialist";
import { ARTIFACTS, runPipeline } from "../src/agents/orchestrator";
import { FACTORY_ROOT, readJson } from "../src/lib/fsx";
import { ClientBrief, clientBrief } from "../src/schemas/brief";
import { validateAssets } from "../src/validation/validateAssets";
import { hairSalonBrief, realRegistry } from "./helpers";

/** Fourth industry: nail_salon must come out of the same pipeline with data-only changes. */
const nailSalonBrief = (): ClientBrief => clientBrief.parse(readJson(path.join(FACTORY_ROOT, "templates/briefs/nail-salon.example.json")));
const intentsFor = (brief: ClientBrief, requirements: string[]) => analyzeIndustry({ ...brief, requirements }, realRegistry()).profile!.customerIntents.map((i) => i.id);

describe("fourth industry: nail_salon", () => {
  it("loads the nail-salon-v1 profile and validates it without errors", () => {
    const registry = realRegistry();
    expect(registry.industryFor("nail_salon")).toMatchObject({ id: "nail-salon-v1", category: "salon", recommendedRichMenu: "nail-salon-basic-v1" });
    const issues = validateAssets(registry);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    // Also covers ASSET_UNLOCKED: both new assets must be released in asset-lock.json.
    expect(issues.filter((i) => /nail-salon/.test(i.where ?? ""))).toEqual([]);
  });

  it("maps the Japanese brief lines to the existing intents", () => {
    const { profile, issues } = analyzeIndustry(nailSalonBrief(), realRegistry());
    expect(issues).toEqual([]);
    expect(profile!.customerIntents.map((i) => [i.id, i.source])).toEqual([
      ["book", "requirement"],
      ["view_menu", "requirement"],
      ["ask_question", "requirement"],
      ["find_access", "requirement"],
      ["check_hours", "requirement"],
    ]);
    expect(intentsFor(nailSalonBrief(), ["施術を予約したい"])).toEqual(["book"]);
  });

  it("maps nail words through its own aliases without leaking them into hair_salon", () => {
    expect(intentsFor(nailSalonBrief(), ["定額デザインを見られるようにしたい"])).toEqual(["view_menu"]);
    expect(intentsFor(hairSalonBrief(), ["定額デザインを見られるようにしたい", "問い合わせしたい"])).toEqual(["ask_question"]);
  });

  it("reuses exactly the hair_salon workflows and a menu whose buttons all target them", () => {
    const registry = realRegistry();
    const nail = runPipeline(nailSalonBrief(), registry, { createdOn: "2026-09-26" });
    const hair = runPipeline(hairSalonBrief(), registry, { createdOn: "2026-09-23" });
    expect(nail.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(nail.plan!.selected.map((w) => w.id)).toEqual(hair.plan!.selected.map((w) => w.id));
    expect(nail.plan!.deferred).toEqual([]);
    expect(nail.plan!).toMatchObject({ richMenu: "nail-salon-basic-v1", designPreset: "quiet-luxury-v1" });

    const selected = new Set(nail.plan!.selected.map((w) => w.id));
    const menu = registry.menus.get("nail-salon-basic-v1")!.asset;
    expect(menu.layout).toBe(registry.menus.get("salon-basic-v1")!.asset.layout);
    for (const item of menu.items) {
      if (item.action.type === "workflow") expect(selected.has(item.action.workflowId), item.label).toBe(true);
      else expect(nailSalonBrief().config[item.action.configKey], item.label).toMatch(/^https:\/\/example\.com\//);
    }
  });

  it("generates every standard artifact, including the rich-menu PNG", () => {
    const result = runPipeline(nailSalonBrief(), realRegistry(), { createdOn: "2026-09-26" });
    const generated = [...Object.keys(result.files), ...Object.keys(result.binaries), "project.json"];
    for (const artifact of ARTIFACTS.filter((a) => !a.endsWith("/") && !a.startsWith("qa/"))) expect(generated, artifact).toContain(artifact);
    expect(result.binaries["rich-menu/rich-menu.png"].length).toBeGreaterThan(0);
    const schema = JSON.parse(result.files["spreadsheet/schema.json"]);
    expect(schema.sheets.map((s: { name: string }) => s.name).sort()).toEqual(["CONFIG", "CUSTOMERS", "INQUIRIES", "RESERVATIONS", "SERVICES"]);
  });
});
