import { NormalizedReservation } from "./models/ReservationDomain";

/**
 * Pure Japanese email copy for the reservation workflow (Phase 0 §M) —
 * `Mail.ts` only sends whatever `{subject, body}` this module builds; it
 * never composes copy itself. Never includes `submissionId` or the
 * customer's raw phone number (Phase 0 §M: "emails never include internal
 * identifiers beyond what the customer needs").
 */

export interface EmailContent {
  subject: string;
  body: string;
}

export interface ReservationEmailContext {
  reservationId: string;
  reservation: NormalizedReservation;
  cancellationUrl: string;
  businessName: string;
}

export function buildCustomerConfirmationEmail(ctx: ReservationEmailContext): EmailContent {
  return {
    subject: `【${ctx.businessName}】ご予約を受け付けました（${ctx.reservationId}）`,
    body: [
      `${ctx.reservation.customerName} 様`,
      "",
      `${ctx.businessName}をご予約いただき、誠にありがとうございます。以下の内容でご予約を承りました。`,
      "",
      `予約番号: ${ctx.reservationId}`,
      `メニュー: ${ctx.reservation.serviceName}`,
      `日時: ${ctx.reservation.date} ${ctx.reservation.startTime}〜${ctx.reservation.endTime}`,
      "",
      "ご予約のキャンセルは以下のリンクから承ります。",
      ctx.cancellationUrl,
      "",
      ctx.businessName,
    ].join("\n"),
  };
}

export function buildOwnerConfirmedNotificationEmail(ctx: ReservationEmailContext): EmailContent {
  return {
    subject: `[予約通知] ${ctx.reservation.date} ${ctx.reservation.startTime} ${ctx.reservation.serviceName}`,
    body: [
      "新しいご予約が確定しました。",
      "",
      `予約番号: ${ctx.reservationId}`,
      `お客様名: ${ctx.reservation.customerName}`,
      `メニュー: ${ctx.reservation.serviceName}`,
      `日時: ${ctx.reservation.date} ${ctx.reservation.startTime}〜${ctx.reservation.endTime}`,
      ctx.reservation.assignedStaffId ? `担当スタッフID: ${ctx.reservation.assignedStaffId}` : "",
    ]
      .filter((line) => line.length > 0)
      .join("\n"),
  };
}

export function buildOwnerNeedsAttentionEmail(ctx: ReservationEmailContext, reasonSummary: string): EmailContent {
  return {
    subject: `[要確認] ご予約の自動確定に失敗しました（${ctx.reservationId}）`,
    body: [
      "以下のご予約はシステムで自動確定できませんでした。内容をご確認のうえ、手動でのカレンダー登録・対応をお願いします。",
      "",
      `予約番号: ${ctx.reservationId}`,
      `お客様名: ${ctx.reservation.customerName}`,
      `メニュー: ${ctx.reservation.serviceName}`,
      `日時: ${ctx.reservation.date} ${ctx.reservation.startTime}〜${ctx.reservation.endTime}`,
      `理由: ${reasonSummary}`,
      "",
      "詳細はERROR_LOGシートをご確認ください。",
    ].join("\n"),
  };
}
