import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders a real <button> when no href is given", () => {
    render(<Button onClick={() => {}}>送信する</Button>);
    expect(screen.getByRole("button", { name: "送信する" })).toBeInTheDocument();
  });

  it("renders a real link when href is given, never a div onClick", () => {
    render(<Button href="/reservation">ご予約はこちら</Button>);
    const link = screen.getByRole("link", { name: "ご予約はこちら" });
    expect(link).toHaveAttribute("href", "/reservation");
  });

  it("disables the button and reflects it visually when disabled", () => {
    render(<Button disabled>送信中...</Button>);
    expect(screen.getByRole("button", { name: "送信中..." })).toBeDisabled();
  });
});
