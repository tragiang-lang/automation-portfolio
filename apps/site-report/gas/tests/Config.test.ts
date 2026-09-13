import { SITE_REPORT_CONFIG_KEYS, SiteReportConfig } from "../src/Config";

describe("SITE_REPORT_CONFIG_KEYS", () => {
  it("defines exactly the four keys required by the config layer", () => {
    expect(Object.values(SITE_REPORT_CONFIG_KEYS).sort()).toEqual(
      ["ADMIN_EMAIL", "BUSINESS_NAME", "DRIVE_ROOT_FOLDER_ID", "TIMEZONE"].sort(),
    );
  });

  it("SiteReportConfig accepts a fully-populated value", () => {
    const config: SiteReportConfig = {
      businessName: "Acme Construction",
      adminEmail: "admin@example.com",
      driveRootFolderId: "1AbCdEf",
      timezone: "Asia/Tokyo",
    };
    expect(config.timezone).toBe("Asia/Tokyo");
  });
});
