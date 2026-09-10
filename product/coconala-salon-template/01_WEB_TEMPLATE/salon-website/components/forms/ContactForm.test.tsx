import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "@/components/forms/ContactForm";

describe("ContactForm", () => {
  it("shows a required-field error on blur, not just on submit", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const nameInput = screen.getByLabelText("お名前", { exact: false });
    await user.click(nameInput);
    await user.tab();

    expect(await screen.findByText("お名前を入力してください。")).toBeInTheDocument();
  });

  it("rejects an invalid email format", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const emailInput = screen.getByLabelText("メールアドレス", { exact: false });
    await user.type(emailInput, "not-an-email");
    await user.tab();

    expect(
      await screen.findByText("メールアドレスの形式が正しくありません。"),
    ).toBeInTheDocument();
  });

  it("blocks submission and surfaces every missing field when submitted empty", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole("button", { name: "送信する" }));

    expect(await screen.findByText("お名前を入力してください。")).toBeInTheDocument();
    expect(screen.getByText("メールアドレスを入力してください。")).toBeInTheDocument();
    expect(screen.getByText("お問い合わせ内容を入力してください。")).toBeInTheDocument();
    expect(screen.getByText("プライバシーポリシーへの同意が必要です。")).toBeInTheDocument();
  });

  it("does not submit the honeypot field's value as a visible field, and it stays out of the tab order", () => {
    render(<ContactForm />);
    const honeypot = document.getElementById("company") as HTMLInputElement;
    expect(honeypot).toHaveAttribute("tabIndex", "-1");
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("replaces the form with a calm confirmation once a valid submission completes", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("お名前", { exact: false }), "山田 太郎");
    await user.type(screen.getByLabelText("メールアドレス", { exact: false }), "taro@example.com");
    await user.type(screen.getByLabelText("お問い合わせ内容", { exact: false }), "見学したいのですが");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(
      () => expect(screen.getByRole("status")).toHaveTextContent("お問い合わせありがとうございます"),
      { timeout: 2000 },
    );
    expect(screen.queryByRole("button", { name: "送信する" })).not.toBeInTheDocument();
  });
});
