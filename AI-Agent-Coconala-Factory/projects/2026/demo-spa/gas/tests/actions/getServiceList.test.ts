import { describe, expect, it } from "vitest";
import { getServiceList } from "../../src/actions/getServiceList";
import { makeContext, runAction as run } from "../support/fakes";

describe("getServiceList", () => {
  it("returns only active services in display order", () => {
    const ctx = makeContext();
    ctx.tables.append("SERVICES", { serviceId: "S2", name: "カラー", active: true, displayOrder: 2, price: 8800, durationMinutes: 90 });
    ctx.tables.append("SERVICES", { serviceId: "S1", name: "カット", active: "TRUE", displayOrder: 1, price: 5500 });
    ctx.tables.append("SERVICES", { serviceId: "S3", name: "休止中", active: false, displayOrder: 0 });
    const output = run(getServiceList, {}, ctx);
    expect(output.services.map((s) => s.serviceId)).toEqual(["S1", "S2"]);
    expect(getServiceList.toLineMessages!(output, ctx)[0].text).toContain("・カラー 90分 ¥8,800");
  });
});
