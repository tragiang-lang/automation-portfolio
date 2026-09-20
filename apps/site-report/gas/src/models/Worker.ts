/** LINE-linked field worker record (site-report MVP). Independent from
 *  any salon domain type. */
export interface Worker {
  workerId: string;
  lineUserId: string;
  displayName: string;
  email?: string;
  role?: string;
  status: "ACTIVE" | "INACTIVE";
  /** Application-generated audit timestamps (ISO 8601), set on
   *  create/update — always present once persisted. */
  createdAt: string;
  updatedAt: string;
}
