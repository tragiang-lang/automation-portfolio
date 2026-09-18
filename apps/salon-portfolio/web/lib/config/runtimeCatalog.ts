import { cache } from "react";
import { callGasAction } from "@/lib/api/gasClient";
import { parsePublicServices, parsePublicStaff } from "@/lib/validation/catalogValidator";
import { mapPublicServiceToService, mapPublicStaffToStaffMember } from "@/lib/config/resolveCatalog";
import { SERVICES, STAFF } from "@/config/demo-content";
import type { RuntimeConfigStatus } from "@/types/runtime-config";
import type { Service, StaffMember } from "@/types/content";

export interface RuntimeCatalogResult {
  status: RuntimeConfigStatus;
  services: Service[];
  staff: StaffMember[];
}

/** Same demo-fallback rationale as `runtimeConfig.ts::DEMO_RUNTIME_CONFIG` —
 *  reuses the exact `SERVICES`/`STAFF` every other demo-mode section still
 *  renders from, unchanged (they already match `Service[]`/`StaffMember[]`
 *  with description/category/role/introduction/photo intact). */
const DEMO_CATALOG = { services: SERVICES, staff: STAFF };

/**
 * Uncached core — mirrors `lib/config/runtimeConfig.ts::loadRuntimeConfig`
 * exactly: same `demo-fallback`/`runtime`/`runtime-error` status
 * vocabulary, same "any failure anywhere falls back to demo, all or
 * nothing" behavior (never mixes a real service list with demo staff or
 * vice versa — one `status` describes both). `getRuntimeCatalog` (the
 * `cache()`-wrapped export below) is what `app/page.tsx`/`app/layout.tsx`
 * actually call.
 */
export async function loadRuntimeCatalog(): Promise<RuntimeCatalogResult> {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url || url.trim().length === 0) {
    // Production safety guard — same rationale as
    // `runtimeConfig.ts::loadRuntimeConfig`: demo-fallback is a development
    // convenience only. Reuses the existing `runtime-error` status so
    // `RuntimeConfigNotice` (app/layout.tsx) surfaces it, rather than a
    // second status/notice mechanism.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[runtimeCatalog] GAS_WEBAPP_URL is not configured. Refusing to silently serve demo content in production.",
      );
      return { status: "runtime-error", ...DEMO_CATALOG };
    }
    return { status: "demo-fallback", ...DEMO_CATALOG };
  }

  try {
    const [servicesResult, staffResult] = await Promise.all([
      callGasAction<unknown>("getServices", {}),
      callGasAction<unknown>("getStaff", {}),
    ]);

    if (!servicesResult.ok) {
      console.error(
        `[runtimeCatalog] getServices failed: ${servicesResult.error.code} ${servicesResult.error.message}`,
      );
      return { status: "runtime-error", ...DEMO_CATALOG };
    }
    if (!staffResult.ok) {
      console.error(
        `[runtimeCatalog] getStaff failed: ${staffResult.error.code} ${staffResult.error.message}`,
      );
      return { status: "runtime-error", ...DEMO_CATALOG };
    }

    const parsedServices = parsePublicServices(servicesResult.data);
    if (!parsedServices) {
      console.error("[runtimeCatalog] getServices returned a malformed shape.");
      return { status: "runtime-error", ...DEMO_CATALOG };
    }
    const parsedStaff = parsePublicStaff(staffResult.data);
    if (!parsedStaff) {
      console.error("[runtimeCatalog] getStaff returned a malformed shape.");
      return { status: "runtime-error", ...DEMO_CATALOG };
    }

    return {
      status: "runtime",
      services: parsedServices.map(mapPublicServiceToService),
      staff: parsedStaff.map(mapPublicStaffToStaffMember),
    };
  } catch (error) {
    console.error("[runtimeCatalog] unexpected error calling getServices/getStaff:", error);
    return { status: "runtime-error", ...DEMO_CATALOG };
  }
}

export const getRuntimeCatalog = cache(loadRuntimeCatalog);
