import { evaluateAvailableSlots, resolveService, resolveStaffSelection } from "../src/ReservationRules";
import { ServiceRow, StaffRow } from "../src/SheetSchemas";
import { ANY_STAFF } from "../src/models/ReservationRequest";
import { AppConfig } from "../src/models/Config";
import { AvailabilityStrategy } from "../src/availability/AvailabilityStrategy";

const activeService: ServiceRow = {
  ServiceID: "SV001",
  Name: "ジェルネイル",
  DurationMinutes: 60,
  Price: 6000,
  Active: true,
  StaffRequired: false,
  DisplayOrder: 1,
};
const inactiveService: ServiceRow = { ...activeService, ServiceID: "SV002", Active: false };
const services = [activeService, inactiveService];

describe("resolveService", () => {
  it("resolves an active service by id", () => {
    const result = resolveService(services, "SV001");
    expect(result).toEqual({ ok: true, service: activeService });
  });

  it("rejects an unknown serviceId", () => {
    const result = resolveService(services, "SV999");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("MENU_NOT_FOUND");
  });

  it("rejects an inactive service", () => {
    const result = resolveService(services, "SV002");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("MENU_NOT_BOOKABLE");
  });

  it("rejects a service with a non-positive duration", () => {
    const badService: ServiceRow = { ...activeService, ServiceID: "SV003", DurationMinutes: 0 };
    const result = resolveService([badService], "SV003");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("MENU_NOT_BOOKABLE");
  });
});

const staffA: StaffRow = { StaffID: "ST001", Name: "田中", Active: true, DisplayOrder: 1 };
const staffB: StaffRow = { StaffID: "ST002", Name: "鈴木", Active: true, DisplayOrder: 2 };
const inactiveStaff: StaffRow = { StaffID: "ST003", Name: "佐藤", Active: false, DisplayOrder: 3 };
const staff = [staffA, staffB, inactiveStaff];

const configWithStaffSelection: Pick<AppConfig, "features" | "staffAnyAvailableOption"> = {
  features: {
    contactForm: true,
    reservation: true,
    staffSelection: true,
    calendar: true,
    emailNotification: true,
  },
  staffAnyAvailableOption: true,
};
const configWithoutStaffSelection: Pick<AppConfig, "features" | "staffAnyAvailableOption"> = {
  ...configWithStaffSelection,
  features: { ...configWithStaffSelection.features, staffSelection: false },
  staffAnyAvailableOption: false,
};
const configWithoutAnyOption: Pick<AppConfig, "features" | "staffAnyAvailableOption"> = {
  ...configWithStaffSelection,
  staffAnyAvailableOption: false,
};

describe("resolveStaffSelection", () => {
  it("resolves to 'none' when staffSelection is disabled, ignoring any staffId sent", () => {
    const result = resolveStaffSelection(staff, "ST001", configWithoutStaffSelection);
    expect(result).toEqual({ ok: true, selection: { kind: "none" } });
  });

  it("resolves a valid specific active staff member", () => {
    const result = resolveStaffSelection(staff, "ST001", configWithStaffSelection);
    expect(result).toEqual({ ok: true, selection: { kind: "specific", staff: staffA } });
  });

  it("rejects an unknown staffId", () => {
    const result = resolveStaffSelection(staff, "ST999", configWithStaffSelection);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("STAFF_NOT_FOUND");
  });

  it("rejects an inactive staffId", () => {
    const result = resolveStaffSelection(staff, "ST003", configWithStaffSelection);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("STAFF_NOT_FOUND");
  });

  it("resolves ANY_STAFF to the active-staff-in-DisplayOrder list when the option is enabled", () => {
    const result = resolveStaffSelection(staff, ANY_STAFF, configWithStaffSelection);
    expect(result).toEqual({ ok: true, selection: { kind: "any", eligibleStaff: [staffA, staffB] } });
  });

  it("rejects ANY_STAFF when staff.anyAvailableOption is disabled", () => {
    const result = resolveStaffSelection(staff, ANY_STAFF, configWithoutAnyOption);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("STAFF_SELECTION_NOT_SUPPORTED");
  });

  it("requires a staffId when staffSelection is enabled and none was sent", () => {
    const result = resolveStaffSelection(staff, undefined, configWithStaffSelection);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe("REQUIRED_FIELD_MISSING");
  });
});

import { evaluateBusinessDay, checkDateWindow } from "../src/ReservationRules";

const hoursConfig: Pick<AppConfig, "hours" | "holidays"> = {
  hours: {
    monday: "10:00-19:00",
    tuesday: "10:00-19:00",
    wednesday: "10:00-19:00",
    thursday: "10:00-19:00",
    friday: "10:00-19:00",
    saturday: "10:00-18:00",
    sunday: "closed",
  },
  holidays: ["2026-09-21"],
};

describe("evaluateBusinessDay", () => {
  it("is open on a normal weekday", () => {
    // 2026-09-10 is a Thursday
    expect(evaluateBusinessDay("2026-09-10", hoursConfig)).toEqual({ open: true, interval: "10:00-19:00" });
  });

  it("is closed on the configured closed weekday", () => {
    // 2026-09-06 is a Sunday
    expect(evaluateBusinessDay("2026-09-06", hoursConfig)).toEqual({ open: false, reason: "OUTSIDE_BUSINESS_HOURS" });
  });

  it("is closed on a holiday even though that weekday is normally open", () => {
    // 2026-09-21 is a Monday, normally open per hoursConfig
    expect(evaluateBusinessDay("2026-09-21", hoursConfig)).toEqual({ open: false, reason: "HOLIDAY" });
  });
});

describe("checkDateWindow", () => {
  const reservationSettings: AppConfig["reservation"] = {
    timezone: "Asia/Tokyo",
    slotMinutes: 30,
    minLeadHours: 2,
    maxBookingDays: 30,
  };

  it("accepts a date/time far enough in the future", () => {
    const now = new Date("2026-09-10T01:00:00.000Z"); // 2026-09-10 10:00 JST
    expect(checkDateWindow("2026-09-15", "10:00", reservationSettings, now)).toBeNull();
  });

  it("rejects a date/time inside the minimum lead time", () => {
    const now = new Date("2026-09-10T01:00:00.000Z"); // 2026-09-10 10:00 JST
    const issue = checkDateWindow("2026-09-10", "10:30", reservationSettings, now); // only 30min lead, needs 2h
    expect(issue?.code).toBe("PAST_DATE");
  });

  it("rejects a date beyond maxBookingDays", () => {
    const now = new Date("2026-09-10T01:00:00.000Z");
    const issue = checkDateWindow("2026-11-01", "10:00", reservationSettings, now);
    expect(issue?.code).toBe("OUTSIDE_BOOKING_WINDOW");
  });

  it("uses the Asia/Tokyo calendar date for 'today', not the UTC date", () => {
    // now = 2026-09-09T15:30:00Z = 2026-09-10T00:30 JST: Tokyo's "today"
    // is the 10th even though UTC's date is still the 9th. With
    // maxBookingDays=0 (only today bookable), requesting Tokyo's actual
    // today must be accepted — a UTC-based bug would compute "today" as
    // the 9th and wrongly reject the 10th as beyond the window.
    const now = new Date("2026-09-09T15:30:00.000Z");
    const zeroHorizon: AppConfig["reservation"] = { ...reservationSettings, minLeadHours: 0, maxBookingDays: 0 };
    expect(checkDateWindow("2026-09-10", "01:00", zeroHorizon, now)).toBeNull();
  });
});

import { evaluateReservationRequest } from "../src/ReservationRules";
import { createSharedAvailabilityStrategy } from "../src/availability/SharedAvailabilityStrategy";
import { createStaffAvailabilityStrategy } from "../src/availability/StaffAvailabilityStrategy";
import { ReservationRequest } from "../src/models/ReservationRequest";
// ServiceRow is already imported by Task 10's block above in the same file.

const fullConfig: AppConfig = {
  business: { name: "Salon", phone: "03-0000-0000", email: "owner@example.com", address: "Tokyo" },
  hours: hoursConfig.hours,
  holidays: hoursConfig.holidays,
  features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
  staffAnyAvailableOption: false,
  reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 0, maxBookingDays: 60 },
  labels: {},
  content: {},
  calendarId: "calendar-1",
  emailOwnerNotifyAddress: "owner@example.com",
  emailFromName: "Salon",
};

const now = new Date("2026-09-10T01:00:00.000Z"); // 2026-09-10 10:00 JST

function baseValidRequest(): ReservationRequest {
  return {
    submissionId: "sub-1",
    serviceId: "SV001",
    date: "2026-09-11", // a Friday, normally open
    time: "11:00",
    name: "田中太郎",
    email: "customer@example.com",
  };
}

describe("evaluateReservationRequest", () => {
  it("succeeds end to end with no staff dimension and a free calendar", () => {
    const result = evaluateReservationRequest({
      request: baseValidRequest(),
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reservation.serviceName).toBe("ジェルネイル");
      expect(result.reservation.startTime).toBe("11:00");
      expect(result.reservation.endTime).toBe("12:00");
      expect(result.reservation.reservationId).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
    }
  });

  it("rejects a request with a shape validation issue before touching any business rule", () => {
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), email: "not-an-email" },
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "INVALID_FORMAT")).toBe(true);
  });

  it("blocks a reservation on a holiday even though the weekday is normally open", () => {
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), date: "2026-09-21", time: "11:00" }, // configured holiday, a Monday
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "HOLIDAY")).toBe(true);
  });

  it("blocks a service whose duration would cross closing time", () => {
    const longService: ServiceRow = { ...activeService, ServiceID: "SV-LONG", DurationMinutes: 480 }; // 8 hours
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), serviceId: "SV-LONG", time: "18:00" },
      services: [longService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () => createSharedAvailabilityStrategy([]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "OUTSIDE_BUSINESS_HOURS")).toBe(true);
  });

  it("blocks a reservation that conflicts with an existing Calendar event", () => {
    const result = evaluateReservationRequest({
      request: baseValidRequest(),
      services: [activeService],
      staff: [],
      config: fullConfig,
      now,
      availabilityFor: () =>
        createSharedAvailabilityStrategy([{ start: "2026-09-11T11:00", end: "2026-09-11T12:00" }]),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "CALENDAR_CONFLICT")).toBe(true);
  });

  it("succeeds for 'any available staff' when at least one eligible staff member is free", () => {
    const staffConfig: AppConfig = {
      ...fullConfig,
      features: { ...fullConfig.features, staffSelection: true },
      staffAnyAvailableOption: true,
    };
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), staffId: ANY_STAFF },
      services: [activeService],
      staff: [staffA, staffB],
      config: staffConfig,
      now,
      availabilityFor: (_candidate, staffSelection) =>
        createStaffAvailabilityStrategy({
          staffSelection: ANY_STAFF,
          eligibleStaffIdsInOrder:
            staffSelection.kind === "any" ? staffSelection.eligibleStaff.map((member) => member.StaffID) : [],
          busyIntervalsByStaffId: {
            ST001: [{ start: "2026-09-11T11:00", end: "2026-09-11T12:00" }],
          },
        }),
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.reservation.assignedStaffId).toBe("ST002");
  });

  it("fails 'any available staff' when every eligible staff member is busy", () => {
    const staffConfig: AppConfig = {
      ...fullConfig,
      features: { ...fullConfig.features, staffSelection: true },
      staffAnyAvailableOption: true,
    };
    const busy = { start: "2026-09-11T11:00", end: "2026-09-11T12:00" };
    const result = evaluateReservationRequest({
      request: { ...baseValidRequest(), staffId: ANY_STAFF },
      services: [activeService],
      staff: [staffA, staffB],
      config: staffConfig,
      now,
      availabilityFor: (_candidate, staffSelection) =>
        createStaffAvailabilityStrategy({
          staffSelection: ANY_STAFF,
          eligibleStaffIdsInOrder:
            staffSelection.kind === "any" ? staffSelection.eligibleStaff.map((member) => member.StaffID) : [],
          busyIntervalsByStaffId: { ST001: [busy], ST002: [busy] },
        }),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.code === "NO_STAFF_AVAILABLE")).toBe(true);
  });
});

function fakeStrategy(unavailableTimes: string[] = []): AvailabilityStrategy {
  return {
    isAvailable(input) {
      const time = input.candidateStart.slice(11, 16);
      return unavailableTimes.includes(time)
        ? { available: false, reason: "CALENDAR_CONFLICT" }
        : { available: true };
    },
  };
}

describe("evaluateAvailableSlots", () => {
  const baseConfig: AppConfig = {
    business: { name: "Demo", phone: "", email: "", address: "" },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "closed",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-19:00",
      sunday: "closed",
    },
    holidays: ["2026-09-15"],
    features: { contactForm: true, reservation: true, staffSelection: false, calendar: true, emailNotification: true },
    staffAnyAvailableOption: true,
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
    labels: {},
    content: {},
    calendarId: "shared@example.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo",
  };
  const services: ServiceRow[] = [
    { ServiceID: "SV001", Name: "まつげパーマ", DurationMinutes: 60, Price: 6600, Active: true, StaffRequired: false, DisplayOrder: 1 },
  ];
  const staff: StaffRow[] = [{ StaffID: "ST001", Name: "鈴木", Active: true, DisplayOrder: 1 }];
  const staffEnabledConfig: AppConfig = { ...baseConfig, features: { ...baseConfig.features, staffSelection: true } };
  const now = new Date("2026-09-01T00:00:00+09:00");

  it("returns every open, available slot for a bookable weekday", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: undefined,
      date: "2026-09-10", // Thursday
      services,
      staff,
      config: baseConfig,
      now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots[0]).toEqual({ time: "10:00" });
    }
  });

  it("excludes slots the strategy reports as unavailable", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: undefined,
      date: "2026-09-10",
      services,
      staff,
      config: baseConfig,
      now,
      buildStrategy: () => fakeStrategy(["10:00", "10:30"]),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots.map((s) => s.time)).not.toContain("10:00");
      expect(result.slots.map((s) => s.time)).not.toContain("10:30");
    }
  });

  it("returns an empty slot list (not an error) for a holiday", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: undefined,
      date: "2026-09-15",
      services,
      staff,
      config: baseConfig,
      now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result).toEqual({ ok: true, slots: [] });
  });

  it("returns an empty slot list (not an error) for a day the salon is closed", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: undefined,
      date: "2026-09-09", // Wednesday
      services,
      staff,
      config: baseConfig,
      now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result).toEqual({ ok: true, slots: [] });
  });

  it("returns MENU_NOT_FOUND when the service does not exist", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV999",
      staffId: undefined,
      date: "2026-09-10",
      services,
      staff,
      config: baseConfig,
      now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe("MENU_NOT_FOUND");
  });

  it("returns STAFF_NOT_FOUND for an unknown staffId", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: "ST999",
      date: "2026-09-10",
      services,
      staff,
      config: staffEnabledConfig,
      now,
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe("STAFF_NOT_FOUND");
  });

  it("excludes slots inside the minimum lead time", () => {
    const result = evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: undefined,
      date: "2026-09-01", // same day as `now`, Tuesday
      services,
      staff,
      config: baseConfig,
      now: new Date("2026-09-01T18:45:00+09:00"),
      buildStrategy: () => fakeStrategy(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slots).toEqual([]); // 19:00 close, 1h lead time from 18:45 -> nothing left
  });

  it("passes the resolved staff selection to buildStrategy", () => {
    const buildStrategy = jest.fn().mockReturnValue(fakeStrategy());
    evaluateAvailableSlots({
      serviceId: "SV001",
      staffId: "ST001",
      date: "2026-09-10",
      services,
      staff,
      config: staffEnabledConfig,
      now,
      buildStrategy,
    });
    expect(buildStrategy).toHaveBeenCalledTimes(1);
    expect(buildStrategy).toHaveBeenCalledWith({ kind: "specific", staff: staff[0] });
  });
});
