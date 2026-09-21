import { cancelReservation, getAvailability, getServices, getStaff, submitReservation } from "./reservationClient";
import { ReservationSubmission } from "@/types/reservation";

const submission: ReservationSubmission = {
  submissionId: "sub-1",
  serviceId: "SV001",
  date: "2026-09-10",
  time: "10:00",
  name: "山田太郎",
  email: "yamada@example.com",
};

describe("submitReservation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs to /api/gas with the createReservation action and the submission as payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await submitReservation(submission);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "createReservation", payload: submission }),
      }),
    );
    expect(result).toEqual({ ok: true, data: { reservationId: "RES-20260910-X8K2MP" } });
  });

  it("returns a controlled NETWORK_ERROR when fetch itself throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const result = await submitReservation(submission);
    expect(result).toEqual({ ok: false, error: { code: "NETWORK_ERROR", message: expect.any(String) } });
  });

  it("returns a controlled INVALID_RESPONSE when the body is not valid JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    const result = await submitReservation(submission);
    expect(result).toEqual({ ok: false, error: { code: "INVALID_RESPONSE", message: expect.any(String) } });
  });

  it("forwards a GAS-originated failure envelope unchanged", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" } }),
    }) as unknown as typeof fetch;
    const result = await submitReservation(submission);
    expect(result).toEqual({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: "選択された時間帯はご利用いただけません。" } });
  });
});

describe("getServices", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the getServices action with no payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [{ serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getServices();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "getServices" }) }),
    );
    expect(result).toEqual({ ok: true, data: [{ serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 }] });
  });

  it("returns a controlled NETWORK_ERROR when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const result = await getServices();
    expect(result).toEqual({ ok: false, error: { code: "NETWORK_ERROR", message: expect.any(String) } });
  });
});

describe("getStaff", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the getStaff action", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getStaff();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "getStaff" }) }),
    );
    expect(result).toEqual({ ok: true, data: [] });
  });
});

describe("getAvailability", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the getAvailability action with the request as payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }] } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = { serviceId: "SV001", date: "2026-09-10" };
    const result = await getAvailability(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "getAvailability", payload: request }) }),
    );
    expect(result).toEqual({ ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }] } });
  });

  it("forwards a GAS-originated failure envelope unchanged", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "VALIDATION_ERROR", message: "選択されたメニューが見つかりません。" } }),
    }) as unknown as typeof fetch;
    const result = await getAvailability({ serviceId: "SV999", date: "2026-09-10" });
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: "選択されたメニューが見つかりません。" } });
  });

  it("includes time in the payload when provided, for the per-staff breakdown", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { date: "2026-09-10", slots: [{ time: "10:00" }], staff: [] } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = { serviceId: "SV001", date: "2026-09-10", time: "10:00" };
    await getAvailability(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ body: JSON.stringify({ action: "getAvailability", payload: request }) }),
    );
  });
});

describe("cancelReservation", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs the cancelReservation action with the request as payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { reservationId: "RES-1" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = { reservationId: "RES-1", cancellationToken: "tok-1" };
    const result = await cancelReservation(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gas",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "cancelReservation", payload: request }) }),
    );
    expect(result).toEqual({ ok: true, data: { reservationId: "RES-1" } });
  });

  it("forwards a GAS-originated failure envelope unchanged", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { code: "INVALID_CANCELLATION_TOKEN", message: "予約が見つかりません。" } }),
    }) as unknown as typeof fetch;
    const result = await cancelReservation({ reservationId: "RES-404", cancellationToken: "tok-1" });
    expect(result).toEqual({ ok: false, error: { code: "INVALID_CANCELLATION_TOKEN", message: "予約が見つかりません。" } });
  });
});
