import { verifyLineSignature } from "./signature";

/**
 * Minimal LINE webhook verification proxy (Cloudflare Worker).
 *
 *   LINE Platform ──► this Worker ──(verified only)──► GAS web app ?key=WEBHOOK_KEY
 *
 * Apps Script `doPost(e)` cannot read request headers, so it cannot check
 * `x-line-signature`. This Worker does that check on the raw body, then
 * forwards the same bytes to the GAS web app. The GAS `?key=` parameter
 * only proves "this request came through the proxy"; it is not a LINE
 * signature check.
 *
 * - Invalid, missing or tampered signature → 401, GAS is never called.
 * - Valid signature → 200 right away (LINE requires 200); the forward to
 *   GAS runs in `waitUntil`, so LINE never waits for the spreadsheet work.
 *   GAS replies to the user itself with the reply token.
 * - Verification pings (`events: []`) → 200, nothing forwarded.
 * - Missing configuration → 500 (fail closed).
 *
 * No business logic here, and nothing about a specific client: the three
 * values below are Worker secrets set per deployment (`wrangler secret put`).
 */

export interface Env {
  LINE_CHANNEL_SECRET?: string;
  /** The GAS web app URL (…/exec). Secret: it is an internal endpoint. */
  GAS_WEBAPP_URL?: string;
  /** Must equal the GAS Script Property WEBHOOK_KEY (32+ random characters). */
  GAS_WEBHOOK_KEY?: string;
}

export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** LINE webhook bodies are small; anything larger is not from LINE. */
export const MAX_BODY_BYTES = 1024 * 1024;

const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Builds the forward URL, or null if the configuration is unsafe/incomplete. */
export function gasForwardUrl(env: Env): string | null {
  if (!env.GAS_WEBAPP_URL || !env.GAS_WEBHOOK_KEY || env.GAS_WEBHOOK_KEY.length < 16) return null;
  let url: URL;
  try {
    url = new URL(env.GAS_WEBAPP_URL);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "script.google.com") return null;
  url.searchParams.set("key", env.GAS_WEBHOOK_KEY);
  return url.toString();
}

export async function forwardToGas(url: string, rawBody: Uint8Array<ArrayBuffer>, fetchImpl: FetchLike): Promise<number> {
  try {
    // Apps Script answers POST with a 302 to googleusercontent.com; following it is required.
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: rawBody,
      redirect: "follow",
    });
    if (!response.ok) console.error(`[proxy] GAS forward failed with HTTP ${response.status}`);
    return response.status;
  } catch (error) {
    console.error(`[proxy] GAS forward error: ${error instanceof Error ? error.name : "unknown"}`);
    return 0;
  }
}

export async function handleRequest(request: Request, env: Env, ctx: WaitUntilContext, fetchImpl: FetchLike = fetch): Promise<Response> {
  if (request.method !== "POST") return text("Method Not Allowed", 405);
  const forwardUrl = gasForwardUrl(env);
  if (!env.LINE_CHANNEL_SECRET || !forwardUrl) {
    console.error("[proxy] not configured: set LINE_CHANNEL_SECRET, GAS_WEBAPP_URL and GAS_WEBHOOK_KEY");
    return text("Server Misconfigured", 500);
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return text("Payload Too Large", 413);
  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (rawBody.length > MAX_BODY_BYTES) return text("Payload Too Large", 413);

  // Header names are case-insensitive (Headers.get handles that).
  const valid = await verifyLineSignature(env.LINE_CHANNEL_SECRET, rawBody, request.headers.get("x-line-signature"));
  if (!valid) {
    console.warn("[proxy] rejected: invalid or missing x-line-signature");
    return text("Unauthorized", 401);
  }

  // Parsing is safe now: the signature was checked on the untouched bytes.
  let events: unknown;
  try {
    events = (JSON.parse(new TextDecoder().decode(rawBody)) as { events?: unknown }).events;
  } catch {
    return text("Bad Request", 400);
  }
  if (!Array.isArray(events)) return text("Bad Request", 400);
  if (events.length > 0) ctx.waitUntil(forwardToGas(forwardUrl, rawBody, fetchImpl));
  return text("OK", 200);
}

export default {
  fetch(request: Request, env: Env, ctx: WaitUntilContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};
