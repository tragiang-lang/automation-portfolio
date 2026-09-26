import { generateId } from "../lib/ids";
import { ActionError, ERROR_CODES } from "../lib/result";
import { addMinutes, formatJapaneseDateTime, formatLocalDateTime, parseLocalDateTime } from "../lib/time";
import { upsertCustomer } from "../repositories/customerRepository";
import { activeBookings, checkSlot, loadPolicy, ReservationPolicy } from "../services/availability";
import type { ActionContext } from "../services/context";
import { claimOnce } from "../services/idempotency";
import { notifyOwner } from "../services/notify";
import { asPayload, FieldCollector } from "../validation/validators";
import { ActionHandler, textMessage } from "./types";

export const RESERVATIONS_SHEET = "RESERVATIONS";
const SERVICES_SHEET = "SERVICES";

export interface CreateReservationInput {
  submissionId: string;
  startDateTime: string;
  serviceId?: string;
  partySize?: number;
  name?: string;
  email?: string;
  phone?: string;
  lineUserId?: string;
  notes?: string;
  source: "line" | "api";
}

export interface CreateReservationOutput {
  reservationId: string;
  status: "REQUESTED";
  startDateTime: string;
  endDateTime: string;
}

/** Service duration if `serviceId` names an active SERVICES row with a
 *  positive `durationMinutes`; otherwise the policy default. */
export function resolveDurationMinutes(ctx: ActionContext, policy: ReservationPolicy, serviceId?: string): number {
  if (!serviceId || !ctx.tables.hasSheet(SERVICES_SHEET)) {
    return policy.defaultDurationMinutes;
  }
  const service = ctx.tables.readAll(SERVICES_SHEET).find((row) => String(row.serviceId) === serviceId);
  if (!service) {
    throw new ActionError(ERROR_CODES.VALIDATION_ERROR, "unknown serviceId", [
      { field: "serviceId", code: "NOT_FOUND", message: "選択されたメニューが見つかりません" },
    ]);
  }
  const minutes = Number(service.durationMinutes);
  return Number.isInteger(minutes) && minutes > 0 ? minutes : policy.defaultDurationMinutes;
}

/**
 * Creates a reservation *request* (status REQUESTED). The owner confirms it
 * by changing the status to CONFIRMED in the sheet. This is the basic
 * Phase 1 flow; automatic confirmation, Calendar sync, and cancellation are
 * documented extension points. The slot is re-checked under the script lock
 * so two simultaneous requests cannot both take the last seat.
 */
export const createReservation: ActionHandler<CreateReservationInput, CreateReservationOutput> = {
  id: "createReservation",

  parse(payload) {
    const fields = new FieldCollector(asPayload(payload));
    const submissionId = fields.string("submissionId", { required: true, maxLength: 100, label: "submissionId" });
    const startDateTime = fields.string("startDateTime", { required: true, maxLength: 16, label: "ご希望日時" });
    fields.require(startDateTime === undefined || parseLocalDateTime(startDateTime) !== null, {
      field: "startDateTime",
      code: "INVALID_FORMAT",
      message: "ご希望日時の形式が正しくありません",
    });
    const serviceId = fields.string("serviceId", { maxLength: 50 });
    const partySize = fields.integer("partySize", { min: 1, max: 50, label: "人数" });
    const name = fields.string("name", { maxLength: 100, label: "お名前" });
    const email = fields.email("email");
    const phone = fields.phone("phone");
    const lineUserId = fields.string("lineUserId", { maxLength: 100 });
    const notes = fields.string("notes", { maxLength: 500, label: "ご要望" });
    const source = fields.string("source", { maxLength: 10 }) === "line" ? "line" : "api";
    fields.require(Boolean(lineUserId || (name && (email || phone))), {
      field: "contact",
      code: "REQUIRED",
      message: "お名前とご連絡先（メールアドレスまたは電話番号）を入力してください",
    });
    fields.finish();
    return { submissionId: submissionId!, startDateTime: startDateTime!, serviceId, partySize, name, email, phone, lineUserId, notes, source };
  },

  run(input, ctx) {
    const policy = loadPolicy(ctx.config());
    const durationMinutes = resolveDurationMinutes(ctx, policy, input.serviceId);
    const start = parseLocalDateTime(input.startDateTime)!;
    const end = addMinutes(start, durationMinutes);

    const { result, duplicate } = claimOnce<CreateReservationOutput>(
      ctx,
      "reservation",
      input.submissionId,
      () => {
        const row = ctx.tables.readAll(RESERVATIONS_SHEET).find((r) => String(r.submissionId) === input.submissionId);
        return row
          ? { reservationId: String(row.reservationId), status: "REQUESTED", startDateTime: input.startDateTime, endDateTime: formatLocalDateTime(end) }
          : null;
      },
      () => {
        const bookings = activeBookings(ctx.tables.readAll(RESERVATIONS_SHEET));
        const verdict = checkSlot(policy, bookings, start, durationMinutes, ctx.now());
        if (!verdict.ok) {
          throw new ActionError(ERROR_CODES.SLOT_UNAVAILABLE, `slot rejected: ${verdict.reason}`);
        }
        const reservationId = generateId("RES", ctx.now(), () => ctx.random());
        const customerId = upsertCustomer(ctx, input);
        const now = ctx.now().toISOString();
        const endLocal = formatLocalDateTime(end);
        ctx.tables.append(RESERVATIONS_SHEET, {
          reservationId,
          submissionId: input.submissionId,
          createdAt: now,
          updatedAt: now,
          customerId,
          lineUserId: input.lineUserId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          serviceId: input.serviceId,
          partySize: input.partySize,
          date: input.startDateTime.slice(0, 10),
          startTime: input.startDateTime.slice(11, 16),
          endTime: endLocal.slice(11, 16),
          durationMinutes,
          status: "REQUESTED",
          source: input.source,
          notes: input.notes,
        });
        return { reservationId, status: "REQUESTED", startDateTime: input.startDateTime, endDateTime: endLocal };
      },
    );

    if (!duplicate) {
      notifyOwner(
        ctx,
        `【予約リクエスト】${formatJapaneseDateTime(result.startDateTime)} ${result.reservationId}`,
        `新しい予約リクエストが届きました。\n予約番号: ${result.reservationId}\n日時: ${formatJapaneseDateTime(result.startDateTime)}\n\nスプレッドシートの RESERVATIONS シートで内容を確認し、status を CONFIRMED に変更してください。`,
        result.reservationId,
      );
    }
    return result;
  },

  fromLine(invocation) {
    return {
      submissionId: invocation.eventId,
      startDateTime: invocation.params.datetime,
      serviceId: invocation.params.serviceId,
      lineUserId: invocation.userId,
      source: "line",
    };
  },

  toLineMessages(output) {
    return [
      textMessage(
        `ご予約リクエストを受け付けました。\n日時: ${formatJapaneseDateTime(output.startDateTime)}\n予約番号: ${output.reservationId}\n\n確定しましたら改めてご連絡いたします。`,
      ),
    ];
  },
};
