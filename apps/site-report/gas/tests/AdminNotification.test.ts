import { buildAdminNotificationEmail } from "../src/AdminNotification";
import { SiteReport } from "../src/models/Report";
import { Site } from "../src/models/Site";

const report: SiteReport = {
  reportId: "RPT-1",
  siteId: "STE-1",
  workerId: "WRK-1",
  lineUserId: "U123",
  workerName: "Taro",
  reportDate: "2026-09-12",
  workType: "wiring",
  comment: "All done, no issues.",
  photoCount: 2,
  status: "SUBMITTED",
  createdAt: "2026-09-12T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
  progressStatus: "DONE",
  progressStatusName: "完了",
  hasIssue: "NO",
};

const site: Site = {
  siteId: "STE-1",
  siteCode: "S001",
  name: "Site A",
  status: "ACTIVE",
  createdAt: "2026-09-12T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
};

describe("buildAdminNotificationEmail", () => {
  it("includes the report ID, site, report date, worker, work type, progress status, and photo count", () => {
    const email = buildAdminNotificationEmail(report, site);
    expect(email.subject).toContain("Site A");
    expect(email.body).toContain("RPT-1");
    expect(email.body).toContain("Site A");
    expect(email.body).toContain("S001");
    expect(email.body).toContain("2026-09-12");
    expect(email.body).toContain("Taro");
    expect(email.body).toContain("wiring");
    expect(email.body).toContain("Progress: 完了");
    expect(email.body).toContain("2");
  });

  it("includes the comment when present", () => {
    const email = buildAdminNotificationEmail(report, site);
    expect(email.body).toContain("All done, no issues.");
  });

  it("omits a comment section when there is no comment", () => {
    const email = buildAdminNotificationEmail({ ...report, comment: undefined }, site);
    expect(email.body).not.toContain("Comment:");
  });

  it("never includes anything resembling base64 photo content", () => {
    const email = buildAdminNotificationEmail(report, site);
    expect(email.body).not.toMatch(/base64/i);
  });

  it("shows workTypeName instead of the raw workType code when present", () => {
    const email = buildAdminNotificationEmail({ ...report, workType: "EXTERIOR_WALL", workTypeName: "外壁工事" }, site);
    expect(email.body).toContain("Work type: 外壁工事");
    expect(email.body).not.toContain("EXTERIOR_WALL");
  });

  it("falls back to the raw workType code when workTypeName is absent", () => {
    const email = buildAdminNotificationEmail({ ...report, workType: "legacy free text", workTypeName: undefined }, site);
    expect(email.body).toContain("Work type: legacy free text");
  });

  it("falls back to the raw progressStatus code when progressStatusName is absent", () => {
    const email = buildAdminNotificationEmail({ ...report, progressStatus: "legacy-code", progressStatusName: undefined }, site);
    expect(email.body).toContain("Progress: legacy-code");
  });

  it("includes an Issue section when hasIssue is YES", () => {
    const email = buildAdminNotificationEmail({ ...report, hasIssue: "YES", issueDetail: "足場が不足しています" }, site);
    expect(email.body).toContain("Issue:");
    expect(email.body).toContain("足場が不足しています");
  });

  it("omits the Issue section when hasIssue is NO", () => {
    const email = buildAdminNotificationEmail({ ...report, hasIssue: "NO", issueDetail: undefined }, site);
    expect(email.body).not.toContain("Issue:");
  });

  it("omits the Issue section when hasIssue is undefined (pre-Phase-2 report shape)", () => {
    const email = buildAdminNotificationEmail({ ...report, hasIssue: undefined, issueDetail: undefined }, site);
    expect(email.body).not.toContain("Issue:");
  });
});
