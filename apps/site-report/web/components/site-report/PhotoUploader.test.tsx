import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PhotoUploader } from "./PhotoUploader";
import * as photoCompression from "./photoCompression";

// The real compressor uses FileReader/Image/canvas — jsdom has no native
// canvas backend, so `getContext("2d")` would return null there. Mocking
// keeps this test deterministic and focused on PhotoUploader's own
// selection/validation/error-display behavior (Task 10 §7).
jest.mock("./photoCompression", () => ({
  ...jest.requireActual("./photoCompression"),
  compressPhotoFile: jest.fn(),
}));

const compressPhotoFile = photoCompression.compressPhotoFile as jest.Mock;

beforeEach(() => {
  compressPhotoFile
    .mockReset()
    .mockResolvedValue({ mimeType: "image/jpeg", base64Data: "QQ==", size: 1, width: 10, height: 10 });
});

function makeFile(name: string, type = "image/jpeg") {
  return new File(["x"], name, { type });
}

describe("PhotoUploader", () => {
  it("renders an accessible file input accepting multiple images", () => {
    render(<PhotoUploader onAddPhotos={() => {}} />);

    const input = screen.getByLabelText("写真を追加") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("multiple");
  });

  it("calls onAddPhotos with the compressed photo after a valid single selection", async () => {
    const onAddPhotos = jest.fn();
    render(<PhotoUploader onAddPhotos={onAddPhotos} />);

    fireEvent.change(screen.getByLabelText("写真を追加"), { target: { files: [makeFile("a.jpg")] } });

    await waitFor(() => expect(onAddPhotos).toHaveBeenCalledTimes(1));
    expect(onAddPhotos.mock.calls[0][0]).toHaveLength(1);
  });

  it("calls onAddPhotos once with every valid photo from a multi-file selection, in order", async () => {
    const onAddPhotos = jest.fn();
    render(<PhotoUploader onAddPhotos={onAddPhotos} />);

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [makeFile("a.jpg"), makeFile("b.jpg")] },
    });

    await waitFor(() => expect(onAddPhotos).toHaveBeenCalledTimes(1));
    expect(onAddPhotos.mock.calls[0][0].map((p: { fileName: string }) => p.fileName)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("shows a readable error and does not call onAddPhotos for an invalid file", async () => {
    const onAddPhotos = jest.fn();
    render(<PhotoUploader onAddPhotos={onAddPhotos} />);

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [makeFile("bad.pdf", "application/pdf")] },
    });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onAddPhotos).not.toHaveBeenCalled();
  });

  it("adds valid files and shows an error for invalid ones in a mixed selection", async () => {
    const onAddPhotos = jest.fn();
    render(<PhotoUploader onAddPhotos={onAddPhotos} />);

    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: { files: [makeFile("valid.jpg"), makeFile("invalid.pdf", "application/pdf")] },
    });

    await waitFor(() => expect(onAddPhotos).toHaveBeenCalledTimes(1));
    expect(onAddPhotos.mock.calls[0][0]).toHaveLength(1);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("resets the input value so selecting the same file again still triggers a change event", async () => {
    render(<PhotoUploader onAddPhotos={() => {}} />);
    const input = screen.getByLabelText("写真を追加") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [makeFile("a.jpg")] } });

    await waitFor(() => expect(input.value).toBe(""));
  });
});
