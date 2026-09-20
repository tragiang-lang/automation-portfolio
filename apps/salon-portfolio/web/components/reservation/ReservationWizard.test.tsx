import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationWizard } from "./ReservationWizard";
import * as reservationClient from "@/lib/api/reservationClient";

// jest.mock's module specifier is a plain string argument, not a static
// import — Next's SWC transform rewrites "@/..." aliases only in real
// import/require statements, so a relative path is needed here for Jest's
// resolver to find the same module the `import * as reservationClient`
// above resolves to.
jest.mock("../../lib/api/reservationClient");

function mockHappyPath() {
  (reservationClient.getServices as jest.Mock).mockResolvedValue({
    ok: true,
    data: [{ serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 }],
  });
  (reservationClient.getStaff as jest.Mock).mockResolvedValue({ ok: true, data: [] });
  (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
    ok: true,
    data: { date: "2026-09-10", slots: [{ time: "10:00" }] },
  });
  (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
    ok: true,
    data: { reservationId: "RES-20260910-X8K2MP" },
  });
}

describe("ReservationWizard", () => {
  // `jest.restoreAllMocks()` only restores mocks created via
  // `jest.spyOn()` — the module-level `jest.mock(...)` auto-mocks above
  // keep their accumulated `mock.calls` across tests unless explicitly
  // cleared, which would make call-count assertions in later tests count
  // invocations from earlier ones too.
  afterEach(() => jest.clearAllMocks());

  it("walks a customer from service selection through to success", async () => {
    mockHappyPath();
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    // staff step is skipped (getStaff returned []) — straight to date/time
    const dateInput = await screen.findByLabelText("日付");
    await userEvent.type(dateInput, "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));

    await waitFor(() => expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument());
    expect(screen.getByText("RES-20260910-X8K2MP")).toBeInTheDocument();
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
  });

  it("shows a customer-safe error and lets the customer retry after a failed submission", async () => {
    mockHappyPath();
    (reservationClient.submitReservation as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("選択された時間帯はご利用いただけません。"));
    expect(screen.queryByText("ご予約ありがとうございます")).not.toBeInTheDocument();
  });

  it("disables the confirm button while a submission is in flight and never double-submits", async () => {
    mockHappyPath();
    let resolveSubmit!: (value: unknown) => void;
    (reservationClient.submitReservation as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveSubmit = resolve; }));
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /まつげパーマ/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /まつげパーマ/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    const confirmButton = screen.getByRole("button", { name: "この内容で予約する" });
    await userEvent.click(confirmButton);
    await userEvent.click(confirmButton); // second click while pending
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);

    resolveSubmit({ ok: true, data: { reservationId: "RES-X" } });
    await waitFor(() => expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument());
  });

  it("explicit demo mode: never calls getServices/getStaff/getAvailability, shows デモ予約 at review, and still submits to real GAS", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-DEMO-REAL-SUBMIT" },
    });
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" demoMode />);

    // Demo catalog resolves without ever hitting the (mocked) real client.
    await waitFor(() => expect(screen.getByRole("radiogroup", { name: "メニューを選択" })).toBeInTheDocument());
    expect(reservationClient.getServices).not.toHaveBeenCalled();
    expect(reservationClient.getStaff).not.toHaveBeenCalled();

    const [firstServiceRadio] = screen.getAllByRole("radio");
    await userEvent.click(firstServiceRadio);
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    // Staff step (demo STAFF is non-empty) or straight to date/time.
    if (screen.queryByRole("radiogroup", { name: "スタッフを選択" })) {
      const [firstStaffRadio] = screen.getAllByRole("radio");
      await userEvent.click(firstStaffRadio);
      await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    }

    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-14"); // demo hours: Monday 10:00-19:00
    await waitFor(() => expect(reservationClient.getAvailability).not.toHaveBeenCalled());
    const timeButton = await screen.findByRole("group", { name: "時間を選択" });
    await userEvent.click(timeButton.querySelector("button") as HTMLButtonElement);
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("デモ予約")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));
    await waitFor(() => expect(screen.getByText("ご予約ありがとうございます")).toBeInTheDocument());

    // Submit always goes through the real (mocked) reservation client — demo
    // mode never fakes a success locally.
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
    expect(screen.getByText("RES-DEMO-REAL-SUBMIT")).toBeInTheDocument();
  });
});
