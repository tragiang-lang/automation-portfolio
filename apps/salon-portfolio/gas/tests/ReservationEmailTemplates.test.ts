import {
  buildCustomerConfirmationEmail,
  buildOwnerConfirmedNotificationEmail,
  buildOwnerNeedsAttentionEmail,
  ReservationEmailContext,
} from "../src/ReservationEmailTemplates";
import { NormalizedReservation } from "../src/models/ReservationDomain";

const reservation: NormalizedReservation = {
  reservationId: "RES-20260910-X8K2MP",
  submissionId: "sub-1",
  customerName: "山田太郎",
  email: "yamada@example.com",
  phone: "09012345678",
  date: "2026-09-10",
  startTime: "10:00",
  endTime: "11:00",
  serviceId: "SV001",
  serviceName: "ジェルネイル",
  durationMinutes: 60,
  price: 6000,
  staffSelection: { kind: "none" },
  assignedStaffId: undefined,
  notes: undefined,
};

const ctx: ReservationEmailContext = {
  reservationId: reservation.reservationId,
  reservation,
  cancellationUrl: "https://example.com/reservation/cancel?reservationId=RES-20260910-X8K2MP&token=abc",
  businessName: "サロン花",
  serviceLabel: "メニュー",
};

describe("buildCustomerConfirmationEmail", () => {
  it("includes the reservation id, service, date/time, and cancellation link", () => {
    const email = buildCustomerConfirmationEmail(ctx);
    expect(email.subject).toContain("RES-20260910-X8K2MP");
    expect(email.body).toContain("山田太郎");
    expect(email.body).toContain("ジェルネイル");
    expect(email.body).toContain("2026-09-10");
    expect(email.body).toContain("10:00");
    expect(email.body).toContain(ctx.cancellationUrl);
  });

  it("never includes the customer's raw phone number or submissionId (Phase 0 §M)", () => {
    const email = buildCustomerConfirmationEmail(ctx);
    expect(email.body).not.toContain(reservation.phone!);
    expect(email.body).not.toContain(reservation.submissionId);
  });

  it("uses ctx.serviceLabel as the line label instead of a hard-coded term, so a non-salon business can say Workshop/Class instead of メニュー", () => {
    const email = buildCustomerConfirmationEmail({ ...ctx, serviceLabel: "ワークショップ" });
    expect(email.body).toContain("ワークショップ: ジェルネイル");
    expect(email.body).not.toContain("メニュー:");
  });
});

describe("buildOwnerConfirmedNotificationEmail", () => {
  it("includes the customer name and assigned staff id when present", () => {
    const email = buildOwnerConfirmedNotificationEmail({
      ...ctx,
      reservation: { ...reservation, assignedStaffId: "ST001" },
    });
    expect(email.body).toContain("山田太郎");
    expect(email.body).toContain("ST001");
  });
});

describe("buildOwnerNeedsAttentionEmail", () => {
  it("includes the reservation id and the given reason", () => {
    const email = buildOwnerNeedsAttentionEmail(ctx, "カレンダーへの登録に失敗しました。");
    expect(email.subject).toContain("要確認");
    expect(email.body).toContain("カレンダーへの登録に失敗しました。");
    expect(email.body).toContain("RES-20260910-X8K2MP");
  });
});
