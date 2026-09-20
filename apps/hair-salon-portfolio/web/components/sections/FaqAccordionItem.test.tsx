import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FaqAccordionItem } from "@/components/sections/FaqAccordionItem";

const item = {
  id: "faq-1",
  question: "予約は当日でも可能ですか？",
  answer: "空き状況によりご案内可能です。",
};

describe("FaqAccordionItem", () => {
  it("starts collapsed with aria-expanded false", () => {
    render(<FaqAccordionItem item={item} />);
    expect(screen.getByRole("button", { name: item.question })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("expands on click and exposes the answer via aria-controls", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionItem item={item} />);

    const button = screen.getByRole("button", { name: item.question });
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const controlsId = button.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId!)).toHaveTextContent(item.answer);
  });

  it("collapses again on a second click", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionItem item={item} />);

    const button = screen.getByRole("button", { name: item.question });
    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("is keyboard operable (Enter toggles it)", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionItem item={item} />);

    const button = screen.getByRole("button", { name: item.question });
    button.focus();
    await user.keyboard("{Enter}");

    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
