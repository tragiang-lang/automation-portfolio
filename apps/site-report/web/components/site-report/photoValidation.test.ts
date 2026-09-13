import { ACCEPTED_PHOTO_MIME_TYPES, MAX_ORIGINAL_PHOTO_SIZE_BYTES, validatePhotoFile } from "./photoValidation";

function makeFile(overrides: Partial<{ name: string; type: string; size: number }> = {}) {
  return { name: "photo.jpg", type: "image/jpeg", size: 1024, ...overrides };
}

describe("validatePhotoFile — MIME validation", () => {
  it("accepts every documented accepted MIME type", () => {
    for (const mimeType of ACCEPTED_PHOTO_MIME_TYPES) {
      expect(validatePhotoFile(makeFile({ type: mimeType }))).toEqual({ ok: true });
    }
  });

  it("rejects an unsupported image MIME type", () => {
    expect(validatePhotoFile(makeFile({ type: "image/heic" })).ok).toBe(false);
  });

  it("rejects a non-image file", () => {
    expect(validatePhotoFile(makeFile({ type: "application/pdf", name: "report.pdf" })).ok).toBe(false);
  });

  it("safely rejects an empty MIME type instead of throwing", () => {
    expect(() => validatePhotoFile(makeFile({ type: "" }))).not.toThrow();
    expect(validatePhotoFile(makeFile({ type: "" })).ok).toBe(false);
  });

  it("safely rejects an undefined MIME type instead of throwing", () => {
    const file = makeFile();
    // Simulates a runtime value TypeScript's `string` type wouldn't allow
    // statically (e.g. a File-like object built by hand elsewhere).
    (file as { type: unknown }).type = undefined;

    expect(() => validatePhotoFile(file)).not.toThrow();
    expect(validatePhotoFile(file).ok).toBe(false);
  });
});

describe("validatePhotoFile — size validation (client-side guard only, no GAS limit exists)", () => {
  it("accepts a file below the size guard", () => {
    expect(validatePhotoFile(makeFile({ size: MAX_ORIGINAL_PHOTO_SIZE_BYTES - 1 })).ok).toBe(true);
  });

  it("accepts a file exactly at the size guard", () => {
    expect(validatePhotoFile(makeFile({ size: MAX_ORIGINAL_PHOTO_SIZE_BYTES })).ok).toBe(true);
  });

  it("rejects a file above the size guard", () => {
    expect(validatePhotoFile(makeFile({ size: MAX_ORIGINAL_PHOTO_SIZE_BYTES + 1 })).ok).toBe(false);
  });
});
