import { parsePublicRuntimeConfig } from "./runtimeConfigValidator";
import type { PublicRuntimeConfig } from "@/types/runtime-config";

function validConfig(): PublicRuntimeConfig {
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
    reservation: { timezone: "Asia/Tokyo", slotMinutes: 30, minLeadHours: 1, maxBookingDays: 60 },
  };
}

describe("parsePublicRuntimeConfig", () => {
  it("accepts a fully valid config", () => {
    expect(parsePublicRuntimeConfig(validConfig())).toEqual(validConfig());
  });

  it("rejects a non-object value", () => {
    expect(parsePublicRuntimeConfig(null)).toBeNull();
    expect(parsePublicRuntimeConfig("nope")).toBeNull();
    expect(parsePublicRuntimeConfig(undefined)).toBeNull();
  });

  it("rejects a missing business field", () => {
    const config = validConfig() as unknown as Record<string, unknown>;
    delete config.business;
    expect(parsePublicRuntimeConfig(config)).toBeNull();
  });

  it("rejects a business field with the wrong type", () => {
    const config = validConfig();
    expect(
      parsePublicRuntimeConfig({ ...config, business: { ...config.business, name: 123 } }),
    ).toBeNull();
  });

  it("rejects hours missing a day", () => {
    const config = validConfig();
    const hours = { ...config.hours } as Record<string, unknown>;
    delete hours.sunday;
    expect(parsePublicRuntimeConfig({ ...config, hours })).toBeNull();
  });

  it("rejects holidays that aren't an array of strings", () => {
    const config = validConfig();
    expect(parsePublicRuntimeConfig({ ...config, holidays: "2026-01-01" })).toBeNull();
    expect(parsePublicRuntimeConfig({ ...config, holidays: [1, 2] })).toBeNull();
  });

  it("accepts an empty holidays array", () => {
    expect(parsePublicRuntimeConfig({ ...validConfig(), holidays: [] })).not.toBeNull();
  });

  it("rejects a feature flag with a non-boolean value", () => {
    const config = validConfig();
    expect(
      parsePublicRuntimeConfig({
        ...config,
        features: { ...config.features, reservation: "true" },
      }),
    ).toBeNull();
  });

  it("rejects a reservation settings object with a non-Asia/Tokyo timezone", () => {
    const config = validConfig();
    expect(
      parsePublicRuntimeConfig({
        ...config,
        reservation: { ...config.reservation, timezone: "UTC" },
      }),
    ).toBeNull();
  });

  it("rejects a reservation settings object with a non-numeric field", () => {
    const config = validConfig();
    expect(
      parsePublicRuntimeConfig({
        ...config,
        reservation: { ...config.reservation, slotMinutes: "30" },
      }),
    ).toBeNull();
  });
});
