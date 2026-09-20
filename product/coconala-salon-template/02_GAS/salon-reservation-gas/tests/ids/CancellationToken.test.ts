import { generateCancellationToken } from "../../src/ids/CancellationToken";

describe("generateCancellationToken", () => {
  it("generates a 32-character alphanumeric token", () => {
    const token = generateCancellationToken();
    expect(token).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it("is deterministic given an injected random source", () => {
    const random = () => 0;
    expect(generateCancellationToken(random)).toBe(generateCancellationToken(random));
  });

  it("produces different tokens across default (Math.random) calls with overwhelming probability", () => {
    expect(generateCancellationToken()).not.toBe(generateCancellationToken());
  });
});
