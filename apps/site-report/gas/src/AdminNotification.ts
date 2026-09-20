import { Site } from "./models/Site";
import { SiteReport } from "./models/Report";
import { sendEmail } from "./Mail";

export interface AdminNotificationEmail {
  subject: string;
  body: string;
}

/** Pure email content builder (Task 5) — Jest-tested directly; Mail.ts's
 *  sendEmail carries the untested Gmail-touching call. Deliberately
 *  excludes anything sensitive (Task 5 §22/§39): no stack traces, no raw
 *  CONFIG values, no photo binary/base64 data — only the report fields
 *  useful to an administrator reviewing a submission. `comment` is
 *  included because it is the report's actual content (not "internal
 *  implementation detail"), but only when present. */
export function buildAdminNotificationEmail(report: SiteReport, site: Site): AdminNotificationEmail {
  const subject = `[Site Report] New report for ${site.name} (${site.siteCode})`;
  const lines = [
    `Report ID: ${report.reportId}`,
    `Site: ${site.name} (${site.siteCode})`,
    `Report date: ${report.reportDate}`,
    `Worker: ${report.workerName}`,
    `Work type: ${report.workTypeName ?? report.workType}`,
  ];
  if (report.progressStatus !== undefined) {
    lines.push(`Progress: ${report.progressStatusName ?? report.progressStatus}`);
  }
  lines.push(`Photos: ${report.photoCount}`);
  if (report.hasIssue === "YES" && report.issueDetail) {
    lines.push("", "Issue:", report.issueDetail);
  }
  if (report.comment) {
    lines.push("", "Comment:", report.comment);
  }
  return { subject, body: lines.join("\n") };
}

/** Thin: sends the admin notification for a submitted report. Not unit
 *  tested directly (touches Mail.ts's GmailApp wrapper) —
 *  buildAdminNotificationEmail above carries the tested content logic,
 *  and this function is mocked wholesale in SubmitReportService.test.ts. */
export function sendAdminNotification(adminEmail: string, report: SiteReport, site: Site): void {
  const { subject, body } = buildAdminNotificationEmail(report, site);
  sendEmail(adminEmail, subject, body);
}
