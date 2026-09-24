import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../src/agents/orchestrator";
import { hashBytes } from "../src/lib/fsx";
import { inspectImage } from "../src/richMenu/png";
import { layoutTile, localRenderer, richMenuSvg } from "../src/richMenu/renderer";
import { hairSalonBrief, realEstateBrief, realRegistry, restaurantBrief } from "./helpers";

const registry = realRegistry();
const briefs = { hair_salon: hairSalonBrief(), restaurant: restaurantBrief(), real_estate: realEstateBrief() };
const generate = (brief: ReturnType<typeof hairSalonBrief>) => runPipeline(brief, registry, { createdOn: "2026-09-23" });

/** Minimal RGBA PNG encoder for fixtures (filter 0 on every row). */
function rgbaPng(width: number, height: number, alpha: number): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, "ascii");
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), body])), 0);
    return Buffer.concat([head, body, tail]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw.set([255, 255, 255, alpha], y * (width * 4 + 1) + 1 + x * 4);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new Uint8Array(Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

describe("Rich Menu renderer", () => {
  it.each(Object.entries(briefs))("renders a LINE-valid, opaque PNG for %s", (_industry, brief) => {
    const result = generate(brief);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    const png = result.binaries["rich-menu/rich-menu.png"];
    const info = inspectImage(png);
    const record = JSON.parse(result.files["rich-menu/image.json"]);
    expect(info).toMatchObject({ format: "png", width: 2500, height: 1686, opaque: true });
    expect(png.length).toBeLessThanOrEqual(1024 * 1024);
    expect(record).toMatchObject({ width: 2500, height: 1686, bytes: png.length, sha256: hashBytes(png), contentType: "image/png" });
    expect(record.renderer).toMatchObject({ id: "local-svg-resvg", version: "1.0.0" });
  });

  it("is deterministic: same spec and renderer give byte-identical PNG and SVG", () => {
    const spec = JSON.parse(generate(realEstateBrief()).files["rich-menu/design-spec.json"]);
    const a = localRenderer.render(spec);
    const b = localRenderer.render(spec);
    expect(hashBytes(a.png)).toBe(hashBytes(b.png));
    expect(a.svg).toBe(b.svg);
  });

  it("draws every tile inside the same bounds LINE uses as its tappable area", () => {
    for (const brief of Object.values(briefs)) {
      const { files } = generate(brief);
      const spec = JSON.parse(files["rich-menu/design-spec.json"]);
      const menu = JSON.parse(files["rich-menu/menu-config.json"]);
      const layout = registry.layouts.get(spec.layout)!.asset;
      spec.cells.forEach((cell: { slot: string; bounds: object; label: string }, i: number) => {
        expect(cell.bounds).toEqual(layout.slots.find((s) => s.id === cell.slot)!.bounds);
        expect(menu.areas[i].bounds).toEqual(cell.bounds);
        const tile = layoutTile(cell as never, spec);
        const b = cell.bounds as { x: number; y: number; width: number; height: number };
        expect(tile.inner.x).toBeGreaterThanOrEqual(b.x);
        expect(tile.inner.x + tile.inner.width).toBeLessThanOrEqual(b.x + b.width);
        expect(tile.inner.y + tile.inner.height).toBeLessThanOrEqual(b.y + b.height);
        expect(tile.labelSize).toBeGreaterThanOrEqual(spec.typography.minLabelPx);
      });
      expect(files["rich-menu/preview.svg"]).toContain(`id="slot-${spec.cells[0].slot}"`);
    }
  });

  it("changing a layout slot moves both the drawn tile and the tappable area", () => {
    const spec = JSON.parse(generate(realEstateBrief()).files["rich-menu/design-spec.json"]);
    const moved = { ...spec, cells: spec.cells.map((c: { bounds: object }, i: number) => (i === 0 ? { ...c, bounds: { x: 0, y: 0, width: 1666, height: 843 } } : c)) };
    expect(richMenuSvg(moved).svg).not.toBe(richMenuSvg(spec).svg);
    expect(hashBytes(localRenderer.render(moved).png)).not.toBe(hashBytes(localRenderer.render(spec).png));
  });

  it("reports a label that cannot fit at the preset minimum size, and an unknown icon", () => {
    const spec = JSON.parse(generate(realEstateBrief()).files["rich-menu/design-spec.json"]);
    spec.cells[0] = { ...spec.cells[0], label: "とても長いボタンの名前です", icon: { name: "rocket", style: "x" } };
    const { issues } = richMenuSvg(spec);
    expect(issues.some((i) => i.rule === "LINE_IMAGE_READABLE" && i.severity === "error" && /only fits at/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.severity === "warning" && /icon "rocket"/.test(i.message))).toBe(true);
  });

  it("escapes label text for the SVG", () => {
    const spec = JSON.parse(generate(hairSalonBrief()).files["rich-menu/design-spec.json"]);
    spec.cells[0].label = "A&B<C>";
    expect(richMenuSvg(spec).svg).toContain("A&amp;B&lt;C&gt;");
  });
});

describe("PNG inspector", () => {
  it("detects transparency, dimensions and non-image files", () => {
    expect(inspectImage(rgbaPng(4, 2, 255))).toMatchObject({ format: "png", width: 4, height: 2, opaque: true });
    expect(inspectImage(rgbaPng(4, 2, 0))).toMatchObject({ opaque: false });
    expect(inspectImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).format).toBe("jpeg");
    expect(inspectImage(new TextEncoder().encode("not an image")).format).toBe("unknown");
  });
});
