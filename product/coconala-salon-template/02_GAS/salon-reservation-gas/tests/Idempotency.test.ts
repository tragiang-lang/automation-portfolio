import { buildIdempotencyCacheKey, mapReservationRowToResult } from "../src/Idempotency";
import { ReservationRow } from "../src/SheetSchemas";

const baseRow: ReservationRow = {
  ReservationID: "RES-20260910-X8K2MP",
  SubmissionID: "sub-1",
  CreatedAt: "2026-09-06T00:00:00.000Z",
  UpdatedAt: "2026-09-06T00:00:00.000Z",
  Name: "山田太郎",
  Email: "yamada@example.com",
  Date: "2026-09-10",
  Time: "10:00",
  ServiceID: "SV001",
  Status: "受付済",
  EmailStatus: "sent",
  CancellationToken: "token",
};

describe("buildIdempotencyCacheKey", () => {
  it("namespaces the submissionId", () => {
    expect(buildIdempotencyCacheKey("sub-1")).toBe("reservation-submission:sub-1");
  });

  it("produces distinct keys for distinct submissionIds", () => {
    expect(buildIdempotencyCacheKey("sub-1")).not.toBe(buildIdempotencyCacheKey("sub-2"));
  });
});

describe("mapReservationRowToResult", () => {
  it("maps a 受付済 row without needsConfirmation", () => {
    expect(mapReservationRowToResult(baseRow)).toEqual({ reservationId: "RES-20260910-X8K2MP", needsConfirmation: undefined });
  });

  it("maps a 要確認 row with needsConfirmation: true", () => {
    expect(mapReservationRowToResult({ ...baseRow, Status: "要確認" })).toEqual({
      reservationId: "RES-20260910-X8K2MP",
      needsConfirmation: true,
    });
  });

  it("maps a still-処理中 row the same as 受付済 (no needsConfirmation) — a retry mid-flight replays as a plain pending success", () => {
    expect(mapReservationRowToResult({ ...baseRow, Status: "処理中" }).needsConfirmation).toBeUndefined();
  });
});
