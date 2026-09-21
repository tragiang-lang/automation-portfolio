jest.mock("../../lib/api/reservationClient");

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CancelReservationView } from "./CancelReservationView";
import * as reservationClient from "@/lib/api/reservationClient";

const details = {
  reservationId: "RES-20260910-X8K2MP",
  cancellationToken: "tok-1",
  date: "2026-09-10",
  time: "10:00",
  serviceName: "カット",
};

describe("CancelReservationView", () => {
  afterEach(() => jest.clearAllMocks());

  it("shows the reservation summary and requires an explicit confirmation click before cancelling anything", () => {
    render(<CancelReservationView details={details} />);
    expect(screen.getByText("カット")).toBeInTheDocument();
    expect(screen.getByText("2026-09-10")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(reservationClient.cancelReservation).not.toHaveBeenCalled();
  });

  it("calls cancelReservation with the reservationId/token only after the confirm button is clicked", async () => {
    (reservationClient.cancelReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-20260910-X8K2MP" },
    });
    render(<CancelReservationView details={details} />);
    await userEvent.click(screen.getByRole("button", { name: /キャンセルする/ }));
    expect(reservationClient.cancelReservation).toHaveBeenCalledWith({
      reservationId: "RES-20260910-X8K2MP",
      cancellationToken: "tok-1",
    });
  });

  it("shows a success message after a successful cancellation", async () => {
    (reservationClient.cancelReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-20260910-X8K2MP" },
    });
    render(<CancelReservationView details={details} />);
    await userEvent.click(screen.getByRole("button", { name: /キャンセルする/ }));
    await waitFor(() => expect(screen.getByText("ご予約をキャンセルしました")).toBeInTheDocument());
  });

  it("shows the backend's error message and keeps the confirm button available to retry on failure", async () => {
    (reservationClient.cancelReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "INVALID_CANCELLATION_TOKEN", message: "予約が見つからないか、キャンセル情報が正しくありません。" },
    });
    render(<CancelReservationView details={details} />);
    await userEvent.click(screen.getByRole("button", { name: /キャンセルする/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("予約が見つからないか、キャンセル情報が正しくありません。"),
    );
    expect(screen.getByRole("button", { name: /キャンセルする/ })).toBeInTheDocument();
  });

  it("disables the confirm button while the cancellation request is in flight", async () => {
    let resolveCancel!: (value: unknown) => void;
    (reservationClient.cancelReservation as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveCancel = resolve;
      }),
    );
    render(<CancelReservationView details={details} />);
    const button = screen.getByRole("button", { name: /キャンセルする/ });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    resolveCancel({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } });
    await waitFor(() => expect(screen.getByText("ご予約をキャンセルしました")).toBeInTheDocument());
  });
});
