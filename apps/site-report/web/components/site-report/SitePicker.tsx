import type { Site } from "@/types/api";
import styles from "./site-report.module.css";

/**
 * Mobile-friendly site picker (Task 8 §8). Renders only fields that
 * actually exist on `Site` (`types/api.ts`) — `address` is shown when
 * present, nothing is invented for a site that lacks it. Selecting a
 * site hands the caller the full `Site` object, never a partial/
 * reconstructed one.
 */
export function SitePicker({
  sites,
  onSelect,
}: {
  sites: Site[];
  onSelect: (site: Site) => void;
}) {
  return (
    <ul className={styles.siteList}>
      {sites.map((site) => (
        <li key={site.siteId}>
          <button
            type="button"
            className={styles.siteItem}
            onClick={() => onSelect(site)}
            aria-label={`${site.name} ${site.siteCode}`}
          >
            <span className={styles.siteName}>{site.name}</span>
            <span className={styles.siteMeta}>{site.siteCode}</span>
            {site.address ? <span className={styles.siteMeta}>{site.address}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
