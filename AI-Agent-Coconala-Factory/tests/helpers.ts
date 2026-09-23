import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CORE_ASSETS_DIR, FACTORY_ROOT, readJson } from "../src/lib/fsx";
import { CoreAssetRegistry } from "../src/registry/registry";
import { ClientBrief, clientBrief } from "../src/schemas/brief";

/** A throwaway directory inside the factory (gitignored .tmp/), where generated GAS projects can resolve the factory toolchain. */
export function factoryTempDir(prefix: string): string {
  fs.mkdirSync(path.join(FACTORY_ROOT, ".tmp"), { recursive: true });
  return fs.mkdtempSync(path.join(FACTORY_ROOT, ".tmp", `${prefix}-`));
}

/** A throwaway directory under the OS temp dir. */
export function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `factory-${prefix}-`));
}

/**
 * Copies core-assets (without node_modules) to a temp dir, lets the test
 * mutate JSON files, and loads a registry from the copy. The real Core
 * Assets are never modified by tests.
 */
export function registryWith(mutate: (dir: string) => void = () => undefined): CoreAssetRegistry {
  const dir = tempDir("assets");
  fs.cpSync(CORE_ASSETS_DIR, dir, { recursive: true, filter: (src) => !src.includes("node_modules") });
  mutate(dir);
  return CoreAssetRegistry.load(dir);
}

export function editJson(dir: string, rel: string, edit: (json: any) => void): void {
  const file = path.join(dir, rel);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  edit(json);
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

export function writeJson(dir: string, rel: string, json: unknown): void {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), `${JSON.stringify(json, null, 2)}\n`);
}

export function hairSalonBrief(): ClientBrief {
  return clientBrief.parse(readJson(path.join(FACTORY_ROOT, "templates/briefs/hair-salon.example.json")));
}

export function restaurantBrief(): ClientBrief {
  return clientBrief.parse(readJson(path.join(FACTORY_ROOT, "templates/briefs/restaurant.example.json")));
}

export function realEstateBrief(): ClientBrief {
  return clientBrief.parse(readJson(path.join(FACTORY_ROOT, "templates/briefs/real-estate.example.json")));
}

export const realRegistry = () => CoreAssetRegistry.load();
