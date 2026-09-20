import { DEFAULT_GALLERY_VARIANT, GALLERY_VARIANTS } from "./gallery-variants";

describe("GALLERY_VARIANTS", () => {
  it("lists exactly the 3 required variants, in the order they were introduced", () => {
    expect(GALLERY_VARIANTS).toEqual(["grid", "masonry", "feature-editorial"]);
  });
});

describe("DEFAULT_GALLERY_VARIANT", () => {
  it("is grid — the preserved/backward-compatible composition", () => {
    expect(DEFAULT_GALLERY_VARIANT).toBe("grid");
  });

  it("is one of the registered GALLERY_VARIANTS", () => {
    expect(GALLERY_VARIANTS).toContain(DEFAULT_GALLERY_VARIANT);
  });
});
