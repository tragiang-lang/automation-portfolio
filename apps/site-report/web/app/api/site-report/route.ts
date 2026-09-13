import { NextResponse } from "next/server";
import { callSiteReportAction } from "@/lib/api/siteReportClient";

/**
 * Generic Site Report GAS action proxy — the one place a browser is ever
 * allowed to reach the Site Report GAS backend through. `GAS_WEBAPP_URL` is
 * read server-side only inside `siteReportClient.ts`; this route never puts
 * it, or any other server-only value, into the response.
 *
 * A deliberate port of apps/salon-portfolio/web/app/api/gas/route.ts's
 * established proxy pattern (same request parsing, validation, forwarding,
 * error sanitization, and HTTP status handling) — reused rather than
 * reinvented, adapted only to this app's `callSiteReportAction` import.
 *
 * `lib/api/siteReportWorkflows.ts`'s `getSites()`/`submitReport()` are the
 * browser-safe callers of this route (`fetch("/api/site-report")`);
 * `GET_SITES`/`SUBMIT_REPORT` action names and payload shapes are unchanged
 * from the existing GAS contract (`apps/site-report/gas/src/Api.ts`) — this
 * route adds no business logic of its own, only the missing browser->server
 * transport boundary.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Request body is not valid JSON." },
    });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { action?: unknown }).action !== "string" ||
    (body as { action: string }).action.trim().length === 0
  ) {
    return NextResponse.json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: 'Request body must include a non-empty "action" field.',
      },
    });
  }

  const { action, payload } = body as { action: string; payload?: unknown };

  try {
    const result = await callSiteReportAction(action, payload ?? {});

    // Sanitize error messages from siteReportClient-local codes:
    // NETWORK_ERROR, HTTP_ERROR, INVALID_RESPONSE. These may contain
    // technical diagnostics or URLs. GAS-originated codes (VALIDATION_ERROR,
    // CONFIG_INVALID, SHEET_ERROR, DATA_INVALID, SITE_NOT_FOUND,
    // DRIVE_ERROR, INTERNAL_ERROR from Api.ts) already have safe messages
    // and are forwarded unchanged.
    if (
      result.ok === false &&
      ["NETWORK_ERROR", "HTTP_ERROR", "INVALID_RESPONSE"].includes(result.error.code)
    ) {
      console.error(
        "[/api/site-report] callSiteReportAction returned a local failure:",
        result.error.code,
        result.error.message,
      );
      return NextResponse.json({
        ok: false,
        error: {
          code: result.error.code,
          message: "サーバーエラーが発生しました。",
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[/api/site-report] callSiteReportAction threw:", message);
    return NextResponse.json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" },
    });
  }
}
