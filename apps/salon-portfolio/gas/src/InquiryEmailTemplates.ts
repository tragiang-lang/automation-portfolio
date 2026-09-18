import { InquiryRequest } from "./models/InquiryRequest";
import { EmailContent } from "./ReservationEmailTemplates";

/**
 * Pure Japanese email copy for the Inquiry workflow (Starter MVP §5) —
 * mirrors ReservationEmailTemplates.ts's conventions. `Mail.ts` only sends
 * whatever `{subject, body}` this module builds; it never composes copy
 * itself. The customer email never includes the raw message content,
 * phone number, or submissionId (same "no internal identifiers beyond
 * what the customer needs" rule as reservations).
 */

export interface InquiryEmailContext {
  inquiryId: string;
  inquiry: InquiryRequest;
  businessName: string;
  createdAt: Date;
}

export function buildCustomerInquiryConfirmationEmail(ctx: InquiryEmailContext): EmailContent {
  return {
    subject: "お問い合わせを受け付けました",
    body: [
      `${ctx.inquiry.name} 様`,
      "",
      `${ctx.businessName}へのお問い合わせを受け付けました。内容を確認の上、担当より折り返しご連絡いたします。`,
      "",
      "今しばらくお待ちくださいますようお願いいたします。",
      "",
      ctx.businessName,
    ].join("\n"),
  };
}

export function buildOwnerInquiryNotificationEmail(ctx: InquiryEmailContext): EmailContent {
  return {
    subject: "【お問い合わせ】新しいお問い合わせがあります",
    body: [
      `お名前: ${ctx.inquiry.name}`,
      `メールアドレス: ${ctx.inquiry.email}`,
      ctx.inquiry.phone ? `電話番号: ${ctx.inquiry.phone}` : "",
      ctx.inquiry.subject ? `件名: ${ctx.inquiry.subject}` : "",
      `お問い合わせ内容: ${ctx.inquiry.message}`,
      `受付日時: ${ctx.createdAt.toISOString()}`,
    ]
      .filter((line) => line.length > 0)
      .join("\n"),
  };
}
