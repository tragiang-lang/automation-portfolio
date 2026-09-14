/** A submitted site report (site-report MVP). `status` is a literal
 *  union of one because Task 1 establishes only the shape a submitted
 *  report has; no other status is produced by any workflow yet.
 *  Independent from any salon domain type. */
export interface SiteReport {
  reportId: string;
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photoCount: number;
  status: "SUBMITTED";
  createdAt: string;
  updatedAt: string;
  /** Phase 1 P0: Japanese label resolved from WORK_TYPES at submission
   *  time — see SubmitReportService.submitReport. */
  workTypeName?: string;
}
