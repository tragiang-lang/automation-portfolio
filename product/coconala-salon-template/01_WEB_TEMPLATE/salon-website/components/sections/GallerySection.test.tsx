import { render, screen } from "@testing-library/react";
import { GallerySection } from "@/components/sections/GallerySection";
import type { GalleryImageItem } from "@/types/content";

const images: GalleryImageItem[] = [
  { id: "g1", src: "/a.jpg", alt: "写真1", width: 1200, height: 800 },
  { id: "g2", src: "/b.jpg", alt: "写真2", width: 1200, height: 900 },
];

const GALLERY_VARIANTS = ["grid", "masonry", "feature-editorial"] as const;

describe("GallerySection", () => {
  it("defaults to the grid variant when galleryVariant is not passed", () => {
    render(<GallerySection images={images} />);
    expect(screen.getByTestId("gallery-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("gallery-masonry")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gallery-feature-editorial")).not.toBeInTheDocument();
  });

  it("falls back to grid for an invalid galleryVariant instead of crashing", () => {
    render(<GallerySection images={images} galleryVariant={"large-feature" as never} />);
    expect(screen.getByTestId("gallery-grid")).toBeInTheDocument();
  });

  it.each(GALLERY_VARIANTS)("renders the %s variant with every runtime image", (variant) => {
    render(<GallerySection images={images} galleryVariant={variant} />);
    expect(screen.getByTestId(`gallery-${variant}`)).toBeInTheDocument();
    expect(screen.getByAltText("写真1")).toBeInTheDocument();
    expect(screen.getByAltText("写真2")).toBeInTheDocument();
  });

  it("always renders the #gallery anchor and exactly one heading, regardless of variant", () => {
    render(<GallerySection images={images} galleryVariant="feature-editorial" />);
    expect(document.querySelector("#gallery")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "ギャラリー" })).toBeInTheDocument();
  });
});
