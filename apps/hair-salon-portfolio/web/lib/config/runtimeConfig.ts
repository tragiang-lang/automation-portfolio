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
    // Production safety guard: demo-fallback is only ever a *development*
    // convenience (spec: "prevent production from silently serving
    // demo-fallback data"). A production build/deploy missing
    // GAS_WEBAPP_URL must not present demo business info as if it were
    // real — reuse the existing `runtime-error` status so
    // `RuntimeConfigNotice` (already wired in app/layout.tsx) surfaces it,
    // rather than inventing a second status/notice mechanism.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[runtimeConfig] GAS_WEBAPP_URL is not configured. Refusing to silently serve demo content in production.",
      );
      return { status: "runtime-error", config: DEMO_RUNTIME_CONFIG };
    }
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
