import { describe, expect, it } from "vitest";
import { upsertCustomer } from "../../src/repositories/customerRepository";
import { claimOnce } from "../../src/services/idempotency";
import { notifyOwner } from "../../src/services/notify";
import { makeContext } from "../support/fakes";

describe("claimOnce", () => {
  it("creates once and returns the cached result on retry", () => {
    const ctx = makeContext();
    let creates = 0;
    const first = claimOnce(ctx, "ns", "sub-1", () => null, () => ({ id: ++creates }));
    const second = claimOnce(ctx, "ns", "sub-1", () => null, () => ({ id: ++creates }));
    expect(first).toEqual({ result: { id: 1 }, duplicate: false });
    expect(second).toEqual({ result: { id: 1 }, duplicate: true });
    expect(creates).toBe(1);
  });

  it("falls back to the sheet backstop when the cache is cold", () => {
    const ctx = makeContext();
    const result = claimOnce(ctx, "ns", "sub-2", () => ({ id: 99 }), () => ({ id: 1 }));
    expect(result).toEqual({ result: { id: 99 }, duplicate: true });
  });
});

describe("notifyOwner", () => {
  it("skips silently without an owner email and never throws on mail failure", () => {
    const quiet = makeContext();
    expect(notifyOwner(quiet, "s", "b", "X")).toBe(false);
    const failing = makeContext({ config: { "notification.ownerEmail": "owner@example.com" }, mailFails: true });
    expect(notifyOwner(failing, "s", "b", "X")).toBe(false);
    expect(failing.errors.map((e) => e.event)).toContain("notify.failed");
  });
});

describe("upsertCustomer", () => {
  it("reuses an existing customer by LINE id and fills only blank fields", () => {
    const ctx = makeContext();
    const first = upsertCustomer(ctx, { lineUserId: "U0000test" });
    const second = upsertCustomer(ctx, { lineUserId: "U0000test", name: "山田" });
    expect(second).toBe(first);
    expect(ctx.tables.readAll("CUSTOMERS")).toHaveLength(1);
    expect(ctx.tables.readAll("CUSTOMERS")[0].name).toBe("山田");
  });
});
