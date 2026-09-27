import { generateId } from "../lib/ids";
import { upsertCustomer } from "../repositories/customerRepository";
import { claimOnce } from "../services/idempotency";
import { notifyOwner } from "../services/notify";
import { asPayload, FieldCollector } from "../validation/validators";
import { ActionHandler, textMessage } from "./types";

export const INQUIRIES_SHEET = "INQUIRIES";

export interface CreateInquiryInput {
  submissionId: string;
  message: string;
  name?: string;
  email?: string;
  phone?: string;
  lineUserId?: string;
  source: "line" | "api";
}

export interface CreateInquiryOutput {
  inquiryId: string;
}

/**
 * Records one inquiry, idempotently, then notifies the owner by email.
 * Requires at least one way to reply: a LINE user id, an email, or a phone.
 */
export const createInquiry: ActionHandler<CreateInquiryInput, CreateInquiryOutput> = {
  id: "createInquiry",

  parse(payload) {
    const fields = new FieldCollector(asPayload(payload));
    const submissionId = fields.string("submissionId", { required: true, maxLength: 100, label: "submissionId" });
    const message = fields.string("message", { required: true, maxLength: 2000, label: "お問い合わせ内容" });
    const name = fields.string("name", { maxLength: 100, label: "お名前" });
    const email = fields.email("email");
    const phone = fields.phone("phone");
    const lineUserId = fields.string("lineUserId", { maxLength: 100, label: "lineUserId" });
    const source = fields.string("source", { maxLength: 10 }) === "line" ? "line" : "api";
    fields.require(Boolean(lineUserId || email || phone), {
      field: "contact",
      code: "REQUIRED",
      message: "ご連絡先（メールアドレスまたは電話番号）を入力してください",
    });
    fields.finish();
    return { submissionId: submissionId!, message: message!, name, email, phone, lineUserId, source };
  },

  run(input, ctx) {
    const { result, duplicate } = claimOnce<CreateInquiryOutput>(
      ctx,
      "inquiry",
      input.submissionId,
      () => {
        const existing = ctx.tables.readAll(INQUIRIES_SHEET).find((row) => String(row.submissionId) === input.submissionId);
        return existing ? { inquiryId: String(existing.inquiryId) } : null;
      },
      () => {
        const inquiryId = generateId("INQ", ctx.now(), () => ctx.random());
        const customerId = upsertCustomer(ctx, input);
        ctx.tables.append(INQUIRIES_SHEET, {
          inquiryId,
          submissionId: input.submissionId,
          createdAt: ctx.now().toISOString(),
          customerId,
          lineUserId: input.lineUserId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          message: input.message,
          source: input.source,
          status: "NEW",
        });
        return { inquiryId };
      },
    );
    if (!duplicate) {
      notifyOwner(
        ctx,
        `【新しいお問い合わせ】${result.inquiryId}`,
        `新しいお問い合わせが届きました。\n受付番号: ${result.inquiryId}\n経路: ${input.source === "line" ? "LINE" : "Web"}\n\n内容はスプレッドシートの INQUIRIES シートでご確認ください。`,
        result.inquiryId,
      );
    }
    return result;
  },

  fromLine(invocation) {
    return { submissionId: invocation.eventId, message: invocation.text, lineUserId: invocation.userId, source: "line" };
  },

  toLineMessages(output) {
    return [textMessage(`お問い合わせを受け付けました。\n担当者より順次ご返信いたします。\n受付番号: ${output.inquiryId}`)];
  },
};
