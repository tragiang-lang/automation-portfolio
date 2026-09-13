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
  it("includes the report ID, site, report date, worker, work type, and photo count", () => {
    const email = buildAdminNotificationEmail(report, site);
    expect(email.subject).toContain("Site A");
    expect(email.body).toContain("RPT-1");
    expect(email.body).toContain("Site A");
    expect(email.body).toContain("S001");
    expect(email.body).toContain("2026-09-12");
    expect(email.body).toContain("Taro");
    expect(email.body).toContain("wiring");
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
});
