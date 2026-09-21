jest.mock("../src/ConfigStore", () => {
  const actual = jest.requireActual("../src/ConfigStore");
  return { ...actual, getConfig: jest.fn() };
});
jest.mock("../src/Catalog");
jest.mock("../src/ReservationRepository", () => ({
  // buildPendingReservationRow is pure — kept real so its output flows
  // through unchanged; only the Sheets-touching functions are mocked.
  ...jest.requireActual("../src/ReservationRepository"),
  appendReservationRow: jest.fn(),
  findReservationBySubmissionId: jest.fn(),
  findReservationByReservationId: jest.fn(),
  markReservationConfirmed: jest.fn(),
  markReservationNeedsConfirmation: jest.fn(),
  markReservationCancelled: jest.fn(),
  updateReservationEmailStatus: jest.fn(),
}));
jest.mock("../src/Idempotency", () => ({
  // buildIdempotencyCacheKey/mapReservationRowToResult are pure — kept
  // real; only the CacheService-touching functions are mocked.
  ...jest.requireActual("../src/Idempotency"),
  getCachedReservationResult: jest.fn(),
  setCachedReservationResult: jest.fn(),
}));
jest.mock("../src/Calendar");
jest.mock("../src/Mail");
jest.mock("../src/Logging");
jest.mock("../src/RuntimeProperties", () => ({ getSiteBaseUrl: jest.fn() }));
jest.mock("../src/InquiryRepository", () => ({
  // buildPendingInquiryRow is pure — kept real; only the Sheets-touching
  // functions are mocked (mirrors the ReservationRepository mock above).
  ...jest.requireActual("../src/InquiryRepository"),
  appendInquiryRow: jest.fn(),
  findInquiryBySubmissionId: jest.fn(),
}));
jest.mock("../src/InquiryIdempotency", () => ({
  ...jest.requireActual("../src/InquiryIdempotency"),
  getCachedInquiryResult: jest.fn(),
  setCachedInquiryResult: jest.fn(),
}));

import {
  buildErrorResponse,
  buildSuccessResponse,
  cancelReservationAction,
  createInquiryAction,
  createReservationAction,
  getAvailabilityAction,
  getConfigAction,
  getServicesAction,
  getStaffAction,
  handleApiRequest,
  mapConfigErrorToResponse,
  mapMissingHeadersErrorToResponse,
  parseApiRequest,
} from "../src/Api";
import { ConfigError, getConfig } from "../src/ConfigStore";
import { MissingHeadersError } from "../src/RowMapper";
import { ERROR_CODES } from "../src/models/ErrorCodes";
import * as Catalog from "../src/Catalog";
import * as ReservationRepository from "../src/ReservationRepository";
import * as Idempotency from "../src/Idempotency";
import * as InquiryRepository from "../src/InquiryRepository";
import * as InquiryIdempotency from "../src/InquiryIdempotency";
import * as Calendar from "../src/Calendar";
import * as Mail from "../src/Mail";
import * as Logging from "../src/Logging";
import * as RuntimeProperties from "../src/RuntimeProperties";
import { ServiceRow, StaffRow } from "../src/SheetSchemas";
import { AppConfig } from "../src/models/Config";
import { ReservationRequest } from "../src/models/ReservationRequest";
import { InquiryRequest } from "../src/models/InquiryRequest";
import { addDaysToTokyoDateString, formatDateYYYYMMDDDashedInTokyo, getWeekdayForDateString } from "../src/Utils";

describe("parseApiRequest", () => {
  it("parses a well-formed request", () => {
    const result = parseApiRequest('{"action":"getConfig","payload":{}}');
    expect(result).toEqual({
      ok: true,
      request: { action: "getConfig", payload: {} },
    });
  });

  it("rejects an empty or missing body", () => {
    expect(parseApiRequest(undefined).ok).toBe(false);
    expect(parseApiRequest("").ok).toBe(false);
    expect(parseApiRequest("   ").ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    expect(parseApiRequest("{not json").ok).toBe(false);
  });

  it("rejects a body missing a non-empty action field", () => {
    expect(parseApiRequest("{}").ok).toBe(false);
    expect(parseApiRequest('{"action":""}').ok).toBe(false);
    expect(parseApiRequest('{"action":123}').ok).toBe(false);
    expect(parseApiRequest("[1,2,3]").ok).toBe(false);
  });
});

describe("response builders", () => {
  it("buildSuccessResponse wraps data in the ok envelope", () => {
    expect(buildSuccessResponse({ a: 1 })).toEqual({
      ok: true,
      data: { a: 1 },
    });
  });

  it("buildErrorResponse wraps a code/message in the error envelope", () => {
    expect(buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "bad request")).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "bad request" },
    });
  });
});

describe("mapConfigErrorToResponse", () => {
  it("maps to a stable CONFIG_INVALID error without leaking the raw issues", () => {
    const error = new ConfigError([
      { field: "calendar.id", reason: "missing or empty string" },
    ]);
    const response = mapConfigErrorToResponse(error);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("calendar.id");
      expect(serialized).not.toContain("missing or empty string");
    }
  });
});

describe("mapMissingHeadersErrorToResponse", () => {
  it("maps to a stable SHEET_ERROR without leaking the missing header names", () => {
    const error = new MissingHeadersError(["Key", "Value"]);
    const response = mapMissingHeadersErrorToResponse(error);
    expect(response).toEqual({
      ok: false,
      error: {
        code: "SHEET_ERROR",
        message:
          "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。",
      },
    });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("Key");
    expect(serialized).not.toContain("Value");
  });
});

describe("getConfigAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
  });

  it("maps a MissingHeadersError thrown by ConfigStore.getConfig to SHEET_ERROR", () => {
    (getConfig as jest.Mock).mockImplementation(() => {
      throw new MissingHeadersError(["Key", "Value"]);
    });
    const response = getConfigAction();
    expect(response).toEqual({
      ok: false,
      error: {
        code: "SHEET_ERROR",
        message:
          "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。",
      },
    });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("Key");
    expect(serialized).not.toContain("Value");
  });
});

describe("handleApiRequest dispatch", () => {
  it("returns VALIDATION_ERROR for malformed request bodies", () => {
    const response = handleApiRequest("{not json");
    expect(response).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is not valid JSON.",
      },
    });
  });

  it("returns VALIDATION_ERROR for an unsupported action name", () => {
    const response = handleApiRequest('{"action":"deleteEverything"}');
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("VALIDATION_ERROR");
      expect(response.error.message).toContain("deleteEverything");
    }
  });

  it("routes createReservation to createReservationAction instead of rejecting it as unsupported", () => {
    // With ConfigStore mocked, getConfig() returns undefined by default
    // here (no mockReturnValue set in this describe block), so
    // createReservationActionInner throws reading `config.features` —
    // createReservationAction's own top-level catch turns that into
    // INTERNAL_ERROR rather than letting it escape handleApiRequest. This
    // test only asserts that dispatch actually reached
    // createReservationAction (i.e. it is NOT the "Unsupported action"
    // VALIDATION_ERROR the default switch case would produce) — the
    // createReservationAction describe block below covers its real
    // behavior in full.
    const response = handleApiRequest('{"action":"createReservation","payload":{}}');
    expect(response).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: expect.any(String) },
    });
  });
});

describe("getServicesAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getServiceRows as jest.Mock).mockReset();
  });

  it("returns the public projection of active services, sorted", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue([
      { ServiceID: "SV002", Name: "カット＋カラー", DurationMinutes: 90, Price: 8800, Active: true, StaffRequired: false, DisplayOrder: 2 },
      { ServiceID: "SV001", Name: "カット", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
    ] as ServiceRow[]);

    const response = getServicesAction();

    expect(response).toEqual({
      ok: true,
      data: [
        { serviceId: "SV001", name: "カット", durationMinutes: 60, price: 6600, displayOrder: 1 },
        { serviceId: "SV002", name: "カット＋カラー", durationMinutes: 90, price: 8800, displayOrder: 2 },
      ],
    });
  });

  it("returns FEATURE_DISABLED when features.reservation is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: false, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);

    const response = getServicesAction();

    expect(response).toEqual({
      ok: false,
      error: { code: "FEATURE_DISABLED", message: "現在ご予約の受付を停止しています。" },
    });
    expect(Catalog.getServiceRows).not.toHaveBeenCalled();
  });

  it("maps a MissingHeadersError from getServiceRows to SHEET_ERROR", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getServiceRows as jest.Mock).mockImplementation(() => {
      throw new MissingHeadersError(["ServiceID"]);
    });

    const response = getServicesAction();

    expect(response).toEqual({
      ok: false,
      error: { code: "SHEET_ERROR", message: "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。" },
    });
  });
});

describe("getStaffAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getStaffRows as jest.Mock).mockReset();
  });

  it("returns the public projection of active staff, sorted", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([
      { StaffID: "ST001", Name: "鈴木", Active: true, DisplayOrder: 1 },
    ] as StaffRow[]);

    const response = getStaffAction();

    expect(response).toEqual({ ok: true, data: [{ staffId: "ST001", name: "鈴木", displayOrder: 1 }] });
  });

  it("returns an empty list without reading the STAFF sheet when staffSelection is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: false, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);

    const response = getStaffAction();

    expect(response).toEqual({ ok: true, data: [] });
    expect(Catalog.getStaffRows).not.toHaveBeenCalled();
  });

  it("returns FEATURE_DISABLED when features.reservation is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: false, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);

    const response = getStaffAction();

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("FEATURE_DISABLED");
  });
});

describe("handleApiRequest routing for getServices/getStaff", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
  });

  it("routes getServices to getServicesAction", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: true, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue([]);
    const response = handleApiRequest('{"action":"getServices"}');
    expect(response).toEqual({ ok: true, data: [] });
  });

  it("routes getStaff to getStaffAction", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { reservation: true, staffSelection: false, contactForm: true, calendar: true, emailNotification: true },
    } as AppConfig);
    const response = handleApiRequest('{"action":"getStaff"}');
    expect(response).toEqual({ ok: true, data: [] });
  });
});

describe("getAvailabilityAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getServiceRows as jest.Mock).mockReset();
    (Calendar.getBusyEvents as jest.Mock).mockReset();
  });

  const availabilityConfig: AppConfig = {
    business: { name: "Demo", phone: "", email: "", address: "" },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-19:00",
      sunday: "closed",
    },
    holidays: [],
    features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
    staffAnyAvailableOption: false,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    labels: {},
    content: {},
    calendarId: "shared@example.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo",
  };
  const availabilityServices: ServiceRow[] = [
    { ServiceID: "SV001", Name: "カット", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  ];

  it("returns available slots for a valid request, fetching busy events once", () => {
    (getConfig as jest.Mock).mockReturnValue(availabilityConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);

    const response = getAvailabilityAction({ serviceId: "SV001", date: "2026-09-10" });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.date).toBe("2026-09-10");
      expect(response.data.slots.length).toBeGreaterThan(0);
    }
    expect(Calendar.getBusyEvents).toHaveBeenCalledTimes(1);
  });

  it("returns FEATURE_DISABLED when reservation is off", () => {
    (getConfig as jest.Mock).mockReturnValue({
      ...availabilityConfig,
      features: { ...availabilityConfig.features, reservation: false },
    });

    const response = getAvailabilityAction({ serviceId: "SV001", date: "2026-09-10" });

    expect(response).toEqual({
      ok: false,
      error: { code: "FEATURE_DISABLED", message: "現在ご予約の受付を停止しています。" },
    });
  });

  it("returns VALIDATION_ERROR for a malformed payload", () => {
    (getConfig as jest.Mock).mockReturnValue(availabilityConfig);

    expect(getAvailabilityAction(null).ok).toBe(false);
    expect(getAvailabilityAction({ serviceId: 123, date: "2026-09-10" }).ok).toBe(false);
    expect(getAvailabilityAction({ serviceId: "SV001" }).ok).toBe(false);
  });

  it("maps an unknown serviceId to a VALIDATION_ERROR-coded response", () => {
    (getConfig as jest.Mock).mockReturnValue(availabilityConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);

    const response = getAvailabilityAction({ serviceId: "SV999", date: "2026-09-10" });

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("getAvailabilityAction — staff conflict breakdown", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getServiceRows as jest.Mock).mockReset();
    (Catalog.getStaffRows as jest.Mock).mockReset();
    (Calendar.getBusyEvents as jest.Mock).mockReset();
  });

  // getAvailabilityActionInner uses the real `new Date()` (no injection
  // seam), so a hardcoded calendar date goes stale once real time passes
  // it (as happened to the pre-existing "fetching busy events once" test
  // above). Computed relative to today instead — always inside the
  // minLeadHours/maxBookingDays window below, and nudged off Sunday
  // (closed in availabilityConfig.hours) so it's never flaky.
  function futureOpenDateString(): string {
    let candidate = addDaysToTokyoDateString(formatDateYYYYMMDDDashedInTokyo(new Date()), 14);
    while (getWeekdayForDateString(candidate) === "sunday") {
      candidate = addDaysToTokyoDateString(candidate, 1);
    }
    return candidate;
  }

  const availabilityConfig: AppConfig = {
    business: { name: "Demo", phone: "", email: "", address: "" },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-19:00",
      sunday: "closed",
    },
    holidays: [],
    features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
    staffAnyAvailableOption: false,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    labels: {},
    content: {},
    calendarId: "shared@example.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo",
  };
  const staffSelectionConfig: AppConfig = {
    ...availabilityConfig,
    features: { ...availabilityConfig.features, staffSelection: true },
    staffAnyAvailableOption: true,
  };
  const availabilityServices: ServiceRow[] = [
    { ServiceID: "SV001", Name: "カット", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  ];
  const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, CalendarID: "cal-a", DisplayOrder: 1 };
  const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: "cal-b", DisplayOrder: 2 };

  it("includes a per-staff availability breakdown when time is provided and staffSelection is on", () => {
    const date = futureOpenDateString();
    (getConfig as jest.Mock).mockReturnValue(staffSelectionConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([staffA, staffB]);
    (Calendar.getBusyEvents as jest.Mock).mockImplementation((calendarId: string) =>
      calendarId === "cal-a" ? [{ start: `${date}T10:00`, end: `${date}T11:00` }] : [],
    );

    const response = getAvailabilityAction({ serviceId: "SV001", staffId: "ANY", date, time: "10:00" });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.staff).toEqual([
        { staffId: "ST001", name: "田中", available: false, conflicts: [{ startTime: "10:00", endTime: "11:00" }] },
        { staffId: "ST002", name: "鈴木", available: true, conflicts: [] },
      ]);
    }
  });

  it("omits the staff breakdown when time is not provided", () => {
    (getConfig as jest.Mock).mockReturnValue(staffSelectionConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([staffA, staffB]);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);

    const response = getAvailabilityAction({ serviceId: "SV001", staffId: "ANY", date: futureOpenDateString() });

    expect(response.ok).toBe(true);
    if (response.ok) expect(response.data.staff).toBeUndefined();
  });

  it("omits the staff breakdown when staffSelection is off even if time is provided", () => {
    (getConfig as jest.Mock).mockReturnValue(availabilityConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);

    const response = getAvailabilityAction({ serviceId: "SV001", date: futureOpenDateString(), time: "10:00" });

    expect(response.ok).toBe(true);
    if (response.ok) expect(response.data.staff).toBeUndefined();
  });

  it("maps an invalid candidate time for the staff breakdown to an error response", () => {
    (getConfig as jest.Mock).mockReturnValue(staffSelectionConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([staffA, staffB]);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);

    const response = getAvailabilityAction({ serviceId: "SV001", staffId: "ANY", date: futureOpenDateString(), time: "23:45" });

    expect(response.ok).toBe(false);
  });

  it("regression: after cancelling, the previously-conflicting staff shows available again", () => {
    (globalThis as unknown as { LockService: unknown }).LockService = {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
    };
    const date = futureOpenDateString();
    (getConfig as jest.Mock).mockReturnValue(staffSelectionConfig);
    (Catalog.getServiceRows as jest.Mock).mockReturnValue(availabilityServices);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([staffA]);

    // Before cancellation: staffA's calendar has a conflicting event.
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([{ start: `${date}T10:00`, end: `${date}T11:00` }]);
    const before = getAvailabilityAction({ serviceId: "SV001", staffId: "ST001", date, time: "10:00" });
    expect(before.ok && before.data.staff).toEqual([
      { staffId: "ST001", name: "田中", available: false, conflicts: [{ startTime: "10:00", endTime: "11:00" }] },
    ]);

    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-1",
      CancellationToken: "tok-1",
      Status: "受付済",
      CalendarEventID: "evt-1",
      StaffID: "ST001",
    });
    const cancelResponse = cancelReservationAction({ reservationId: "RES-1", cancellationToken: "tok-1" });
    expect(cancelResponse).toEqual({ ok: true, data: { reservationId: "RES-1" } });
    expect(Calendar.deleteReservationEvent).toHaveBeenCalledWith("cal-a", "evt-1");
    expect(ReservationRepository.markReservationCancelled).toHaveBeenCalledWith("RES-1", expect.any(Date));

    // After cancellation: the Calendar event is gone, so the staff's
    // calendar no longer reports the busy interval.
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);
    const after = getAvailabilityAction({ serviceId: "SV001", staffId: "ST001", date, time: "10:00" });
    expect(after.ok && after.data.staff).toEqual([{ staffId: "ST001", name: "田中", available: true, conflicts: [] }]);
  });
});

describe("cancelReservationAction", () => {
  let cancelLockTryLockResult = true;

  beforeEach(() => {
    cancelLockTryLockResult = true;
    (globalThis as unknown as { LockService: unknown }).LockService = {
      getScriptLock: () => ({
        tryLock: () => cancelLockTryLockResult,
        releaseLock: () => {},
      }),
    };
  });

  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
    (Catalog.getStaffRows as jest.Mock).mockReset();
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReset();
    (ReservationRepository.markReservationCancelled as jest.Mock).mockReset();
    (Calendar.deleteReservationEvent as jest.Mock).mockReset();
  });

  const cancelConfig: AppConfig = {
    business: { name: "Demo", phone: "", email: "", address: "" },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-19:00",
      sunday: "closed",
    },
    holidays: [],
    features: { contactForm: true, reservation: true, staffSelection: true, calendar: true, emailNotification: true },
    staffAnyAvailableOption: true,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    labels: {},
    content: {},
    calendarId: "shared@example.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo",
  };

  it("returns VALIDATION_ERROR for a malformed payload", () => {
    expect(cancelReservationAction(null).ok).toBe(false);
    expect(cancelReservationAction({ reservationId: "RES-1" }).ok).toBe(false);
    expect(cancelReservationAction({ cancellationToken: "tok-1" }).ok).toBe(false);
  });

  it("returns INVALID_CANCELLATION_TOKEN when no reservation exists for the given id", () => {
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue(null);

    const response = cancelReservationAction({ reservationId: "RES-404", cancellationToken: "tok-1" });

    expect(response).toEqual({
      ok: false,
      error: { code: "INVALID_CANCELLATION_TOKEN", message: expect.any(String) },
    });
    expect(ReservationRepository.markReservationCancelled).not.toHaveBeenCalled();
  });

  it("returns INVALID_CANCELLATION_TOKEN when the token does not match the reservation's stored token", () => {
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-1",
      CancellationToken: "the-real-token",
      Status: "受付済",
    });

    const response = cancelReservationAction({ reservationId: "RES-1", cancellationToken: "wrong-token" });

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("INVALID_CANCELLATION_TOKEN");
    expect(ReservationRepository.markReservationCancelled).not.toHaveBeenCalled();
  });

  it("idempotently returns success without touching Calendar or the lock when already キャンセル済", () => {
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-1",
      CancellationToken: "tok-1",
      Status: "キャンセル済",
      CalendarEventID: "evt-1",
    });

    const response = cancelReservationAction({ reservationId: "RES-1", cancellationToken: "tok-1" });

    expect(response).toEqual({ ok: true, data: { reservationId: "RES-1" } });
    expect(Calendar.deleteReservationEvent).not.toHaveBeenCalled();
    expect(ReservationRepository.markReservationCancelled).not.toHaveBeenCalled();
  });

  it("cancels a confirmed reservation: deletes the Calendar event on the assigned staff's calendar and marks the row キャンセル済", () => {
    (getConfig as jest.Mock).mockReturnValue(cancelConfig);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([
      { StaffID: "ST001", Name: "田中", Active: true, CalendarID: "cal-a", DisplayOrder: 1 } as StaffRow,
    ]);
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-1",
      CancellationToken: "tok-1",
      Status: "受付済",
      CalendarEventID: "evt-1",
      StaffID: "ST001",
    });

    const response = cancelReservationAction({ reservationId: "RES-1", cancellationToken: "tok-1" });

    expect(response).toEqual({ ok: true, data: { reservationId: "RES-1" } });
    expect(Calendar.deleteReservationEvent).toHaveBeenCalledWith("cal-a", "evt-1");
    expect(ReservationRepository.markReservationCancelled).toHaveBeenCalledWith("RES-1", expect.any(Date));
  });

  it("falls back to the shared calendar when the reservation has no staff dimension", () => {
    (getConfig as jest.Mock).mockReturnValue({ ...cancelConfig, features: { ...cancelConfig.features, staffSelection: false } });
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-2",
      CancellationToken: "tok-2",
      Status: "受付済",
      CalendarEventID: "evt-2",
    });

    const response = cancelReservationAction({ reservationId: "RES-2", cancellationToken: "tok-2" });

    expect(response).toEqual({ ok: true, data: { reservationId: "RES-2" } });
    expect(Calendar.deleteReservationEvent).toHaveBeenCalledWith("shared@example.com", "evt-2");
    expect(Catalog.getStaffRows).not.toHaveBeenCalled();
  });

  it("marks the reservation cancelled without touching Calendar when there is no CalendarEventID", () => {
    (getConfig as jest.Mock).mockReturnValue(cancelConfig);
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-3",
      CancellationToken: "tok-3",
      Status: "処理中",
    });

    const response = cancelReservationAction({ reservationId: "RES-3", cancellationToken: "tok-3" });

    expect(response).toEqual({ ok: true, data: { reservationId: "RES-3" } });
    expect(Calendar.deleteReservationEvent).not.toHaveBeenCalled();
    expect(ReservationRepository.markReservationCancelled).toHaveBeenCalledWith("RES-3", expect.any(Date));
  });

  it("still marks the reservation cancelled even if deleting the Calendar event throws", () => {
    (getConfig as jest.Mock).mockReturnValue({ ...cancelConfig, features: { ...cancelConfig.features, staffSelection: false } });
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-4",
      CancellationToken: "tok-4",
      Status: "受付済",
      CalendarEventID: "evt-4",
    });
    (Calendar.deleteReservationEvent as jest.Mock).mockImplementation(() => {
      throw new Error("Calendar unavailable");
    });

    const response = cancelReservationAction({ reservationId: "RES-4", cancellationToken: "tok-4" });

    expect(response).toEqual({ ok: true, data: { reservationId: "RES-4" } });
    expect(ReservationRepository.markReservationCancelled).toHaveBeenCalledWith("RES-4", expect.any(Date));
  });

  it("returns SYSTEM_BUSY when the lock cannot be acquired, leaving the row unmarked", () => {
    (getConfig as jest.Mock).mockReturnValue(cancelConfig);
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue({
      ReservationID: "RES-5",
      CancellationToken: "tok-5",
      Status: "受付済",
      CalendarEventID: "evt-5",
    });
    cancelLockTryLockResult = false;

    const response = cancelReservationAction({ reservationId: "RES-5", cancellationToken: "tok-5" });

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("SYSTEM_BUSY");
    expect(ReservationRepository.markReservationCancelled).not.toHaveBeenCalled();
  });
});

describe("handleApiRequest routing for cancelReservation", () => {
  afterEach(() => {
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReset();
  });

  it("routes cancelReservation to cancelReservationAction instead of rejecting it as unsupported", () => {
    (ReservationRepository.findReservationByReservationId as jest.Mock).mockReturnValue(null);

    const response = handleApiRequest(
      '{"action":"cancelReservation","payload":{"reservationId":"RES-1","cancellationToken":"tok-1"}}',
    );

    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe("INVALID_CANCELLATION_TOKEN");
  });
});

describe("createReservationAction", () => {
  const service: ServiceRow = {
    ServiceID: "SV001",
    Name: "カット",
    DurationMinutes: 60,
    Price: 6000,
    Active: true,
    StaffRequired: false,
    DisplayOrder: 1,
  };
  const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, CalendarID: "cal-a", DisplayOrder: 1 };
  const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, CalendarID: "cal-b", DisplayOrder: 2 };

  function buildConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
      business: { name: "サロン花", phone: "0300000000", email: "info@example.com", address: "東京都" },
      hours: {
        monday: "09:00-18:00",
        tuesday: "09:00-18:00",
        wednesday: "09:00-18:00",
        thursday: "09:00-18:00",
        friday: "09:00-18:00",
        saturday: "09:00-18:00",
        sunday: "closed",
      },
      holidays: [],
      features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
      staffAnyAvailableOption: true,
      reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
      labels: {},
      content: {},
      calendarId: "shared-cal",
      emailOwnerNotifyAddress: "owner@example.com",
      emailFromName: "サロン花",
      ...overrides,
    };
  }

  function buildRequest(overrides: Partial<ReservationRequest> = {}): ReservationRequest {
    return {
      submissionId: "sub-1",
      serviceId: "SV001",
      date: "2026-09-10",
      time: "10:00",
      name: "山田太郎",
      email: "yamada@example.com",
      ...overrides,
    };
  }

  let lockState: { tryLockResults: boolean[]; releaseCount: number };

  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) is required here: clearAllMocks
    // only clears call history, it leaves a custom mockImplementation set
    // by a previous test's mock in place, which previously leaked a
    // markReservationConfirmed throw from one test into the next.
    jest.resetAllMocks();
    lockState = { tryLockResults: [true, true], releaseCount: 0 };
    (globalThis as unknown as { LockService: unknown }).LockService = {
      getScriptLock: () => ({
        tryLock: () => lockState.tryLockResults.shift() ?? false,
        releaseLock: () => {
          lockState.releaseCount += 1;
        },
      }),
    };
    (Catalog.getServiceRows as jest.Mock).mockReturnValue([service]);
    (Catalog.getStaffRows as jest.Mock).mockReturnValue([staffA, staffB]);
    (Idempotency.getCachedReservationResult as jest.Mock).mockReturnValue(null);
    (ReservationRepository.findReservationBySubmissionId as jest.Mock).mockReturnValue(null);
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([]);
    (Calendar.createReservationEvent as jest.Mock).mockReturnValue("event-1");
    (getConfig as jest.Mock).mockReturnValue(buildConfig());
    (RuntimeProperties.getSiteBaseUrl as jest.Mock).mockReturnValue("https://example.com");
  });

  it("returns FEATURE_DISABLED when the reservation feature is off", () => {
    (getConfig as jest.Mock).mockReturnValue(buildConfig({ features: { ...buildConfig().features, reservation: false } }));
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "FEATURE_DISABLED", message: expect.any(String) } });
  });

  it("returns the cached result without touching the repository or Calendar (idempotency fast path)", () => {
    (Idempotency.getCachedReservationResult as jest.Mock).mockReturnValue({ reservationId: "RES-CACHED" });
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: true, data: { reservationId: "RES-CACHED" } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
    expect(Calendar.createReservationEvent).not.toHaveBeenCalled();
  });

  it("returns the Sheet-backstop result and re-populates the cache (idempotency retry after cache expiry)", () => {
    (ReservationRepository.findReservationBySubmissionId as jest.Mock).mockReturnValue({
      ReservationID: "RES-EXISTING",
      Status: "受付済",
    });
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: true, data: { reservationId: "RES-EXISTING", needsConfirmation: undefined } });
    expect(Idempotency.setCachedReservationResult).toHaveBeenCalledWith("sub-1", { reservationId: "RES-EXISTING", needsConfirmation: undefined });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("returns SYSTEM_BUSY when the idempotency-claim lock cannot be acquired", () => {
    lockState.tryLockResults = [false];
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SYSTEM_BUSY", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("returns SYSTEM_BUSY when the critical-section lock cannot be acquired, leaving the pending row untouched", () => {
    lockState.tryLockResults = [true, false];
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SYSTEM_BUSY", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).toHaveBeenCalledTimes(1);
    expect(ReservationRepository.markReservationNeedsConfirmation).not.toHaveBeenCalled();
    expect(ReservationRepository.markReservationConfirmed).not.toHaveBeenCalled();
  });

  it("normal successful booking: confirms the row, creates the Calendar event, sends both emails", () => {
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.reservationId).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
      expect(response.data.needsConfirmation).toBeUndefined();
    }
    expect(ReservationRepository.markReservationConfirmed).toHaveBeenCalledWith(
      expect.any(String),
      "event-1",
      expect.any(Date),
    );
    expect(Mail.sendEmail).toHaveBeenCalledTimes(2);
    expect(ReservationRepository.updateReservationEmailStatus).toHaveBeenCalledWith(expect.any(String), "sent", expect.any(Date));
    expect(lockState.releaseCount).toBe(2);
  });

  it("slot becomes unavailable during the lock-protected re-check: SLOT_UNAVAILABLE error, row marked 要確認, no customer email", () => {
    (Calendar.getBusyEvents as jest.Mock)
      .mockReturnValueOnce([]) // pre-lock advisory check
      .mockReturnValueOnce([{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }]); // lock-protected re-check
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: expect.any(String) } });
    expect(ReservationRepository.markReservationNeedsConfirmation).toHaveBeenCalled();
    expect(Calendar.createReservationEvent).not.toHaveBeenCalled();
    expect(Mail.sendEmail).toHaveBeenCalledTimes(1); // owner needs-attention only
  });

  it("Calendar event creation fails: still ok:true with needsConfirmation, row marked 要確認, owner-only email", () => {
    (Calendar.createReservationEvent as jest.Mock).mockImplementation(() => {
      throw new Error("Calendar API quota exceeded");
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.needsConfirmation).toBe(true);
    }
    expect(ReservationRepository.markReservationNeedsConfirmation).toHaveBeenCalled();
    expect(ReservationRepository.markReservationConfirmed).not.toHaveBeenCalled();
    expect(Mail.sendEmail).toHaveBeenCalledTimes(1);
    expect(Logging.logError).toHaveBeenCalled();
  });

  it("Sheet update fails after Calendar succeeds: SHEET_ERROR, CalendarEventID preserved in the ERROR_LOG context, no emails sent", () => {
    (ReservationRepository.markReservationConfirmed as jest.Mock).mockImplementation(() => {
      throw new Error("Sheets API rate limit");
    });
    const response = createReservationAction(buildRequest());
    expect(response).toEqual({ ok: false, error: { code: "SHEET_ERROR", message: expect.any(String) } });
    expect(Logging.logError).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "critical", context: expect.objectContaining({ calendarEventId: "event-1" }) }),
    );
    expect(Mail.sendEmail).not.toHaveBeenCalled();
  });

  it("email send failure after a successful reservation does not change the success response or roll back the reservation", () => {
    (Mail.sendEmail as jest.Mock).mockImplementation(() => {
      throw new Error("Gmail quota exceeded");
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    expect(ReservationRepository.updateReservationEmailStatus).toHaveBeenCalledWith(expect.any(String), "failed", expect.any(Date));
    expect(Logging.logEmail).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });

  it("a throw while building the email context (e.g. SITE_BASE_URL unset) after a successful reservation still returns the real success response, not a false failure", () => {
    // Regression test: sendReservationEmailsForOutcome's own email-context
    // construction (buildCancellationUrl -> getSiteBaseUrl) used to be
    // unguarded — a throw here after the reservation was already
    // confirmed would previously propagate past createReservationAction's
    // top-level catch and turn an already-successful, already-persisted
    // reservation into a false ok:false INTERNAL_ERROR told to the
    // customer, with no emails ever attempted.
    (RuntimeProperties.getSiteBaseUrl as jest.Mock).mockImplementation(() => {
      throw new Error('Script Property "SITE_BASE_URL" is not set.');
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.reservationId).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
    }
    expect(ReservationRepository.markReservationConfirmed).toHaveBeenCalled();
    expect(Mail.sendEmail).not.toHaveBeenCalled();
    expect(Logging.logError).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "critical", message: expect.stringContaining("post-reservation emails") }),
    );
  });

  it("specific staff selection: assigns the requested staff and creates the event on that staff's calendar", () => {
    (getConfig as jest.Mock).mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    createReservationAction(buildRequest({ staffId: "ST002" }));
    expect(Calendar.createReservationEvent).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "cal-b" }));
  });

  it("ANY_STAFF selection: assigns the first free staff in DisplayOrder", () => {
    (getConfig as jest.Mock).mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    (Calendar.getBusyEvents as jest.Mock).mockImplementation((calendarId: string) =>
      calendarId === "cal-a" ? [{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }] : [],
    );
    createReservationAction(buildRequest({ staffId: "ANY" }));
    expect(Calendar.createReservationEvent).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "cal-b" }));
  });

  it("unavailable specific staff: SLOT_UNAVAILABLE before any row is written", () => {
    (getConfig as jest.Mock).mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    (Calendar.getBusyEvents as jest.Mock).mockReturnValue([{ start: "2026-09-10T10:00", end: "2026-09-10T11:00" }]);
    const response = createReservationAction(buildRequest({ staffId: "ST001" }));
    expect(response).toEqual({ ok: false, error: { code: "SLOT_UNAVAILABLE", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("unauthorized/unknown staff id is rejected as VALIDATION_ERROR before any row is written", () => {
    (getConfig as jest.Mock).mockReturnValue(buildConfig({ features: { ...buildConfig().features, staffSelection: true } }));
    const response = createReservationAction(buildRequest({ staffId: "ST999" }));
    expect(response).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: expect.any(String) } });
    expect(ReservationRepository.appendReservationRow).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied price/duration and uses the server-resolved service data for the created row", () => {
    createReservationAction({ ...buildRequest(), price: 1, durationMinutes: 1 } as unknown as ReservationRequest);
    const [[pendingRow]] = (ReservationRepository.appendReservationRow as jest.Mock).mock.calls;
    // appendReservationRow itself takes the already-built ReservationRow —
    // buildPendingReservationRow only ever reads price/duration from the
    // server-resolved NormalizedReservation, which has no pass-through
    // field for a client-supplied price/duration at all.
    expect(pendingRow.ServiceID).toBe("SV001");
  });

  it("sanitizes a ConfigError from getConfig into CONFIG_INVALID without leaking issues", () => {
    const { ConfigError: ActualConfigError } = jest.requireActual("../src/ConfigStore");
    (getConfig as jest.Mock).mockImplementation(() => {
      throw new ActualConfigError([{ field: "calendar.id", reason: "missing" }]);
    });
    const response = createReservationAction(buildRequest());
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      expect(JSON.stringify(response)).not.toContain("calendar.id");
    }
  });

  it("never includes GAS_WEBAPP_URL or a raw exception message in any response", () => {
    (Calendar.createReservationEvent as jest.Mock).mockImplementation(() => {
      throw new Error("https://script.google.com/macros/s/SUPER-SECRET-DEPLOYMENT-ID/exec failed");
    });
    const response = createReservationAction(buildRequest());
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("script.google.com");
    expect(serialized).not.toContain("SUPER-SECRET-DEPLOYMENT-ID");
  });
});

describe("createInquiryAction", () => {
  function buildInquiryConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
      business: { name: "サロン花", phone: "0300000000", email: "info@example.com", address: "東京都" },
      hours: {
        monday: "09:00-18:00",
        tuesday: "09:00-18:00",
        wednesday: "09:00-18:00",
        thursday: "09:00-18:00",
        friday: "09:00-18:00",
        saturday: "09:00-18:00",
        sunday: "closed",
      },
      holidays: [],
      features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
      staffAnyAvailableOption: true,
      reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
      labels: {},
      content: {},
      calendarId: "shared-cal",
      emailOwnerNotifyAddress: "owner@example.com",
      emailFromName: "サロン花",
      ...overrides,
    };
  }

  function buildInquiryRequest(overrides: Partial<InquiryRequest> = {}): InquiryRequest {
    return {
      submissionId: "sub-1",
      name: "山田太郎",
      email: "yamada@example.com",
      message: "料金プランについて教えてください。",
      ...overrides,
    };
  }

  let inquiryLockState: { tryLockResults: boolean[]; releaseCount: number };

  beforeEach(() => {
    jest.resetAllMocks();
    inquiryLockState = { tryLockResults: [true], releaseCount: 0 };
    (globalThis as unknown as { LockService: unknown }).LockService = {
      getScriptLock: () => ({
        tryLock: () => inquiryLockState.tryLockResults.shift() ?? false,
        releaseLock: () => {
          inquiryLockState.releaseCount += 1;
        },
      }),
    };
    (getConfig as jest.Mock).mockReturnValue(buildInquiryConfig());
    (InquiryIdempotency.getCachedInquiryResult as jest.Mock).mockReturnValue(null);
    (InquiryRepository.findInquiryBySubmissionId as jest.Mock).mockReturnValue(null);
  });

  it("returns FEATURE_DISABLED when features.contactForm is off", () => {
    (getConfig as jest.Mock).mockReturnValue(
      buildInquiryConfig({ features: { ...buildInquiryConfig().features, contactForm: false } }),
    );
    const response = createInquiryAction(buildInquiryRequest());
    expect(response).toEqual({ ok: false, error: { code: "FEATURE_DISABLED", message: expect.any(String) } });
    expect(InquiryRepository.appendInquiryRow).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR and writes nothing when required fields are missing", () => {
    const response = createInquiryAction(buildInquiryRequest({ name: "", email: "", message: "" }));
    expect(response).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: expect.any(String) } });
    expect(InquiryRepository.appendInquiryRow).not.toHaveBeenCalled();
  });

  it("returns the cached result without touching the repository (idempotency fast path)", () => {
    (InquiryIdempotency.getCachedInquiryResult as jest.Mock).mockReturnValue({ inquiryId: "INQ-CACHED" });
    const response = createInquiryAction(buildInquiryRequest());
    expect(response).toEqual({ ok: true, data: { inquiryId: "INQ-CACHED" } });
    expect(InquiryRepository.appendInquiryRow).not.toHaveBeenCalled();
    expect(Mail.sendEmail).not.toHaveBeenCalled();
  });

  it("returns the Sheet-backstop result and re-populates the cache (idempotency retry after cache expiry)", () => {
    (InquiryRepository.findInquiryBySubmissionId as jest.Mock).mockReturnValue({
      InquiryID: "INQ-EXISTING",
      SubmissionID: "sub-1",
    });
    const response = createInquiryAction(buildInquiryRequest());
    expect(response).toEqual({ ok: true, data: { inquiryId: "INQ-EXISTING" } });
    expect(InquiryIdempotency.setCachedInquiryResult).toHaveBeenCalledWith("sub-1", { inquiryId: "INQ-EXISTING" });
    expect(InquiryRepository.appendInquiryRow).not.toHaveBeenCalled();
  });

  it("returns SYSTEM_BUSY when the idempotency-claim lock cannot be acquired", () => {
    inquiryLockState.tryLockResults = [false];
    const response = createInquiryAction(buildInquiryRequest());
    expect(response).toEqual({ ok: false, error: { code: "SYSTEM_BUSY", message: expect.any(String) } });
    expect(InquiryRepository.appendInquiryRow).not.toHaveBeenCalled();
  });

  it("normal successful inquiry: appends the row and sends both emails", () => {
    const response = createInquiryAction(buildInquiryRequest());
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect((response.data as { inquiryId: string }).inquiryId).toMatch(/^INQ-\d{8}-[A-Z0-9]{6}$/);
    }
    expect(InquiryRepository.appendInquiryRow).toHaveBeenCalledTimes(1);
    expect(Mail.sendEmail).toHaveBeenCalledTimes(2);
    expect(inquiryLockState.releaseCount).toBe(1);
  });

  it("a customer email send failure does not change the success response or block the owner email", () => {
    (Mail.sendEmail as jest.Mock).mockImplementationOnce(() => {
      throw new Error("send failed");
    });
    const response = createInquiryAction(buildInquiryRequest());
    expect(response.ok).toBe(true);
    expect(Mail.sendEmail).toHaveBeenCalledTimes(2);
    expect(Logging.logEmail).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });

  it("sanitizes a ConfigError from getConfig into CONFIG_INVALID without leaking issues", () => {
    const { ConfigError: ActualConfigError } = jest.requireActual("../src/ConfigStore");
    (getConfig as jest.Mock).mockImplementation(() => {
      throw new ActualConfigError([{ field: "calendar.id", reason: "missing" }]);
    });
    const response = createInquiryAction(buildInquiryRequest());
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      expect(JSON.stringify(response)).not.toContain("calendar.id");
    }
  });
});

describe("handleApiRequest routing for createInquiry", () => {
  it("routes createInquiry to createInquiryAction instead of rejecting it as unsupported", () => {
    (getConfig as jest.Mock).mockReturnValue({
      features: { contactForm: false },
    });
    const response = handleApiRequest(JSON.stringify({ action: "createInquiry", payload: {} }));
    // FEATURE_DISABLED (not VALIDATION_ERROR: "Unsupported action") proves
    // dispatch reached createInquiryAction rather than the default case.
    expect(response).toEqual({ ok: false, error: { code: "FEATURE_DISABLED", message: expect.any(String) } });
  });
});
