import { generatePhotoId, generateRandomSuffix, generateReportId } from "../src/ids/ReportId";

describe("generateRandomSuffix", () => {
  it("uses the injected random source deterministically", () => {
    const values = [0, 0.5, 0.999];
    let i = 0;
    const random = () => values[i++ % values.length];
    expect(generateRandomSuffix(random, 3)).toBe(generateRandomSuffix(random, 3));
  });

  it("defaults to a 10-character alphanumeric suffix", () => {
    const suffix = generateRandomSuffix();
    expect(suffix).toMatch(/^[A-Z0-9]{10}$/);
  });
});

describe("generateReportId", () => {
  it("is prefixed with RPT and includes the timestamp and a random suffix", () => {
    const now = new Date("2026-09-12T03:04:05.000Z");
    const id = generateReportId(now, () => 0.42);
    expect(id.startsWith(`RPT-${now.getTime()}-`)).toBe(true);
  });

  it("is deterministic given the same now/random inputs", () => {
    const now = new Date("2026-09-12T03:04:05.000Z");
    const random = () => 0.1;
    expect(generateReportId(now, random)).toBe(generateReportId(now, random));
  });

  it("never collides for two calls with different random output", () => {
    const now = new Date("2026-09-12T03:04:05.000Z");
    let i = 0;
    const random = () => [0.1, 0.9][i++];
    const first = generateReportId(now, random);
    const second = generateReportId(now, random);
    expect(first).not.toBe(second);
  });
});

describe("generatePhotoId", () => {
  it("is prefixed with PHO", () => {
    const now = new Date("2026-09-12T03:04:05.000Z");
    expect(generatePhotoId(now, () => 0.5).startsWith("PHO-")).toBe(true);
  });
});
