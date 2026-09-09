import type { GalleryContentProps } from "@/components/sections/GalleryContent";

describe("GalleryContentProps", () => {
  it("accepts the existing GalleryImageItem[] shape with no extra required fields", () => {
    const props: GalleryContentProps = {
      images: [{ id: "g1", src: "/x.jpg", alt: "a", width: 100, height: 80 }],
    };
    expect(props.images).toHaveLength(1);
  });
});
