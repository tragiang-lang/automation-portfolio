/**
 * Selection-batch orchestration for Task 10's photo pipeline: validate ->
 * compress -> assemble `ReportDraftPhoto`s, for a whole file selection at
 * once. Deliberately a plain async function, not a React hook/component —
 * `PhotoUploader.tsx` is the only caller, and keeping this here lets it be
 * unit-tested without rendering anything (Task 10 §7/§10/§11).
 */
import { compressPhotoFile } from "./photoCompression";
import { validatePhotoFile } from "./photoValidation";
import type { ReportDraftPhoto } from "./reportDraft";

let photoIdCounter = 0;

/** A small counter+timestamp id, unique within one page session — good
 *  enough as a React list key and a removal target (Task 10 §15). No UUID
 *  library was added for this, per Task 10's explicit scope rule. */
export function createPhotoId(): string {
  photoIdCounter += 1;
  return `photo-${Date.now()}-${photoIdCounter}`;
}

export interface ProcessSelectedPhotoFilesResult {
  /** Successfully validated+compressed photos, in the exact order the
   *  input file list was given — never reordered by which file's
   *  compression finishes first (Task 10 §10). */
  photos: ReportDraftPhoto[];
  /** One human-readable message per rejected file (invalid MIME/size, or
   *  a compression failure), in the same order. */
  errors: string[];
}

interface CompressResult {
  mimeType: string;
  base64Data: string;
  size: number;
}

/**
 * Validates and compresses every file in `files`, preserving selection
 * order in the result regardless of validation/compression timing. A
 * rejected or failed file never discards the rest of the batch (Task 10
 * §11) — it only contributes an entry to `errors`.
 */
export async function processSelectedPhotoFiles(
  files: File[],
  compress: (file: File) => Promise<CompressResult> = compressPhotoFile,
): Promise<ProcessSelectedPhotoFilesResult> {
  const outcomes = await Promise.all(
    files.map(async (file): Promise<{ photo: ReportDraftPhoto } | { error: string }> => {
      const validation = validatePhotoFile(file);
      if (!validation.ok) {
        return { error: validation.reason };
      }
      try {
        const compressed = await compress(file);
        return {
          photo: {
            id: createPhotoId(),
            fileName: file.name,
            mimeType: compressed.mimeType,
            base64Data: compressed.base64Data,
            size: compressed.size,
            previewUrl: `data:${compressed.mimeType};base64,${compressed.base64Data}`,
          },
        };
      } catch {
        return { error: `写真の処理に失敗しました: ${file.name}` };
      }
    }),
  );

  const photos: ReportDraftPhoto[] = [];
  const errors: string[] = [];
  for (const outcome of outcomes) {
    if ("photo" in outcome) {
      photos.push(outcome.photo);
    } else {
      errors.push(outcome.error);
    }
  }
  return { photos, errors };
}
