import { render, screen } from "@testing-library/react";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import type { Testimonial } from "@/types/content";

const testimonials: Testimonial[] = [
  {
    id: "T001",
    name: "M.K 様",
    comment: "丁寧なカウンセリングで安心して施術を受けられました。",
    photoSrc: "/images/testimonials/customer-01.svg",
    photoAlt: "お客様のイメージアイコン",
  },
];

describe("TestimonialsSection", () => {
  it("renders the #testimonials anchor section with its heading", () => {
    const { container } = render(<TestimonialsSection testimonials={testimonials} />);
    expect(container.querySelector("#testimonials")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お客様の声" })).toBeInTheDocument();
  });

  it("renders a testimonial's photo with its own alt text", () => {
    render(<TestimonialsSection testimonials={testimonials} />);

    const image = screen.getByAltText("お客様のイメージアイコン") as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain("/images/testimonials/customer-01.svg");
  });

  it("renders the comment text and the reviewer name", () => {
    render(<TestimonialsSection testimonials={testimonials} />);

    expect(screen.getByText(/丁寧なカウンセリングで安心して施術を受けられました。/)).toBeInTheDocument();
    expect(screen.getByText("M.K 様")).toBeInTheDocument();
  });

  it("falls back to an initial-letter tile instead of a broken image when photoSrc is absent", () => {
    const noPhoto: Testimonial[] = [{ id: "T002", name: "鈴木 さくら", comment: "とても満足しています。" }];
    render(<TestimonialsSection testimonials={noPhoto} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("鈴")).toBeInTheDocument();
    expect(screen.getByText("とても満足しています。", { exact: false })).toBeInTheDocument();
  });

  it("falls back to alt = name when photoAlt is missing but photoSrc is present", () => {
    const noAlt: Testimonial[] = [
      { id: "T003", name: "佐藤 みなみ", comment: "また利用したいです。", photoSrc: "/images/testimonials/customer-02.svg" },
    ];
    render(<TestimonialsSection testimonials={noAlt} />);

    expect(screen.getByAltText("佐藤 みなみ")).toBeInTheDocument();
  });

  it("renders nothing when there are no testimonials, instead of an empty section shell", () => {
    const { container } = render(<TestimonialsSection testimonials={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("preserves testimonial order (no re-sorting)", () => {
    const ordered: Testimonial[] = [
      { id: "T010", name: "第一 様", comment: "一件目のコメントです。" },
      { id: "T011", name: "第二 様", comment: "二件目のコメントです。" },
    ];
    render(<TestimonialsSection testimonials={ordered} />);

    const names = screen.getAllByText(/第一 様|第二 様/).map((el) => el.textContent);
    expect(names).toEqual(["第一 様", "第二 様"]);
  });
});
