import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeIndustry } from "../src/agents/industrySpecialist";
import { ARTIFACTS, runPipeline } from "../src/agents/orchestrator";
import { FACTORY_ROOT, readJson } from "../src/lib/fsx";
import { ClientBrief, clientBrief } from "../src/schemas/brief";
import { validateAssets } from "../src/validation/validateAssets";
import { hairSalonBrief, realRegistry } from "./helpers";

/** Third beauty industry: spa must come out of the same pipeline with data-only changes. */
const readBrief = (file: string): ClientBrief => clientBrief.parse(readJson(path.join(FACTORY_ROOT, "templates/briefs", file)));
const spaBrief = () => readBrief("spa.example.json");
const nailSalonBrief = () => readBrief("nail-salon.example.json");
const intentsFor = (brief: ClientBrief, requirements: string[]) => analyzeIndustry({ ...brief, requirements }, realRegistry()).profile!.customerIntents.map((i) => i.id);

describe("beauty industry: spa", () => {
  it("loads the spa-v1 profile and validates it without errors", () => {
    const registry = realRegistry();
    expect(registry.industryFor("spa")).toMatchObject({ id: "spa-v1", category: "salon", recommendedRichMenu: "spa-basic-v1" });
    const issues = validateAssets(registry);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    // Also covers ASSET_UNLOCKED: both new assets must be released in asset-lock.json.
    expect(issues.filter((i) => /spa-/.test(i.where ?? ""))).toEqual([]);
  });

  it("maps the Japanese brief lines to the existing intents", () => {
    const { profile, issues } = analyzeIndustry(spaBrief(), realRegistry());
    expect(issues).toEqual([]);
    expect(profile!.customerIntents.map((i) => [i.id, i.source])).toEqual([
      ["book", "requirement"],
      ["view_menu", "requirement"],
      ["ask_question", "requirement"],
      ["find_access", "requirement"],
      ["check_hours", "requirement"],
    ]);
    for (const line of ["施術を予約したい", "トリートメントを予約したい", "ボディケアを予約したい"]) expect(intentsFor(spaBrief(), [line]), line).toEqual(["book"]);
  });

  it("maps spa words through its own aliases without leaking them into hair_salon or nail_salon", () => {
    expect(intentsFor(spaBrief(), ["施術時間を確認できるようにしたい"])).toEqual(["view_menu"]);
    expect(intentsFor(spaBrief(), ["体調について事前に確認したい"])).toEqual(["ask_question"]);
    for (const other of [hairSalonBrief(), nailSalonBrief()]) {
      expect(intentsFor(other, ["施術時間を確認できるようにしたい", "体調について事前に確認したい", "問い合わせしたい"]), other.industry).toEqual(["ask_question"]);
    }
  });

  it("reuses exactly the hair_salon and nail_salon workflows and a menu whose buttons all target them", () => {
    const registry = realRegistry();
    const spa = runPipeline(spaBrief(), registry, { createdOn: "2026-09-26" });
    const hair = runPipeline(hairSalonBrief(), registry, { createdOn: "2026-09-23" });
    const nail = runPipeline(nailSalonBrief(), registry, { createdOn: "2026-09-26" });
    expect(spa.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(spa.plan!.selected.map((w) => w.id)).toEqual(["reservation-basic-v1", "service-menu-v1", "inquiry-basic-v1", "business-info-v1"]);
    expect(spa.plan!.selected.map((w) => w.id)).toEqual(hair.plan!.selected.map((w) => w.id));
    expect(spa.plan!.selected.map((w) => w.id)).toEqual(nail.plan!.selected.map((w) => w.id));
    expect(spa.plan!.deferred).toEqual([]);
    expect(spa.plan!).toMatchObject({ richMenu: "spa-basic-v1", designPreset: "warm-natural-v1" });

    const selected = new Set(spa.plan!.selected.map((w) => w.id));
    const menu = registry.menus.get("spa-basic-v1")!.asset;
    expect(menu.layout).toBe(registry.menus.get("salon-basic-v1")!.asset.layout);
    for (const item of menu.items) {
      if (item.action.type === "workflow") expect(selected.has(item.action.workflowId), item.label).toBe(true);
      else expect(spaBrief().config[item.action.configKey], item.label).toMatch(/^https:\/\/example\.com\//);
    }
  });

  it("generates every standard artifact, including the rich-menu PNG", () => {
    const result = runPipeline(spaBrief(), realRegistry(), { createdOn: "2026-09-26" });
    const generated = [...Object.keys(result.files), ...Object.keys(result.binaries), "project.json"];
    for (const artifact of ARTIFACTS.filter((a) => !a.endsWith("/") && !a.startsWith("qa/"))) expect(generated, artifact).toContain(artifact);
    expect(result.binaries["rich-menu/rich-menu.png"].length).toBeGreaterThan(0);
    const schema = JSON.parse(result.files["spreadsheet/schema.json"]);
    expect(schema.sheets.map((s: { name: string }) => s.name).sort()).toEqual(["CONFIG", "CUSTOMERS", "INQUIRIES", "RESERVATIONS", "SERVICES"]);
  });
});
