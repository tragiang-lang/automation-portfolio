import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ARTIFACTS } from "../src/agents/orchestrator";
import { GENERATED_GAS_FILES } from "../src/generators/gasProject";
import { ProjectWriteError } from "../src/generators/projectWriter";
import { listFiles } from "../src/lib/fsx";
import { createProject } from "../src/project";
import { hairSalonBrief, realRegistry, registryWith, restaurantBrief, tempDir, writeJson } from "./helpers";

const options = (projectsDir: string, extra = {}) => ({ force: false, runGasChecks: false, projectsDir, today: "2026-09-23", ...extra });

describe("Client Project Generator", () => {
  it("creates the expected directory structure and required files", () => {
    const projectsDir = tempDir("projects");
    const result = createProject(hairSalonBrief(), realRegistry(), options(projectsDir));
    const dir = path.join(projectsDir, "2026", "demo-hair-salon");
    expect(result.projectDir).toBe(dir);
    for (const folder of ["brief", "analysis", "workflow", "rich-menu", "spreadsheet", "gas/src", "gas/tests", "qa", "delivery"]) {
      expect(fs.statSync(path.join(dir, folder)).isDirectory(), folder).toBe(true);
    }
    for (const artifact of ARTIFACTS.filter((a) => !a.endsWith("/"))) expect(fs.existsSync(path.join(dir, artifact)), artifact).toBe(true);
    for (const rel of GENERATED_GAS_FILES) expect(fs.existsSync(path.join(dir, "gas", rel)), rel).toBe(true);
    expect(fs.existsSync(path.join(dir, "gas/src/actions/createReservation.ts"))).toBe(true);
    expect(result.qa!.result).toBe("PASS");
  });

  it("copies only the modules the selected workflows need", () => {
    const projectsDir = tempDir("projects");
    const registry = registryWith((dir) =>
      writeJson(dir, "rich-menu/menus/info-only-v1.json", {
        kind: "rich-menu",
        id: "info-only-v1",
        version: "1.0.0",
        description: "test menu: inquiry + access + hours",
        industries: ["hair_salon"],
        layout: "compact-1x3-v1",
        chatBarText: "メニュー",
        items: [
          { slot: "a", label: "お問い合わせ", role: "primary", icon: "chat", action: { type: "workflow", workflowId: "inquiry-basic-v1", entry: "default" } },
          { slot: "b", label: "アクセス", role: "secondary", icon: "map-pin", action: { type: "workflow", workflowId: "business-info-v1", entry: "access" } },
          { slot: "c", label: "営業時間", role: "secondary", icon: "clock", action: { type: "workflow", workflowId: "business-info-v1", entry: "hours" } },
        ],
      }),
    );
    const brief = hairSalonBrief();
    brief.overrides = { workflows: ["inquiry-basic-v1", "business-info-v1"], richMenu: "info-only-v1" };
    const result = createProject(brief, registry, options(projectsDir));
    expect(result.qa!.result).toBe("PASS");
    const gasFiles = listFiles(path.join(result.projectDir!, "gas"));
    expect(gasFiles).toContain("src/actions/createInquiry.ts");
    expect(gasFiles).not.toContain("src/actions/createReservation.ts");
    expect(gasFiles).not.toContain("src/services/availability.ts");
    const schema = JSON.parse(fs.readFileSync(path.join(result.projectDir!, "spreadsheet/schema.json"), "utf8"));
    expect(schema.sheets.map((s: { name: string }) => s.name)).toEqual(["CONFIG", "CUSTOMERS", "INQUIRIES"]);
  });

  it("refuses a workflow override that the chosen rich menu cannot serve", () => {
    const projectsDir = tempDir("projects");
    const brief = hairSalonBrief();
    brief.overrides = { workflows: ["inquiry-basic-v1", "business-info-v1"], richMenu: "salon-basic-v1" };
    // salon-basic-v1 needs all four workflows, so this must be refused before anything is written.
    const refused = createProject(brief, realRegistry(), options(projectsDir));
    expect(refused.qa).toBeUndefined();
    expect(fs.existsSync(path.join(projectsDir, "2026"))).toBe(false);
  });

  it("does not overwrite an existing project without --force, nor unrelated directories", () => {
    const projectsDir = tempDir("projects");
    const registry = realRegistry();
    createProject(hairSalonBrief(), registry, options(projectsDir));
    expect(() => createProject(hairSalonBrief(), registry, options(projectsDir))).toThrow(ProjectWriteError);

    const unrelated = path.join(projectsDir, "2026", "demo-restaurant");
    fs.mkdirSync(unrelated, { recursive: true });
    fs.writeFileSync(path.join(unrelated, "notes.txt"), "client notes");
    expect(() => createProject(restaurantBrief(), registry, options(projectsDir, { force: true }))).toThrow(/not a factory project/);
    expect(fs.readFileSync(path.join(unrelated, "notes.txt"), "utf8")).toBe("client notes");
  });

  it("regenerates with --force without touching hand-added files or other client projects", () => {
    const projectsDir = tempDir("projects");
    const registry = realRegistry();
    createProject(restaurantBrief(), registry, options(projectsDir));
    const salon = createProject(hairSalonBrief(), registry, options(projectsDir));
    const restaurantDir = path.join(projectsDir, "2026", "demo-restaurant");
    const before = listFiles(restaurantDir).map((f) => [f, fs.readFileSync(path.join(restaurantDir, f), "utf8")]);

    // deployment-history.json is written by `line-deploy --live`, never by generation.
    fs.writeFileSync(path.join(salon.projectDir!, "line/deployment-history.json"), '{"entries":["live record"]}');
    const again = createProject(hairSalonBrief(), registry, options(projectsDir, { force: true }));
    expect(again.removed).toEqual([]);
    expect(fs.readFileSync(path.join(salon.projectDir!, "line/deployment-history.json"), "utf8")).toBe('{"entries":["live record"]}');
    expect(listFiles(restaurantDir).map((f) => [f, fs.readFileSync(path.join(restaurantDir, f), "utf8")])).toEqual(before);
  });

  it("refuses an invalid brief before writing anything", () => {
    const projectsDir = tempDir("projects");
    const result = createProject({ ...hairSalonBrief(), project: { slug: "../escape", clientName: "x", year: 2026 } }, realRegistry(), options(projectsDir));
    expect(result.issues[0]).toMatchObject({ rule: "BRIEF_INVALID" });
    expect(fs.readdirSync(projectsDir)).toEqual([]);
  });
});
