import { buildRawConfigMap, parseSiteReportConfig } from "../src/ConfigParser";

describe("buildRawConfigMap", () => {
  it("trims keys and keeps values as-is", () => {
    const map = buildRawConfigMap([
      { Key: " BUSINESS_NAME ", Value: "Acme Construction" },
      { Key: "TIMEZONE", Value: "Asia/Tokyo" },
    ]);
    expect(map).toEqual({ BUSINESS_NAME: "Acme Construction", TIMEZONE: "Asia/Tokyo" });
  });

  it("first occurrence of a duplicate key wins (documented decision)", () => {
    const map = buildRawConfigMap([
      { Key: "ADMIN_EMAIL", Value: "first@example.com" },
      { Key: "ADMIN_EMAIL", Value: "second@example.com" },
    ]);
    expect(map.ADMIN_EMAIL).toBe("first@example.com");
  });

  it("ignores rows with an empty key", () => {
    expect(buildRawConfigMap([{ Key: "", Value: "ignored" }])).toEqual({});
  });
});

function validRawConfig(): Record<string, unknown> {
  return {
    BUSINESS_NAME: "Acme Construction",
    ADMIN_EMAIL: "admin@example.com",
    DRIVE_ROOT_FOLDER_ID: "1AbCdEf",
    TIMEZONE: "Asia/Tokyo",
  };
}

describe("parseSiteReportConfig", () => {
  it("builds a valid SiteReportConfig from a fully-populated raw map", () => {
    const result = parseSiteReportConfig(validRawConfig());
    expect(result).toEqual({
      ok: true,
      config: {
        businessName: "Acme Construction",
        adminEmail: "admin@example.com",
        driveRootFolderId: "1AbCdEf",
        timezone: "Asia/Tokyo",
      },
    });
  });

  it("silently ignores an unrecognized key (documented decision)", () => {
    const result = parseSiteReportConfig({ ...validRawConfig(), SOME_FUTURE_KEY: "x" });
    expect(result.ok).toBe(true);
  });

  it("reports a missing required key as an issue", () => {
    const raw = validRawConfig();
    delete raw.ADMIN_EMAIL;
    const result = parseSiteReportConfig(raw);
    expect(result).toEqual({
      ok: false,
      issues: [{ field: "ADMIN_EMAIL", reason: "missing or empty string" }],
    });
  });

  it("reports a present-but-empty required value as an issue", () => {
    const result = parseSiteReportConfig({ ...validRawConfig(), TIMEZONE: "   " });
    expect(result).toEqual({
      ok: false,
      issues: [{ field: "TIMEZONE", reason: "missing or empty string" }],
    });
  });

  it("collects every missing/empty field as a separate issue", () => {
    const result = parseSiteReportConfig({ BUSINESS_NAME: "Acme Construction" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((i) => i.field).sort()).toEqual(
        ["ADMIN_EMAIL", "DRIVE_ROOT_FOLDER_ID", "TIMEZONE"].sort(),
      );
    }
  });
});
