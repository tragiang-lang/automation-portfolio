/**
 * @jest-environment node
 *
 * `siteReportWorkflows.ts` is imported directly by the "use client"
 * `SiteReportScreen.tsx` (see that file's imports), so it must never pull
 * in the server-only `siteReportClient.ts` at runtime — its transport is
 * `fetch("/api/site-report")`, the same same-origin route proxy Salon's
 * `lib/api/reservationClient.ts` uses for `/api/gas`. These tests mock
 * `global.fetch` directly (not `siteReportClient`) specifically to prove
 * that boundary — mocking `siteReportClient` here would hide the exact P0
 * this file exists to fix.
 */
import { getSites, getWorkTypes, submitReport } from "./siteReportWorkflows";
import type { GetSitesResponseData, GetWorkTypesResponseData, SubmitReportInput, SubmitReportResponseData } from "@/types/api";

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getSites", () => {
  // Test 1 — calls the same-origin route proxy, never GAS_WEBAPP_URL directly
  it("POSTs GET_SITES with an empty payload to /api/site-report", async () => {
    mockFetchOnce({ ok: true, data: { sites: [] } });

    await getSites();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/site-report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_SITES", payload: {} }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Test 2 — returns typed response unchanged
  it("returns the typed GetSitesResponseData result unchanged", async () => {
    const data: GetSitesResponseData = {
      sites: [
        {
          siteId: "SITE-1",
          siteCode: "S001",
          name: "Test Site",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    mockFetchOnce({ ok: true, data });

    const result = await getSites();

    expect(result).toEqual({ ok: true, data });
  });

  it("returns the error envelope unchanged when the route reports ok:false", async () => {
    mockFetchOnce({ ok: false, error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." } });

    const result = await getSites();

    expect(result).toEqual({
      ok: false,
      error: { code: "SHEET_ERROR", message: "The Sites sheet could not be read." },
    });
  });

  // Test 3 — a network failure resolves to a NETWORK_ERROR envelope,
  // never an unhandled rejection (SiteReportScreen has no try/catch of its
  // own around getSites() for this case).
  it("resolves to a NETWORK_ERROR envelope when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const result = await getSites();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("resolves to an INVALID_RESPONSE envelope when the response body is not valid JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    });

    const result = await getSites();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_RESPONSE");
    }
  });
});

describe("getWorkTypes", () => {
  it("POSTs GET_WORK_TYPES with an empty payload to /api/site-report", async () => {
    mockFetchOnce({ ok: true, data: { workTypes: [] } });

    await getWorkTypes();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/site-report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_WORK_TYPES", payload: {} }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns the typed GetWorkTypesResponseData result unchanged", async () => {
    const data: GetWorkTypesResponseData = {
      workTypes: [{ code: "INSPECTION", name: "検査", status: "ACTIVE", sortOrder: 21 }],
    };
    mockFetchOnce({ ok: true, data });

    const result = await getWorkTypes();

    expect(result).toEqual({ ok: true, data });
  });
});

describe("submitReport", () => {
  const validInput: SubmitReportInput = {
    siteId: "SITE-1",
    lineUserId: "U1234567890",
    workerName: "Taro Yamada",
    reportDate: "2026-09-12",
    workType: "Inspection",
    comment: "All clear.",
    photos: [
      {
        fileName: "photo1.jpg",
        mimeType: "image/jpeg",
        base64Data: "ZmFrZS1iYXNlNjQtZGF0YQ==",
      },
    ],
  };

  // Test 5 — calls the same route with SUBMIT_REPORT
  it("POSTs SUBMIT_REPORT with the input unchanged to /api/site-report", async () => {
    mockFetchOnce({ ok: true, data: { reportId: "RPT-1", photoCount: 1, notificationSent: true } });

    await submitReport(validInput);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/site-report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_REPORT", payload: validInput }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("passes a report with zero photos through unchanged", async () => {
    const noPhotoInput: SubmitReportInput = { ...validInput, comment: undefined, photos: [] };
    mockFetchOnce({ ok: true, data: { reportId: "RPT-2", photoCount: 0, notificationSent: true } });

    await submitReport(noPhotoInput);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/site-report",
      expect.objectContaining({ body: JSON.stringify({ action: "SUBMIT_REPORT", payload: noPhotoInput }) }),
    );
  });

  // Test 7 — returns typed response
  it("returns the typed SubmitReportResponseData result unchanged", async () => {
    const data: SubmitReportResponseData = {
      reportId: "RPT-99",
      photoCount: 1,
      notificationSent: false,
    };
    mockFetchOnce({ ok: true, data });

    const result = await submitReport(validInput);

    expect(result).toEqual({ ok: true, data });
  });

  it("returns the error envelope unchanged when the route reports ok:false", async () => {
    mockFetchOnce({ ok: false, error: { code: "SITE_NOT_FOUND", message: "The selected site could not be found." } });

    const result = await submitReport(validInput);

    expect(result).toEqual({
      ok: false,
      error: { code: "SITE_NOT_FOUND", message: "The selected site could not be found." },
    });
  });

  // Test 8 — a network failure resolves to a NETWORK_ERROR envelope
  it("resolves to a NETWORK_ERROR envelope when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network down"));

    const result = await submitReport(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });
});
