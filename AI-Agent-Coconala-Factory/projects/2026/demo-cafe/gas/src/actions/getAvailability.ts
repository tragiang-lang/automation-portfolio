import { isValidLocalDate } from "../lib/time";
import { activeBookings, listAvailableStartTimes, loadPolicy } from "../services/availability";
import { asPayload, FieldCollector } from "../validation/validators";
import { RESERVATIONS_SHEET, resolveDurationMinutes } from "./createReservation";
import { ActionHandler } from "./types";

export interface GetAvailabilityInput {
  date: string;
  serviceId?: string;
}

export interface GetAvailabilityOutput {
  date: string;
  durationMinutes: number;
  startTimes: string[];
}

/** Bookable start times for one date. API-only in Phase 1. A Phase 2 LIFF
 *  booking screen calls it; the LINE flow uses LINE's own date picker. */
export const getAvailability: ActionHandler<GetAvailabilityInput, GetAvailabilityOutput> = {
  id: "getAvailability",

  parse(payload) {
    const fields = new FieldCollector(asPayload(payload));
    const date = fields.string("date", { required: true, maxLength: 10, label: "日付" });
    const serviceId = fields.string("serviceId", { maxLength: 50 });
    fields.require(date === undefined || isValidLocalDate(date), { field: "date", code: "INVALID_FORMAT", message: "日付の形式が正しくありません" });
    fields.finish();
    return { date: date!, serviceId };
  },

  run(input, ctx) {
    const policy = loadPolicy(ctx.config());
    const durationMinutes = resolveDurationMinutes(ctx, policy, input.serviceId);
    const bookings = activeBookings(ctx.tables.readAll(RESERVATIONS_SHEET));
    return {
      date: input.date,
      durationMinutes,
      startTimes: listAvailableStartTimes(policy, bookings, input.date, durationMinutes, ctx.now()),
    };
  },
};
