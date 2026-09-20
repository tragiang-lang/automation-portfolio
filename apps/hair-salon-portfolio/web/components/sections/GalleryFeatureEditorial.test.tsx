import { render, screen, within } from "@testing-library/react";
import { GalleryFeatureEditorial } from "@/components/sections/GalleryFeatureEditorial";
import type { GalleryImageItem } from "@/types/content";

const images: GalleryImageItem[] = [
  { id: "g1", src: "/a.jpg", alt: "特集写真", width: 1200, height: 800 },
  { id: "g2", src: "/b.jpg", alt: "サブ写真1", width: 1200, height: 800 },
  { id: "g3", src: "/c.jpg", alt: "サブ写真2", width: 1200, height: 800 },
  { id: "g4", src: "/d.jpg", alt: "サブ写真3", width: 1200, height: 800 },
];

describe("GalleryFeatureEditorial", () => {
  it("renders the container and the first image inside the dominant feature tile", () => {
    render(<GalleryFeatureEditorial images={images} />);
    expect(screen.getByTestId("gallery-feature-editorial")).toBeInTheDocument();
    const feature = screen.getByTestId("gallery-feature-editorial-feature");
    expect(within(feature).getByAltText("特集写真")).toBeInTheDocument();
  });

  it("renders every remaining image as a supporting tile, in order", () => {
    render(<GalleryFeatureEditorial images={images} />);
    const supporting = screen.getByTestId("gallery-feature-editorial-supporting");
    const alts = within(supporting)
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt"));
    expect(alts).toEqual(["サブ写真1", "サブ写真2", "サブ写真3"]);
  });

  it("does not crash with a single image and renders no supporting tiles", () => {
    render(<GalleryFeatureEditorial images={[images[0]]} />);
    expect(screen.getByAltText("特集写真")).toBeInTheDocument();
    expect(screen.queryByTestId("gallery-feature-editorial-supporting")).not.toBeInTheDocument();
  });

  it("does not crash with an empty images array", () => {
    const { container } = render(<GalleryFeatureEditorial images={[]} />);
    expect(container.querySelector('[data-testid="gallery-feature-editorial"]')).toBeInTheDocument();
  });
});
