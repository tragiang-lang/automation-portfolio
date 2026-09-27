import { describe, expect, it } from "vitest";
import { getBusinessInfo } from "../../src/actions/getBusinessInfo";
import { ActionError } from "../../src/lib/result";
import { makeContext, runAction as run } from "../support/fakes";

describe("getBusinessInfo", () => {
  it("reads business.* keys and formats the access view", () => {
    const ctx = makeContext({ config: { "business.name": "テストサロン", "business.address": "東京都渋谷区1-1", "business.hoursText": "10:00-19:00" } });
    const info = run(getBusinessInfo, { view: "access" }, ctx);
    expect(info).toMatchObject({ name: "テストサロン", address: "東京都渋谷区1-1" });
    const text = getBusinessInfo.toLineMessages!(info, ctx)[0].text;
    expect(text).toContain("住所");
    expect(text).not.toContain("営業時間");
  });

  it("fails with CONFIG_INVALID when business.name is missing", () => {
    const ctx = makeContext({ config: {} });
    expect(() => run(getBusinessInfo, {}, ctx)).toThrow(expect.objectContaining({ code: "CONFIG_INVALID" }));
  });

  it("rejects unknown views", () => {
    expect(() => getBusinessInfo.parse({ view: "secret" })).toThrow(ActionError);
  });
});
