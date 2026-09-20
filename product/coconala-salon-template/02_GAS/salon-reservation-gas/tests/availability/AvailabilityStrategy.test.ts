import { intervalsOverlap } from "../../src/availability/AvailabilityStrategy";

describe("intervalsOverlap", () => {
  it("is available when the candidate starts exactly when the existing event ends", () => {
    expect(intervalsOverlap("2026-09-10T11:00", "2026-09-10T12:00", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(false);
  });

  it("is available when the candidate ends exactly when the existing event starts", () => {
    expect(intervalsOverlap("2026-09-10T09:00", "2026-09-10T10:00", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(false);
  });

  it("conflicts on an identical interval", () => {
    expect(intervalsOverlap("2026-09-10T10:00", "2026-09-10T11:00", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(true);
  });

  it("conflicts when the candidate starts inside an existing event", () => {
    expect(intervalsOverlap("2026-09-10T10:30", "2026-09-10T11:30", "2026-09-10T10:00", "2026-09-10T11:00")).toBe(true);
  });

  it("conflicts when the existing event starts inside the candidate", () => {
    expect(intervalsOverlap("2026-09-10T10:00", "2026-09-10T11:00", "2026-09-10T10:30", "2026-09-10T10:45")).toBe(true);
  });

  it("conflicts when the existing event fully contains the candidate", () => {
    expect(intervalsOverlap("2026-09-10T10:00", "2026-09-10T11:00", "2026-09-10T09:00", "2026-09-10T12:00")).toBe(true);
  });
});
