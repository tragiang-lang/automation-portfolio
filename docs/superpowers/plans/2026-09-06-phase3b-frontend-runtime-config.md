# Phase 3B — Frontend Runtime Config Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's hard-coded business data (`web/config/demo-content.ts`) with runtime data fetched from the existing GAS `getConfig` action, while every presentation/visual concern stays frontend-owned and the Phase 2A/2C UI is visually unchanged.

**Architecture:** A server-only `gasClient.callGasAction()` talks to the GAS Web App. `lib/config/runtimeConfig.ts` wraps it in a `getRuntimeConfig()` loader (cached per-request via React `cache()`) that returns one of three explicit statuses — `runtime` (real GAS data), `demo-fallback` (no `GAS_WEBAPP_URL` configured — local/demo mode), or `runtime-error` (a configured GAS backend failed or returned a malformed shape). `resolveSiteConfig()` merges the validated runtime business data with the frontend's own presentation-only fields (`nameLatin`, `tagline`, `postalCode`, `socialLinks`) into the *same* `SiteConfig` shape every existing component already consumes, so no component's props change except where a feature flag now actually gates something it didn't before (the reservation CTA buttons). `app/layout.tsx` and `app/page.tsx` (already Server Components) call `getRuntimeConfig()` directly — not through an HTTP round-trip to the app's own `/api/gas` route, per Next.js's own guidance against a Server Component calling its own Route Handler over the network. `/api/gas` is still built as a thin generic proxy, because the project's architecture explicitly wants that boundary established (it currently has no caller — the next phase that adds a browser-initiated action, e.g. reservation submission, will be its first real user).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Jest + Testing Library (existing web app tooling — no new dependencies).

**Spec:** The Phase 3B task brief given in this conversation (frontend runtime config integration, `apps/salon-portfolio` — GAS backend at `apps/salon-portfolio/gas`, frontend at `apps/salon-portfolio/web`). Backend contract baseline: `apps/salon-portfolio/gas/src/Api.ts` (`getConfigAction`/`handleApiRequest`), `apps/salon-portfolio/gas/src/models/Config.ts` (`PublicConfig`), `docs/config-and-sheets-guide.md`, `docs/api-documentation.md`.

## Global Constraints

- No new npm dependencies in `web/` (no schema-validation library, no state-management library) — hand-written type guards, plain React/Next patterns only.
- `GAS_WEBAPP_URL` (and any future GAS auth) must never be read in a file importable by a Client Component, and must never appear in an error message returned to a browser.
- Only the `getConfig` action exists server-side; do not add new GAS actions or modify `gas/src/**` (Phase 3A is the approved, tested contract — inspection found no incompatibility, so zero GAS changes in this plan).
- `PublicConfig`'s exact fields (verified in `gas/src/models/Config.ts` / `gas/src/PublicConfig.ts`): `business{name,phone,email,address}`, `hours{monday..sunday}`, `holidays: string[]`, `features{contactForm,reservation,staffSelection,calendar,emailNotification}`, `staffAnyAvailableOption: boolean`, `reservation{timezone:"Asia/Tokyo",slotMinutes,minLeadHours,maxBookingDays}`. No `services`/`staff` fields exist in the Phase 3A contract — menu/staff catalogs stay on `config/demo-content.ts` (documented as Phase 4 future work, per roadmap.md).
- No redesign: every existing component keeps its current props shape except `SiteHeader`/`MobileNav`, which gain one new optional boolean prop (`reservationEnabled`, default `true`) to fix a pre-existing gap (their reservation CTA buttons were never gated by `features.reservation` at all, unlike `page.tsx`'s `ReservationCtaBand`s and `SiteFooter`... actually `SiteFooter`'s button isn't gated either yet — this plan fixes that too).
- No reservation submission, contact submission, Calendar, Gmail, auth, Supabase, or deployment work of any kind.
- Business config fetches use `cache: "no-store"` — hours/holidays/feature flags must never go stale behind Next.js's fetch cache (correctness over caching).
- Every visitor-facing string this plan adds must be natural Japanese and must never show `undefined`/`null`/a raw error/stack trace.

---

## Task 1: Runtime config domain type + GAS API client

**Files:**
- Create: `apps/salon-portfolio/web/types/runtime-config.ts`
- Create: `apps/salon-portfolio/web/lib/api/gasClient.ts`
- Test: `apps/salon-portfolio/web/lib/api/gasClient.test.ts`

**Interfaces:**
- Produces: `PublicRuntimeConfig`, `RuntimeConfigStatus`, `RuntimeConfigResult` (types), `callGasAction<T>(action: string, payload?: unknown): Promise<GasClientResult<T>>`, `GasClientResult<T>`.

- [ ] **Step 1: Create the runtime config domain type (no test — pure type declarations)**

`apps/salon-portfolio/web/types/runtime-config.ts`:

```ts
/**
 * Frontend mirror of the GAS `PublicConfig` contract (Phase 3A —
 * apps/salon-portfolio/gas/src/models/Config.ts `PublicConfig`,
 * apps/salon-portfolio/gas/src/PublicConfig.ts `buildPublicConfig`).
 *
 * This is the validated, backend-shaped runtime config — a distinct type
 * from `types/content.ts`'s `SiteConfig` (the UI view-model). The mapping
 * layer (`lib/config/resolveSiteConfig.ts`) converts one into the other;
 * components never see this type directly.
 */

export interface PublicRuntimeBusinessInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface PublicRuntimeBusinessHours {
  monday: string | "closed";
  tuesday: string | "closed";
  wednesday: string | "closed";
  thursday: string | "closed";
  friday: string | "closed";
  saturday: string | "closed";
  sunday: string | "closed";
}

export interface PublicRuntimeFeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface PublicRuntimeReservationSettings {
  timezone: "Asia/Tokyo";
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

export interface PublicRuntimeConfig {
  business: PublicRuntimeBusinessInfo;
  hours: PublicRuntimeBusinessHours;
  holidays: string[];
  features: PublicRuntimeFeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: PublicRuntimeReservationSettings;
}

/** Where a rendered page's runtime config actually came from — kept
 *  explicit so a GAS outage never silently masquerades as demo content. */
export type RuntimeConfigStatus = "runtime" | "demo-fallback" | "runtime-error";

export interface RuntimeConfigResult {
  status: RuntimeConfigStatus;
  config: PublicRuntimeConfig;
}
```

- [ ] **Step 2: Write the failing tests for `callGasAction`**

`apps/salon-portfolio/web/lib/api/gasClient.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { callGasAction } from "./gasClient";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, GAS_WEBAPP_URL: "https://example.com/exec" };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
}

describe("callGasAction", () => {
  it("returns the parsed success envelope on a 200 ok response", async () => {
    mockFetchOnce({ ok: true, data: { hello: "world" } });

    const result = await callGasAction<{ hello: string }>("getConfig", {});

    expect(result).toEqual({ ok: true, data: { hello: "world" } });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/exec",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "getConfig", payload: {} }),
      }),
    );
  });

  it("returns the parsed error envelope when GAS reports ok:false", async () => {
    mockFetchOnce({
      ok: false,
      error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
    });

    const result = await callGasAction("getConfig", {});

    expect(result).toEqual({
      ok: false,
      error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
    });
  });

  it("returns a NETWORK_ERROR result when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const result = await callGasAction("getConfig", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("returns an HTTP_ERROR result for a non-2xx response without parsing its body", async () => {
    mockFetchOnce({ irrelevant: true }, { ok: false, status: 500 });

    const result = await callGasAction("getConfig", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HTTP_ERROR");
    }
  });

  it("returns an INVALID_RESPONSE result when the response body is not valid JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    });

    const result = await callGasAction("getConfig", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_RESPONSE");
    }
  });

  it("returns an INVALID_RESPONSE result when the body doesn't match the envelope shape", async () => {
    mockFetchOnce({ nonsense: true });

    const result = await callGasAction("getConfig", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_RESPONSE");
    }
  });

  it("throws when GAS_WEBAPP_URL is not configured", async () => {
    delete process.env.GAS_WEBAPP_URL;

    await expect(callGasAction("getConfig", {})).rejects.toThrow(
      "GAS_WEBAPP_URL is not configured.",
    );
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest lib/api/gasClient.test.ts`
Expected: FAIL — `Cannot find module './gasClient'`.

- [ ] **Step 4: Implement `gasClient.ts`**

`apps/salon-portfolio/web/lib/api/gasClient.ts`:

```ts
/**
 * Thin server-only client for calling the GAS backend's single-action
 * endpoint (Phase 0 §H / Phase 3A `Api.ts`). Never import this file from
 * a Client Component — `GAS_WEBAPP_URL` (and any future shared secret)
 * must stay server-side.
 */

export interface GasClientSuccess<T> {
  ok: true;
  data: T;
}

export interface GasClientFailure {
  ok: false;
  error: { code: string; message: string };
}

export type GasClientResult<T> = GasClientSuccess<T> | GasClientFailure;

function failure(code: string, message: string): GasClientFailure {
  return { ok: false, error: { code, message } };
}

/** True only for a plausible `{ ok: boolean, ... }` envelope — the same
 *  shape GAS's `ApiResponse<T>` always produces (Api.ts). Does not
 *  validate `data`'s inner shape; callers validate that themselves. */
function isApiEnvelope(value: unknown): value is { ok: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/**
 * Calls one GAS action via its single-endpoint contract:
 * `POST { action, payload } -> { ok, data } | { ok: false, error }`.
 *
 * Requires `GAS_WEBAPP_URL` to already be set — callers that need a
 * demo/offline fallback (`lib/config/runtimeConfig.ts`) check that env
 * var themselves before calling this, so this function stays a single-
 * responsibility "talk to GAS" primitive.
 */
export async function callGasAction<T>(
  action: string,
  payload: unknown = {},
): Promise<GasClientResult<T>> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    throw new Error("GAS_WEBAPP_URL is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      // Business config (hours/holidays/feature flags) must never go
      // stale behind Next.js's fetch cache.
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    return failure("NETWORK_ERROR", `Failed to reach GAS: ${message}`);
  }

  if (!response.ok) {
    return failure("HTTP_ERROR", `GAS responded with HTTP ${response.status}.`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return failure("INVALID_RESPONSE", "GAS response was not valid JSON.");
  }

  if (!isApiEnvelope(parsed)) {
    return failure("INVALID_RESPONSE", "GAS response did not match the expected envelope.");
  }

  return parsed as GasClientResult<T>;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest lib/api/gasClient.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/salon-portfolio/web/types/runtime-config.ts apps/salon-portfolio/web/lib/api/gasClient.ts apps/salon-portfolio/web/lib/api/gasClient.test.ts
git commit -m "feat(web): add runtime config type and GAS API client"
```

---

## Task 2: Runtime config structural validator

**Files:**
- Create: `apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.ts`
- Test: `apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.test.ts`

**Interfaces:**
- Consumes: `PublicRuntimeConfig` (Task 1, `@/types/runtime-config`), `HOURS_DAY_ORDER` (`@/lib/constants/hours.ts:5`, already exists).
- Produces: `parsePublicRuntimeConfig(value: unknown): PublicRuntimeConfig | null`.

- [ ] **Step 1: Write the failing tests**

`apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/runtimeConfigValidator.test.ts`
Expected: FAIL — `Cannot find module './runtimeConfigValidator'`.

- [ ] **Step 3: Implement the validator**

`apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.ts`:

```ts
import { HOURS_DAY_ORDER } from "@/lib/constants/hours";
import type { PublicRuntimeBusinessHours, PublicRuntimeConfig } from "@/types/runtime-config";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseBusinessHours(value: unknown): PublicRuntimeBusinessHours | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const hours = {} as PublicRuntimeBusinessHours;
  for (const day of HOURS_DAY_ORDER) {
    const cell = record[day];
    if (!isNonEmptyString(cell)) return null;
    hours[day] = cell as PublicRuntimeBusinessHours[typeof day];
  }
  return hours;
}

/**
 * Structural validation only — checks that a `getConfig` response has the
 * shape the frontend depends on. Business-rule validation (e.g. "is this
 * really a valid time range") already happened in GAS's ConfigValidator
 * before the response was ever sent (Phase 3A); duplicating that here
 * would just be dead code. Returns `null` for anything that doesn't
 * match, so the caller can fall back safely instead of rendering
 * `undefined`/`null` business data.
 */
export function parsePublicRuntimeConfig(value: unknown): PublicRuntimeConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const root = value as Record<string, unknown>;

  const business = root.business;
  if (
    typeof business !== "object" ||
    business === null ||
    !isNonEmptyString((business as Record<string, unknown>).name) ||
    !isNonEmptyString((business as Record<string, unknown>).phone) ||
    !isNonEmptyString((business as Record<string, unknown>).email) ||
    !isNonEmptyString((business as Record<string, unknown>).address)
  ) {
    return null;
  }

  const hours = parseBusinessHours(root.hours);
  if (!hours) return null;

  if (!Array.isArray(root.holidays) || !root.holidays.every((d) => typeof d === "string")) {
    return null;
  }

  const features = root.features;
  if (
    typeof features !== "object" ||
    features === null ||
    !isBoolean((features as Record<string, unknown>).contactForm) ||
    !isBoolean((features as Record<string, unknown>).reservation) ||
    !isBoolean((features as Record<string, unknown>).staffSelection) ||
    !isBoolean((features as Record<string, unknown>).calendar) ||
    !isBoolean((features as Record<string, unknown>).emailNotification)
  ) {
    return null;
  }

  if (!isBoolean(root.staffAnyAvailableOption)) return null;

  const reservation = root.reservation;
  if (
    typeof reservation !== "object" ||
    reservation === null ||
    (reservation as Record<string, unknown>).timezone !== "Asia/Tokyo" ||
    !isFiniteNumber((reservation as Record<string, unknown>).slotMinutes) ||
    !isFiniteNumber((reservation as Record<string, unknown>).minLeadHours) ||
    !isFiniteNumber((reservation as Record<string, unknown>).maxBookingDays)
  ) {
    return null;
  }

  return {
    business: business as PublicRuntimeConfig["business"],
    hours,
    holidays: root.holidays as string[],
    features: features as PublicRuntimeConfig["features"],
    staffAnyAvailableOption: root.staffAnyAvailableOption,
    reservation: reservation as PublicRuntimeConfig["reservation"],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest lib/validation/runtimeConfigValidator.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.ts apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.test.ts
git commit -m "feat(web): add structural validator for getConfig responses"
```

---

## Task 3: Runtime config loader with demo/error fallback

**Files:**
- Create: `apps/salon-portfolio/web/lib/config/runtimeConfig.ts`
- Test: `apps/salon-portfolio/web/lib/config/runtimeConfig.test.ts`

**Interfaces:**
- Consumes: `callGasAction` (Task 1, `@/lib/api/gasClient`), `parsePublicRuntimeConfig` (Task 2, `@/lib/validation/runtimeConfigValidator`), `SITE_CONFIG` (`@/config/demo-content.ts:26`, existing), `RuntimeConfigResult`/`PublicRuntimeConfig` (Task 1).
- Produces: `DEMO_RUNTIME_CONFIG: PublicRuntimeConfig`, `loadRuntimeConfig(): Promise<RuntimeConfigResult>` (uncached — used by tests), `getRuntimeConfig` (React-`cache()`-wrapped — used by Server Components in Task 6/7).

- [ ] **Step 1: Write the failing tests**

`apps/salon-portfolio/web/lib/config/runtimeConfig.test.ts`:

```ts
jest.mock("@/lib/api/gasClient", () => ({
  callGasAction: jest.fn(),
}));

import { callGasAction } from "@/lib/api/gasClient";
import { DEMO_RUNTIME_CONFIG, loadRuntimeConfig } from "./runtimeConfig";

const mockedCallGasAction = callGasAction as jest.Mock;
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mockedCallGasAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("loadRuntimeConfig", () => {
  it("returns demo-fallback when GAS_WEBAPP_URL is not set", async () => {
    delete process.env.GAS_WEBAPP_URL;

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "demo-fallback", config: DEMO_RUNTIME_CONFIG });
    expect(mockedCallGasAction).not.toHaveBeenCalled();
  });

  it("returns runtime with the parsed config on success", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: DEMO_RUNTIME_CONFIG });

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime", config: DEMO_RUNTIME_CONFIG });
  });

  it("returns runtime-error when GAS reports ok:false", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "CONFIG_INVALID", message: "設定情報の読み込みに失敗しました。" },
    });

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
  });

  it("returns runtime-error when the response fails shape validation", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: { nonsense: true } });

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
  });

  it("returns runtime-error when callGasAction throws", async () => {
    process.env.GAS_WEBAPP_URL = "https://example.com/exec";
    mockedCallGasAction.mockRejectedValueOnce(new Error("GAS_WEBAPP_URL is not configured."));

    const result = await loadRuntimeConfig();

    expect(result).toEqual({ status: "runtime-error", config: DEMO_RUNTIME_CONFIG });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/runtimeConfig.test.ts`
Expected: FAIL — `Cannot find module './runtimeConfig'`.

- [ ] **Step 3: Implement the loader**

`apps/salon-portfolio/web/lib/config/runtimeConfig.ts`:

```ts
import { cache } from "react";
import { callGasAction } from "@/lib/api/gasClient";
import { parsePublicRuntimeConfig } from "@/lib/validation/runtimeConfigValidator";
import { SITE_CONFIG } from "@/config/demo-content";
import type { PublicRuntimeConfig, RuntimeConfigResult } from "@/types/runtime-config";

/**
 * Demo-mode fallback — reuses the same demo business values every other
 * Phase 2 section still renders from `config/demo-content.ts`, plus the
 * fields `SiteConfig` doesn't carry (holidays, the `calendar`/
 * `emailNotification` backend-only flags, reservation settings) filled
 * in with the same example values documented in
 * `docs/config-and-sheets-guide.md`. Used both when `GAS_WEBAPP_URL` is
 * unset (local/demo mode) and when a configured GAS backend fails — the
 * `status` field on `RuntimeConfigResult` is what tells those two cases
 * apart, never this object's content.
 */
export const DEMO_RUNTIME_CONFIG: PublicRuntimeConfig = {
  business: {
    name: SITE_CONFIG.business.name,
    phone: SITE_CONFIG.business.phone,
    email: SITE_CONFIG.business.email,
    address: SITE_CONFIG.business.address,
  },
  hours: SITE_CONFIG.hours,
  holidays: ["2026-01-01", "2026-01-02", "2026-01-03"],
  features: {
    contactForm: SITE_CONFIG.features.contactForm,
    reservation: SITE_CONFIG.features.reservation,
    staffSelection: SITE_CONFIG.features.staffSelection,
    calendar: true,
    emailNotification: true,
  },
  staffAnyAvailableOption: SITE_CONFIG.staffAnyAvailableOption,
  reservation: {
    timezone: "Asia/Tokyo",
    slotMinutes: 30,
    minLeadHours: 1,
    maxBookingDays: 60,
  },
};

/**
 * Uncached core — exported separately from `getRuntimeConfig` so tests
 * can exercise every branch directly. `getRuntimeConfig` (below) is what
 * `app/layout.tsx`/`app/page.tsx` actually call; wrapping it in React's
 * `cache()` is what makes their multiple call sites in the same request
 * share one network call. `cache()` only dedupes inside a real Next.js
 * request render (verified manually — see
 * docs/runtime-config-guide.md — a bare Jest call to a `cache()`-wrapped
 * function does not dedupe, so that specific behavior isn't Jest-tested).
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfigResult> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    return { status: "demo-fallback", config: DEMO_RUNTIME_CONFIG };
  }

  try {
    const result = await callGasAction<unknown>("getConfig", {});
    if (!result.ok) {
      console.error(
        `[runtimeConfig] getConfig failed: ${result.error.code} ${result.error.message}`,
      );
      return { status: "runtime-error", config: DEMO_RUNTIME_CONFIG };
    }

    const parsed = parsePublicRuntimeConfig(result.data);
    if (!parsed) {
      console.error("[runtimeConfig] getConfig returned a malformed config shape.");
      return { status: "runtime-error", config: DEMO_RUNTIME_CONFIG };
    }

    return { status: "runtime", config: parsed };
  } catch (error) {
    console.error("[runtimeConfig] unexpected error calling getConfig:", error);
    return { status: "runtime-error", config: DEMO_RUNTIME_CONFIG };
  }
}

export const getRuntimeConfig = cache(loadRuntimeConfig);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/runtimeConfig.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/web/lib/config/runtimeConfig.ts apps/salon-portfolio/web/lib/config/runtimeConfig.test.ts
git commit -m "feat(web): add runtime config loader with demo/error fallback"
```

---

## Task 4: Map runtime config onto the existing `SiteConfig` view-model

**Files:**
- Create: `apps/salon-portfolio/web/lib/config/resolveSiteConfig.ts`
- Test: `apps/salon-portfolio/web/lib/config/resolveSiteConfig.test.ts`

**Interfaces:**
- Consumes: `PublicRuntimeConfig` (Task 1), `SiteConfig` (`@/types/content.ts:40`, existing), `SITE_CONFIG` (`@/config/demo-content.ts:26`, existing).
- Produces: `resolveSiteConfig(runtime: PublicRuntimeConfig): SiteConfig`.

- [ ] **Step 1: Write the failing tests**

`apps/salon-portfolio/web/lib/config/resolveSiteConfig.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveSiteConfig.test.ts`
Expected: FAIL — `Cannot find module './resolveSiteConfig'`.

- [ ] **Step 3: Implement the mapper**

`apps/salon-portfolio/web/lib/config/resolveSiteConfig.ts`:

```ts
import { SITE_CONFIG } from "@/config/demo-content";
import type { SiteConfig } from "@/types/content";
import type { PublicRuntimeConfig } from "@/types/runtime-config";

/**
 * Merges runtime business data (Phase 3A `getConfig`) with the
 * presentation-only fields `PublicRuntimeConfig` deliberately doesn't
 * carry — `nameLatin`, `tagline`, `postalCode`, `socialLinks` are not
 * part of the Phase 3A CONFIG contract, so they stay frontend-owned.
 * Produces the same `SiteConfig` shape every Phase 2 component already
 * consumes, so no component signature changes.
 */
export function resolveSiteConfig(runtime: PublicRuntimeConfig): SiteConfig {
  return {
    business: {
      name: runtime.business.name,
      nameLatin: SITE_CONFIG.business.nameLatin,
      tagline: SITE_CONFIG.business.tagline,
      phone: runtime.business.phone,
      email: runtime.business.email,
      address: runtime.business.address,
      postalCode: SITE_CONFIG.business.postalCode,
    },
    hours: runtime.hours,
    features: {
      contactForm: runtime.features.contactForm,
      reservation: runtime.features.reservation,
      staffSelection: runtime.features.staffSelection,
    },
    staffAnyAvailableOption: runtime.staffAnyAvailableOption,
    socialLinks: SITE_CONFIG.socialLinks,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest lib/config/resolveSiteConfig.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/web/lib/config/resolveSiteConfig.ts apps/salon-portfolio/web/lib/config/resolveSiteConfig.test.ts
git commit -m "feat(web): map runtime config onto the existing SiteConfig view-model"
```

---

## Task 5: Generic `/api/gas` proxy route

**Files:**
- Create: `apps/salon-portfolio/web/app/api/gas/route.ts`
- Test: `apps/salon-portfolio/web/app/api/gas/route.test.ts`

**Interfaces:**
- Consumes: `callGasAction` (Task 1, `@/lib/api/gasClient`).
- Produces: `POST(request: Request): Promise<Response>` (Next.js Route Handler convention, mirrors `apps/salon-portfolio/web/app/api/health/route.ts`'s existing pattern).

- [ ] **Step 1: Write the failing tests**

`apps/salon-portfolio/web/app/api/gas/route.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock("@/lib/api/gasClient", () => ({
  callGasAction: jest.fn(),
}));

import { callGasAction } from "@/lib/api/gasClient";
import { POST } from "./route";

const mockedCallGasAction = callGasAction as jest.Mock;

beforeEach(() => {
  mockedCallGasAction.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/gas", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/gas", () => {
  it("forwards a well-formed request to callGasAction and returns its result", async () => {
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: { hello: "world" } });

    const response = await POST(postRequest({ action: "getConfig", payload: {} }));
    const responseBody = await response.json();

    expect(mockedCallGasAction).toHaveBeenCalledWith("getConfig", {});
    expect(responseBody).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("defaults payload to {} when omitted", async () => {
    mockedCallGasAction.mockResolvedValueOnce({ ok: true, data: {} });

    await POST(postRequest({ action: "getConfig" }));

    expect(mockedCallGasAction).toHaveBeenCalledWith("getConfig", {});
  });

  it("returns a VALIDATION_ERROR envelope for malformed JSON", async () => {
    const response = await POST(postRequest("{not json"));
    const responseBody = await response.json();

    expect(mockedCallGasAction).not.toHaveBeenCalled();
    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a VALIDATION_ERROR envelope when action is missing or empty", async () => {
    const response = await POST(postRequest({ action: "" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns an INTERNAL_ERROR envelope, never a raw error, when callGasAction throws", async () => {
    mockedCallGasAction.mockRejectedValueOnce(new Error("GAS_WEBAPP_URL is not configured."));

    const response = await POST(postRequest({ action: "getConfig" }));
    const responseBody = await response.json();

    expect(responseBody.ok).toBe(false);
    expect(responseBody.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(responseBody)).not.toContain("GAS_WEBAPP_URL");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest app/api/gas/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the route**

`apps/salon-portfolio/web/app/api/gas/route.ts`:

```ts
import { NextResponse } from "next/server";
import { callGasAction } from "@/lib/api/gasClient";

/**
 * Generic GAS action proxy — the one place a browser is ever allowed to
 * reach GAS through. `GAS_WEBAPP_URL` is read server-side only inside
 * `gasClient.ts`; this route never puts it, or any other server-only
 * value, into the response.
 *
 * No frontend code calls this yet: `getConfig` is fetched directly from
 * the server boundary in `lib/config/runtimeConfig.ts`, per Next.js's own
 * guidance against a Server Component calling its own Route Handler over
 * HTTP. This route exists so a later phase's browser-initiated action
 * (e.g. `createReservation`) has the proxy boundary already in place —
 * see docs/runtime-config-guide.md.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Request body is not valid JSON." },
    });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { action?: unknown }).action !== "string" ||
    (body as { action: string }).action.trim().length === 0
  ) {
    return NextResponse.json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: 'Request body must include a non-empty "action" field.',
      },
    });
  }

  const { action, payload } = body as { action: string; payload?: unknown };

  try {
    const result = await callGasAction(action, payload ?? {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[/api/gas] callGasAction threw:", message);
    return NextResponse.json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" },
    });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest app/api/gas/route.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/web/app/api/gas/route.ts apps/salon-portfolio/web/app/api/gas/route.test.ts
git commit -m "feat(web): add generic /api/gas proxy route"
```

---

## Task 6: Runtime config failure notice component

**Files:**
- Create: `apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.tsx`
- Test: `apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.test.tsx`

**Interfaces:**
- Produces: `RuntimeConfigNotice({ show: boolean }): JSX.Element | null`.

- [ ] **Step 1: Write the failing tests**

`apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { RuntimeConfigNotice } from "./RuntimeConfigNotice";

describe("RuntimeConfigNotice", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(<RuntimeConfigNotice show={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a calm Japanese notice when show is true", () => {
    render(<RuntimeConfigNotice show={true} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "現在、最新の店舗情報を取得できませんでした。表示中の内容が実際と異なる場合がございます。",
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest components/layout/RuntimeConfigNotice.test.tsx`
Expected: FAIL — `Cannot find module './RuntimeConfigNotice'`.

- [ ] **Step 3: Implement the component**

`apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.tsx`:

```tsx
/**
 * Calm, non-technical notice shown only when this request's runtime
 * config status is `runtime-error` — a configured GAS backend that
 * failed, as opposed to `demo-fallback` (expected in local/demo mode) or
 * `runtime` (the normal path). Renders nothing in every other case, so it
 * causes zero layout shift on the site's current default state.
 */
export function RuntimeConfigNotice({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div role="status" className="bg-surface-sunken py-2 text-center text-[13px] text-secondary">
      現在、最新の店舗情報を取得できませんでした。表示中の内容が実際と異なる場合がございます。
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest components/layout/RuntimeConfigNotice.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.tsx apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.test.tsx
git commit -m "feat(web): add runtime config failure notice component"
```

---

## Task 7: Gate the reservation CTA buttons on `features.reservation`

**Files:**
- Modify: `apps/salon-portfolio/web/components/layout/SiteHeader.tsx`
- Modify: `apps/salon-portfolio/web/components/layout/MobileNav.tsx`
- Modify: `apps/salon-portfolio/web/components/layout/SiteFooter.tsx`
- Modify (append tests): `apps/salon-portfolio/web/components/layout/SiteHeader.test.tsx`
- Create: `apps/salon-portfolio/web/components/layout/SiteFooter.test.tsx`

**Interfaces:**
- `SiteHeader` gains an optional prop `reservationEnabled?: boolean` (default `true` — preserves current always-on behavior for the existing test file's calls that omit it).
- `MobileNav` gains an optional prop `reservationEnabled?: boolean` (default `true`), passed through by `SiteHeader`.
- `SiteFooter` already receives `config: SiteConfig`; it reads `config.features.reservation` directly — no new prop.

- [ ] **Step 1: Write the failing tests**

Append to `apps/salon-portfolio/web/components/layout/SiteHeader.test.tsx` (after the existing `describe("SiteHeader / MobileNav", ...)` block, same file, same imports already present):

```tsx
describe("SiteHeader reservation flag", () => {
  it("shows the reservation buttons by default", () => {
    render(<SiteHeader business={business} navItems={navItems} />);
    expect(screen.getByRole("link", { name: "ご予約はこちら" })).toBeInTheDocument();
  });

  it("hides the header and mobile-nav reservation buttons when reservationEnabled is false", async () => {
    const user = userEvent.setup();
    render(<SiteHeader business={business} navItems={navItems} reservationEnabled={false} />);

    expect(screen.queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "予約" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
  });
});
```

Create `apps/salon-portfolio/web/components/layout/SiteFooter.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { NavItem, SiteConfig } from "@/types/content";

const config: SiteConfig = {
  business: {
    name: "凛",
    nameLatin: "Rin Nail & Eyelash",
    tagline: "静けさの中で、指先とまなざしを整える。",
    phone: "03-1234-5678",
    email: "info@example.com",
    address: "東京都中央区銀座1-2-3",
    postalCode: "〒104-0061",
  },
  hours: {
    monday: "10:00-19:00",
    tuesday: "10:00-19:00",
    wednesday: "closed",
    thursday: "10:00-19:00",
    friday: "10:00-20:00",
    saturday: "10:00-20:00",
    sunday: "10:00-18:00",
  },
  features: { contactForm: true, reservation: true, staffSelection: true },
  staffAnyAvailableOption: true,
  socialLinks: [],
};

const navItems: NavItem[] = [{ label: "コンセプト", href: "#concept" }];

describe("SiteFooter reservation flag", () => {
  it("shows the reservation button when features.reservation is true", () => {
    render(<SiteFooter config={config} navItems={navItems} />);
    expect(screen.getByRole("link", { name: "ご予約はこちら" })).toBeInTheDocument();
  });

  it("hides the reservation button when features.reservation is false", () => {
    render(
      <SiteFooter
        config={{ ...config, features: { ...config.features, reservation: false } }}
        navItems={navItems}
      />,
    );
    expect(screen.queryByRole("link", { name: "ご予約はこちら" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/salon-portfolio/web && npx jest components/layout/SiteHeader.test.tsx components/layout/SiteFooter.test.tsx`
Expected: FAIL — the new `SiteHeader` cases fail because `reservationEnabled` isn't wired yet; `SiteFooter.test.tsx` fails because the "hides" case still finds the button.

- [ ] **Step 3: Update `SiteHeader.tsx`**

In `apps/salon-portfolio/web/components/layout/SiteHeader.tsx`, change the function signature (around line 21) from:

```tsx
export function SiteHeader({
  business,
  navItems,
}: {
  business: BusinessInfo;
  navItems: NavItem[];
}) {
```

to:

```tsx
export function SiteHeader({
  business,
  navItems,
  reservationEnabled = true,
}: {
  business: BusinessInfo;
  navItems: NavItem[];
  reservationEnabled?: boolean;
}) {
```

Then replace the button block (around lines 87-104):

```tsx
          <div className="flex items-center gap-3">
            {/* The visibility toggle lives on this wrapper, not on the
                Button itself: Button's own base classes hardcode
                `inline-flex` (Button.tsx), which — being an unprefixed
                utility on the same `display` property — can beat an
                unprefixed `hidden` passed in via className regardless of
                viewport, since Tailwind only guarantees a responsive
                variant overrides its own base utility, not an unrelated
                one. Toggling display on a wrapper sidesteps that clash
                entirely. */}
            <div className="hidden sm:block">
              <Button href="/reservation">ご予約はこちら</Button>
            </div>
            <div className="sm:hidden">
              <Button href="/reservation" aria-label="ご予約はこちら">
                予約
              </Button>
            </div>
```

with:

```tsx
          <div className="flex items-center gap-3">
            {/* The visibility toggle lives on this wrapper, not on the
                Button itself: Button's own base classes hardcode
                `inline-flex` (Button.tsx), which — being an unprefixed
                utility on the same `display` property — can beat an
                unprefixed `hidden` passed in via className regardless of
                viewport, since Tailwind only guarantees a responsive
                variant overrides its own base utility, not an unrelated
                one. Toggling display on a wrapper sidesteps that clash
                entirely. */}
            {reservationEnabled ? (
              <>
                <div className="hidden sm:block">
                  <Button href="/reservation">ご予約はこちら</Button>
                </div>
                <div className="sm:hidden">
                  <Button href="/reservation" aria-label="ご予約はこちら">
                    予約
                  </Button>
                </div>
              </>
            ) : null}
```

Finally, update the `<MobileNav .../>` call at the bottom of the component (around line 129-134) from:

```tsx
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={navItems}
        triggerRef={menuButtonRef}
      />
```

to:

```tsx
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={navItems}
        triggerRef={menuButtonRef}
        reservationEnabled={reservationEnabled}
      />
```

- [ ] **Step 4: Update `MobileNav.tsx`**

Change the function signature (around line 13) from:

```tsx
export function MobileNav({
  open,
  onClose,
  navItems,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
```

to:

```tsx
export function MobileNav({
  open,
  onClose,
  navItems,
  triggerRef,
  reservationEnabled = true,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  reservationEnabled?: boolean;
}) {
```

Then replace (around line 84):

```tsx
        <Button href="/reservation" fullWidth className="mt-6">
          ご予約はこちら
        </Button>
```

with:

```tsx
        {reservationEnabled ? (
          <Button href="/reservation" fullWidth className="mt-6">
            ご予約はこちら
          </Button>
        ) : null}
```

- [ ] **Step 5: Update `SiteFooter.tsx`**

Replace (around line 87-89):

```tsx
          <Button href="/reservation" variant="secondary" className="mt-6 border-on-primary/40 text-on-primary hover:bg-on-primary/10">
            ご予約はこちら
          </Button>
```

with:

```tsx
          {config.features.reservation ? (
            <Button href="/reservation" variant="secondary" className="mt-6 border-on-primary/40 text-on-primary hover:bg-on-primary/10">
              ご予約はこちら
            </Button>
          ) : null}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/salon-portfolio/web && npx jest components/layout/SiteHeader.test.tsx components/layout/SiteFooter.test.tsx`
Expected: PASS (all existing SiteHeader tests still pass + 2 new SiteHeader cases + 2 new SiteFooter cases).

- [ ] **Step 7: Commit**

```bash
git add apps/salon-portfolio/web/components/layout/SiteHeader.tsx apps/salon-portfolio/web/components/layout/MobileNav.tsx apps/salon-portfolio/web/components/layout/SiteFooter.tsx apps/salon-portfolio/web/components/layout/SiteHeader.test.tsx apps/salon-portfolio/web/components/layout/SiteFooter.test.tsx
git commit -m "feat(web): gate reservation CTA buttons on features.reservation"
```

---

## Task 8: Wire `app/layout.tsx` to runtime config

**Files:**
- Modify: `apps/salon-portfolio/web/app/layout.tsx`

**Interfaces:**
- Consumes: `getRuntimeConfig` (Task 3), `resolveSiteConfig` (Task 4), `RuntimeConfigNotice` (Task 6), `NAV_ITEMS` (`@/config/demo-content.ts`, existing, unchanged).

No test file for this task — `app/layout.tsx`/`app/page.tsx` are composition-root files with no existing test coverage in this repo (same convention as `Sheets.ts`/`ConfigStore.ts`'s "thin orchestration, not unit tested" boundary on the GAS side); this task is verified by typecheck + production build (Task 11) and a manual dev-server check (Task 11).

- [ ] **Step 1: Replace the static `metadata` export and make the layout async**

In `apps/salon-portfolio/web/app/layout.tsx`, replace the imports block (lines 1-11):

```tsx
import type { Metadata } from "next";
import {
  Shippori_Mincho,
  Cormorant_Garamond,
  Noto_Sans_JP,
  Inter,
} from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { NAV_ITEMS, SITE_CONFIG } from "@/config/demo-content";
import "./globals.css";
```

with:

```tsx
import type { Metadata } from "next";
import {
  Shippori_Mincho,
  Cormorant_Garamond,
  Noto_Sans_JP,
  Inter,
} from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RuntimeConfigNotice } from "@/components/layout/RuntimeConfigNotice";
import { NAV_ITEMS } from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";
import "./globals.css";
```

Then replace the `metadata`/`RootLayout` block (lines 46-64):

```tsx
export const metadata: Metadata = {
  title: `${SITE_CONFIG.business.name} | ${SITE_CONFIG.business.nameLatin}`,
  description: SITE_CONFIG.business.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${shipporiMincho.variable} ${cormorantGaramond.variable} ${notoSansJP.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        <SiteHeader business={SITE_CONFIG.business} navItems={NAV_ITEMS} />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter config={SITE_CONFIG} navItems={NAV_ITEMS} />
      </body>
    </html>
  );
}
```

with:

```tsx
// Dynamic per Phase 3B: title/description now reflect the runtime
// business name/tagline, so this can no longer be a static `metadata`
// export (Next.js requires `generateMetadata` for that). `getRuntimeConfig`
// is React-`cache()`-wrapped, so this call and the one in `RootLayout`
// below share a single GAS request per page load.
export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);
  return {
    title: `${siteConfig.business.name} | ${siteConfig.business.nameLatin}`,
    description: siteConfig.business.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { status, config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);

  return (
    <html
      lang="ja"
      className={`${shipporiMincho.variable} ${cormorantGaramond.variable} ${notoSansJP.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        <RuntimeConfigNotice show={status === "runtime-error"} />
        <SiteHeader
          business={siteConfig.business}
          navItems={NAV_ITEMS}
          reservationEnabled={siteConfig.features.reservation}
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter config={siteConfig} navItems={NAV_ITEMS} />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/salon-portfolio/web && npx tsc --noEmit`
Expected: no errors referencing `app/layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/salon-portfolio/web/app/layout.tsx
git commit -m "feat(web): wire app/layout.tsx to runtime config"
```

---

## Task 9: Wire `app/page.tsx` to runtime config

**Files:**
- Modify: `apps/salon-portfolio/web/app/page.tsx`

**Interfaces:**
- Consumes: `getRuntimeConfig` (Task 3), `resolveSiteConfig` (Task 4). `SERVICES`, `STAFF`, `GALLERY_IMAGES`, `SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`, `FAQ_ITEMS`, `ACCESS_INFO` stay imported from `@/config/demo-content` unchanged — Phase 3A's `getConfig` contract does not expose services/staff/gallery/FAQ data (documented in Task 10's doc update as Phase 4 future work).

No test file — same composition-root convention as Task 8.

- [ ] **Step 1: Make the page async and use the resolved site config**

Replace the full content of `apps/salon-portfolio/web/app/page.tsx`:

```tsx
import { HeroSection } from "@/components/sections/HeroSection";
import { ConceptSection } from "@/components/sections/ConceptSection";
import { MenuSection } from "@/components/sections/MenuSection";
import { StaffSection } from "@/components/sections/StaffSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { ReservationCtaBand } from "@/components/sections/ReservationCtaBand";
import { SalonFeaturesSection } from "@/components/sections/SalonFeaturesSection";
import { CustomerFlowSection } from "@/components/sections/CustomerFlowSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { AccessSection } from "@/components/sections/AccessSection";
import { ContactSection } from "@/components/sections/ContactSection";
import {
  ACCESS_INFO,
  CUSTOMER_FLOW_STEPS,
  FAQ_ITEMS,
  GALLERY_IMAGES,
  SALON_FEATURES,
  SERVICES,
  STAFF,
} from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";

// Page order matches Phase 2A §6 exactly: Header (layout) → Hero →
// Concept → Menu → Staff → Gallery → Reservation CTA → Salon Features →
// Customer Flow → FAQ → Access → Contact → Footer (layout). Configurable
// sections are gated here by the resolved runtime config's `features`,
// not by editing the section components themselves.
//
// SERVICES/STAFF/GALLERY_IMAGES/SALON_FEATURES/CUSTOMER_FLOW_STEPS/
// FAQ_ITEMS/ACCESS_INFO are not part of the Phase 3A `getConfig` contract
// (no `services`/`staff` fields in `PublicConfig`) and stay on
// `config/demo-content.ts` — see docs/runtime-config-guide.md for the
// Phase 4 plan to move SERVICES/STAFF onto `getServices`/`getStaff`.
export default async function Home() {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);

  return (
    <main className="flex flex-1 flex-col">
      <HeroSection
        headline={siteConfig.business.tagline}
        subheadline="銀座の一角で、丁寧なネイル・まつげのお手入れをご提供しています。"
      />

      <ConceptSection
        eyebrow="Concept"
        title="静けさの中で、指先を整える時間を"
        paragraphs={[
          "流行を追いかけるより、長く付き合える美しさを。当店では、派手さよりも一つひとつの仕上がりの丁寧さを大切にしています。",
          "落ち着いた空間で過ごすひとときそのものも、施術と同じくらい価値のあるものだと考えています。",
        ]}
      />

      <MenuSection services={SERVICES} />

      <StaffSection
        enabled={siteConfig.features.staffSelection}
        staff={STAFF}
        anyAvailableOption={siteConfig.staffAnyAvailableOption}
        businessNameInitial={siteConfig.business.name}
      />

      <GallerySection images={GALLERY_IMAGES} />

      {siteConfig.features.reservation ? (
        <ReservationCtaBand
          heading="仕上がりを見て、気持ちが決まったら"
          message="ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。"
        />
      ) : null}

      <SalonFeaturesSection features={SALON_FEATURES} />

      <CustomerFlowSection steps={CUSTOMER_FLOW_STEPS} />

      <FaqSection items={FAQ_ITEMS} />

      <AccessSection
        business={siteConfig.business}
        hours={siteConfig.hours}
        access={ACCESS_INFO}
      />

      {siteConfig.features.contactForm ? (
        <ContactSection business={siteConfig.business} />
      ) : null}

      {siteConfig.features.reservation ? (
        <ReservationCtaBand
          heading="最後まで読んでくださり、ありがとうございます"
          message="少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。"
        />
      ) : null}
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/salon-portfolio/web && npx tsc --noEmit`
Expected: no errors referencing `app/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/salon-portfolio/web/app/page.tsx
git commit -m "feat(web): wire app/page.tsx to runtime config"
```

---

## Task 10: Add a `typecheck` script, `.env.example`, and documentation

**Files:**
- Modify: `apps/salon-portfolio/web/package.json`
- Create: `apps/salon-portfolio/web/.env.example`
- Create: `docs/runtime-config-guide.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/architecture-overview.md`
- Modify: `docs/changelog.md`

- [ ] **Step 1: Add a `typecheck` script to `web/package.json`**

In `apps/salon-portfolio/web/package.json`, change the `scripts` block from:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest"
  },
```

to:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
```

(Mirrors the `typecheck` script already present in `apps/salon-portfolio/gas/package.json`.)

- [ ] **Step 2: Add `.env.example`**

Create `apps/salon-portfolio/web/.env.example`:

```
# GAS Web App deployment URL for the getConfig action (Phase 3A backend).
# Leave unset for local/demo mode -- the site automatically falls back to
# config/demo-content.ts (see docs/runtime-config-guide.md).
#
# Never prefix this with NEXT_PUBLIC_ -- it must stay server-only. It is
# read only by apps/salon-portfolio/web/lib/api/gasClient.ts.
GAS_WEBAPP_URL=
```

- [ ] **Step 3: Write `docs/runtime-config-guide.md`**

Create `docs/runtime-config-guide.md`:

```markdown
# Frontend Runtime Config Guide (Phase 3B)

How `apps/salon-portfolio/web` obtains business configuration from the
Phase 3A GAS backend at runtime, instead of hard-coding it into the
Next.js bundle.

## Architecture

```text
Server render (app/layout.tsx generateMetadata + RootLayout, app/page.tsx)
      |
      | getRuntimeConfig()            <- React cache(), one call per request
      v
lib/config/runtimeConfig.ts
      |
      | GAS_WEBAPP_URL set?
      |   no  -> { status: "demo-fallback", config: DEMO_RUNTIME_CONFIG }
      |   yes -> lib/api/gasClient.ts callGasAction("getConfig", {})
      |            |
      |            | POST { action: "getConfig", payload: {} }
      |            v
      |          GAS Web App (apps/salon-portfolio/gas) -> Api.ts getConfigAction
      |            |
      |            v
      |          CONFIG + HOLIDAYS sheets (ConfigStore/ConfigParser/ConfigValidator)
      |
      | ok:true, valid shape  -> { status: "runtime", config }
      | ok:false / bad shape / network error -> { status: "runtime-error", config: DEMO_RUNTIME_CONFIG }
      v
lib/config/resolveSiteConfig.ts
      |
      | merges runtime business/hours/features/staffAnyAvailableOption
      | with the frontend-owned nameLatin/tagline/postalCode/socialLinks
      v
SiteConfig (types/content.ts -- unchanged view-model every Phase 2 component already consumes)
```

`app/api/gas/route.ts` is a second, independent path: a generic
`POST /api/gas` proxy for a future browser-initiated action (reservation
submission, contact submission). It has no caller yet in Phase 3B —
`getConfig` is fetched directly from the server boundary above, because a
Next.js Server Component calling its own Route Handler over HTTP is an
anti-pattern the framework explicitly recommends against. When a later
phase needs a browser-initiated write, it becomes this route's first
caller; `lib/api/gasClient.ts`'s `callGasAction` is already the shared
core both paths use.

## Ownership boundary

**GAS/CONFIG owns** (from Phase 3A's `getConfig`, `PublicConfig`):
`business.name`, `business.phone`, `business.email`, `business.address`,
`hours.*`, `holidays`, `features.contactForm`, `features.reservation`,
`features.staffSelection`, `features.calendar`, `features.emailNotification`,
`staffAnyAvailableOption`, `reservation.timezone/slotMinutes/minLeadHours/maxBookingDays`.

**Frontend owns** (stays in `config/demo-content.ts`, never sent by GAS):
`business.nameLatin`, `business.tagline`, `business.postalCode`,
`socialLinks`, all of `SERVICES`, `STAFF`, `GALLERY_IMAGES`,
`SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`, `FAQ_ITEMS`, `ACCESS_INFO`
(transit directions), and every visual/typography/spacing/layout
decision.

`holidays` is fetched and validated but has no UI consumer yet — no
existing section displays it (Phase 2A never specified one, and adding
one would be a new visual section, out of Phase 3B's scope). A future
phase can surface it in `AccessSection` once that's an approved design
change.

`SERVICES`/`STAFF` are not part of the Phase 3A `PublicConfig` contract
at all (verified in `gas/src/models/Config.ts`) — per `docs/roadmap.md`,
`getServices`/`getStaff` are Phase 4 work. Phase 3B does not invent a
second API to fetch them early.

## Fallback / error behavior

| `GAS_WEBAPP_URL` | GAS call result | `RuntimeConfigResult.status` | What renders |
|---|---|---|---|
| unset | (not attempted) | `demo-fallback` | Demo business values (`config/demo-content.ts`-derived) — normal local/portfolio-demo mode, no notice shown. |
| set | success, valid shape | `runtime` | Real business values from GAS. |
| set | `ok:false`, network error, or malformed shape | `runtime-error` | Same demo-derived values as a safe placeholder, **plus** a calm Japanese notice banner (`components/layout/RuntimeConfigNotice.tsx`) above the header, so a real backend failure is never silently indistinguishable from demo mode. The specific error is logged server-side via `console.error` only — never sent to the browser. |

This distinguishes "no backend configured yet" (expected during
development and for the current portfolio deployment, since Phase 3B
does not include a production GAS deployment) from "a configured backend
is actually broken" (which must never be silently masked as normal demo
content).

## Caching / revalidation

Every `getConfig` fetch uses `cache: "no-store"` (`lib/api/gasClient.ts`)
— business hours, holidays, and feature flags must reflect the CONFIG
sheet's current state on every request, not a stale cached response.

Within one request, `generateMetadata`, `RootLayout`, and `Home` (page.tsx)
each call `getRuntimeConfig()`; it is wrapped in React's `cache()` so all
three share a single GAS network call per page load rather than issuing
it two or three times. `cache()` only dedupes inside an actual Next.js
request render (verified manually, not by Jest — a bare call outside of
a render does not dedupe, which is expected and is not the code path
that matters here).

## Security

- `GAS_WEBAPP_URL` is read only in `lib/api/gasClient.ts`, a file with no
  `"use client"` boundary anywhere in its import chain — it is never sent
  to the browser.
- No `NEXT_PUBLIC_*` environment variable is introduced by this phase.
- `app/api/gas/route.ts` never echoes a caught error's message to the
  client — it always maps to the fixed `INTERNAL_ERROR` / Japanese
  message pair, mirroring the GAS-side `Api.ts` convention of never
  forwarding raw exception text.
- The frontend treats every `getConfig` response as untrusted external
  input: `lib/validation/runtimeConfigValidator.ts` structurally validates
  it before any component ever sees it.

## What Phase 3B intentionally did not do

- No GAS/`gas/src/**` changes — the Phase 3A contract was found fully
  sufficient for everything in scope.
- No reservation/contact submission, Calendar, Gmail, auth, Supabase, or
  deployment.
- No production GAS Web App has been deployed, so the `runtime`/
  `runtime-error` branches are exercised only by the Jest test suite
  (`lib/config/runtimeConfig.test.ts`) with `callGasAction` mocked, not by
  a real end-to-end call. `demo-fallback` is what actually renders today
  (`GAS_WEBAPP_URL` unset in every environment so far).
```

- [ ] **Step 4: Update `docs/roadmap.md`**

In `docs/roadmap.md`, replace:

```markdown
- [ ] **Phase 3B — Frontend CONFIG integration.** Replace
      `web/config/demo-content.ts` with a real `getConfig` fetch; no new
      GAS actions.
```

with:

```markdown
- [x] **Phase 3B — Frontend CONFIG integration.** `web/app/layout.tsx`
      (via `generateMetadata`) and `web/app/page.tsx` now source
      `business`/`hours`/`holidays`/`features`/`staffAnyAvailableOption`/
      `reservation` from the real `getConfig` action, through
      `lib/api/gasClient.ts` -> `lib/validation/runtimeConfigValidator.ts`
      -> `lib/config/runtimeConfig.ts` -> `lib/config/resolveSiteConfig.ts`.
      Explicit `runtime`/`demo-fallback`/`runtime-error` status, with a
      visible notice on the error path. Generic `app/api/gas/route.ts`
      proxy added for future browser-initiated actions (unused so far).
      No GAS changes. See
      [`runtime-config-guide.md`](runtime-config-guide.md).
```

And update the trailing summary line:

```markdown
Phase 3A is the newest code in the repo; Phase 3B (frontend `getConfig`
integration) is the next phase and has not been started.
```

to:

```markdown
Phase 3B (frontend `getConfig` integration) is the newest code in the
repo; Phase 4 (Sheets/Calendar/Gmail adapters + SERVICES/STAFF catalog
actions) is next and has not been started.
```

- [ ] **Step 5: Update `docs/architecture-overview.md`**

Find the frontend data-flow description (around the `Browser → Next.js →
GAS Web App` diagram noted in this plan's Task 0 inspection) and add,
directly below it:

```markdown
As of Phase 3B, `apps/salon-portfolio/web` fetches `getConfig` from a
Server Component boundary (`lib/config/runtimeConfig.ts`), not from the
browser — see [`runtime-config-guide.md`](runtime-config-guide.md) for
the full data flow, ownership boundary, and fallback behavior.
```

- [ ] **Step 6: Update `docs/changelog.md`**

Read the existing top entry's format first (`head -30 docs/changelog.md`)
and add a new entry above it following that exact format, summarizing:
frontend now sources business/hours/holidays/features/reservation
settings from `getConfig` via a new `lib/api/gasClient.ts` /
`lib/config/runtimeConfig.ts` / `lib/config/resolveSiteConfig.ts` chain;
new `/api/gas` proxy route (unused so far); reservation CTA buttons in
`SiteHeader`/`MobileNav`/`SiteFooter` now gated on `features.reservation`;
no GAS changes.

- [ ] **Step 7: Commit**

```bash
git add apps/salon-portfolio/web/package.json apps/salon-portfolio/web/.env.example docs/runtime-config-guide.md docs/roadmap.md docs/architecture-overview.md docs/changelog.md
git commit -m "docs(web): document Phase 3B runtime config architecture"
```

---

## Task 11: Full QA pass and evidence capture

**Files:** none created/modified beyond evidence artifacts under `.evidence/`.

- [ ] **Step 1: Create the evidence directory**

Run: `mkdir -p .evidence/$(date +%Y%m%d-%H%M)-phase3b-frontend-runtime-config` (or the Windows/PowerShell equivalent `New-Item -ItemType Directory -Force`), and record its path for the final report.

- [ ] **Step 2: Run the full web test suite and save the log**

Run: `cd apps/salon-portfolio/web && npx jest --logger "console;verbosity=detailed" 2>&1 | tee ../../../.evidence/<dir>/test.log` (or just redirect stdout on Windows PowerShell: `npx jest *> ..\..\..\.evidence\<dir>\test.log`)
Expected: PASS, with the previously-passing suite count preserved and every new test file from Tasks 1-7 included. Record the exact before/after test counts by also reading `.evidence/20260906-1200-phase3a-final-review-fixes/` (or whichever Phase 3A evidence folder recorded the last known-good web test count) for the "before" number — do not estimate it.

- [ ] **Step 3: Typecheck**

Run: `cd apps/salon-portfolio/web && npx tsc --noEmit > ../../../.evidence/<dir>/typecheck.log 2>&1`
Expected: no output (clean).

- [ ] **Step 4: Lint**

Run: `cd apps/salon-portfolio/web && npx eslint . > ../../../.evidence/<dir>/lint.log 2>&1`
Expected: no errors (warnings from the existing `no-unused-vars` rule tuning are acceptable if any already existed before this change — compare against a pre-change baseline if any warnings appear).

- [ ] **Step 5: Production build**

Run: `cd apps/salon-portfolio/web && npx next build > ../../../.evidence/<dir>/build.log 2>&1`
Expected: build succeeds. Since `GAS_WEBAPP_URL` is unset in this environment, static generation of `/` and the root layout will exercise the `demo-fallback` path — confirm the build log shows no runtime error thrown during prerendering (a thrown error here would mean the fallback path itself is broken, which must be fixed before this task is considered done).

- [ ] **Step 6: Manual dev-server check**

Run: `cd apps/salon-portfolio/web && npm run dev` (background), then fetch `http://localhost:3000/` and visually/structurally confirm: header/footer show the same demo business name/hours as before this change (demo-fallback renders identically to the pre-Phase-3B page), the reservation buttons are still visible (features.reservation is true in `DEMO_RUNTIME_CONFIG`), and no `RuntimeConfigNotice` banner appears (status is `demo-fallback`, not `runtime-error`). Stop the dev server afterward.

- [ ] **Step 7: Self-review pass**

Check specifically for, and fix any found before finalizing:
- **Critical:** `GAS_WEBAPP_URL` or any GAS-side detail never appears in a response body, log statement visible to a test asserting on client-facing output, or committed file with a real value. Demo data never silently presents itself as `runtime` status. `getConfig` is called at most once per request (verified by code inspection of `generateMetadata`/`RootLayout`/`Home` all calling the same `cache()`-wrapped `getRuntimeConfig` export, not `loadRuntimeConfig` directly).
- **Important:** No new unnecessary `"use client"` directives were added. No new dependency was added to `package.json`. `SiteConfig`/`PublicRuntimeConfig` field names stay consistent everywhere they're used across Tasks 1-9.
- **Minor:** Naming/doc-comment consistency with the rest of the codebase's comment style (see the existing files read during inspection — dense, decision-referencing doc comments above exported functions).

- [ ] **Step 8: Compose the final report**

Following this repo's evidence-reporting convention: Tier 1 summary (build/test/lint/typecheck pass-fail + new test method names + `git status -s` + `git diff --stat` + claim-to-evidence mapping), Tier 2 full detail for anything in the "always full" categories (none expected here, since no GAS file changes and no unrelated files are touched), and an explicit "what Phase 3B did not do" section matching `docs/runtime-config-guide.md`'s closing section.

- [ ] **Step 9: Do not commit test/build logs**

Confirm `.evidence/` is excluded from tracked deliverable diffs the same way prior phases' `.evidence/` folders were handled in this repo (check `git status` — if `.evidence/` is already tracked in this repo's history, follow that existing precedent rather than gitignoring it now).

---

## Self-Review Notes (already applied above)

- **Spec coverage:** business/hours/holidays/features/staffAnyAvailableOption/reservation integration (Tasks 1-4, 8-9), loading strategy (server boundary, Task 8-9), error/demo fallback distinction (Task 3, 6), reservation feature flag UI gating (Task 7), `/api/gas` boundary establishment (Task 5), tests for API client/validator/mapper/fallback (Tasks 1-4), typecheck/lint/build/docs (Tasks 10-11), explicit "did not do" scope statement (Task 11 report + `runtime-config-guide.md`). SERVICES/STAFF/holidays-display explicitly deferred with rationale (Task 10 doc).
- **Placeholder scan:** none found — every step has complete, runnable code.
- **Type consistency:** `PublicRuntimeConfig` (Task 1) is the single type threaded through `gasClient` (generic, doesn't reference it), `runtimeConfigValidator` (Task 2), `runtimeConfig` (Task 3), and `resolveSiteConfig` (Task 4) without renaming. `SiteConfig`/`BusinessInfo`/`FeatureFlags` (existing `types/content.ts`) are reused unchanged, never redefined.
