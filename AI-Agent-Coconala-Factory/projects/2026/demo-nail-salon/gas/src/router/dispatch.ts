import type { ActionRegistry } from "../actions/types";
import { handleLineWebhook, isLineWebhookBody, LineRoute } from "../line/webhook";
import { ApiResponse, ERROR_CODES, failure } from "../lib/result";
import type { ActionContext } from "../services/context";
import { handleApiRequest } from "./apiRouter";

/**
 * Single doPost decision point, kept pure so it can be tested.
 *
 * GAS web apps cannot read request headers, so LINE's x-line-signature
 * cannot be verified here (a platform limitation, see docs/security.md).
 * In production LINE calls the verification proxy (line/webhook/), which
 * checks the signature and forwards only verified deliveries here with a
 * secret `key` query parameter. That key must equal the WEBHOOK_KEY Script
 * Property; it authenticates the proxy, it is NOT a LINE signature check.
 * When WEBHOOK_KEY is unset, every LINE delivery is rejected (fail closed).
 */

export interface DispatchDeps {
  registry: ActionRegistry;
  apiActions: readonly string[];
  routes: readonly LineRoute[];
  webhookKey: string | null;
  apiEnabled: boolean;
  ctx: () => ActionContext;
}

export function isAuthorizedWebhook(provided: string | undefined, expected: string | null): boolean {
  if (!expected || expected.length < 16 || !provided || provided.length !== expected.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export function dispatchPost(rawBody: string | undefined, queryKey: string | undefined, deps: DispatchDeps): ApiResponse | { ok: true; data: { handled: number } } {
  let parsed: unknown = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = null;
  }
  if (isLineWebhookBody(parsed)) {
    if (!isAuthorizedWebhook(queryKey, deps.webhookKey)) {
      return failure(ERROR_CODES.UNAUTHORIZED);
    }
    const sent = handleLineWebhook(parsed, { routes: deps.routes, registry: deps.registry, ctx: deps.ctx() });
    return { ok: true, data: { handled: sent.length } };
  }
  return handleApiRequest(rawBody, { apiEnabled: deps.apiEnabled, registry: deps.registry, apiActions: deps.apiActions, ctx: deps.ctx });
}
