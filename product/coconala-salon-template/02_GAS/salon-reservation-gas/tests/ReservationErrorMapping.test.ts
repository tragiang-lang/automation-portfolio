import { mapReservationIssueToErrorResponse } from "../src/ReservationErrorMapping";
import { ERROR_CODES } from "../src/models/ErrorCodes";

describe("mapReservationIssueToErrorResponse", () => {
  it("maps availability-failure domain codes to SLOT_UNAVAILABLE", () => {
    for (const code of ["CALENDAR_CONFLICT", "STAFF_NOT_AVAILABLE", "NO_STAFF_AVAILABLE"] as const) {
      const result = mapReservationIssueToErrorResponse({ field: "date", code });
      expect(result.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("maps every other domain code to VALIDATION_ERROR", () => {
    const otherCodes = [
      "REQUIRED_FIELD_MISSING",
      "INVALID_FORMAT",
      "INVALID_DATE",
      "TOO_LONG",
      "MENU_NOT_FOUND",
      "MENU_NOT_BOOKABLE",
      "STAFF_NOT_FOUND",
      "STAFF_SELECTION_NOT_SUPPORTED",
      "OUTSIDE_BUSINESS_HOURS",
      "HOLIDAY",
      "PAST_DATE",
      "OUTSIDE_BOOKING_WINDOW",
    ] as const;
    for (const code of otherCodes) {
      const result = mapReservationIssueToErrorResponse({ field: "x", code });
      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("never forwards the issue's own internal message/field to the mapped result", () => {
    const result = mapReservationIssueToErrorResponse({
      field: "email",
      code: "INVALID_FORMAT",
      message: "raw internal diagnostic detail",
    });
    expect(result.message).not.toContain("raw internal diagnostic detail");
  });
});
