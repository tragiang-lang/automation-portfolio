/** 作業種別 master-data record (Phase 1 P0). Independent from any salon
 *  domain type. */
export interface WorkType {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}
