import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../src/agents/orchestrator";
import { CORE_ASSETS_DIR, hashBytes } from "../src/lib/fsx";
import { inspectImage } from "../src/richMenu/png";
import { Bounds, richMenuLayoutAsset, RichMenuLayoutAsset } from "../src/schemas/assets";
import { validateLayoutGeometry, validateMenuStructure } from "../src/validation/rules";
import { editJson, realRegistry, registryWith, restaurantBrief } from "./helpers";

/**
 * Contract for the four-button layout grid-2x2-v1.
 * `validateLayoutGeometry` covers bounds, overlap and duplicate ids; full
 * coverage is checked here: in-bounds + no overlap + slot areas summing to
 * the canvas area means the slots tile the canvas with no dead zone.
 */

type Slot = RichMenuLayoutAsset["slots"][number];

const registry = realRegistry();
const layout = (id: string) => registry.layouts.get(id)!.asset;
const slot = (id: string, x: number, y: number, width: number, height: number, emphasis: "hero" | "normal" = "normal"): Slot => ({ id, bounds: { x, y, width, height }, emphasis });
const area = (b: Bounds) => b.width * b.height;
const tilesCanvas = (size: { width: number; height: number }, slots: readonly Slot[]) =>
  validateLayoutGeometry(size, slots, "t").length === 0 && slots.reduce((sum, s) => sum + area(s.bounds), 0) === size.width * size.height;

const CONTRACTS: Record<string, Slot[]> = {
  "grid-2x2-v1": [slot("a", 0, 0, 1250, 843), slot("b", 1250, 0, 1250, 843), slot("c", 0, 843, 1250, 843), slot("d", 1250, 843, 1250, 843)],
};

describe.each(Object.keys(CONTRACTS))("layout %s", (id) => {
  it("loads from core-assets and matches the exact coordinate contract", () => {
    const l = layout(id);
    expect(l).toMatchObject({ kind: "rich-menu-layout", id, version: "1.0.0", size: { width: 2500, height: 1686 } });
    expect(l.slots).toEqual(CONTRACTS[id]);
  });

  it("validates with no geometry issues and tiles the whole canvas", () => {
    const l = layout(id);
    expect(validateLayoutGeometry(l.size, l.slots, id)).toEqual([]);
    for (const s of l.slots) for (const v of Object.values(s.bounds)) expect(Number.isInteger(v)).toBe(true);
    expect(l.slots.reduce((sum, s) => sum + area(s.bounds), 0)).toBe(2500 * 1686);
    expect(tilesCanvas(l.size, l.slots)).toBe(true);
  });

  it("has exactly four uniquely-named slots in deterministic row-major order", () => {
    const l = layout(id);
    expect(l.slots.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    const rowMajor = [...l.slots].sort((p, q) => p.bounds.y - q.bounds.y || p.bounds.x - q.bounds.x);
    expect(rowMajor.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    const raw = richMenuLayoutAsset.parse(JSON.parse(fs.readFileSync(path.join(CORE_ASSETS_DIR, "rich-menu/layouts", `${id}.json`), "utf8")));
    expect(raw.slots).toEqual(realRegistry().layouts.get(id)!.asset.slots);
  });
});

describe("grid-2x2-v1 contract", () => {
  it("splits the canvas exactly 1250 | 1250 and 843 / 843, all normal emphasis", () => {
    const [a, b, c, d] = layout("grid-2x2-v1").slots.map((s) => s.bounds);
    expect([a.width, b.width, c.width, d.width]).toEqual([1250, 1250, 1250, 1250]);
    expect(a.width + b.width).toBe(2500);
    expect(a.height + c.height).toBe(1686);
    expect(layout("grid-2x2-v1").slots.every((s) => s.emphasis === "normal")).toBe(true);
  });
});

describe("four-button layout negative cases", () => {
  const size = { width: 2500, height: 1686 };
  const grid = () => structuredClone(CONTRACTS["grid-2x2-v1"]);
  const messages = (slots: Slot[]) => validateLayoutGeometry(size, slots, "t").map((i) => i.message);

  it("rejects a slot outside the canvas", () => {
    const slots = grid();
    slots[3].bounds.x = 1251;
    expect(messages(slots)).toContain('slot "d" extends outside the 2500x1686 canvas');
    expect(tilesCanvas(size, slots)).toBe(false);
  });

  it("rejects overlapping slots", () => {
    const slots = grid();
    slots[1].bounds.x = 1249;
    slots[1].bounds.width = 1251;
    expect(messages(slots)).toContain('slots "a" and "b" overlap');
    expect(tilesCanvas(size, slots)).toBe(false);
  });

  it("rejects a duplicate slot id", () => {
    const slots = grid();
    slots[3].id = "c";
    expect(messages(slots)).toContain('slot "c" is defined twice');
  });

  it("rejects non-integer, negative and zero bounds at the schema level", () => {
    const asset = (edit: (s: Slot[]) => void) => {
      const slots = grid();
      edit(slots);
      return richMenuLayoutAsset.safeParse({ ...layout("grid-2x2-v1"), slots }).success;
    };
    expect(asset(() => undefined)).toBe(true);
    expect(asset((s) => (s[1].bounds.x = 0.5))).toBe(false);
    expect(asset((s) => (s[1].bounds.y = -1))).toBe(false);
    expect(asset((s) => (s[2].bounds.width = 0))).toBe(false);
    expect(asset((s) => (s[0].bounds.height = 842.5))).toBe(false);
  });

  it("detects missing coverage: a 1249px right column leaves one pixel column uncovered", () => {
    const slots = grid();
    slots[3].bounds.width = 1249;
    expect(messages(slots)).toEqual([]); // in bounds, no overlap: only the coverage invariant catches it
    expect(tilesCanvas(size, slots)).toBe(false);
  });
});

/**
 * Binds an existing four-button menu (restaurant-basic-v1, existing workflows
 * only) to each layout in a temp copy of core-assets. The real menu asset
 * is not changed.
 */
const onLayout = (layoutId: string) => registryWith((dir) => editJson(dir, "rich-menu/menus/restaurant-basic-v1.json", (m) => (m.layout = layoutId)));

describe.each(Object.keys(CONTRACTS))("menu bound to %s", (layoutId) => {
  const bound = onLayout(layoutId);
  const lookup = (id: string) => bound.workflows.get(id)?.asset;
  const menu = () => structuredClone(bound.menus.get("restaurant-basic-v1")!.asset);
  const run = () => runPipeline(restaurantBrief(), bound, { createdOn: "2026-09-23" });

  it("binds every slot exactly once to existing workflows with the unchanged menu schema", () => {
    expect(validateMenuStructure(menu(), bound.layouts.get(layoutId)!.asset, lookup, "t")).toEqual([]);
  });

  it("reports unknown, duplicated and missing slots and unknown workflows", () => {
    const m = menu();
    m.items[1].slot = "e";
    m.items[2].slot = "d";
    m.items[0].action = { type: "workflow", workflowId: "gallery-v1", entry: "default" };
    const text = validateMenuStructure(m, bound.layouts.get(layoutId)!.asset, lookup, "t").map((i) => i.message);
    expect(text.some((t) => /uses slot "e", which layout .* does not have/.test(t))).toBe(true);
    expect(text).toContain('slot "d" is used by more than one button');
    expect(text).toContain('layout slot "b" has no button');
    expect(text.some((t) => /unknown workflow "gallery-v1"/.test(t))).toBe(true);
  });

  it("renders with the existing renderer and tappable areas equal the layout contract", () => {
    const result = run();
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    const spec = JSON.parse(result.files["rich-menu/design-spec.json"]);
    const config = JSON.parse(result.files["rich-menu/menu-config.json"]);
    expect(spec.layout).toBe(layoutId);
    const bySlot = Object.fromEntries(CONTRACTS[layoutId].map((s) => [s.id, s]));
    spec.cells.forEach((cell: { slot: string; bounds: Bounds; emphasis: string }, i: number) => {
      expect(cell.bounds).toEqual(bySlot[cell.slot].bounds);
      expect(cell.emphasis).toBe(bySlot[cell.slot].emphasis);
      expect(config.areas[i].bounds).toEqual(cell.bounds);
    });
    expect(config.areas.reduce((sum: number, a: { bounds: Bounds }) => sum + area(a.bounds), 0)).toBe(2500 * 1686);
    expect(inspectImage(result.binaries["rich-menu/rich-menu.png"])).toMatchObject({ format: "png", width: 2500, height: 1686, opaque: true });
  });

  it("is deterministic: two runs give byte-identical files and PNG", () => {
    const a = run();
    const b = run();
    expect(Object.keys(a.files)).toEqual(Object.keys(b.files));
    for (const key of Object.keys(a.files)) expect(a.files[key], key).toBe(b.files[key]);
    expect(hashBytes(a.binaries["rich-menu/rich-menu.png"])).toBe(hashBytes(b.binaries["rich-menu/rich-menu.png"]));
  });
});
