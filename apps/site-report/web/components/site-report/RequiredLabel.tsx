import type { ReactNode } from "react";
import styles from "./site-report.module.css";

/**
 * Shared required-field label (Phase 2 spec §13). A trailing `*` is
 * `aria-hidden` (purely decorative to a screen reader, which would
 * otherwise announce a bare asterisk) paired with a visually-hidden
 * "（必須）" span so the requirement is announced either way. Applied once
 * here instead of six one-off edits across ReportForm.tsx/SitePicker.tsx.
 */
export function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={styles.label}>
      {children}
      <span className={styles.requiredMarker} aria-hidden="true">
        {" "}
        *
      </span>
      <span className={styles.srOnly}>（必須）</span>
    </label>
  );
}
