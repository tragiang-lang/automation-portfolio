import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { DesignCell, DesignSpec } from "../agents/designAgent";
import { FACTORY_ROOT, hashBytes, hashText, readJson } from "../lib/fsx";
import { error, Issue, warning } from "../lib/issues";
import { FALLBACK_ICON, ICONS } from "./icons";

/**
 * Local Rich Menu renderer: design-spec.json → preview.svg → rich-menu.png.
 *
 * - The only input is the design spec. Tile bounds come from the layout
 *   asset through `spec.cells[].bounds`, the same bounds the LINE config
 *   generator writes into menu-config.json, so the drawn tiles and the
 *   tappable areas share one source of truth.
 * - Colors come from the spec too (the Design Agent decides them); this
 *   file only decides geometry inside a tile and the icon shapes.
 * - Deterministic: the SVG is a pure string function of the spec, and the
 *   rasterizer uses a pinned font file with system fonts disabled, so the
 *   same spec + renderer version gives byte-identical PNGs on any machine
 *   with the same dependency versions (package-lock).
 *
 * The renderer is one implementation of `RichMenuImageRenderer`. A design
 * tool adapter (e.g. Canva) could implement the same interface later; the
 * factory does not depend on one.
 */

export type RenderableSpec = Pick<DesignSpec, "canvas" | "colorTokens" | "typography" | "spacing" | "cells">;

export interface RenderedRichMenu {
  svg: string;
  png: Uint8Array;
  issues: Issue[];
}

export interface RichMenuImageRenderer {
  id: string;
  version: string;
  render(spec: RenderableSpec): RenderedRichMenu;
}

/** Bump when the drawing code changes (the PNG hash will change with it). */
export const RENDERER_VERSION = "1.0.0";
export const RENDERER_ID = "local-svg-resvg";

const FONT_DIR = path.join(FACTORY_ROOT, "node_modules", "@embedpdf", "fonts-jp", "fonts");
const FONT_FAMILY = "Noto Sans JP";
const FONT_FILES = ["NotoSansJP-Regular.otf", "NotoSansJP-Medium.otf", "NotoSansJP-Bold.otf"];
const WEIGHTS = { regular: 400, medium: 500, bold: 700 } as const;

function dependencyVersion(name: string): string {
  const file = path.join(FACTORY_ROOT, "node_modules", ...name.split("/"), "package.json");
  return fs.existsSync(file) ? readJson<{ version: string }>(file).version : "missing";
}

/** Everything that can change the PNG bytes. Recorded in image.json. */
export function rendererInfo() {
  return {
    id: RENDERER_ID,
    version: RENDERER_VERSION,
    rasterizer: `@resvg/resvg-js@${dependencyVersion("@resvg/resvg-js")}`,
    font: `${FONT_FAMILY} (@embedpdf/fonts-jp@${dependencyVersion("@embedpdf/fonts-jp")}, OFL-1.1)`,
  };
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Width of a label in em: full-width (Japanese) characters are 1em, ASCII about 0.6em. */
export function textWidthEm(text: string): number {
  let em = 0;
  for (const ch of text) em += ch === " " ? 0.3 : ch.charCodeAt(0) < 0x2e80 ? 0.6 : 1;
  return em;
}

export interface TileLayout {
  inner: { x: number; y: number; width: number; height: number };
  iconSize: number;
  iconX: number;
  iconY: number;
  labelSize: number;
  labelBaseline: number;
  subLabelSize: number;
  subLabelBaseline?: number;
  centerX: number;
}

/** Geometry inside one tile. Everything is an integer so the SVG stays stable. */
export function layoutTile(cell: DesignCell, spec: RenderableSpec): TileLayout {
  const inset = Math.round(spec.spacing.gutterPx / 2);
  const inner = { x: cell.bounds.x + inset, y: cell.bounds.y + inset, width: cell.bounds.width - 2 * inset, height: cell.bounds.height - 2 * inset };
  const padding = spec.spacing.tilePaddingPx;
  const usableWidth = inner.width - 2 * padding;
  const maxLabel = Math.round(Math.min(inner.height * 0.13, 120));
  const labelSize = Math.max(1, Math.min(maxLabel, Math.floor(usableWidth / textWidthEm(cell.label))));
  const subLabelSize = cell.subLabel ? Math.max(1, Math.min(Math.round(labelSize * 0.62), Math.floor(usableWidth / textWidthEm(cell.subLabel)))) : 0;
  const iconSize = Math.round(Math.min(inner.width, inner.height) * 0.28);
  const iconGap = Math.round(iconSize * 0.2);
  const subGap = Math.round(labelSize * 0.45);
  const total = iconSize + iconGap + labelSize + (cell.subLabel ? subGap + subLabelSize : 0);
  const top = inner.y + Math.round((inner.height - total) / 2);
  const centerX = inner.x + Math.round(inner.width / 2);
  const labelTop = top + iconSize + iconGap;
  return {
    inner,
    iconSize,
    iconX: centerX - Math.round(iconSize / 2),
    iconY: top,
    labelSize,
    // Noto Sans JP glyphs sit about 0.88em below the top of the line.
    labelBaseline: labelTop + Math.round(labelSize * 0.88),
    subLabelSize,
    subLabelBaseline: cell.subLabel ? labelTop + labelSize + subGap + Math.round(subLabelSize * 0.88) : undefined,
    centerX,
  };
}

export function richMenuSvg(spec: RenderableSpec): { svg: string; issues: Issue[] } {
  const issues: Issue[] = [];
  const { width, height } = spec.canvas;
  const weight = WEIGHTS[spec.typography.labelWeight as keyof typeof WEIGHTS] ?? 700;
  const radius = spec.spacing.cornerRadiusPx;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${spec.colorTokens.background}"/>`,
  ];
  for (const cell of spec.cells) {
    const t = layoutTile(cell, spec);
    if (t.labelSize < spec.typography.minLabelPx) {
      issues.push(error("LINE_IMAGE_READABLE", `"${cell.label}" only fits at ${t.labelSize}px; the preset minimum is ${spec.typography.minLabelPx}px (shorten the label)`, `slot ${cell.slot}`));
    }
    const icon = ICONS[cell.icon.name];
    if (!icon) issues.push(warning("LINE_IMAGE_READABLE", `icon "${cell.icon.name}" is not in the renderer icon library; a plain circle is drawn`, `slot ${cell.slot}`));
    const scale = t.iconSize / 24;
    parts.push(
      `<g id="slot-${cell.slot}">`,
      `<rect x="${t.inner.x}" y="${t.inner.y}" width="${t.inner.width}" height="${t.inner.height}" rx="${radius}" fill="${cell.fill}" stroke="${cell.borderColor}" stroke-width="2"/>`,
      `<g transform="translate(${t.iconX} ${t.iconY}) scale(${Math.round(scale * 1000) / 1000})" fill="none" stroke="${cell.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon ?? FALLBACK_ICON}</g>`,
      `<text x="${t.centerX}" y="${t.labelBaseline}" font-family="${FONT_FAMILY}" font-weight="${weight}" font-size="${t.labelSize}" fill="${cell.labelColor}" text-anchor="middle">${escapeXml(cell.label)}</text>`,
    );
    if (cell.subLabel && t.subLabelBaseline !== undefined) {
      parts.push(`<text x="${t.centerX}" y="${t.subLabelBaseline}" font-family="${FONT_FAMILY}" font-weight="400" font-size="${t.subLabelSize}" fill="${cell.subLabelColor}" text-anchor="middle">${escapeXml(cell.subLabel)}</text>`);
    }
    parts.push("</g>");
  }
  parts.push("</svg>", "");
  return { svg: parts.join("\n"), issues };
}

export function rasterize(svg: string, background: string): Uint8Array {
  const fontFiles = FONT_FILES.map((file) => path.join(FONT_DIR, file));
  const missing = fontFiles.filter((file) => !fs.existsSync(file));
  if (missing.length > 0) throw new Error(`rich menu font missing: ${missing.join(", ")} (run npm install)`);
  const resvg = new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
    background,
  });
  return new Uint8Array(resvg.render().asPng());
}

export const localRenderer: RichMenuImageRenderer = {
  id: RENDERER_ID,
  version: RENDERER_VERSION,
  render(spec) {
    const { svg, issues } = richMenuSvg(spec);
    return { svg, png: rasterize(svg, spec.colorTokens.background), issues };
  },
};

/** The rich-menu/image.json record: what was rendered, from what, by which renderer. */
export function imageRecord(rendered: RenderedRichMenu, spec: RenderableSpec) {
  return {
    file: "rich-menu/rich-menu.png",
    format: "png",
    contentType: "image/png",
    width: spec.canvas.width,
    height: spec.canvas.height,
    bytes: rendered.png.length,
    sha256: hashBytes(rendered.png),
    previewSvgSha256: hashText(rendered.svg),
    renderer: rendererInfo(),
  };
}
export type ImageRecord = ReturnType<typeof imageRecord>;
