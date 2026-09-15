import type { Site } from "@/types/api";
import { RequiredLabel } from "./RequiredLabel";
import styles from "./site-report.module.css";

/**
 * Mobile-friendly site dropdown (Phase 1 P0 — replaces the Task 8
 * button-list). A native `<select>`: one tap to open, one tap to choose,
 * standard mobile OS picker UI — no custom listbox to maintain. A leading
 * disabled placeholder option means no site is ever silently selected
 * without the user acting; `onSelect(site)` fires once, from `onChange`,
 * only for a real site option (never for the placeholder, whose `value`
 * is the empty string and is filtered out below).
 */
export function SitePicker({
  sites,
  onSelect,
}: {
  sites: Site[];
  onSelect: (site: Site) => void;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const site = sites.find((candidate) => candidate.siteId === event.target.value);
    if (site) {
      onSelect(site);
    }
  };

  return (
    <div className={styles.field}>
      <RequiredLabel htmlFor="site-picker">現場名</RequiredLabel>
      <select id="site-picker" className={styles.input} defaultValue="" onChange={handleChange}>
        <option value="" disabled>
          現場を選択してください
        </option>
        {sites.map((site) => (
          <option key={site.siteId} value={site.siteId}>
            {site.name}
          </option>
        ))}
      </select>
    </div>
  );
}
