import { getContrastRatio } from "./contrastRatio";

describe("getContrastRatio", () => {
  it("returns 21 for pure black vs pure white (WCAG's maximum ratio)", () => {
    expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("returns 1 for a color against itself (no contrast)", () => {
    expect(getContrastRatio("#9c4b3f", "#9c4b3f")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a = getContrastRatio("#2b2622", "#faf7f2");
    const b = getContrastRatio("#faf7f2", "#2b2622");
    expect(a).toBeCloseTo(b, 10);
  });

  it("matches the W3C worked example: #767676 on #ffffff is ~4.54:1", () => {
    expect(getContrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
  });
});
