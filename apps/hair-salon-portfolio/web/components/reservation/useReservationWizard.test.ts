jest.mock("../../lib/api/reservationClient");

import { renderHook, act, waitFor } from "@testing-library/react";
import { useReservationWizard } from "./useReservationWizard";
import * as reservationClient from "@/lib/api/reservationClient";
import { ANY_STAFF } from "@/types/reservation";

const services = [{ serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 }];
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
    expect(result.current.steps).toEqual(["service", "datetime", "staff", "customer", "review"]);
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

  it("selecting staff after a time is already chosen sets selectedStaffId without clearing the time (staff comes after datetime now)", async () => {
    const result = await readyHook();
    act(() => {
      result.current.selectService("SV001");
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));
    expect(result.current.selectedTime).toBe("10:00");
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));

    act(() => result.current.selectStaff(ANY_STAFF));
    expect(result.current.selectedStaffId).toBe(ANY_STAFF);
    expect(result.current.selectedTime).toBe("10:00");
  });

  it("selecting a new time clears a previously selected staff (their availability was only checked for the old time)", async () => {
    const result = await readyHook();
    act(() => {
      result.current.selectService("SV001");
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));
    act(() => result.current.selectStaff(ANY_STAFF));
    expect(result.current.selectedStaffId).toBe(ANY_STAFF);

    act(() => result.current.selectTime("10:30"));
    expect(result.current.selectedStaffId).toBeNull();
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));
  });

  it("requests availability for any available staff (not a specific one) before staff has been chosen", async () => {
    const result = await readyHook();
    act(() => {
      result.current.selectService("SV001");
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));

    expect(reservationClient.getAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: "SV001", date: "2026-09-10", staffId: ANY_STAFF }),
    );
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

describe("useReservationWizard — per-staff availability", () => {
  beforeEach(() => {
    mockCatalog();
    (reservationClient.getAvailability as jest.Mock).mockImplementation((request: { time?: string }) =>
      Promise.resolve(
        request.time
          ? {
              ok: true,
              data: {
                date: "2026-09-10",
                slots: [{ time: "10:00" }],
                staff: [{ staffId: "ST001", name: "鈴木", available: true, conflicts: [] }],
              },
            }
          : { ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }] } },
      ),
    );
  });
  afterEach(() => jest.resetAllMocks());

  async function readyAtDatetime() {
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    act(() => {
      result.current.selectService("SV001");
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    return result;
  }

  it("stays idle until service, date, and time are all chosen", async () => {
    const result = await readyAtDatetime();
    expect(result.current.staffAvailabilityStatus).toBe("idle");
    expect(result.current.staffAvailability).toEqual([]);
  });

  it("loads the per-staff breakdown once a time is chosen, requesting that exact time", async () => {
    const result = await readyAtDatetime();
    act(() => result.current.selectTime("10:00"));
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));

    expect(result.current.staffAvailability).toEqual([
      { staffId: "ST001", name: "鈴木", available: true, conflicts: [] },
    ]);
    expect(reservationClient.getAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: "SV001", date: "2026-09-10", time: "10:00" }),
    );
  });

  it("shows an error and supports retry when the staff breakdown fails to load", async () => {
    const result = await readyAtDatetime();
    (reservationClient.getAvailability as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" } }),
    );
    act(() => result.current.selectTime("10:00"));
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("error"));
    expect(result.current.staffAvailabilityError).toBe("サーバーエラーが発生しました。");

    act(() => result.current.retryStaffAvailability());
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));
  });

  it("resolves the staff breakdown from the demo generator in explicit demo mode", async () => {
    const { result } = renderHook(() => useReservationWizard({ ...wizardConfig, demoMode: true }));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    const demoServiceId = result.current.services[0].serviceId;
    act(() => {
      result.current.selectService(demoServiceId);
      result.current.selectDate("2026-09-15"); // demo hours: Tuesday 10:00-19:00
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    const demoTime = result.current.availableSlots[0].time;

    act(() => result.current.selectTime(demoTime));
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));

    expect(reservationClient.getAvailability).not.toHaveBeenCalled();
    expect(result.current.staffAvailability.length).toBeGreaterThan(0);
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
      result.current.selectDate("2026-09-10");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    act(() => result.current.selectTime("10:00"));
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));
    act(() => {
      result.current.selectStaff(ANY_STAFF);
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

  it("on SLOT_UNAVAILABLE, returns to the staff step, clears the stale staff pick, and refreshes staff availability", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SLOT_UNAVAILABLE", message: "選択されたスタッフはこの時間帯に予約があります。" },
    });
    const result = await filledHook();
    expect(result.current.selectedStaffId).toBe(ANY_STAFF);
    const callsBefore = (reservationClient.getAvailability as jest.Mock).mock.calls.length;

    await act(async () => result.current.submit());

    expect(result.current.currentStep).toBe("staff");
    expect(result.current.selectedStaffId).toBeNull();
    // The selected date/time survive — the customer picks a different
    // staff at the same slot, or goes back to change the time themselves.
    expect(result.current.selectedDate).toBe("2026-09-10");
    expect(result.current.selectedTime).toBe("10:00");
    await waitFor(() =>
      expect((reservationClient.getAvailability as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("does not navigate away or clear the staff pick on a non-conflict submit error", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: "SYSTEM_BUSY", message: "只今混み合っております。少々時間をおいて再度お試しください。" },
    });
    const result = await filledHook();
    const stepBefore = result.current.currentStep;

    await act(async () => result.current.submit());

    expect(result.current.currentStep).toBe(stepBefore);
    expect(result.current.selectedStaffId).toBe(ANY_STAFF);
  });
});

describe("useReservationWizard — explicit demo mode", () => {
  afterEach(() => jest.resetAllMocks());

  it("resolves the catalog from demo data without calling getServices/getStaff, and exposes dataSource=demo", async () => {
    const { result } = renderHook(() => useReservationWizard({ ...wizardConfig, demoMode: true }));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    expect(reservationClient.getServices).not.toHaveBeenCalled();
    expect(reservationClient.getStaff).not.toHaveBeenCalled();
    expect(result.current.dataSource).toBe("demo");
    expect(result.current.services.length).toBeGreaterThan(0);
  });

  it("resolves availability from the demo generator without calling getAvailability", async () => {
    const { result } = renderHook(() => useReservationWizard({ ...wizardConfig, demoMode: true }));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    const demoServiceId = result.current.services[0].serviceId;

    act(() => {
      result.current.selectService(demoServiceId);
      result.current.selectDate("2026-09-15"); // demo hours: Tuesday 10:00-19:00
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));

    expect(reservationClient.getAvailability).not.toHaveBeenCalled();
    expect(result.current.availableSlots.length).toBeGreaterThan(0);
  });

  it("demoMode alone does not gate submit — with submitEnabled left at its default (true), it still calls the real submitReservation client", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-REAL-ID" },
    });
    const { result } = renderHook(() => useReservationWizard({ ...wizardConfig, demoMode: true }));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    const demoServiceId = result.current.services[0].serviceId;

    act(() => {
      result.current.selectService(demoServiceId);
      result.current.selectDate("2026-09-15");
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    const demoTime = result.current.availableSlots[0].time;

    act(() => {
      result.current.selectTime(demoTime);
      result.current.setCustomerField("name", "山田太郎");
      result.current.setCustomerField("email", "yamada@example.com");
    });

    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
    expect(reservationClient.submitReservation).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: demoServiceId, date: "2026-09-15", time: demoTime }),
    );
    expect(result.current.submitStatus).toBe("success");
    expect(result.current.submitResult).toEqual({ reservationId: "RES-REAL-ID" });
  });

  it("normal mode (demoMode omitted) still uses the real GAS path and a real GAS failure remains a real error", async () => {
    mockCatalog({ servicesOk: false });
    const { result } = renderHook(() => useReservationWizard(wizardConfig));
    await waitFor(() => expect(result.current.catalogStatus).toBe("error"));
    expect(result.current.catalogError).toBe("サーバーエラーが発生しました。");
    expect(result.current.dataSource).toBe("runtime");
  });
});

describe("useReservationWizard — reservation submit gate (submitEnabled)", () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.GAS_WEBAPP_URL;
  });

  async function fillAndReady(config: Partial<{ demoMode: boolean; submitEnabled: boolean }> = {}) {
    if (!config.demoMode) {
      mockCatalog();
    }
    (reservationClient.getAvailability as jest.Mock).mockResolvedValue({
      ok: true,
      data: { date: "2026-09-10", slots: [{ time: "10:00" }] },
    });
    const { result } = renderHook(() => useReservationWizard({ ...wizardConfig, ...config }));
    await waitFor(() => expect(result.current.catalogStatus).toBe("ready"));
    const serviceId = result.current.services[0].serviceId;
    const date = config.demoMode ? "2026-09-15" : "2026-09-10"; // demo hours: Tuesday 10:00-19:00
    act(() => {
      result.current.selectService(serviceId);
      result.current.selectDate(date);
    });
    await waitFor(() => expect(result.current.availabilityStatus).toBe("ready"));
    const time = result.current.availableSlots[0].time;
    act(() => result.current.selectTime(time));
    await waitFor(() => expect(result.current.staffAvailabilityStatus).toBe("ready"));
    act(() => {
      result.current.setCustomerField("name", "山田太郎");
      result.current.setCustomerField("email", "yamada@example.com");
    });
    return result;
  }

  it("submitEnabled=false uses the local demo submission and never calls reservationClient.submitReservation", async () => {
    const result = await fillAndReady({ submitEnabled: false });
    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).not.toHaveBeenCalled();
    expect(result.current.submitStatus).toBe("success");
    expect(result.current.submitResult?.isDemo).toBe(true);
    expect(result.current.submitResult?.reservationId).toMatch(/^DEMO-/);
  });

  it("safety case: demoMode=true, submitEnabled=false, and GAS_WEBAPP_URL configured — submit still never reaches the real client", async () => {
    process.env.GAS_WEBAPP_URL = "https://real.example.com/exec";
    const result = await fillAndReady({ demoMode: true, submitEnabled: false });
    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).not.toHaveBeenCalled();
    expect(result.current.submitStatus).toBe("success");
    expect(result.current.submitResult?.isDemo).toBe(true);
  });

  it("submitEnabled=true, demoMode=false (production) uses the real submit client", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-REAL" },
    });
    const result = await fillAndReady({ demoMode: false, submitEnabled: true });
    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
    expect(result.current.submitResult).toEqual({ reservationId: "RES-REAL" });
  });

  it("submitEnabled omitted defaults to true — existing real-GAS behavior for callers that don't pass it", async () => {
    (reservationClient.submitReservation as jest.Mock).mockResolvedValue({
      ok: true,
      data: { reservationId: "RES-REAL-2" },
    });
    const result = await fillAndReady({});
    await act(async () => result.current.submit());

    expect(reservationClient.submitReservation).toHaveBeenCalledTimes(1);
  });
});
