/**
 * Client-side-only photo selection guard (Task 10). Contract inspection
 * (`apps/site-report/gas/src/models/SubmitReportInput.ts` +
 * `SubmitReportService.parseSubmitReportInput`) found: GAS treats
 * `mimeType` as an opaque required non-empty string — no MIME allowlist,
 * no per-photo size limit, no maximum photo count exists anywhere in the
 * actual contract (`photos` is documented as "zero or more ... no maximum
 * is enforced ... do not invent arbitrary limits"). Everything in this
 * file is therefore a client-side UX/optimization decision, not a
 * mirrored server rule — documented as such rather than presented as a
 * GAS requirement. See `docs/site-report-architecture-overview.md`
 * (Task 10) for the full inspection notes.
 */

/** Formats this app lets a worker pick — every one a browser can decode
 *  for client-side compression (`photoCompression.ts`) and that Google
 *  Drive can serve back as a viewable image. Not exhaustive of what GAS
 *  would accept (GAS accepts any string) — a deliberately conservative
 *  default, not a re-implementation of a server rule. */
export const ACCEPTED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AcceptedPhotoMimeType = (typeof ACCEPTED_PHOTO_MIME_TYPES)[number];

function isAcceptedMimeType(mimeType: unknown): mimeType is AcceptedPhotoMimeType {
  return typeof mimeType === "string" && (ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Client-side guard only — GAS enforces no per-photo size limit (Task 10
 *  contract inspection). This exists purely to stop an unreasonably large
 *  original file (e.g. an uncompressed high-resolution camera capture)
 *  from being fed into the canvas-based compressor in
 *  `photoCompression.ts`, which decodes the whole image into memory
 *  before it can shrink it — a client-side perf/memory guard, not a
 *  server contract. */
export const MAX_ORIGINAL_PHOTO_SIZE_BYTES = 15 * 1024 * 1024;

/** The minimal shape validation needs — a real `File` satisfies this
 *  structurally, and tests can pass a plain object without constructing
 *  one. */
export interface PhotoFileLike {
  name: string;
  type: string;
  size: number;
}

export type PhotoValidationResult = { ok: true } | { ok: false; reason: string };

export function validatePhotoFile(file: PhotoFileLike): PhotoValidationResult {
  if (!isAcceptedMimeType(file.type)) {
    return { ok: false, reason: `対応していないファイル形式です: ${file.name}` };
  }
  if (file.size > MAX_ORIGINAL_PHOTO_SIZE_BYTES) {
    return { ok: false, reason: `ファイルサイズが大きすぎます: ${file.name}` };
  }
  return { ok: true };
}
