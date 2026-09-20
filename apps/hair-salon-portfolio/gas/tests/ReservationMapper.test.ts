import { buildNormalizedReservation } from "../src/ReservationMapper";
import { ReservationRequest } from "../src/models/ReservationRequest";
import { ServiceRow } from "../src/SheetSchemas";

const request: ReservationRequest = {
  submissionId: "sub-1",
  serviceId: "SV001",
  date: "2026-09-15",
  time: "10:00",
  name: "田中太郎",
  email: "customer@example.com",
  notes: "初めてです",
};

const service: ServiceRow = {
  ServiceID: "SV001",
  Name: "カット",
  DurationMinutes: 60,
  Price: 6000,
  Active: true,
  StaffRequired: false,
  DisplayOrder: 1,
};

const candidate = { date: "2026-09-15", startTime: "10:00", endTime: "11:00" };

describe("buildNormalizedReservation", () => {
  it("takes duration/price/name from the resolved service, never from the request", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "none" },
      now: new Date("2026-09-10T01:00:00.000Z"),
    });
    expect(reservation.durationMinutes).toBe(60);
    expect(reservation.price).toBe(6000);
    expect(reservation.serviceName).toBe("カット");
  });

  it("generates a RES-YYYYMMDD-XXXXXX reservationId using the injected now/random", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "none" },
      now: new Date("2026-09-10T01:00:00.000Z"),
      random: () => 0.5,
    });
    expect(reservation.reservationId).toMatch(/^RES-20260910-[A-Z0-9]{6}$/);
  });

  it("carries the assigned staffId through when the availability strategy resolved one", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "any", eligibleStaff: [] },
      assignedStaffId: "ST002",
      now: new Date("2026-09-10T01:00:00.000Z"),
    });
    expect(reservation.assignedStaffId).toBe("ST002");
    expect(reservation.staffSelection).toEqual({ kind: "any", eligibleStaff: [] });
  });

  it("carries submissionId, contact fields, and notes through unchanged", () => {
    const reservation = buildNormalizedReservation({
      request,
      service,
      candidate,
      staffSelection: { kind: "none" },
      now: new Date("2026-09-10T01:00:00.000Z"),
    });
    expect(reservation.submissionId).toBe("sub-1");
    expect(reservation.customerName).toBe("田中太郎");
    expect(reservation.email).toBe("customer@example.com");
    expect(reservation.notes).toBe("初めてです");
    expect(reservation.date).toBe("2026-09-15");
    expect(reservation.startTime).toBe("10:00");
    expect(reservation.endTime).toBe("11:00");
  });
});
