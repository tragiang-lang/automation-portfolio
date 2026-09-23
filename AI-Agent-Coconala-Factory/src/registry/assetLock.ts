import fs from "node:fs";
import path from "node:path";
import { hashFile, readJson, toStableJson, writeFile } from "../lib/fsx";
import { error, Issue, warning } from "../lib/issues";
import { SEMVER } from "../schemas/assets";
import { ASSET_LOCK_FILE, CoreAssetRegistry, GAS_MODULES_DIR } from "./registry";

/**
 * Immutability guard for released Core Assets (docs/decisions/0003).
 *
 * `core-assets/asset-lock.json` records the version and content hash of
 * every released asset file and every GAS module source file. `validate`
 * then fails if a locked file's content changed while its version stayed
 * the same, so an asset can never be edited silently under an existing
 * client project. Compatible changes bump MINOR/PATCH. Breaking changes
 * get a new `-v<N+1>` id / action major.
 */

interface LockEntry {
  version: string;
  sha256: string;
}

export interface AssetLock {
  kind: "asset-lock";
  note: string;
  assets: Record<string, LockEntry>;
}

/** Current version + hash of every lockable file, keyed by path relative to core-assets. */
export function currentEntries(registry: CoreAssetRegistry): Record<string, LockEntry> {
  const entries: Record<string, LockEntry> = {};
  const add = (file: string, version: string) => {
    entries[file] = { version, sha256: hashFile(path.join(registry.dir, file)) };
  };
  for (const map of [registry.actions, registry.workflows, registry.schemas, registry.layouts, registry.menus, registry.presets, registry.industries, registry.intentCatalogs, registry.qaRules]) {
    for (const loaded of map.values()) add(loaded.file, loaded.asset.version);
  }
  for (const module of registry.gasModules?.modules ?? []) {
    for (const file of [...module.files, ...module.tests]) {
      const rel = `${GAS_MODULES_DIR}/${file}`;
      if (fs.existsSync(path.join(registry.dir, rel))) add(rel, module.version);
    }
  }
  if (registry.gasModules) add(`${GAS_MODULES_DIR}/modules.json`, registry.gasModules.version);
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

export function readLock(dir: string): AssetLock | null {
  const file = path.join(dir, ASSET_LOCK_FILE);
  return fs.existsSync(file) ? readJson<AssetLock>(file) : null;
}

function compareSemver(a: string, b: string): number {
  const pa = SEMVER.exec(a)!.slice(1).map(Number);
  const pb = SEMVER.exec(b)!.slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

export function checkLock(registry: CoreAssetRegistry): Issue[] {
  const lock = readLock(registry.dir);
  const current = currentEntries(registry);
  if (!lock) {
    return [warning("ASSET_UNLOCKED", "no asset-lock.json yet. Run `factory lock-assets` to release the current assets")];
  }
  const issues: Issue[] = [];
  for (const [file, locked] of Object.entries(lock.assets)) {
    const now = current[file];
    if (!now) {
      issues.push(error("ASSET_REMOVED", `released asset was removed (released v${locked.version}); deprecate it instead of deleting`, file));
    } else if (now.sha256 !== locked.sha256 && compareSemver(now.version, locked.version) <= 0) {
      issues.push(error("ASSET_MUTATED", `content changed but version is still ${now.version}; bump MINOR/PATCH, or create a new -v<N> asset for breaking changes`, file));
    }
  }
  for (const file of Object.keys(current)) {
    if (!(file in lock.assets)) issues.push(warning("ASSET_UNLOCKED", "new asset not yet released (run `factory lock-assets`)", file));
  }
  return issues;
}

/** Adds new assets and version-bumped changes to the lock. Refuses when checkLock reports errors. */
export function updateLock(registry: CoreAssetRegistry): { added: string[]; updated: string[]; blocked: Issue[] } {
  const blocked = checkLock(registry).filter((issue) => issue.severity === "error");
  if (blocked.length > 0) return { added: [], updated: [], blocked };
  const lock = readLock(registry.dir) ?? {
    kind: "asset-lock" as const,
    note: "Released Core Assets. Do not edit by hand. Use `npm run factory -- lock-assets`.",
    assets: {},
  };
  const current = currentEntries(registry);
  const added: string[] = [];
  const updated: string[] = [];
  for (const [file, entry] of Object.entries(current)) {
    const locked = lock.assets[file];
    if (!locked) added.push(file);
    else if (locked.sha256 !== entry.sha256) updated.push(file);
    lock.assets[file] = entry;
  }
  lock.assets = Object.fromEntries(Object.entries(lock.assets).sort(([a], [b]) => a.localeCompare(b)));
  writeFile(path.join(registry.dir, ASSET_LOCK_FILE), toStableJson(lock));
  return { added, updated, blocked: [] };
}
