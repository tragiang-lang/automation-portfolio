import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createProject } from "../src/project";
import { runQa, scanForSecrets } from "../src/qa/qaAgent";
import { editJson, factoryTempDir, hairSalonBrief, realRegistry, restaurantBrief, tempDir } from "./helpers";

let dir: string;
const registry = realRegistry();
const qa = () => runQa(dir, registry, { runGasChecks: false });
const failed = (report: ReturnType<typeof qa>) => report.checks.filter((c) => c.status === "fail").map((c) => c.rule);

beforeEach(() => {
  const projectsDir = tempDir("qa");
  dir = createProject(hairSalonBrief(), registry, { force: false, runGasChecks: false, projectsDir, today: "2026-09-23" }).projectDir!;
});

describe("QA Agent", () => {
  it("passes a freshly generated project", () => {
    const report = qa();
    expect(report.result).toBe("PASS");
    expect(report.checks.find((c) => c.rule === "GAS_TESTS_PASS")!.status).toBe("skipped");
    expect(fs.readFileSync(path.join(dir, "qa/QA_REPORT.md"), "utf8")).toMatch(/Result: PASS/);
  });

  it("detects an invalid workflow", () => {
    editJson(dir, "workflow/selected-workflows.json", (plan) => (plan.selected[1].id = "service-menu-v7"));
    const report = qa();
    expect(report.result).toBe("FAIL");
    expect(failed(report)).toContain("WF_EXISTS");
  });

  it("detects an invalid spreadsheet", () => {
    editJson(dir, "spreadsheet/schema.json", (schema) => {
      const inquiries = schema.sheets.find((s: { name: string }) => s.name === "INQUIRIES");
      inquiries.columns.push({ ...inquiries.columns[0] });
      schema.sheets = schema.sheets.filter((s: { name: string }) => s.name !== "SERVICES");
    });
    const rules = failed(qa());
    expect(rules).toEqual(expect.arrayContaining(["SS_DUPLICATE_COLUMNS", "SS_REQUIRED_SHEETS", "SS_KEYS_AND_REFERENCES"]));
  });

  it("detects an invalid Rich Menu reference", () => {
    editJson(dir, "rich-menu/menu-config.json", (menu) => (menu.areas[2].action.data = "wf=coupon-v1&e=default"));
    const report = qa();
    expect(failed(report)).toEqual(expect.arrayContaining(["RM_ACTIONS_VALID", "RM_REQUIRED_BUTTONS"]));
  });

  it("detects overlapping Rich Menu areas and oversized postback data", () => {
    editJson(dir, "rich-menu/menu-config.json", (menu) => {
      menu.areas[1].bounds.x = 500;
      menu.areas[1].action.data += `&pad=${"x".repeat(300)}`;
    });
    expect(failed(qa())).toEqual(expect.arrayContaining(["RM_LAYOUT_VALID", "RM_POSTBACK_LENGTH"]));
  });

  it("detects missing GAS files and broken imports", () => {
    fs.rmSync(path.join(dir, "gas/src/actions/createInquiry.ts"));
    fs.rmSync(path.join(dir, "gas/tests/generated.test.ts"));
    const report = qa();
    expect(failed(report)).toEqual(expect.arrayContaining(["GAS_FILES", "GAS_IMPORTS", "GAS_TESTS_EXIST"]));
  });

  it("detects committed secrets and secret files", () => {
    fs.writeFileSync(path.join(dir, "gas/.clasp.json"), '{"scriptId":"1abc"}');
    fs.appendFileSync(path.join(dir, "gas/src/generated/configSeed.ts"), '\nconst channelSecret = "8f4c2a91d0b7e6f5a3c2b1d0e9f8a7b6";\n');
    const messages = scanForSecrets(dir).map((i) => `${i.where}: ${i.message}`);
    expect(messages).toContain("gas/.clasp.json: gas/.clasp.json must not be in the project (per-environment secret file)");
    expect(messages.some((m) => /configSeed\.ts: possible hard-coded secret in "channelSecret"/.test(m))).toBe(true);
    expect(failed(qa())).toContain("SEC_NO_SECRETS");
  });

  it("detects a label color that fails contrast", () => {
    editJson(dir, "rich-menu/design-spec.json", (spec) => (spec.cells[0].labelColor = spec.cells[0].fill));
    expect(failed(qa())).toContain("DS_CONTRAST");
  });

  it("detects missing traceability", () => {
    editJson(dir, "spreadsheet/schema.json", (schema) => delete schema._meta.workflows);
    expect(failed(qa())).toContain("DEL_TRACEABILITY");
  });
});

describe("QA Agent with real GAS checks", () => {
  it("fails clearly when a project outside the factory has no toolchain installed", () => {
    const report = runQa(dir, registry, { runGasChecks: true });
    expect(report.checks.find((c) => c.rule === "GAS_TYPECHECK")).toMatchObject({ status: "fail", details: [expect.stringMatching(/npm install/)] });
  });

  it(
    "typechecks, tests and builds a generated restaurant GAS project",
    () => {
      const projectsDir = factoryTempDir("qa-gas");
      const result = createProject(restaurantBrief(), registry, { force: false, runGasChecks: true, projectsDir, today: "2026-09-23" });
      const gasChecks = result.qa!.checks.filter((c) => ["GAS_TYPECHECK", "GAS_TESTS_PASS", "GAS_BUILD"].includes(c.rule));
      expect(gasChecks.map((c) => [c.rule, c.status])).toEqual([
        ["GAS_TYPECHECK", "pass"],
        ["GAS_TESTS_PASS", "pass"],
        ["GAS_BUILD", "pass"],
      ]);
      expect(result.qa!.result).toBe("PASS");
      fs.rmSync(projectsDir, { recursive: true, force: true });
    },
    240_000,
  );
});
