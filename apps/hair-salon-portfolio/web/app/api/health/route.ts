import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/utils/health";

/**
 * Minimal liveness endpoint for Phase 1. Deliberately contains no
 * business logic, no Sheets/Calendar/Gmail calls, and no CONFIG access —
 * it only proves the deployed app is up and responding.
 */
export function GET() {
  return NextResponse.json(getHealthStatus());
}
