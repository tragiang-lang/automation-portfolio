import {
  calculateTargetDimensions,
  compressPhotoFile,
  DEFAULT_OUTPUT_MIME_TYPE,
  DEFAULT_QUALITY,
  estimateBase64ByteSize,
  parseDataUrl,
  type BrowserImageOps,
} from "./photoCompression";

describe("calculateTargetDimensions", () => {
  it("leaves dimensions unchanged when already within the limit", () => {
    expect(calculateTargetDimensions({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("treats an image exactly at the limit as already fitting", () => {
    expect(calculateTargetDimensions({ width: 1600, height: 900 }, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("scales a landscape image down to fit, preserving aspect ratio", () => {
    expect(calculateTargetDimensions({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales a portrait image down to fit, preserving aspect ratio", () => {
    expect(calculateTargetDimensions({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 });
  });
});

describe("parseDataUrl", () => {
  it("splits a base64 data URL into its MIME type and payload", () => {
    expect(parseDataUrl("data:image/jpeg;base64,QUJD")).toEqual({ mimeType: "image/jpeg", base64Data: "QUJD" });
  });

  it("throws for a string that is not a base64 data URL", () => {
    expect(() => parseDataUrl("not-a-data-url")).toThrow();
  });
});

describe("estimateBase64ByteSize", () => {
  it("computes the decoded byte length with no padding", () => {
    expect(estimateBase64ByteSize("QUJD")).toBe(3); // "ABC"
  });

  it("accounts for '=' padding", () => {
    expect(estimateBase64ByteSize("QQ==")).toBe(1); // "A"
  });
});

function makeFakeOps(overrides: Partial<BrowserImageOps> = {}): BrowserImageOps {
  return {
    readAsDataUrl: jest.fn().mockResolvedValue("data:image/png;base64,ORIGINAL"),
    loadImage: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
    drawAndExport: jest.fn().mockResolvedValue("data:image/jpeg;base64,Q09NUFJFU1NFRA=="),
    ...overrides,
  };
}

describe("compressPhotoFile", () => {
  const file = new File(["fake-bytes"], "photo.png", { type: "image/png" });

  it("produces a base64 payload with no data: URI prefix (SubmitReportPhotoInput's wire format)", async () => {
    const ops = makeFakeOps();

    const result = await compressPhotoFile(file, {}, ops);

    expect(result.base64Data).toBe("Q09NUFJFU1NFRA==");
    expect(result.base64Data.startsWith("data:")).toBe(false);
  });

  it("outputs the default JPEG MIME type regardless of the original format", async () => {
    const ops = makeFakeOps();

    const result = await compressPhotoFile(file, {}, ops);

    expect(result.mimeType).toBe("image/jpeg");
  });

  it("passes dimensions unchanged to drawAndExport when already within the max dimension", async () => {
    const ops = makeFakeOps({ loadImage: jest.fn().mockResolvedValue({ width: 800, height: 600 }) });

    await compressPhotoFile(file, {}, ops);

    expect(ops.drawAndExport).toHaveBeenCalledWith(
      "data:image/png;base64,ORIGINAL",
      800,
      600,
      DEFAULT_OUTPUT_MIME_TYPE,
      DEFAULT_QUALITY,
    );
  });

  it("scales dimensions down before calling drawAndExport when the original exceeds the max dimension", async () => {
    const ops = makeFakeOps({ loadImage: jest.fn().mockResolvedValue({ width: 4000, height: 3000 }) });

    await compressPhotoFile(file, {}, ops);

    expect(ops.drawAndExport).toHaveBeenCalledWith(
      "data:image/png;base64,ORIGINAL",
      1600,
      1200,
      DEFAULT_OUTPUT_MIME_TYPE,
      DEFAULT_QUALITY,
    );
  });

  it("rejects cleanly when the browser fails to decode the image", async () => {
    const ops = makeFakeOps({ loadImage: jest.fn().mockRejectedValue(new Error("bad image")) });

    await expect(compressPhotoFile(file, {}, ops)).rejects.toThrow();
  });

  it("rejects cleanly when reading the file fails", async () => {
    const ops = makeFakeOps({ readAsDataUrl: jest.fn().mockRejectedValue(new Error("read failed")) });

    await expect(compressPhotoFile(file, {}, ops)).rejects.toThrow();
  });
});
