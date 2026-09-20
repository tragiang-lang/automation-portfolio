import { NextResponse } from "next/server";
import { callGasAction } from "@/lib/api/gasClient";

/**
 * Generic GAS action proxy — the one place a browser is ever allowed to
 * reach GAS through. `GAS_WEBAPP_URL` is read server-side only inside
 * `gasClient.ts`; this route never puts it, or any other server-only
 * value, into the response.
 *
 * No frontend code calls this yet: `getConfig` is fetched directly from
 * the server boundary in `lib/config/runtimeConfig.ts`, per Next.js's own
 * guidance against a Server Component calling its own Route Handler over
 * HTTP. This route exists so a later phase's browser-initiated action
 * (e.g. `createReservation`) has the proxy boundary already in place —
 * see docs/runtime-config-guide.md.
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
    const result = await callGasAction(action, payload ?? {});

    // Sanitize error messages from gasClient-local codes: NETWORK_ERROR,
    // HTTP_ERROR, INVALID_RESPONSE. These may contain technical diagnostics
    // or URLs. GAS-originated codes (CONFIG_INVALID, VALIDATION_ERROR,
    // SHEET_ERROR, INTERNAL_ERROR from Api.ts) already have safe Japanese
    // messages and are forwarded unchanged.
    if (
      result.ok === false &&
      ["NETWORK_ERROR", "HTTP_ERROR", "INVALID_RESPONSE"].includes(result.error.code)
    ) {
      console.error(
        "[/api/gas] callGasAction returned a local failure:",
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
    console.error("[/api/gas] callGasAction threw:", message);
    return NextResponse.json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました。" },
    });
  }
}
