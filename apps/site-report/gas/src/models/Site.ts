/** Construction site master record (site-report MVP). Independent from
 *  any salon domain type. */
export interface Site {
  siteId: string;
  siteCode: string;
  name: string;
  address?: string;
  clientName?: string;
  status: "ACTIVE" | "INACTIVE";
  /** Optional project schedule bounds — legitimately empty for a site with
   *  no fixed start/end (e.g. ongoing maintenance contract). */
  startDate?: string;
  endDate?: string;
  /** Application-generated audit timestamps (ISO 8601), set on
   *  create/update — always present once persisted. */
  createdAt: string;
  updatedAt: string;
}
