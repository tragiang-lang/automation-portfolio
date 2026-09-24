import { inflateSync } from "node:zlib";

/**
 * Minimal PNG/JPEG inspector for QA: format, dimensions, and whether a PNG
 * is fully opaque. LINE shows transparent pixels over the chat background,
 * so a rich menu image must not contain any.
 */

export interface ImageInfo {
  format: "png" | "jpeg" | "unknown";
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: number;
  /** PNG only: true when no pixel has alpha < 255. null when it could not be decoded. */
  opaque?: boolean | null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Bytes per pixel for 8-bit PNG color types. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(data: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    const prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const raw = data[src + x];
      const a = x >= bpp ? out[row + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0;
      const predictor = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
      out[row + x] = (raw + predictor) & 0xff;
    }
  }
  return out;
}

export function inspectImage(bytes: Uint8Array): ImageInfo {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { format: "jpeg" };
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return { format: "unknown" };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let info: ImageInfo = { format: "png" };
  const idat: Uint8Array[] = [];
  let transparencyChunk = false;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      info = { format: "png", width: view.getUint32(offset + 8), height: view.getUint32(offset + 12), bitDepth: body[8], colorType: body[9] };
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "tRNS") {
      transparencyChunk = true;
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  const { width, height, bitDepth, colorType } = info;
  if (!width || !height || colorType === undefined) return { ...info, opaque: null };
  if (colorType === 0 || colorType === 2 || colorType === 3) return { ...info, opaque: !transparencyChunk };
  if (bitDepth !== 8 || !(colorType in CHANNELS)) return { ...info, opaque: null };
  try {
    const bpp = CHANNELS[colorType];
    const pixels = unfilter(inflateSync(Buffer.concat(idat)), width, height, bpp);
    for (let i = bpp - 1; i < pixels.length; i += bpp) if (pixels[i] !== 255) return { ...info, opaque: false };
    return { ...info, opaque: true };
  } catch {
    return { ...info, opaque: null };
  }
}
