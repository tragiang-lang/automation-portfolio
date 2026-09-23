import { describe, expect, it } from "vitest";
import { createInquiry } from "../../src/actions/createInquiry";
import { ActionError } from "../../src/lib/result";
import { makeContext, runAction as run } from "../support/fakes";

describe("createInquiry", () => {
  it("requires a message and a way to reply", () => {
    try {
      createInquiry.parse({ submissionId: "s1" });
      throw new Error("expected validation error");
    } catch (error) {
      expect((error as ActionError).issues.map((i) => i.field).sort()).toEqual(["contact", "message"]);
    }
  });

  it("stores the inquiry once, links a customer, and notifies the owner once", () => {
    const ctx = makeContext({ config: { "business.name": "テストサロン", "notification.ownerEmail": "owner@example.com" } });
    const payload = createInquiry.fromLine!({ eventId: "evt-1", userId: "U0000test", text: "駐車場はありますか？", params: {} });
    const first = run(createInquiry, payload, ctx);
    const retry = run(createInquiry, payload, ctx);
    expect(retry).toEqual(first);
    expect(ctx.tables.readAll("INQUIRIES")).toHaveLength(1);
    expect(ctx.tables.readAll("INQUIRIES")[0]).toMatchObject({ source: "line", status: "NEW", lineUserId: "U0000test" });
    expect(ctx.tables.readAll("CUSTOMERS")).toHaveLength(1);
    expect(ctx.mails).toHaveLength(1);
    expect(ctx.mails[0].body).not.toContain("駐車場"); // owner mail carries the id, not the message body
  });

  it("still saves the inquiry when the notification email fails", () => {
    const ctx = makeContext({ config: { "business.name": "x", "notification.ownerEmail": "owner@example.com" }, mailFails: true });
    const output = run(createInquiry, { submissionId: "s2", message: "hi", email: "guest@example.com" }, ctx);
    expect(output.inquiryId).toMatch(/^INQ-\d{8}-[A-Z0-9]{6}$/);
    expect(ctx.tables.readAll("INQUIRIES")).toHaveLength(1);
  });
});
