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
    data: [{ serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 }],
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

    await waitFor(() => expect(screen.getByRole("radio", { name: /カット/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /カット/ }));
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

    await waitFor(() => expect(screen.getByRole("radio", { name: /カット/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /カット/ }));
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

    await waitFor(() => expect(screen.getByRole("radio", { name: /カット/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /カット/ }));
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

  it("public demo config (demoMode + submitEnabled=false): never calls getServices/getStaff/getAvailability/submitReservation, shows デモ予約 at review, and ends in the demo success state", async () => {
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" demoMode submitEnabled={false} />);

    // Demo catalog resolves without ever hitting the (mocked) real client.
    await waitFor(() => expect(screen.getByRole("radiogroup", { name: "メニューを選択" })).toBeInTheDocument());
    expect(reservationClient.getServices).not.toHaveBeenCalled();
    expect(reservationClient.getStaff).not.toHaveBeenCalled();

    const [firstServiceRadio] = screen.getAllByRole("radio");
    await userEvent.click(firstServiceRadio);
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-15"); // demo hours: Tuesday 10:00-19:00
    await waitFor(() => expect(reservationClient.getAvailability).not.toHaveBeenCalled());
    const timeButton = await screen.findByRole("group", { name: "時間を選択" });
    await userEvent.click(timeButton.querySelector("button") as HTMLButtonElement);
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    // Staff step (demo STAFF is non-empty) now comes after date/time.
    if (screen.queryByRole("radiogroup", { name: "スタッフを選択" })) {
      const [firstStaffRadio] = screen.getAllByRole("radio");
      await userEvent.click(firstStaffRadio);
      await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    }

    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("デモ予約")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "デモ予約を送信する" }));
    await waitFor(() => expect(screen.getByText("ご予約デモが完了しました")).toBeInTheDocument());

    // submitEnabled=false: submit never reaches the real (mocked)
    // reservation client at all — the demo success state comes from
    // lib/config/reservationDemoSubmission.ts's local result only.
    expect(reservationClient.submitReservation).not.toHaveBeenCalled();
    expect(screen.getByText(/実際の予約は作成されていません/)).toBeInTheDocument();
    expect(screen.getByText("デモ予約番号")).toBeInTheDocument();
  });

  it("staff step comes after date/time, shows availability, and a SLOT_UNAVAILABLE at submit returns here with the stale pick cleared", async () => {
    (reservationClient.getServices as jest.Mock).mockResolvedValue({
      ok: true,
      data: [{ serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 }],
    });
    (reservationClient.getStaff as jest.Mock).mockResolvedValue({
      ok: true,
      data: [{ staffId: "ST001", name: "鈴木", displayOrder: 1 }],
    });
    (reservationClient.getAvailability as jest.Mock).mockImplementation((request: { time?: string }) =>
      Promise.resolve({
        ok: true,
        data: {
          date: "2026-09-10",
          slots: [{ time: "10:00" }],
          ...(request.time ? { staff: [{ staffId: "ST001", name: "鈴木", available: true, conflicts: [] }] } : {}),
        },
      }),
    );
    (reservationClient.submitReservation as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択されたスタッフはこの時間帯に予約があります。" },
    });
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /カット/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /カット/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    // Date/time comes before staff now.
    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    // Staff step shows the availability breakdown, not just plain names.
    await waitFor(() => expect(screen.getByRole("radio", { name: /鈴木/ })).toBeInTheDocument());
    expect(screen.getByText("○ 空き")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /鈴木/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await userEvent.type(screen.getByLabelText(/お名前/), "山田太郎");
    await userEvent.type(screen.getByLabelText(/メールアドレス/), "yamada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));

    // Kicked back to the staff step, staff no longer pre-selected.
    await waitFor(() => expect(screen.getByRole("radio", { name: /鈴木/ })).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: /鈴木/ })).not.toBeChecked();
  });

  it("shows an error with retry on the staff step when the per-staff breakdown fails to load", async () => {
    (reservationClient.getServices as jest.Mock).mockResolvedValue({
      ok: true,
      data: [{ serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 }],
    });
    (reservationClient.getStaff as jest.Mock).mockResolvedValue({
      ok: true,
      data: [{ staffId: "ST001", name: "鈴木", displayOrder: 1 }],
    });
    (reservationClient.getAvailability as jest.Mock).mockImplementation((request: { time?: string }) =>
      request.time
        ? Promise.resolve({ ok: false, error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" } })
        : Promise.resolve({ ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }] } }),
    );
    render(<ReservationWizard minDate="2026-09-02" maxDate="2026-11-01" />);

    await waitFor(() => expect(screen.getByRole("radio", { name: /カット/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: /カット/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.type(await screen.findByLabelText("日付"), "2026-09-10");
    await waitFor(() => expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "10:00" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("サーバーエラーが発生しました。"));

    (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
      ok: true,
      data: { date: "2026-09-10", slots: [{ time: "10:00" }], staff: [{ staffId: "ST001", name: "鈴木", available: true, conflicts: [] }] },
    });
    await userEvent.click(screen.getByRole("button", { name: "もう一度お試しください" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: /鈴木/ })).toBeInTheDocument());
  });
});
