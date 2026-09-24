import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FACTORY_ROOT } from "../src/lib/fsx";
import { createProject } from "../src/project";
import { runLineQa, scanLineSecrets } from "../src/qa/lineQa";
import { scanForSecrets } from "../src/qa/qaAgent";
import { editJson, realEstateBrief, realRegistry, tempDir } from "./helpers";

let dir: string;
const registry = realRegistry();
const qa = () => runLineQa(dir, registry, { runChecks: false });
const failed = (report: ReturnType<typeof qa>) => report.checks.filter((c) => c.status === "fail").map((c) => c.rule);
const status = (report: ReturnType<typeof qa>, rule: string) => report.checks.find((c) => c.rule === rule)!.status;

beforeEach(() => {
  dir = createProject(realEstateBrief(), registry, { force: false, runGasChecks: false, projectsDir: tempDir("line-qa"), today: "2026-09-23" }).projectDir!;
});

describe("LINE QA", () => {
  it("passes a freshly generated project and reports levels honestly", () => {
    const report = qa();
    expect(failed(report)).toEqual([]);
    expect(report.result).toBe("PASS");
    expect(report.levels.map((l) => [l.level, l.status])).toEqual([
      [1, "PASS"],
      [2, "NOT RUN"],
      [3, "NOT RUN"],
      [4, "NOT RUN"],
    ]);
    expect(status(report, "LINE_LIVE_SMOKE")).toBe("skipped");
    expect(fs.readFileSync(path.join(dir, "qa/LINE_QA_REPORT.md"), "utf8")).toMatch(/Result: PASS/);
  });

  it("detects a missing or replaced rich menu image", () => {
    fs.rmSync(path.join(dir, "rich-menu/rich-menu.png"));
    expect(failed(qa())).toContain("LINE_IMAGE_EXISTS");
  });

  it("detects an image LINE would reject and one that no longer matches its record", () => {
    fs.writeFileSync(path.join(dir, "rich-menu/rich-menu.png"), "GIF89a not a png");
    expect(failed(qa())).toEqual(expect.arrayContaining(["LINE_IMAGE_EXISTS", "LINE_IMAGE_FORMAT", "LINE_DETERMINISTIC_IMAGE"]));
  });

  it("detects a tappable area that no longer matches the drawn tile", () => {
    editJson(dir, "rich-menu/menu-config.json", (menu) => (menu.areas[0].bounds.width = 1000));
    expect(failed(qa())).toEqual(expect.arrayContaining(["LINE_IMAGE_MATCHES_CONFIG", "LINE_DEPLOYMENT_CONFIG"]));
  });

  it("detects an area outside the image", () => {
    editJson(dir, "rich-menu/menu-config.json", (menu) => (menu.areas[5].bounds.y = 1600));
    expect(failed(qa())).toContain("LINE_IMAGE_MATCHES_CONFIG");
  });

  it("detects a design spec edited after rendering (non-reproducible image)", () => {
    editJson(dir, "rich-menu/design-spec.json", (spec) => (spec.cells[1].fill = "#FFFFFE"));
    expect(failed(qa())).toContain("LINE_DETERMINISTIC_IMAGE");
  });

  it("detects unreadable sub-labels and icons", () => {
    editJson(dir, "rich-menu/design-spec.json", (spec) => {
      spec.cells[1].subLabelColor = spec.cells[1].fill;
      spec.cells[2].iconColor = "#FEFEFE";
    });
    expect(failed(qa())).toContain("LINE_IMAGE_READABLE");
  });

  it("detects invalid LINE actions", () => {
    editJson(dir, "rich-menu/menu-config.json", (menu) => {
      menu.areas[1].action.type = "camera";
      menu.areas[2].action.uri = "http://example.com/insecure";
      menu.areas[3].action.label = "あ".repeat(21);
    });
    expect(failed(qa())).toContain("LINE_ACTIONS_VALID");
  });

  it("detects a broken button → workflow → action → GAS chain", () => {
    const routes = path.join(dir, "gas/src/generated/routes.ts");
    fs.writeFileSync(routes, fs.readFileSync(routes, "utf8").replace('"entry": "hours"', '"entry": "opening"'));
    fs.rmSync(path.join(dir, "gas/src/actions/createInquiry.ts"));
    const report = qa();
    const details = report.checks.find((c) => c.rule === "LINE_WORKFLOW_REFERENCES")!.details.join("\n");
    expect(details).toMatch(/no webhook route for business-info-v1#hours/);
    expect(details).toMatch(/GAS handler gas\/src\/actions\/createInquiry\.ts is missing/);
  });

  it("detects server-issued ids in the generated deployment definition", () => {
    editJson(dir, "line/deployment.json", (d) => (d.richMenu.name = `richmenu-${"a".repeat(32)}`));
    expect(failed(qa())).toContain("LINE_DEPLOYMENT_CONFIG");
  });

  it("detects secrets and Worker secret files anywhere in the project", () => {
    fs.writeFileSync(path.join(dir, "line/webhook/.dev.vars"), "LINE_CHANNEL_SECRET=x\n");
    fs.appendFileSync(path.join(dir, "delivery/LINE_SETUP.md"), `\nLINE_CHANNEL_SECRET = "${"0123456789abcdef".repeat(2)}"\n`);
    fs.appendFileSync(path.join(dir, "line/README.md"), `\nhttps://script.google.com/macros/s/${"A".repeat(40)}/exec?key=abc\n`);
    const details = qa().checks.find((c) => c.rule === "LINE_SECRET_SCAN")!.details.join("\n");
    expect(details).toMatch(/\.dev\.vars holds Worker secrets/);
    expect(details).toMatch(/possible LINE channel secret value \(delivery\/LINE_SETUP\.md\)/);
    expect(details).toMatch(/GAS web app URL with its key \(line\/README\.md\)/);
  });

  it("detects a proxy that differs from the released asset or declares secrets as vars", () => {
    fs.appendFileSync(path.join(dir, "line/webhook/src/worker.ts"), "\n// patched\n");
    fs.appendFileSync(path.join(dir, "line/webhook/wrangler.toml.example"), "[vars]\nGAS_WEBHOOK_KEY = \"x\"\n");
    const details = qa().checks.find((c) => c.rule === "LINE_PROXY_CONFIG")!.details.join("\n");
    expect(details).toMatch(/src\/worker\.ts differs from the released proxy/);
    expect(details).toMatch(/sets a secret as a plain variable/);
  });

  it("detects a GAS webhook that no longer requires the internal key", () => {
    const dispatch = path.join(dir, "gas/src/router/dispatch.ts");
    fs.writeFileSync(dispatch, fs.readFileSync(dispatch, "utf8").replace("isAuthorizedWebhook(queryKey, deps.webhookKey)", "true"));
    expect(failed(qa())).toContain("LINE_WEBHOOK_CONFIG");
  });

  it("reports Level 4 only when a live smoke test result exists, and never fails on NOT RUN", () => {
    fs.writeFileSync(path.join(dir, "line/smoke-test-result.json"), JSON.stringify({ ranAt: "2026-09-23T00:00:00.000Z", environment: "test", result: "FAIL", automated: [] }));
    const report = qa();
    expect(status(report, "LINE_LIVE_SMOKE")).toBe("warn");
    expect(report.levels[3]).toMatchObject({ level: 4, status: "FAIL" });
    expect(report.result).toBe("PASS");
  });

  it("finds no secrets in the factory's own core assets, templates, docs and client projects", () => {
    for (const folder of ["core-assets", "templates", "docs", "projects"]) {
      const found = [...scanForSecrets(path.join(FACTORY_ROOT, folder)), ...scanLineSecrets(path.join(FACTORY_ROOT, folder))].filter((i) => i.severity === "error");
      expect(found, folder).toEqual([]);
    }
  });

  it("fails Level 2 when the GAS test run failed", () => {
    const report = runLineQa(dir, registry, { runChecks: false, gasTests: { ran: true, passed: false } });
    expect(failed(report)).toContain("LINE_RUNTIME_TESTS");
  });
});
