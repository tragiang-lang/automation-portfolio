import { AppConfig } from "../src/models/Config";
import { buildPublicConfig } from "../src/PublicConfig";

function fullConfig(): AppConfig {
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
    holidays: ["2026-01-01"],
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
    calendarId: "secret-calendar-id@group.calendar.google.com",
    emailOwnerNotifyAddress: "owner@example.com",
    emailFromName: "Demo Salon",
  };
}

describe("buildPublicConfig", () => {
  it("keeps every public field", () => {
    const result = buildPublicConfig(fullConfig());
    expect(result.business.name).toBe("Demo Salon");
    expect(result.hours.sunday).toBe("closed");
    expect(result.holidays).toEqual(["2026-01-01"]);
    expect(result.features.staffSelection).toBe(true);
    expect(result.staffAnyAvailableOption).toBe(true);
    expect(result.reservation.slotMinutes).toBe(30);
  });

  it("never includes calendarId or the owner-facing email settings", () => {
    const result = buildPublicConfig(fullConfig());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret-calendar-id");
    expect(result).not.toHaveProperty("calendarId");
    expect(result).not.toHaveProperty("emailOwnerNotifyAddress");
    expect(result).not.toHaveProperty("emailFromName");
  });
});
