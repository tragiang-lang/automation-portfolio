import { ConfigRow } from "../src/SheetSchemas";
import { buildSiteReportConfigFromRawRows, SiteReportConfigError } from "../src/ConfigStore";

function validConfigRows(): ConfigRow[] {
  return [
    { Key: "BUSINESS_NAME", Value: "Acme Construction" },
    { Key: "ADMIN_EMAIL", Value: "admin@example.com" },
    { Key: "DRIVE_ROOT_FOLDER_ID", Value: "1AbCdEf" },
    { Key: "TIMEZONE", Value: "Asia/Tokyo" },
  ];
}

describe("buildSiteReportConfigFromRawRows", () => {
  it("builds a valid SiteReportConfig from valid rows", () => {
    const config = buildSiteReportConfigFromRawRows(validConfigRows());
    expect(config).toEqual({
      businessName: "Acme Construction",
      adminEmail: "admin@example.com",
      driveRootFolderId: "1AbCdEf",
      timezone: "Asia/Tokyo",
    });
  });

  it("throws SiteReportConfigError when a required key is missing", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "TIMEZONE");
    expect(() => buildSiteReportConfigFromRawRows(rows)).toThrow(SiteReportConfigError);
  });

  it("SiteReportConfigError carries the field issues for server-side logging", () => {
    const rows = validConfigRows().filter((row) => row.Key !== "TIMEZONE");
    try {
      buildSiteReportConfigFromRawRows(rows);
      throw new Error("expected buildSiteReportConfigFromRawRows to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SiteReportConfigError);
      expect((error as SiteReportConfigError).issues).toContainEqual({
        field: "TIMEZONE",
        reason: "missing or empty string",
      });
    }
  });

  it("throws when a required value is present but empty", () => {
    const rows = validConfigRows().map((row) => (row.Key === "ADMIN_EMAIL" ? { ...row, Value: "   " } : row));
    expect(() => buildSiteReportConfigFromRawRows(rows)).toThrow(SiteReportConfigError);
  });

  it("first occurrence of a duplicate CONFIG row wins", () => {
    const rows = [...validConfigRows(), { Key: "BUSINESS_NAME", Value: "Different Name" }];
    const config = buildSiteReportConfigFromRawRows(rows);
    expect(config.businessName).toBe("Acme Construction");
  });

  it("ignores an unrecognized CONFIG key", () => {
    const rows = [...validConfigRows(), { Key: "SOME_FUTURE_KEY", Value: "x" } as unknown as ConfigRow];
    expect(() => buildSiteReportConfigFromRawRows(rows)).not.toThrow();
  });
});
