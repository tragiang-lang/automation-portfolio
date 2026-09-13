/** Pure helper so the health check is unit-testable without a running
 *  server — same convention as
 *  apps/salon-portfolio/web/lib/utils/health.ts. */
export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "site-report-web",
    timestamp: new Date().toISOString(),
  };
}
