import { asPayload, FieldCollector } from "../validation/validators";
import { ActionHandler, textMessage } from "./types";

type View = "all" | "access" | "hours";
const VIEWS: readonly View[] = ["all", "access", "hours"];

export interface BusinessInfo {
  view: View;
  name: string;
  address?: string;
  phone?: string;
  mapUrl?: string;
  hoursText?: string;
  accessNote?: string;
}

/** Read-only business profile from CONFIG (business.*). Backs the
 *  business-info-v1 workflow (access / hours buttons). */
export const getBusinessInfo: ActionHandler<{ view: View }, BusinessInfo> = {
  id: "getBusinessInfo",

  parse(payload) {
    const fields = new FieldCollector(asPayload(payload));
    const view = (fields.string("view", { maxLength: 10 }) ?? "all") as View;
    fields.require(VIEWS.includes(view), { field: "view", code: "INVALID_VALUE", message: "表示内容の指定が正しくありません" });
    fields.finish();
    return { view };
  },

  run(input, ctx) {
    const config = ctx.config();
    return {
      view: input.view,
      name: config.requiredString("business.name"),
      address: config.optionalString("business.address"),
      phone: config.optionalString("business.phone"),
      mapUrl: config.optionalString("business.mapUrl"),
      hoursText: config.optionalString("business.hoursText"),
      accessNote: config.optionalString("business.accessNote"),
    };
  },

  fromLine(invocation) {
    return { view: invocation.params.view ?? "all" };
  },

  toLineMessages(info) {
    const lines: string[] = [`【${info.name}】`];
    if (info.view !== "hours") {
      if (info.address) lines.push(`住所: ${info.address}`);
      if (info.accessNote) lines.push(info.accessNote);
      if (info.mapUrl) lines.push(`地図: ${info.mapUrl}`);
    }
    if (info.view !== "access") {
      if (info.hoursText) lines.push(`営業時間: ${info.hoursText}`);
    }
    if (info.phone) lines.push(`電話: ${info.phone}`);
    return [textMessage(lines.join("\n"))];
  },
};
