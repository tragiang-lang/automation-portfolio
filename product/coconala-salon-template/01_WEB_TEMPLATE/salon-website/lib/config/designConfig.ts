import { resolveDesignConfig } from "@/lib/config/resolveDesignConfig";
import type { DesignConfig } from "@/types/design-config";

/**
 * Reads the deployment's chosen preset from `SALON_DESIGN_PRESET` (server-
 * only env var — never prefix with `NEXT_PUBLIC_`, matching
 * `GAS_WEBAPP_URL`'s convention in `.env.example`) and resolves it to a
 * safe `DesignConfig`. Unlike `getRuntimeConfig`/`getRuntimeCatalog`
 * (`lib/config/runtimeConfig.ts`, `lib/config/runtimeCatalog.ts`) this
 * makes no network/GAS call and is not wrapped in React's `cache()` — it
 * is synchronous and side-effect-free, so there is nothing to dedupe.
 */
export function getDesignConfig(): DesignConfig {
  return resolveDesignConfig(process.env.SALON_DESIGN_PRESET);
}
