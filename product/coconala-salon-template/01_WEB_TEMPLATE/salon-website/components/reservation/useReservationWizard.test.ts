jest.mock("../../lib/api/reservationClient");

import { renderHook, act, waitFor } from "@testing-library/react";
import { useReservationWizard } from "./useReservationWizard";
import * as reservationClient from "@/lib/api/reservationClient";
import { ANY_STAFF } from "@/types/reservation";

const services = [{ serviceId: "SV001", name: "まつげパーマ", durationMinutes: 60, price: 6600, displayOrder: 1 }];
const staff = [{ staffId: "ST001", name: "鈴木", displayOrder: 1 }];

function mockCatalog(overrides: Partial<{ servicesOk: boolean; staffOk: boolean; staffList: typeof staff }> = {}) {
  (reservationClient.getServices as jest.Mock).mockResolvedValue(
    overrides.servicesOk === false
      ? { ok: false, error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" } }
      : { ok: true, data: services },
  );
  (reservationClient.getStaff as jest.Mock).mockResolvedValue(
    overrides.staffOk === false
      ? { ok: false, error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" } }
      : { ok: true, data: overrides.staffList ?? staff },
  );
}

const wizardConfig = { minDate: "2026-09-02", maxDate: "2026-11-01" };

describe("useReservationWizard — catalog loading", () => {
  afterEach(() => jest.resetAllMocks());

  it("starts in a loading state and resolves to ready with services+staff", async () => {
    mockCatalog();
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    expect(result.current.catalogStatus).toBe("loading");
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    expect(result.current.services).toEqual(services);
    expect(result.current.staff).toEqual(staff);
    expect(result.current.staffSelectionEnabled).toBe(true);
    expect(result.current.steps).toEqual(["service", "staff", "datetime", "customer", "review"]);
  });

  it("omits the staff step when getStaff returns an empty list", async () => {
    mockCatalog({ staffList: [] });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    expect(result.current.staffSelectionEnabled).toBe(false);
    expect(result.current.steps).toEqual(["service", "datetime", "customer", "review"]);
  });

  it("enters an error state when getServices fails, and retryCatalog re-fetches", async () => {
    mockCatalog({ servicesOk: false });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("error"));
    expect(result.current.catalogError).toBe("サーバーエラーが発生しました。");

    mockCatalog();
    act(() => result.current.retryCatalog());
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
  });

  it("enters an error state when getStaff fails", async () => {
    mockCatalog({ staffOk: false });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("error"));
  });
});

describe("useReservationWizard — selection and dependency resets", () => {
  beforeEach(() => {
    mockCatalog();
    (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
      ok: true,
      data: { date: "2026-09-10", slots: [{ time: "10:00" }, { time: "10:30" }] },
    });
  });
  afterEach(() => jest.resetAllMocks());

  async function readyHook() {
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    return result;
  }

  it("selecting a service sets selectedServiceId and clears any selected time", async () => {
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    expect(result.current.selectedServiceId).toBe("SV001");
    expect(result.current.selectedTime).toBeNull();
  });

  it("selecting staff sets selectedStaffId (including ANY_STAFF) and clears selected time", async () => {
    const result = await readyHook();
    act(() => {
      result.current.selectService("SV001");
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));
    expect(result.current.selectedTime).toBe("10:00");

    act(() => result.current.selectStaff(ANY_STAFF));
    expect(result.current.selectedStaffId).toBe(ANY_STAFF);
    expect(result.current.selectedTime).toBeNull();
    // Selecting staff also re-triggers the availability effect (same
    // dependency-reset rule as date) — let it settle before the test ends
    // so its resolution doesn't leak an unwrapped state update into
    // whichever test runs next.
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
  });

  it("selecting a date clears selected time and loads availability", async () => {
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    act(() => result.current.selectDate("2026-09-10"));
    expect(result.current.availabilityStatus).toBe("loading");
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    expect(result.current.availableSlots).toEqual([{ time: "10:00" }, { time: "10:30" }]);
  });

  it("changing the date after a time was already selected clears that time and reloads", async () => {
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    act(() => result.current.selectDate("2026-09-10"));
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));

    act(() => result.current.selectDate("2026-09-11"));
    expect(result.current.selectedTime).toBeNull();
    expect(result.current.availabilityStatus).toBe("loading");
    // Let the re-triggered fetch settle before the test ends, so its
    // resolution doesn't leak an unwrapped state update into the next test.
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
  });

  it("shows an availability error and supports retry", async () => {
    (reservationClient.getAvailability as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" },
    });
    const result = await readyHook();
    act(() => result.current.selectService("SV001"));
    act(() => result.current.selectDate("2026-09-10"));
    await waitFor(() => expect(result.current.availabilityStatus).toBe("error"));

    act(() => result.current.retryAvailability());
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
  });
});

describe("useReservationWizard — submission", () => {
  beforeEach(() => {
    mockCatalog();
    (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
      ok: true,
      data: { date: "2026-09-10", slots: [{ time: "10:00" }] },
    });
  });
  afterEach(() => jest.resetAllMocks());

  async function filledHook() {
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    act(() => {
      result.current.selectService("SV001");
      result.current.selectStaff(ANY_STAFF);
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => {
      result.current.selectTime("10:00");
      result.current.setCustomerField("name", "山田太郎");
      result.current.setCustomerField("email", "yamada@example.com");
    });
    return result;
  }

  it("submits with a generated submissionId and reflects success", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-20260910-X8K2MP" },
    });
    const result = await filledHook();

    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
    const call = (reservationClient.submitReservation as jest.Mock).mock.calls[0][0];
    expect(typeof call.submissionId).toBe("string");
    expect(call.submissionId.length).toBeGreaterThan(0);
    expect(call).toMatchObject({ serviceId: "SV001", staffId: ANY_STAFF, date: "2026-09-10", time: "10:00", name: "山田太郎", email: "yamada@example.com" });
    expect(result.current.submitStatus).toBe("success");
    expect(result.current.submitResult).toEqual({ reservationId: "RES-20260910-X8K2MP" });
  });

  it("reuses the same submissionId across a retried submit after a transient failure", async () => {
    (reservationClient.submitReservation as jest.Mock)
      .mockResolvedValueOnce({ ok: false, error: { code: "SYSTEM_BUSY", message: "只今混み合っております。少々時間をおいて再度お試しください。" } })
      .mockResolvedValueOnce({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } });
    const result = await filledHook();

    await act(async () => result.current.submit());
    expect(result.current.submitStatus).toBe("error");
    const firstId = (reservationClient.submitReservation as jest.Mock).mock.calls[0][0].submissionId;

    await act(async () => result.current.submit());
    const secondId = (reservationClient.submitReservation as jest.Mock).mock.calls[1][0].submissionId;
    expect(secondId).toBe(firstId);
    expect(result.current.submitStatus).toBe("success");
  });

  it("generates a new submissionId once the customer changes the selected time after a failure", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    const result = await filledHook();
    await act(async () => result.current.submit());
    const firstId = (reservationClient.submitReservation as jest.Mock).mock.calls[0][0].submissionId;

    act(() => result.current.selectTime("10:00")); // re-select (simulates picking a different, still-mocked-available time)
    (reservationClient.submitReservation as jest.Mock).mockResolvedValueOnce({ ok: true, data: { reservationId: "RES-X" } });
    await act(async () => result.current.submit());
    const secondId = (reservationClient.submitReservation as jest.Mock).mock.calls[1][0].submissionId;
    expect(secondId).not.toBe(firstId);
  });

  it("ignores a second concurrent submit call while one is already in flight", async () => {
    let resolveSubmit!: (value: unknown) => void;
    (reservationClient.submitReservation as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    const result = await filledHook();

    let firstCall!: Promise<void>;
    act(() => {
      firstCall = result.current.submit();
      result.current.submit(); // second call while first is still pending
    });
    expect(result.current.submitStatus).toBe("submitting");
    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ ok: true, data: { reservationId: "RES-X" } });
      await firstCall;
    });
  });

  it("surfaces the backend's own sanitized error message verbatim on failure", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    const result = await filledHook();
    await act(async () => result.current.submit());
    expect(result.current.submitError).toBe("選択された時間帯はご利用いただけません。");
  });

  it("resetAfterError returns submitStatus to idle without clearing selections", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" },
    });
    const result = await filledHook();
    await act(async () => result.current.submit());
    act(() => result.current.resetAfterError());
    expect(result.current.submitStatus).toBe("idle");
    expect(result.current.selectedServiceId).toBe("SV001");
  });
});
