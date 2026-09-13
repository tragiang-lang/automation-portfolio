/**
 * Client-side image compression (Task 10). Isolates the two real
 * browser-only steps (decode via FileReader+Image, re-encode via canvas)
 * behind a small `BrowserImageOps` interface so the actual compression
 * *policy* (target dimensions, quality, output format) stays pure and
 * deterministically testable without a real canvas — jsdom has no native
 * canvas backend (`getContext("2d")` returns `null` there), so anything
 * exercising the real canvas path could never run under Jest anyway.
 *
 * Compression policy (client-side UX/optimization only — not a GAS
 * contract; `docs/site-report-architecture-overview.md`'s Task 10 section
 * records the contract inspection that found GAS enforces no dimension/
 * quality/format rule at all):
 *   - long edge capped at DEFAULT_MAX_DIMENSION px, aspect ratio preserved
 *   - re-encoded as DEFAULT_OUTPUT_MIME_TYPE (JPEG) at DEFAULT_QUALITY,
 *     regardless of the original format — GAS's `SubmitReportPhotoInput`/
 *     `uploadReportPhoto()` accept any `mimeType` string (`Utilities.
 *     newBlob` just uses whatever is given), so this is a valid, always-
 *     compatible choice, not a contract violation. Transparency (e.g. an
 *     original PNG) is lost on re-encode — an accepted trade-off for a
 *     photo-of-a-jobsite use case, not an oversight.
 */

export const DEFAULT_MAX_DIMENSION = 1600;
export const DEFAULT_QUALITY = 0.8;
export const DEFAULT_OUTPUT_MIME_TYPE = "image/jpeg";

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Pure — scales `source` down so its longest side is at most
 *  `maxDimension`, preserving aspect ratio. Returns the same values
 *  unchanged when it already fits (including exactly at the limit). */
export function calculateTargetDimensions(source: ImageDimensions, maxDimension: number): ImageDimensions {
  const longestSide = Math.max(source.width, source.height);
  if (longestSide <= maxDimension) {
    return { width: source.width, height: source.height };
  }
  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

/** Pure — splits a `data:<mime>;base64,<data>` URL into its parts. Throws
 *  for anything else, since `drawAndExport`'s real implementation
 *  (`HTMLCanvasElement.toDataURL`) only ever produces this shape. */
export function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Expected a base64 data URL");
  }
  return { mimeType: match[1], base64Data: match[2] };
}

/** Pure — the decoded byte length of a base64 string (accounts for `=`
 *  padding); used as `ReportDraftPhoto.size`, a client-side-only hint. */
export function estimateBase64ByteSize(base64Data: string): number {
  const paddingMatch = /=*$/.exec(base64Data);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

/**
 * The only browser-specific surface in this file (FileReader/Image/
 * canvas) — real callers use `defaultBrowserImageOps`; tests inject a
 * fake so the compression *policy* above can be verified deterministically
 * without a real canvas (Task 10 §7: "keep browser-specific code thin and
 * isolate it from pure validation/state logic").
 */
export interface BrowserImageOps {
  readAsDataUrl(file: File): Promise<string>;
  loadImage(dataUrl: string): Promise<ImageDimensions>;
  drawAndExport(dataUrl: string, width: number, height: number, mimeType: string, quality: number): Promise<string>;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read the selected file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Failed to decode the selected image"));
    image.src = dataUrl;
  });
}

function drawAndExport(
  dataUrl: string,
  width: number,
  height: number,
  mimeType: string,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas 2D rendering is not supported"));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL(mimeType, quality));
    };
    image.onerror = () => reject(new Error("Failed to decode the selected image"));
    image.src = dataUrl;
  });
}

/** Real browser implementation — not unit-tested directly, same
 *  convention `apps/site-report/gas/src/DriveStorage.ts` documents for
 *  its own thin `DriveApp` wrapper: this is thin enough that the tested
 *  logic (`compressPhotoFile`'s orchestration + the pure helpers above)
 *  carries the actual behavior, with this object mocked wholesale in
 *  tests that exercise it. */
export const defaultBrowserImageOps: BrowserImageOps = { readAsDataUrl, loadImage, drawAndExport };

export interface PhotoCompressionOptions {
  maxDimension?: number;
  quality?: number;
  outputMimeType?: string;
}

export interface CompressedPhoto {
  base64Data: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

/** Orchestrates decode -> resize decision -> re-encode for one file.
 *  Rejects (never throws synchronously) if any browser step fails — see
 *  `BrowserImageOps`'s real implementation's `onerror` handlers — so a
 *  caller can `.catch()` this into a per-file error message (Task 10 §7/
 *  §11) without one bad image crashing a whole selection batch. */
export async function compressPhotoFile(
  file: File,
  options: PhotoCompressionOptions = {},
  ops: BrowserImageOps = defaultBrowserImageOps,
): Promise<CompressedPhoto> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const outputMimeType = options.outputMimeType ?? DEFAULT_OUTPUT_MIME_TYPE;

  const originalDataUrl = await ops.readAsDataUrl(file);
  const originalDimensions = await ops.loadImage(originalDataUrl);
  const target = calculateTargetDimensions(originalDimensions, maxDimension);
  const outputDataUrl = await ops.drawAndExport(originalDataUrl, target.width, target.height, outputMimeType, quality);
  const { mimeType, base64Data } = parseDataUrl(outputDataUrl);

  return {
    base64Data,
    mimeType,
    size: estimateBase64ByteSize(base64Data),
    width: target.width,
    height: target.height,
  };
}
