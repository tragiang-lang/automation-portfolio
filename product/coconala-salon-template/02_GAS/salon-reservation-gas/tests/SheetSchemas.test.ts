import { SHEET_NAMES } from "../src/SheetNames";
import {
  CONFIG_HEADERS,
  HOLIDAYS_HEADERS,
  REQUIRED_HEADERS,
  RESERVATIONS_HEADERS,
  SERVICES_HEADERS,
  SERVICES_OPTIONAL_HEADERS,
  STAFF_HEADERS,
  STAFF_OPTIONAL_HEADERS,
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

describe("SERVICES/STAFF optional presentation columns (V1.1 Task 4)", () => {
  it("keeps the required SERVICES/STAFF headers unchanged", () => {
    expect(SERVICES_HEADERS).toEqual([
      "ServiceID",
      "Name",
      "DurationMinutes",
      "Price",
      "Active",
      "StaffRequired",
      "DisplayOrder",
    ]);
    expect(STAFF_HEADERS).toEqual(["StaffID", "Name", "Active", "CalendarID", "DisplayOrder"]);
  });

  it("defines SERVICES optional headers as Description/Category", () => {
    expect(SERVICES_OPTIONAL_HEADERS).toEqual(["Description", "Category"]);
  });

  it("defines STAFF optional headers as Role/Bio/ImagePath", () => {
    expect(STAFF_OPTIONAL_HEADERS).toEqual(["Role", "Bio", "ImagePath"]);
  });
});
