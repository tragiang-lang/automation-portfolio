import { createPhotoId, processSelectedPhotoFiles } from "./photoPipeline";
import { MAX_ORIGINAL_PHOTO_SIZE_BYTES } from "./photoValidation";

function makeFile(name: string, type = "image/jpeg"): File {
  return new File(["x"], name, { type });
}

describe("createPhotoId", () => {
  it("returns a unique id on each call", () => {
    const first = createPhotoId();
    const second = createPhotoId();

    expect(first).not.toBe(second);
  });
});

describe("processSelectedPhotoFiles", () => {
  it("adds one valid photo", async () => {
    const compress = jest.fn().mockResolvedValue({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1 });

    const result = await processSelectedPhotoFiles([makeFile("a.jpg")], compress);

    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]).toMatchObject({ fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "QQ==" });
    expect(result.errors).toHaveLength(0);
  });

  it("adds multiple valid photos in selection order", async () => {
    const compress = jest
      .fn()
      .mockImplementation((file: File) =>
        Promise.resolve({ mimeType: "image/jpeg", base64Data: `DATA_${file.name}`, size: 1 }),
      );

    const result = await processSelectedPhotoFiles(
      [makeFile("a.jpg"), makeFile("b.jpg"), makeFile("c.jpg")],
      compress,
    );

    expect(result.photos.map((p) => p.fileName)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  it("preserves selection order even when compression resolves out of order", async () => {
    const resolvers: Record<string, () => void> = {};
    const compress = jest.fn().mockImplementation(
      (file: File) =>
        new Promise<{ mimeType: string; base64Data: string; size: number }>((resolve) => {
          resolvers[file.name] = () => resolve({ mimeType: "image/jpeg", base64Data: file.name, size: 1 });
        }),
    );

    const resultPromise = processSelectedPhotoFiles(
      [makeFile("a.jpg"), makeFile("b.jpg"), makeFile("c.jpg"), makeFile("d.jpg")],
      compress,
    );

    // Resolve deliberately out of selection order: D, C, A, B.
    resolvers["d.jpg"]();
    resolvers["c.jpg"]();
    resolvers["a.jpg"]();
    resolvers["b.jpg"]();

    const result = await resultPromise;

    expect(result.photos.map((p) => p.fileName)).toEqual(["a.jpg", "b.jpg", "c.jpg", "d.jpg"]);
  });

  it("rejects an unsupported MIME type without adding it to photos or calling compress", async () => {
    const compress = jest.fn();

    const result = await processSelectedPhotoFiles([makeFile("bad.pdf", "application/pdf")], compress);

    expect(result.photos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(compress).not.toHaveBeenCalled();
  });

  it("adds valid files and reports errors for invalid ones in a mixed selection", async () => {
    const compress = jest.fn().mockResolvedValue({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1 });

    const result = await processSelectedPhotoFiles(
      [makeFile("valid.jpg"), makeFile("invalid.pdf", "application/pdf"), makeFile("valid2.png", "image/png")],
      compress,
    );

    expect(result.photos.map((p) => p.fileName)).toEqual(["valid.jpg", "valid2.png"]);
    expect(result.errors).toHaveLength(1);
  });

  it("reports a compression failure as an error without discarding the rest of the batch", async () => {
    const compress = jest
      .fn()
      .mockResolvedValueOnce({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1 })
      .mockRejectedValueOnce(new Error("decode failed"));

    const result = await processSelectedPhotoFiles([makeFile("a.jpg"), makeFile("b.jpg")], compress);

    expect(result.photos.map((p) => p.fileName)).toEqual(["a.jpg"]);
    expect(result.errors).toHaveLength(1);
  });

  it("rejects an oversized file without calling compress (client-side size guard)", async () => {
    const compress = jest.fn();
    const oversized = new File([new Uint8Array(MAX_ORIGINAL_PHOTO_SIZE_BYTES + 1)], "big.jpg", {
      type: "image/jpeg",
    });

    const result = await processSelectedPhotoFiles([oversized], compress);

    expect(result.photos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(compress).not.toHaveBeenCalled();
  });
});
