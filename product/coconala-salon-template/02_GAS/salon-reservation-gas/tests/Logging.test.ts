import { buildErrorLogRow, buildEmailLogRow } from "../src/Logging";

describe("buildErrorLogRow", () => {
  it("serializes context to JSON and never includes a stack unless provided", () => {
    const now = new Date("2026-09-06T00:00:00.000Z");
    const row = buildErrorLogRow(
      { action: "createReservation", message: "Calendar event creation failed", context: { reservationId: "RES-1" }, severity: "error" },
      "err-1",
      now,
    );
    expect(row).toEqual({
      ErrorID: "err-1",
      CreatedAt: now.toISOString(),
      Action: "createReservation",
      Message: "Calendar event creation failed",
      Stack: undefined,
      ContextJSON: JSON.stringify({ reservationId: "RES-1" }),
      Severity: "error",
    });
  });

  it("omits ContextJSON entirely (undefined, not \"{}\") when no context is given", () => {
    const row = buildErrorLogRow({ action: "createReservation", message: "x", severity: "warning" }, "err-2", new Date());
    expect(row.ContextJSON).toBeUndefined();
  });
});

describe("buildEmailLogRow", () => {
  it("builds a sent-status row", () => {
    const now = new Date("2026-09-06T00:00:00.000Z");
    const row = buildEmailLogRow(
      {
        relatedType: "Reservation",
        relatedId: "RES-1",
        recipientType: "customer",
        recipientEmail: "a@example.com",
        subject: "ご予約を受け付けました",
        status: "sent",
      },
      "email-1",
      now,
    );
    expect(row).toEqual({
      EmailLogID: "email-1",
      CreatedAt: now.toISOString(),
      RelatedType: "Reservation",
      RelatedID: "RES-1",
      RecipientType: "customer",
      RecipientEmail: "a@example.com",
      Subject: "ご予約を受け付けました",
      Status: "sent",
      ErrorMessage: undefined,
    });
  });

  it("carries an ErrorMessage on a failed-status row", () => {
    const row = buildEmailLogRow(
      {
        relatedType: "Reservation",
        relatedId: "RES-1",
        recipientType: "owner",
        recipientEmail: "owner@example.com",
        subject: "x",
        status: "failed",
        errorMessage: "quota exceeded",
      },
      "email-2",
      new Date(),
    );
    expect(row.ErrorMessage).toBe("quota exceeded");
  });
});
