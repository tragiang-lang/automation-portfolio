## Task 6: Public configuration projection

**Files:**
- Create: `apps/salon-portfolio/gas/src/PublicConfig.ts`
- Test: `apps/salon-portfolio/gas/tests/PublicConfig.test.ts`

**Interfaces:**
- Consumes: `AppConfig`, `PublicConfig` from `./models/Config`.
- Produces: `buildPublicConfig(config: AppConfig): PublicConfig`.

- [ ] **Step 1: Write the failing test `tests/PublicConfig.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/PublicConfig.test.ts`
Expected: FAIL — `Cannot find module '../src/PublicConfig'`.

- [ ] **Step 3: Write `PublicConfig.ts`**

```ts
import { AppConfig, PublicConfig } from "./models/Config";

/** Strips internal-only fields before a config is ever sent to the
 *  frontend (Phase 3A §20). calendarId and the owner-facing email
 *  settings must never appear in a getConfig response. */
export function buildPublicConfig(config: AppConfig): PublicConfig {
  return {
    business: config.business,
    hours: config.hours,
    holidays: config.holidays,
    features: config.features,
    staffAnyAvailableOption: config.staffAnyAvailableOption,
    reservation: config.reservation,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/PublicConfig.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/PublicConfig.ts apps/salon-portfolio/gas/tests/PublicConfig.test.ts
git commit -m "feat(gas): add public/private CONFIG projection"
```

---

