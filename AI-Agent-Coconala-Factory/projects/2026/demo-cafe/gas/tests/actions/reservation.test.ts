import { describe, expect, it } from "vitest";
import { createReservation } from "../../src/actions/createReservation";
import { getAvailability } from "../../src/actions/getAvailability";
import { ConfigReader } from "../../src/config/configReader";
import { handleLineWebhook } from "../../src/line/webhook";
import { ActionError } from "../../src/lib/result";
import { parseLocalDateTime } from "../../src/lib/time";
import { activeBookings, checkSlot, listAvailableStartTimes, loadPolicy, normalizeCell } from "../../src/services/availability";
import { makeContext, RESERVATION_CONFIG, runAction as run } from "../support/fakes";

const NOW = new Date("2026-10-01T00:00:00.000Z"); // Thu 09:00 JST

describe("reservation actions", () => {
  it("lists availability for a date", () => {
    const ctx = makeContext({ config: RESERVATION_CONFIG });
    const output = run(getAvailability, { date: "2026-10-02" }, ctx);
    expect(output.startTimes[0]).toBe("10:00");
    expect(output.durationMinutes).toBe(60);
  });

  it("creates a REQUESTED reservation from a LINE datetimepicker postback", () => {
    const ctx = makeContext({ config: RESERVATION_CONFIG });
    const payload = createReservation.fromLine!({ eventId: "evt-9", userId: "U0000test", params: { datetime: "2026-10-02T11:00" } });
    const output = run(createReservation, payload, ctx);
    expect(output).toMatchObject({ status: "REQUESTED", startDateTime: "2026-10-02T11:00", endDateTime: "2026-10-02T12:00" });
    expect(ctx.tables.readAll("RESERVATIONS")[0]).toMatchObject({ date: "2026-10-02", startTime: "11:00", endTime: "12:00" });
    expect(ctx.mails).toHaveLength(1);
    expect(createReservation.toLineMessages!(output, ctx)[0].text).toContain("10月2日(金) 11:00");
  });

  it("is idempotent for LINE redelivery of the same event", () => {
    const ctx = makeContext({ config: RESERVATION_CONFIG });
    const payload = { submissionId: "evt-10", startDateTime: "2026-10-02T11:00", lineUserId: "U0000test", source: "line" };
    run(createReservation, payload, ctx);
    run(createReservation, payload, ctx);
    expect(ctx.tables.readAll("RESERVATIONS")).toHaveLength(1);
  });

  it("rejects a second booking for a full slot with SLOT_UNAVAILABLE", () => {
    const ctx = makeContext({ config: RESERVATION_CONFIG });
    run(createReservation, { submissionId: "a", startDateTime: "2026-10-02T11:00", lineUserId: "U0000a" }, ctx);
    expect(() => run(createReservation, { submissionId: "b", startDateTime: "2026-10-02T11:30", lineUserId: "U0000b" }, ctx)).toThrow(
      expect.objectContaining({ code: "SLOT_UNAVAILABLE" }),
    );
  });

  it("uses the service duration when a serviceId is given and rejects unknown services", () => {
    const ctx = makeContext({ config: RESERVATION_CONFIG });
    ctx.tables.append("SERVICES", { serviceId: "S1", name: "カラー", active: true, durationMinutes: 120 });
    const output = run(createReservation, { submissionId: "c", startDateTime: "2026-10-02T10:00", serviceId: "S1", lineUserId: "U0000c" }, ctx);
    expect(output.endDateTime).toBe("2026-10-02T12:00");
    expect(() => run(createReservation, { submissionId: "d", startDateTime: "2026-10-03T10:00", serviceId: "NOPE", lineUserId: "U0000d" }, ctx)).toThrow(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });

  it("requires name plus contact when there is no LINE user", () => {
    expect(() => createReservation.parse({ submissionId: "e", startDateTime: "2026-10-02T11:00", email: "guest@example.com" })).toThrow(ActionError);
  });
});

describe("availability", () => {
  const policy = loadPolicy(new ConfigReader(Object.entries(RESERVATION_CONFIG).map(([key, value]) => ({ key, value }))));

  it("rejects closed days, outside hours, too-soon and too-far slots", () => {
    const at = (value: string) => parseLocalDateTime(value)!;
    expect(checkSlot(policy, [], at("2026-10-04T12:00"), 60, NOW)).toEqual({ ok: false, reason: "CLOSED" }); // Sunday
    expect(checkSlot(policy, [], at("2026-10-02T18:30"), 60, NOW)).toEqual({ ok: false, reason: "OUTSIDE_HOURS" });
    expect(checkSlot(policy, [], at("2026-10-01T11:00"), 60, NOW)).toEqual({ ok: false, reason: "TOO_SOON" });
    expect(checkSlot(policy, [], at("2026-11-05T11:00"), 60, NOW)).toEqual({ ok: false, reason: "TOO_FAR" });
    expect(checkSlot(policy, [], at("2026-10-02T11:00"), 60, NOW)).toEqual({ ok: true });
  });

  it("enforces capacity against active bookings only", () => {
    const rows = [
      { status: "CONFIRMED", date: "2026-10-02", startTime: "11:00", endTime: "12:00" },
      { status: "CANCELLED", date: "2026-10-02", startTime: "13:00", endTime: "14:00" },
    ];
    const bookings = activeBookings(rows);
    expect(bookings).toHaveLength(1);
    expect(checkSlot(policy, bookings, parseLocalDateTime("2026-10-02T11:30")!, 60, NOW)).toEqual({ ok: false, reason: "FULL" });
    expect(listAvailableStartTimes(policy, bookings, "2026-10-02", 60, NOW)).toEqual([
      "10:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
    ]);
  });

  it("normalizes Date cells written back by Sheets", () => {
    expect(normalizeCell(new Date("2026-10-02T02:00:00Z"), "date")).toBe("2026-10-02");
    expect(normalizeCell(new Date("2026-10-02T02:00:00Z"), "time")).toBe("11:00");
  });
});

describe("reservation via LINE webhook", () => {
  const routes = [{ workflowId: "reservation-basic-v1", entry: "default", action: "createReservation", mode: "direct" as const }];
  const postback = (datetime: string, id: string) => ({
    type: "postback",
    webhookEventId: id,
    replyToken: `rt-${id}`,
    source: { userId: "U0000test" },
    postback: { data: "wf=reservation-basic-v1&e=default", params: { datetime } },
  });

  it("books from a datetimepicker postback and replies with a safe message when the slot is closed", () => {
    const ctx = makeContext({ config: RESERVATION_CONFIG });
    const sent = handleLineWebhook(
      { events: [postback("2026-10-02T11:00", "e1"), postback("2026-10-04T12:00", "e2")] },
      { routes, registry: { createReservation }, ctx },
    );
    expect(sent[0].messages[0].text).toContain("受け付けました");
    expect(sent[1].messages[0].text).toContain("ご予約いただけません");
    expect(ctx.tables.readAll("RESERVATIONS")).toHaveLength(1);
  });
});
