/** 進捗状況 master-data record (Phase 2). Mirrors WorkType.ts exactly —
 *  same status/sortOrder convention, independent domain concept. */
export interface ProgressStatus {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}
