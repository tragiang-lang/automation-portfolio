import type { ReportDraftPhoto } from "./reportDraft";
import styles from "./site-report.module.css";

/**
 * Read-only preview + remove control for `ReportDraft.photos` (Task 10
 * §12/§13). Fully controlled — `photos` is owned by the caller
 * (`ReportEntryShell`, ultimately `SiteReportScreen`'s draft state); this
 * component holds no photo state of its own and never mutates `photos`
 * in place. Keyed by `ReportDraftPhoto.id` (Task 10 §15), never by array
 * index, so React identity survives a removal in the middle of the list.
 *
 * `onRemove` is optional (Phase 3): when omitted, the 削除 button is not
 * rendered at all — used by `ReportConfirmation.tsx` to reuse this exact
 * thumbnail rendering in a genuinely read-only context, rather than
 * rendering a remove control that does nothing.
 */
export function PhotoPreviewList({
  photos,
  onRemove,
}: {
  photos: ReportDraftPhoto[];
  onRemove?: (photoId: string) => void;
}) {
  if (photos.length === 0) {
    return <p className={styles.hint}>まだ写真が追加されていません。</p>;
  }

  return (
    <ul className={styles.photoList}>
      {photos.map((photo) => (
        <li key={photo.id} className={styles.photoItem}>
          <img src={photo.previewUrl} alt={`写真プレビュー: ${photo.fileName}`} className={styles.photoThumbnail} />
          {onRemove ? (
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => onRemove(photo.id)}
              aria-label={`写真を削除: ${photo.fileName}`}
            >
              削除
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
