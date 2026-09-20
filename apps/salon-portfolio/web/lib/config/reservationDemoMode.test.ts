import { isReservationDemoModeEnabled } from "./reservationDemoMode";

describe("isReservationDemoModeEnabled", () => {
  const original = process.env.SALON_RESERVATION_DEMO_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.SALON_RESERVATION_DEMO_MODE;
    else process.env.SALON_RESERVATION_DEMO_MODE = original;
  });

  it("returns true only when set to exactly \"true\"", () => {
    process.env.SALON_RESERVATION_DEMO_MODE = "true";
    expect(isReservationDemoModeEnabled()).toBe(true);
  });

  it("returns false when unset", () => {
    delete process.env.SALON_RESERVATION_DEMO_MODE;
    expect(isReservationDemoModeEnabled()).toBe(false);
  });

  it("returns false for any other value (e.g. \"1\", \"TRUE\", \"false\")", () => {
    for (const value of ["1", "TRUE", "false", "yes"]) {
      process.env.SALON_RESERVATION_DEMO_MODE = value;
      expect(isReservationDemoModeEnabled()).toBe(false);
    }
  });
});
