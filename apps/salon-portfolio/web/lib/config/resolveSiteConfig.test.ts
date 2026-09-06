import { resolveSiteConfig } from "./resolveSiteConfig";
import { SITE_CONFIG } from "@/config/demo-content";
import type { PublicRuntimeConfig } from "@/types/runtime-config";

const runtime: PublicRuntimeConfig = {
  business: {
    name: "新しい店名",
    phone: "03-9999-9999",
    email: "new@example.com",
    address: "新住所1-1-1",
  },
  hours: {
    monday: "closed",
    tuesday: "11:00-20:00",
    wednesday: "11:00-20:00",
    thursday: "11:00-20:00",
    friday: "11:00-20:00",
    saturday: "11:00-20:00",
    sunday: "11:00-18:00",
  },
  holidays: ["2026-08-01"],
  features: {
    contactForm: false,
    reservation: true,
    staffSelection: false,
    calendar: true,
    emailNotification: true,
  },
  staffAnyAvailableOption: false,
  reservation: { timezone: "Asia/Tokyo", slotMinutes: 45, minLeadHours: 2, maxBookingDays: 30 },
};

describe("resolveSiteConfig", () => {
  it("takes business name/phone/email/address/hours from the runtime config", () => {
    const siteConfig = resolveSiteConfig(runtime);
    expect(siteConfig.business.name).toBe("新しい店名");
    expect(siteConfig.business.phone).toBe("03-9999-9999");
    expect(siteConfig.business.email).toBe("new@example.com");
    expect(siteConfig.business.address).toBe("新住所1-1-1");
    expect(siteConfig.hours).toEqual(runtime.hours);
  });

  it("keeps nameLatin/tagline/postalCode/socialLinks from the frontend-owned demo config", () => {
    const siteConfig = resolveSiteConfig(runtime);
    expect(siteConfig.business.nameLatin).toBe(SITE_CONFIG.business.nameLatin);
    expect(siteConfig.business.tagline).toBe(SITE_CONFIG.business.tagline);
    expect(siteConfig.business.postalCode).toBe(SITE_CONFIG.business.postalCode);
    expect(siteConfig.socialLinks).toEqual(SITE_CONFIG.socialLinks);
  });

  it("maps the three UI-relevant feature flags and drops the backend-only ones", () => {
    const siteConfig = resolveSiteConfig(runtime);
    expect(siteConfig.features).toEqual({
      contactForm: false,
      reservation: true,
      staffSelection: false,
    });
    expect(siteConfig.features).not.toHaveProperty("calendar");
    expect(siteConfig.features).not.toHaveProperty("emailNotification");
  });

  it("carries staffAnyAvailableOption through unchanged", () => {
    expect(resolveSiteConfig(runtime).staffAnyAvailableOption).toBe(false);
  });
});
