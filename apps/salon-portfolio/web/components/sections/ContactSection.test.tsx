import { render, screen } from "@testing-library/react";
import { ContactSection } from "./ContactSection";
import type { BusinessInfo } from "@/types/content";

const business: BusinessInfo = {
  name: "凛",
  nameLatin: "Rin",
  tagline: "静けさの中で。",
  phone: "03-1234-5678",
  email: "info@example.com",
  address: "東京都",
  postalCode: "〒100-0001",
};

describe("ContactSection", () => {
  it("defaults the message field label to お問い合わせ内容", () => {
    render(<ContactSection business={business} />);
    expect(screen.getByLabelText("お問い合わせ内容", { exact: false })).toBeInTheDocument();
  });

  it("uses messageLabel instead of a hard-coded term when provided (Starter MVP reusability)", () => {
    render(<ContactSection business={business} messageLabel="お問い合わせ・ご質問" />);
    expect(screen.getByLabelText("お問い合わせ・ご質問", { exact: false })).toBeInTheDocument();
  });
});
