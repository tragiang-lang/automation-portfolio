import { AppConfig } from "../src/models/Config";
import { validateAppConfig } from "../src/ConfigValidator";

function validConfig(): AppConfig {
  return {
    business: {
      name: "Demo Salon",
      phone: "03-0000-0000",
      email: "owner@example.com",
      address: "東京都千代田区1-1-1",
    },
    hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00",
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "10:00-18:00",
      sunday: "closed",
    },
    holidays: ["2026-01-01", "2026-01-02"],
    features: {
      contactForm: true,
      reservation: true,
      staffSelection: true,
      calendar: true,
      emailNotification: true,
    },
    staffAnyAvailableOption: true,
    reservation: {
      timezone: "Asia/Tokyo",
      slotMinutes: 30,
      minLeadHours: 1,
      maxBookingDays: 60,
    },
    labels: {},
    content: {},
    calendarId: "primary",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo Salon",
  };
}

describe("validateAppConfig", () => {
  it("returns no issues for a fully valid config", () => {
    expect(validateAppConfig(validConfig())).toEqual([]);
  });

  it("rejects a timezone other than Asia/Tokyo", () => {
    const config = validConfig();
    // @ts-expect-error — deliberately invalid for this test
    config.reservation.timezone = "UTC";
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "reservation.timezone" }),
    );
  });

  it("rejects a negative minLeadHours", () => {
    const config = validConfig();
    config.reservation.minLeadHours = -1;
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "reservation.minLeadHours" }),
    );
  });

  it("rejects a non-positive slotMinutes or maxBookingDays", () => {
    const config = validConfig();
    config.reservation.slotMinutes = 0;
    config.reservation.maxBookingDays = 0;
    const issues = validateAppConfig(config);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "reservation.slotMinutes" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "reservation.maxBookingDays" }),
    );
  });

  it("rejects malformed business hours", () => {
    const config = validConfig();
    config.hours.monday = "not-a-range";
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "hours.monday" }),
    );
  });

  it("rejects an invalid holiday date", () => {
    const config = validConfig();
    config.holidays = ["2026-02-30"];
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "holidays" }),
    );
  });

  it("rejects a malformed business or owner-notification email", () => {
    const config = validConfig();
    config.business.email = "not-an-email";
    config.emailOwnerNotifyAddress = "also-not-an-email";
    const issues = validateAppConfig(config);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "business.email" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "email.ownerNotifyAddress" }),
    );
  });

  it("rejects staff.anyAvailableOption=true when features.staffSelection is false", () => {
    const config = validConfig();
    config.features.staffSelection = false;
    config.staffAnyAvailableOption = true;
    expect(validateAppConfig(config)).toContainEqual(
      expect.objectContaining({ field: "staff.anyAvailableOption" }),
    );
  });

  it("allows staff.anyAvailableOption=false when features.staffSelection is false", () => {
    const config = validConfig();
    config.features.staffSelection = false;
    config.staffAnyAvailableOption = false;
    expect(validateAppConfig(config)).toEqual([]);
  });
});
