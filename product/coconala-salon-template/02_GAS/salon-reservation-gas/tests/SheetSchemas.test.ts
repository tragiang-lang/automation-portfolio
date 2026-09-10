import { SHEET_NAMES } from "../src/SheetNames";
import {
  CONFIG_HEADERS,
  HOLIDAYS_HEADERS,
  REQUIRED_HEADERS,
  RESERVATIONS_HEADERS,
} from "../src/SheetSchemas";

describe("SheetSchemas", () => {
  it("defines exactly the nine sheets from phase0-specification.md §C", () => {
    expect(Object.keys(SHEET_NAMES).sort()).toEqual(
      [
        "CANCELLATION_REQUESTS",
        "CONFIG",
        "EMAIL_LOG",
        "ERROR_LOG",
        "HOLIDAYS",
        "INQUIRIES",
        "RESERVATIONS",
        "SERVICES",
        "STAFF",
      ].sort(),
    );
  });

  it("has a REQUIRED_HEADERS entry for every sheet name", () => {
    Object.values(SHEET_NAMES).forEach((name) => {
      expect(REQUIRED_HEADERS[name]).toBeDefined();
      expect(REQUIRED_HEADERS[name].length).toBeGreaterThan(0);
    });
  });

  it("CONFIG has Key/Value/Description columns", () => {
    expect(CONFIG_HEADERS).toEqual(["Key", "Value", "Description"]);
  });

  it("HOLIDAYS has Date/Label columns", () => {
    expect(HOLIDAYS_HEADERS).toEqual(["Date", "Label"]);
  });

  it("RESERVATIONS includes the reservation ID and status columns", () => {
    expect(RESERVATIONS_HEADERS).toContain("ReservationID");
    expect(RESERVATIONS_HEADERS).toContain("Status");
    expect(RESERVATIONS_HEADERS).toContain("CancellationToken");
  });
});
