import { getHealthStatus } from "../src/Health";

describe("getHealthStatus", () => {
  it("reports ok status for this service", () => {
    const result = getHealthStatus();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("site-report-gas");
  });

  it("returns a valid ISO 8601 timestamp", () => {
    const result = getHealthStatus();

    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
