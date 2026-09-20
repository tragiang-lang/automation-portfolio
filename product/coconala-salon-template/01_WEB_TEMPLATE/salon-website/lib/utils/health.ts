/** Pure helper so the health check is unit-testable without a running server. */
export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "salon-portfolio-web",
    timestamp: new Date().toISOString(),
  };
}
