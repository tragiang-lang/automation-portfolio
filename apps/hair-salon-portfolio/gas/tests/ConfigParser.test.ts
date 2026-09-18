import {
  buildRawConfigMap,
  parseAppConfig,
  parseJsonSafely,
  parseNonEmptyString,
  parseStrictBoolean,
  parseStrictNumber,
} from "../src/ConfigParser";

describe("buildRawConfigMap", () => {
  it("trims keys and keeps values as-is", () => {
    const map = buildRawConfigMap([
      { Key: " business.name ", Value: "Demo Salon" },
      { Key: "reservation.slotMinutes", Value: 30 },
    ]);
    expect(map).toEqual({
      "business.name": "Demo Salon",
      "reservation.slotMinutes": 30,
    });
  });

  it("first occurrence of a duplicate key wins", () => {
    const map = buildRawConfigMap([
      { Key: "calendar.id", Value: "first" },
      { Key: "calendar.id", Value: "second" },
    ]);
    expect(map["calendar.id"]).toBe("first");
  });

  it("ignores rows with an empty key", () => {
    const map = buildRawConfigMap([{ Key: "", Value: "ignored" }]);
    expect(map).toEqual({});
  });
});

describe("parseStrictBoolean", () => {
  it("accepts a native boolean", () => {
    expect(parseStrictBoolean(true)).toBe(true);
    expect(parseStrictBoolean(false)).toBe(false);
  });

  it("accepts the exact strings true/false, any case, trimmed", () => {
    expect(parseStrictBoolean(" TRUE ")).toBe(true);
    expect(parseStrictBoolean("false")).toBe(false);
  });

  it("rejects ambiguous values", () => {
    expect(parseStrictBoolean("yes")).toBeUndefined();
    expect(parseStrictBoolean("no")).toBeUndefined();
    expect(parseStrictBoolean("1")).toBeUndefined();
    expect(parseStrictBoolean("0")).toBeUndefined();
    expect(parseStrictBoolean("")).toBeUndefined();
  });
});

describe("parseStrictNumber", () => {
  it("accepts a native finite number", () => {
    expect(parseStrictNumber(30)).toBe(30);
  });

  it("accepts a strict numeric string", () => {
    expect(parseStrictNumber(" 60 ")).toBe(60);
    expect(parseStrictNumber("1.5")).toBe(1.5);
  });

  it("rejects non-numeric or malformed strings", () => {
    expect(parseStrictNumber("abc")).toBeUndefined();
    expect(parseStrictNumber("Infinity")).toBeUndefined();
    expect(parseStrictNumber("1,000")).toBeUndefined();
    expect(parseStrictNumber("")).toBeUndefined();
  });
});

describe("parseNonEmptyString", () => {
  it("trims and accepts a non-empty string", () => {
    expect(parseNonEmptyString("  Demo Salon  ")).toBe("Demo Salon");
  });

  it("treats whitespace-only and non-string values as missing", () => {
    expect(parseNonEmptyString("   ")).toBeUndefined();
    expect(parseNonEmptyString(undefined)).toBeUndefined();
    expect(parseNonEmptyString(42)).toBeUndefined();
  });
});

describe("parseJsonSafely", () => {
  it("parses valid JSON", () => {
    expect(parseJsonSafely<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns undefined for malformed JSON instead of throwing", () => {
    expect(parseJsonSafely("{not json")).toBeUndefined();
  });

  it("returns undefined for empty or non-string input", () => {
    expect(parseJsonSafely("")).toBeUndefined();
    expect(parseJsonSafely(undefined)).toBeUndefined();
  });
});

function validRawConfig(): Record<string, unknown> {
  return {
    "business.name": "Demo Salon",
    "business.phone": "03-0000-0000",
    "business.email": "owner@example.com",
    "business.address": "東京都千代田区1-1-1",
    "hours.monday": "10:00-19:00",
    "hours.tuesday": "10:00-19:00",
    "hours.wednesday": "10:00-19:00",
    "hours.thursday": "10:00-19:00",
    "hours.friday": "10:00-19:00",
    "hours.saturday": "10:00-18:00",
    "hours.sunday": "closed",
    "reservation.timezone": "Asia/Tokyo",
    "reservation.slotMinutes": 30,
    "reservation.minLeadHours": 1,
    "reservation.maxBookingDays": 60,
    "features.contactForm": true,
    "features.reservation": true,
    "features.staffSelection": true,
    "features.calendar": true,
    "features.emailNotification": true,
    "staff.anyAvailableOption": true,
    "calendar.id": "primary",
    "email.ownerNotifyAddress": "owner@example.com",
    "email.fromName": "Demo Salon",
  };
}

describe("parseAppConfig", () => {
  it("parses a complete, well-typed raw config", () => {
    const result = parseAppConfig(validRawConfig(), ["2026-01-01"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.name).toBe("Demo Salon");
      expect(result.config.reservation.slotMinutes).toBe(30);
      expect(result.config.holidays).toEqual(["2026-01-01"]);
      expect(result.config.features.staffSelection).toBe(true);
    }
  });

  it("reports every missing required key as an issue", () => {
    const raw = validRawConfig();
    delete raw["business.name"];
    delete raw["calendar.id"];
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.issues.map((issue) => issue.field);
      expect(fields).toContain("business.name");
      expect(fields).toContain("calendar.id");
    }
  });

  it("reports a malformed boolean as an issue instead of coercing it", () => {
    const raw = validRawConfig();
    raw["features.reservation"] = "yes";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: "features.reservation" }),
      );
    }
  });

  it("reports a malformed number as an issue instead of coercing it", () => {
    const raw = validRawConfig();
    raw["reservation.slotMinutes"] = "thirty";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: "reservation.slotMinutes" }),
      );
    }
  });

  it("carries the sheet's actual reservation.timezone value through instead of hard-coding Asia/Tokyo (validation, not parsing, enforces the value)", () => {
    const raw = validRawConfig();
    raw["reservation.timezone"] = "America/New_York";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.reservation.timezone).toBe("America/New_York");
    }
  });
});

describe("parseAppConfig optional presentation fields (V1.1 Task 4)", () => {
  it("leaves nameLatin/tagline/postalCode/socialLinks undefined when absent, with no issues", () => {
    const result = parseAppConfig(validRawConfig(), []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.nameLatin).toBeUndefined();
      expect(result.config.business.tagline).toBeUndefined();
      expect(result.config.business.postalCode).toBeUndefined();
      expect(result.config.socialLinks).toBeUndefined();
    }
  });

  it("parses nameLatin/tagline/postalCode when present, trimmed", () => {
    const raw = validRawConfig();
    raw["business.nameLatin"] = "  Rin Nail & Eyelash  ";
    raw["business.tagline"] = " 静けさの中で。 ";
    raw["business.postalCode"] = " 〒104-0061 ";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.business.nameLatin).toBe("Rin Nail & Eyelash");
      expect(result.config.business.tagline).toBe("静けさの中で。");
      expect(result.config.business.postalCode).toBe("〒104-0061");
    }
  });

  it("builds socialLinks only from the social.* keys that are actually present", () => {
    const raw = validRawConfig();
    raw["social.instagram"] = "https://instagram.com/example";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.socialLinks).toEqual([
        { label: "Instagram", href: "https://instagram.com/example" },
      ]);
    }
  });

  it("orders socialLinks by SOCIAL_LINK_DEFINITIONS order, not CONFIG row order", () => {
    const raw = validRawConfig();
    raw["social.line"] = "https://line.me/example";
    raw["social.instagram"] = "https://instagram.com/example";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.socialLinks?.map((link) => link.label)).toEqual(["Instagram", "LINE"]);
    }
  });

  it("does not report an issue when business.nameLatin/tagline/postalCode/social.* keys are missing (required-key test stays unaffected)", () => {
    const result = parseAppConfig(validRawConfig(), []);
    expect(result.ok).toBe(true);
  });
});

describe("parseAppConfig labels/content overrides (Starter MVP reusability)", () => {
  it("leaves every labels/content field undefined when absent, with no issues", () => {
    const result = parseAppConfig(validRawConfig(), []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.labels).toEqual({});
      expect(result.config.content).toEqual({});
    }
  });

  it("parses labels.* keys when present, trimmed", () => {
    const raw = validRawConfig();
    raw["labels.service"] = "  ワークショップ  ";
    raw["labels.bookingCta"] = " 参加申込み ";
    raw["labels.inquiryMessage"] = " お問い合わせ・ご質問 ";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.labels).toEqual({
        service: "ワークショップ",
        bookingCta: "参加申込み",
        inquiryMessage: "お問い合わせ・ご質問",
      });
    }
  });

  it("parses content.* keys when present, trimmed", () => {
    const raw = validRawConfig();
    raw["content.heroSubheadline"] = " 週末開催のワークショップです。 ";
    raw["content.ctaHeading"] = " 参加をご検討の方へ ";
    const result = parseAppConfig(raw, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.content.heroSubheadline).toBe("週末開催のワークショップです。");
      expect(result.config.content.ctaHeading).toBe("参加をご検討の方へ");
    }
  });
});
