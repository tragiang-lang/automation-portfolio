/**
 * Explicit reservation demo-mode switch — deliberately separate from
 * `GAS_WEBAPP_URL` being unset/failing (`runtimeConfig.ts`/
 * `runtimeCatalog.ts`'s "any GAS failure silently falls back to demo"
 * behavior). That silent-fallback convention is correct for read-only
 * homepage content, but wrong for the Reservation Wizard: catalog/
 * availability must only ever come from demo data when this deployment
 * has intentionally opted in, never merely because GAS happened to be
 * unreachable (a real GAS outage must still surface as a real error).
 *
 * Server-only, same convention as `GAS_WEBAPP_URL`/`SALON_DESIGN_PRESET`
 * (see `.env.example`) — never prefix with `NEXT_PUBLIC_`. Read once in
 * `app/reservation/page.tsx` (a Server Component) and passed down to
 * `ReservationWizard`/`useReservationWizard` as an explicit `demoMode`
 * prop, the same way `minDate`/`maxDate` already are.
 */
export function isReservationDemoModeEnabled(): boolean {
  return process.env.SALON_RESERVATION_DEMO_MODE === "true";
}
