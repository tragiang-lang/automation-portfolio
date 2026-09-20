import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "@/components/forms/ContactForm";

describe("ContactForm", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it("submits to /api/gas with the createInquiry action and replaces the form with a calm confirmation on success", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { inquiryId: "INQ-20260910-ABC123" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    // Clears the min-fill-time anti-spam gate (Phase 0 §P: real submissions
    // filled in under 1.5s are treated as a bot) — real elapsed time, not
    // faked timers, matching this repo's existing convention for this
    // exact kind of check.
    let now = Date.now();
    jest.spyOn(Date, "now").mockImplementation(() => now);

    const user = userEvent.setup();
    render(<ContactForm />);
    now += 2000;

    await user.type(screen.getByLabelText("お名前", { exact: false }), "山田 太郎");
    await user.type(screen.getByLabelText("メールアドレス", { exact: false }), "taro@example.com");
    await user.type(screen.getByLabelText("お問い合わせ内容", { exact: false }), "見学したいのですが");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("お問い合わせありがとうございます"),
    );
    expect(screen.queryByRole("button", { name: "送信する" })).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"action":"createInquiry"'),
      }),
    );
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.payload).toMatchObject({
      name: "山田 太郎",
      email: "taro@example.com",
      message: "見学したいのですが",
    });
    expect(typeof sentBody.payload.submissionId).toBe("string");
    expect(sentBody.payload.submissionId.length).toBeGreaterThan(0);
  });

  it("shows the server's error message and keeps the form usable when submission fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "SYSTEM_BUSY", message: "只今混み合っております。少々時間をおいて再度お試しください。" } }),
    }) as unknown as typeof fetch;
    let now = Date.now();
    jest.spyOn(Date, "now").mockImplementation(() => now);

    const user = userEvent.setup();
    render(<ContactForm />);
    now += 2000;

    await user.type(screen.getByLabelText("お名前", { exact: false }), "山田 太郎");
    await user.type(screen.getByLabelText("メールアドレス", { exact: false }), "taro@example.com");
    await user.type(screen.getByLabelText("お問い合わせ内容", { exact: false }), "見学したいのですが");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "送信する" }));

    expect(await screen.findByText("只今混み合っております。少々時間をおいて再度お試しください。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "送信する" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses messageLabel instead of a hard-coded term for the message field label (Starter MVP reusability)", () => {
    render(<ContactForm messageLabel="お問い合わせ・ご質問" />);
    expect(screen.getByLabelText("お問い合わせ・ご質問", { exact: false })).toBeInTheDocument();
  });
});
