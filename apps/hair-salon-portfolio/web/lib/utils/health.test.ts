import { getHealthStatus } from "./health";

describe("getHealthStatus", () => {
  it("reports ok status for this service", () => {
    const result = getHealthStatus();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("hair-salon-portfolio-web");
  });

  it("returns a valid ISO 8601 timestamp", () => {
    const result = getHealthStatus();

    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
