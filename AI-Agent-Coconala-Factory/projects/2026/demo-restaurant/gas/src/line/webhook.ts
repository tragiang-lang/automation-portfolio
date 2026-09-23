import type { ActionRegistry, LineInvocation } from "../actions/types";
import { textMessage } from "../actions/types";
import { ActionError, ERROR_CODES, ERROR_MESSAGES_JA } from "../lib/result";
import type { ActionContext, LineMessage } from "../services/context";

/**
 * LINE Messaging API webhook adapter.
 *
 * Rich Menu buttons send postbacks such as `wf=inquiry-basic-v1&e=default`
 * (built by the factory's Rich Menu config generator from the same
 * workflow definitions that produced `routes`). Each route either runs its
 * action right away ("direct") or asks a question and runs the action on
 * the user's next text message ("awaitText").
 */

export interface LineRoute {
  workflowId: string;
  entry: string;
  action: string;
  mode: "direct" | "awaitText";
  prompt?: string;
  params?: Record<string, string>;
}

interface LineEvent {
  type: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
  postback?: { data?: string; params?: Record<string, string> };
}

export interface LineWebhookBody {
  destination?: string;
  events: LineEvent[];
}

const AWAIT_TTL_SECONDS = 600;
const AWAIT_PREFIX = "line-await:";

export function isLineWebhookBody(value: unknown): value is LineWebhookBody {
  return typeof value === "object" && value !== null && Array.isArray((value as { events?: unknown }).events);
}

/** GAS has no URLSearchParams, so parse `a=b&c=d` by hand. */
export function parsePostbackData(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of data.split("&")) {
    if (pair === "") continue;
    const index = pair.indexOf("=");
    const key = index === -1 ? pair : pair.slice(0, index);
    const value = index === -1 ? "" : pair.slice(index + 1);
    try {
      result[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      // malformed escape — skip this pair
    }
  }
  return result;
}

export function findRoute(routes: readonly LineRoute[], data: Record<string, string>): LineRoute | undefined {
  return routes.find((route) => route.workflowId === data.wf && route.entry === (data.e ?? "default"));
}

function errorMessage(error: unknown): LineMessage {
  const code = error instanceof ActionError ? error.code : ERROR_CODES.INTERNAL_ERROR;
  return textMessage(ERROR_MESSAGES_JA[code]);
}

function runAction(
  registry: ActionRegistry,
  actionId: string,
  invocation: LineInvocation,
  ctx: ActionContext,
): LineMessage[] {
  const handler = registry[actionId];
  if (!handler || !handler.fromLine) {
    ctx.logger.error("line.unroutable", `action ${actionId} is not LINE-enabled`);
    return [errorMessage(new ActionError(ERROR_CODES.UNKNOWN_ACTION))];
  }
  try {
    const output = handler.run(handler.parse(handler.fromLine(invocation)), ctx);
    return handler.toLineMessages ? handler.toLineMessages(output, ctx) : [];
  } catch (error) {
    ctx.logger.error("line.action_failed", error instanceof Error ? error.message : String(error), { action: actionId, eventId: invocation.eventId });
    if (error instanceof ActionError && error.code === ERROR_CODES.VALIDATION_ERROR && error.issues.length > 0) {
      return [textMessage(error.issues.map((issue) => issue.message).join("\n"))];
    }
    return [errorMessage(error)];
  }
}

/** Handles one webhook delivery. Returns the replies it sent, for tests and logging. */
export function handleLineWebhook(
  body: LineWebhookBody,
  options: { routes: readonly LineRoute[]; registry: ActionRegistry; ctx: ActionContext },
): { replyToken: string; messages: LineMessage[] }[] {
  const { routes, registry, ctx } = options;
  const sent: { replyToken: string; messages: LineMessage[] }[] = [];

  for (const event of body.events) {
    const userId = event.source?.userId;
    const base = { eventId: event.webhookEventId ?? `${userId ?? "anon"}-${ctx.now().getTime()}`, userId };
    let messages: LineMessage[] = [];

    if (event.type === "postback" && event.postback?.data) {
      const data = parsePostbackData(event.postback.data);
      const route = findRoute(routes, data);
      if (!route) {
        ctx.logger.info("line.unknown_postback", { wf: data.wf ?? "" });
        continue;
      }
      if (route.mode === "awaitText") {
        if (!userId) continue;
        ctx.cache.put(`${AWAIT_PREFIX}${userId}`, route.action, AWAIT_TTL_SECONDS);
        messages = [textMessage(route.prompt ?? "内容をメッセージで送信してください。")];
      } else {
        messages = runAction(registry, route.action, { ...base, params: { ...(route.params ?? {}), ...(event.postback.params ?? {}) } }, ctx);
      }
    } else if (event.type === "message" && event.message?.type === "text" && userId) {
      const pendingAction = ctx.cache.get(`${AWAIT_PREFIX}${userId}`);
      if (!pendingAction) {
        continue; // free chat is left to the LINE Official Account's own auto-reply / manual chat
      }
      ctx.cache.remove(`${AWAIT_PREFIX}${userId}`);
      messages = runAction(registry, pendingAction, { ...base, text: event.message.text ?? "", params: {} }, ctx);
    } else {
      continue;
    }

    if (event.replyToken && messages.length > 0) {
      try {
        ctx.line.reply(event.replyToken, messages.slice(0, 5));
        sent.push({ replyToken: event.replyToken, messages: messages.slice(0, 5) });
      } catch (error) {
        ctx.logger.error("line.reply_failed", error instanceof Error ? error.message : String(error), { eventId: base.eventId });
      }
    }
  }
  return sent;
}
