import { generateSubmissionId } from "./id";

describe("generateSubmissionId", () => {
  it("returns a non-empty string", () => {
    expect(generateSubmissionId().length).toBeGreaterThan(0);
  });

  it("returns a different value on each call", () => {
    const a = generateSubmissionId();
    const b = generateSubmissionId();
    expect(a).not.toBe(b);
  });
});
