import type { ActionContext, LineMessage } from "../services/context";

/** What the LINE adapter knows about the event that invoked an action. */
export interface LineInvocation {
  /** `webhookEventId` — used as the idempotency submission id. */
  eventId: string;
  userId?: string;
  /** Free text, for `awaitText` entries (e.g. an inquiry message). */
  text?: string;
  /** Static entry params from the workflow plus datetimepicker params. */
  params: Record<string, string>;
}

/**
 * One reusable action. `id` matches the Action Registry asset id
 * (core-assets/actions/<id>/v<major>.json), so every generated handler can
 * be traced back to its definition.
 */
export interface ActionHandler<I = unknown, O = unknown> {
  id: string;
  /** Validates an untrusted payload. Throws ActionError(VALIDATION_ERROR). */
  parse(payload: unknown): I;
  run(input: I, ctx: ActionContext): O;
  /** Builds the untrusted payload from a LINE event (only for LINE-exposed actions). */
  fromLine?(invocation: LineInvocation): unknown;
  /** Formats the result as LINE reply messages. */
  toLineMessages?(output: O, ctx: ActionContext): LineMessage[];
}

export type ActionRegistry = Record<string, ActionHandler<any, any>>;

/** LINE text messages are capped at 5000 characters. */
export function textMessage(text: string): LineMessage {
  return { type: "text", text: text.length > 5000 ? `${text.slice(0, 4990)}…` : text };
}
