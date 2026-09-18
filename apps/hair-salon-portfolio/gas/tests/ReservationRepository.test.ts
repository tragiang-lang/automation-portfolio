import { buildPendingReservationRow } from "../src/ReservationRepository";
import { NormalizedReservation } from "../src/models/ReservationDomain";

const baseReservation: NormalizedReservation = {
  reservationId: "RES-20260910-X8K2MP",
  submissionId: "sub-123",
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
  notes: "初めて利用します",
};

describe("buildPendingReservationRow", () => {
  it("builds a 処理中 row with matching CreatedAt/UpdatedAt and pending email status", () => {
    const now = new Date("2026-09-06T00:00:00.000Z");
    const row = buildPendingReservationRow(baseReservation, now, "token-abc");
    expect(row).toEqual({
      ReservationID: "RES-20260910-X8K2MP",
      SubmissionID: "sub-123",
      CreatedAt: now.toISOString(),
      UpdatedAt: now.toISOString(),
      Name: "山田太郎",
      Email: "yamada@example.com",
      Phone: "09012345678",
      Date: "2026-09-10",
      Time: "10:00",
      ServiceID: "SV001",
      StaffID: undefined,
      Notes: "初めて利用します",
      Status: "処理中",
      CalendarEventID: undefined,
      EmailStatus: "pending",
      CancellationToken: "token-abc",
    });
  });

  it("persists the assigned staff id when one was resolved", () => {
    const row = buildPendingReservationRow(
      { ...baseReservation, assignedStaffId: "ST001" },
      new Date(),
      "token-abc",
    );
    expect(row.StaffID).toBe("ST001");
  });
});
