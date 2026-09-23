import { describe, expect, it } from "vitest";
import { workflowAsset } from "../src/schemas/assets";
import { validateAssets } from "../src/validation/validateAssets";
import { editJson, realRegistry, registryWith } from "./helpers";

const rules = (issues: { rule: string; severity: string }[]) => issues.filter((i) => i.severity === "error").map((i) => i.rule);

describe("Core Assets as shipped", () => {
  it("validate without errors", () => {
    expect(rules(validateAssets(realRegistry()))).toEqual([]);
  });
});

describe("workflow schema", () => {
  const valid = {
    kind: "workflow",
    id: "demo-flow-v1",
    version: "1.2.0",
    name: "Demo",
    description: "demo",
    status: "stable",
    industries: ["*"],
    trigger: "LINE_RICH_MENU",
    actions: ["createInquiry@1"],
    entries: { default: { type: "postback", action: "createInquiry@1", mode: "awaitText", prompt: "?" } },
    spreadsheet: { schemas: ["core-config-v1"], requiredSheets: ["CONFIG"] },
  };

  it("accepts a valid workflow", () => {
    expect(workflowAsset.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid workflow (unpinned action ref, missing fields)", () => {
    const result = workflowAsset.safeParse({ ...valid, actions: ["createInquiry"], trigger: undefined });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path.join("."))).toEqual(expect.arrayContaining(["actions.0", "trigger"]));
  });

  it("rejects a version whose major does not match the id", () => {
    const result = workflowAsset.safeParse({ ...valid, version: "2.0.0" });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toMatch(/does not match id major v1/);
    expect(workflowAsset.safeParse({ ...valid, version: "1.0" }).success).toBe(false);
  });

  it("detects a missing action", () => {
    const registry = registryWith((dir) => editJson(dir, "workflows/inquiry/inquiry-basic-v1.json", (w) => w.actions.push("doesNotExist@1")));
    const issues = validateAssets(registry).filter((i) => i.rule === "WF_ACTIONS_EXIST");
    expect(issues.map((i) => i.message).join()).toMatch(/doesNotExist@1/);
  });

  it("detects a missing spreadsheet schema", () => {
    const registry = registryWith((dir) => editJson(dir, "workflows/menu/service-menu-v1.json", (w) => (w.spreadsheet.schemas = ["core-config-v1", "menu-items-v9"])));
    const messages = validateAssets(registry).filter((i) => i.severity === "error").map((i) => i.message);
    expect(messages).toContain('spreadsheet schema "menu-items-v9" does not exist');
    expect(messages.join()).toMatch(/required sheet SERVICES is not provided/);
  });

  it("detects a stable workflow that depends on a planned action", () => {
    const registry = registryWith((dir) => editJson(dir, "workflows/reservation/reservation-basic-v1.json", (w) => w.actions.push("cancelReservation@1")));
    expect(validateAssets(registry).some((i) => /stable workflow uses planned action "cancelReservation@1"/.test(i.message))).toBe(true);
  });
});

describe("Action Registry", () => {
  it("resolves a known, pinned action", () => {
    const action = realRegistry().resolveAction("createInquiry@1");
    expect(action).toMatchObject({ id: "createInquiry", status: "available", gas: { module: "inquiry" } });
    expect(action!.input.message).toMatchObject({ type: "string", required: true });
  });

  it("does not resolve unknown or unpinned actions", () => {
    const registry = realRegistry();
    expect(registry.resolveAction("deleteEverything@1")).toBeUndefined();
    expect(registry.resolveAction("createInquiry")).toBeUndefined();
    expect(registry.resolveAction("createInquiry@2")).toBeUndefined();
  });

  it("rejects an invalid input schema", () => {
    const registry = registryWith((dir) => editJson(dir, "actions/createInquiry/v1.json", (a) => (a.input.message.type = "text-ish")));
    const issues = registry.loadIssues.filter((i) => i.rule === "ASSET_SCHEMA");
    expect(issues[0]).toMatchObject({ where: "actions/createInquiry/v1.json" });
    expect(issues[0].message).toMatch(/^input\.message\.type/);
    expect(registry.resolveAction("createInquiry@1")).toBeUndefined();
  });

  it("rejects an action wired to a LINE entry without LINE exposure", () => {
    const registry = registryWith((dir) => editJson(dir, "actions/getServiceList/v1.json", (a) => (a.exposure = ["api"])));
    expect(validateAssets(registry).some((i) => /not LINE-enabled/.test(i.message))).toBe(true);
  });
});

describe("spreadsheet schema rules", () => {
  it("detects duplicate columns, bad keys, bad defaults and dangling references", () => {
    const registry = registryWith((dir) =>
      editJson(dir, "spreadsheet-schemas/inquiries-basic-v1.json", (s) => {
        const sheet = s.sheets[0];
        sheet.columns.push({ ...sheet.columns[1] });
        sheet.indexes.push("nope");
        sheet.columns.find((c: { name: string }) => c.name === "status").default = "UNKNOWN";
        sheet.columns.find((c: { name: string }) => c.name === "customerId").references = "CUSTOMERS.missingColumn";
      }),
    );
    const found = rules(validateAssets(registry));
    expect(found).toEqual(expect.arrayContaining(["SS_DUPLICATE_COLUMNS", "SS_KEYS_AND_REFERENCES", "SS_COLUMNS_VALID"]));
  });

  it("forbids two schemas defining the same sheet", () => {
    const registry = registryWith((dir) => editJson(dir, "spreadsheet-schemas/services-basic-v1.json", (s) => (s.sheets[0].name = "CUSTOMERS")));
    expect(rules(validateAssets(registry))).toContain("SS_DUPLICATE_SHEETS");
  });
});
