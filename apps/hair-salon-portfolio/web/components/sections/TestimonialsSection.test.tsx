import { render, screen } from "@testing-library/react";
import { TestimonialsSection } from "./TestimonialsSection";
import type { TestimonialItem } from "@/types/content";

const testimonials: TestimonialItem[] = [
  { id: "t1", quote: "初めて伺いましたが、カウンセリングが丁寧で安心してお任せできました。", context: "30代 / カット＋カラー" },
  { id: "t2", quote: "髪の悩みを細かく聞いてくださり、自宅でも扱いやすいスタイルになりました。", context: "20代 / カット" },
  { id: "t3", quote: "落ち着いた空間でゆっくり過ごせました。仕上がりも自然で気に入っています。", context: "40代 / トリートメント" },
];

describe("TestimonialsSection", () => {
  it("renders the heading and subtitle", () => {
    render(<TestimonialsSection testimonials={testimonials} />);
    expect(screen.getByRole("heading", { name: "お客様の声" })).toBeInTheDocument();
    expect(
      screen.getByText("atelier itoで過ごす時間と、仕上がりについてのお声。"),
    ).toBeInTheDocument();
  });

  it("has id=\"testimonials\" on its section element", () => {
    render(<TestimonialsSection testimonials={testimonials} />);
    expect(screen.getByRole("heading", { name: "お客様の声" }).closest("section")).toHaveAttribute(
      "id",
      "testimonials",
    );
  });

  it("renders all three reviews with their quote and context", () => {
    render(<TestimonialsSection testimonials={testimonials} />);
    for (const item of testimonials) {
      expect(screen.getByText(item.quote)).toBeInTheDocument();
      expect(screen.getByText(item.context)).toBeInTheDocument();
    }
  });

  it("shows the demo-sample disclosure", () => {
    render(<TestimonialsSection testimonials={testimonials} />);
    expect(screen.getByText("※ こちらはデモ用のサンプルレビューです。")).toBeInTheDocument();
  });

  it("never renders a full customer name — only age-group/service context", () => {
    render(<TestimonialsSection testimonials={testimonials} />);
    // Regression guard for "no real-person claims": context strings are
    // age-group + service only (e.g. "30代 / カット＋カラー"), never a
    // name — this asserts none of the rendered context text contains a
    // Japanese honorific/name-shaped suffix a reviewer name would use.
    expect(screen.queryByText(/様$/)).not.toBeInTheDocument();
  });

  it("lays out reviews in a responsive grid that wraps to a single column on narrow viewports (no horizontal overflow)", () => {
    render(<TestimonialsSection testimonials={testimonials} />);
    const list = screen.getByRole("list");
    // Base layout must be single-column (grid-cols-1) so narrow/mobile
    // viewports stack cards instead of forcing a wide row; wider columns
    // only kick in at sm/lg breakpoints. No fixed pixel width utility
    // (e.g. w-[...px]) should be present, since that would force overflow
    // below its own width on small screens.
    expect(list.className).toMatch(/\bgrid-cols-1\b/);
    expect(list.className).not.toMatch(/w-\[\d+px\]/);
    for (const item of testimonials) {
      const quoteEl = screen.getByText(item.quote);
      expect(quoteEl.className ?? "").not.toMatch(/whitespace-nowrap/);
    }
  });
});
