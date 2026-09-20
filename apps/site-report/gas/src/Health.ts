/**
 * Pure liveness-check payload. No GAS globals, no Sheets/Drive/Gmail
 * calls — kept separate from index.ts purely so it is Jest-testable, same
 * convention as apps/salon-portfolio/gas/src/Health.ts.
 */
export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "site-report-gas",
    timestamp: new Date().toISOString(),
  };
}
