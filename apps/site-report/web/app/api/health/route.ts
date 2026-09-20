import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/utils/health";

/**
 * Minimal liveness endpoint (Task 1 foundation). No business logic, no
 * GAS proxy call yet — same convention as
 * apps/salon-portfolio/web/app/api/health/route.ts.
 */
export function GET() {
  return NextResponse.json(getHealthStatus());
}
