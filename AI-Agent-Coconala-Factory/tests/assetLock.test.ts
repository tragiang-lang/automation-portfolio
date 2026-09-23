import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkLock, updateLock } from "../src/registry/assetLock";
import { CoreAssetRegistry } from "../src/registry/registry";
import { editJson, registryWith } from "./helpers";

describe("asset lock (versioned, immutable Core Assets)", () => {
  it("blocks silent edits to a released asset", () => {
    const registry = registryWith((dir) => fs.rmSync(path.join(dir, "asset-lock.json"), { force: true }));
    expect(updateLock(registry).blocked).toEqual([]);

    editJson(registry.dir, "workflows/inquiry/inquiry-basic-v1.json", (w) => (w.description = "changed without a version bump"));
    const issues = checkLock(CoreAssetRegistry.load(registry.dir));
    expect(issues).toContainEqual(expect.objectContaining({ rule: "ASSET_MUTATED", where: "workflows/inquiry/inquiry-basic-v1.json" }));
    expect(updateLock(CoreAssetRegistry.load(registry.dir)).blocked.length).toBeGreaterThan(0);
  });

  it("accepts the same edit once the version is bumped, and flags new assets as unreleased", () => {
    const registry = registryWith((dir) => fs.rmSync(path.join(dir, "asset-lock.json"), { force: true }));
    updateLock(registry);
    editJson(registry.dir, "workflows/inquiry/inquiry-basic-v1.json", (w) => {
      w.description = "clarified wording";
      w.version = "1.0.1";
    });
    fs.copyFileSync(path.join(registry.dir, "design-presets/minimal-modern-v1.json"), path.join(registry.dir, "design-presets/copy.json"));
    editJson(registry.dir, "design-presets/copy.json", (p) => (p.id = "minimal-modern-v2") && (p.version = "2.0.0"));
    const reloaded = CoreAssetRegistry.load(registry.dir);
    const issues = checkLock(reloaded);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues).toContainEqual(expect.objectContaining({ rule: "ASSET_UNLOCKED", where: "design-presets/copy.json" }));
    expect(updateLock(reloaded)).toMatchObject({ updated: ["workflows/inquiry/inquiry-basic-v1.json"], added: ["design-presets/copy.json"] });
  });

  it("treats deleting a released asset as an error", () => {
    const registry = registryWith((dir) => fs.rmSync(path.join(dir, "asset-lock.json"), { force: true }));
    updateLock(registry);
    fs.rmSync(path.join(registry.dir, "rich-menu/layouts/compact-1x3-v1.json"));
    expect(checkLock(CoreAssetRegistry.load(registry.dir))).toContainEqual(expect.objectContaining({ rule: "ASSET_REMOVED" }));
  });
});
