import { render, screen } from "@testing-library/react";
import { GalleryMasonry } from "@/components/sections/GalleryMasonry";
import type { GalleryImageItem } from "@/types/content";

const images: GalleryImageItem[] = [
  { id: "g1", src: "/a.jpg", alt: "写真A", width: 1200, height: 800 },
  { id: "g2", src: "/b.jpg", alt: "写真B", width: 1200, height: 900 },
  { id: "g3", src: "/c.jpg", alt: "写真C", width: 1200, height: 633 },
];

describe("GalleryMasonry", () => {
  it("renders the container and every image with its own alt text", () => {
    render(<GalleryMasonry images={images} />);
    expect(screen.getByTestId("gallery-masonry")).toBeInTheDocument();
    expect(screen.getByAltText("写真A")).toBeInTheDocument();
    expect(screen.getByAltText("写真B")).toBeInTheDocument();
    expect(screen.getByAltText("写真C")).toBeInTheDocument();
  });

  it("gives tiles genuinely different explicit row spans (bento composition, not identical cards)", () => {
    render(<GalleryMasonry images={images} />);
    const tiles = screen.getAllByTestId("gallery-masonry-tile");
    const spans = tiles.map((tile) => tile.style.gridRowEnd);
    expect(new Set(spans).size).toBeGreaterThan(1);
  });

  it("preserves runtime image order (no re-sorting)", () => {
    render(<GalleryMasonry images={images} />);
    const tiles = screen.getAllByTestId("gallery-masonry-tile");
    const alts = tiles.map((tile) => tile.querySelector("img")?.alt);
    expect(alts).toEqual(["写真A", "写真B", "写真C"]);
  });
});
