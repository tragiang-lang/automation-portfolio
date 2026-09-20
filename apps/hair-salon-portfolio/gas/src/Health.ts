/**
 * Pure liveness-check payload. No GAS globals, no Sheets/Calendar/Gmail
 * calls, no CONFIG access — kept separate from Code.ts purely so it is
 * Jest-testable per the Phase 0 test strategy (§Q).
 */
export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "hair-salon-portfolio-gas",
    timestamp: new Date().toISOString(),
  };
}
