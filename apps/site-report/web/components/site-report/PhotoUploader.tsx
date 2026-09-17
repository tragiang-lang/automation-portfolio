"use client";

import { useState } from "react";
import { ACCEPTED_PHOTO_MIME_TYPES } from "./photoValidation";
import { processSelectedPhotoFiles } from "./photoPipeline";
import type { ReportDraftPhoto } from "./reportDraft";
import styles from "./site-report.module.css";

const FILE_INPUT_ACCEPT = ACCEPTED_PHOTO_MIME_TYPES.join(",");

/**
 * File picker + validate/compress trigger for Task 10's photo pipeline. A
 * native `<input type="file" accept="..." multiple>` — no camera-specific
 * API, no `navigator.mediaDevices` (Task 10 §9). Reports only the
 * successfully processed photos to the caller via `onAddPhotos`; any
 * rejected files are shown as a local, readable error list and never
 * reach `ReportDraft.photos` (Task 10 §11). Holds no authoritative photo
 * state itself — `photos` live only in the caller's `ReportDraft` (Task
 * 10 §18), the `errors`/`isProcessing` state here is purely transient UI
 * feedback for the selection currently being processed.
 */
export function PhotoUploader({
  onAddPhotos,
}: {
  onAddPhotos: (photos: ReportDraftPhoto[]) => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Snapshot into a real array before resetting `.value` below —
    // `event.target.files` is a *live* FileList, so clearing `.value`
    // clears this same reference in place (real browsers only; not
    // reproduced by jsdom/Testing Library's `fireEvent.change`, which is
    // why this stayed invisible to the test suite). Reading it after the
    // reset always observed 0 files, silently no-oping every selection.
    const files = Array.from(event.target.files ?? []);
    // Reset immediately (not after processing) so selecting the exact
    // same file again still fires a change event (Task 10 §9 — a native
    // file input otherwise treats an identical selection as a no-op).
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    setIsProcessing(true);
    const { photos, errors: newErrors } = await processSelectedPhotoFiles(files);
    setIsProcessing(false);
    setErrors(newErrors);
    if (photos.length > 0) {
      onAddPhotos(photos);
    }
  };

  return (
    <div className={styles.field}>
      <label htmlFor="report-photo-input" className={styles.label}>
        写真を追加
      </label>
      <input
        id="report-photo-input"
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        onChange={handleChange}
        className={styles.input}
      />
      {isProcessing ? (
        <p role="status" className={styles.hint}>
          写真を処理しています...
        </p>
      ) : null}
      {errors.length > 0 ? (
        <ul role="alert" className={styles.fieldError}>
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
