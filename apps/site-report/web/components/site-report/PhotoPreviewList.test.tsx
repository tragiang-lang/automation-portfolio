import { fireEvent, render, screen } from "@testing-library/react";
import { PhotoPreviewList } from "./PhotoPreviewList";
import type { ReportDraftPhoto } from "./reportDraft";

function makePhoto(id: string, fileName = `${id}.jpg`): ReportDraftPhoto {
  return {
    id,
    fileName,
    mimeType: "image/jpeg",
    base64Data: "QQ==",
    size: 1,
    previewUrl: "data:image/jpeg;base64,QQ==",
  };
}

describe("PhotoPreviewList", () => {
  it("shows a guidance message when there are no photos", () => {
    render(<PhotoPreviewList photos={[]} onRemove={() => {}} />);

    expect(screen.getByText(/写真/)).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("renders one preview image per photo, in order", () => {
    render(<PhotoPreviewList photos={[makePhoto("1"), makePhoto("2")]} onRemove={() => {}} />);

    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("gives every remove button an accessible name identifying its photo", () => {
    render(<PhotoPreviewList photos={[makePhoto("1", "site-a.jpg")]} onRemove={() => {}} />);

    expect(screen.getByRole("button", { name: /site-a\.jpg/ })).toBeInTheDocument();
  });

  it("calls onRemove with the correct photo id when its remove button is activated", () => {
    const onRemove = jest.fn();
    render(<PhotoPreviewList photos={[makePhoto("1"), makePhoto("2")]} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: /1\.jpg/ }));

    expect(onRemove).toHaveBeenCalledWith("1");
  });
});
