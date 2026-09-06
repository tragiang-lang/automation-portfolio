import { ServiceRow, StaffRow } from "./SheetSchemas";
import { ANY_STAFF, ReservationRequest } from "./models/ReservationRequest";
import { AppConfig } from "./models/Config";
import { NormalizedReservation, StaffSelectionResolution, ValidationIssue } from "./models/ReservationDomain";
import {
  addDaysToTokyoDateString,
  formatDateYYYYMMDDDashedInTokyo,
  getWeekdayForDateString,
  tokyoDateTimeToInstant,
  toTokyoLocalDateTimeString,
} from "./Utils";
import { normalizeReservationRequest, validateReservationRequestShape } from "./Validation";
import { generateCandidateSlots, SlotCandidate } from "./SlotEngine";
import { AvailabilityStrategy } from "./availability/AvailabilityStrategy";
import { buildNormalizedReservation } from "./ReservationMapper";

/**
 * Salon-specific reservation rules — resolving the client's `serviceId`/
 * `staffId` against server-side catalog data, plus (Task 11) business
 * hours/holiday/date-window evaluation, plus (Task 12) the composed
 * end-to-end evaluation entry point. Common, vertical-agnostic validation
 * lives in `Validation.ts` (Phase 3C §45).
 *
 * Neither this file nor anything it calls ever reads `SpreadsheetApp` —
 * `services`/`staff`/`config` are always supplied by the caller (Phase 3C
 * §55/§56).
 */

export function resolveService(
  services: ServiceRow[],
  serviceId: string,
): { ok: true; service: ServiceRow } | { ok: false; issue: ValidationIssue } {
  const service = services.find((candidate) => candidate.ServiceID === serviceId);
  if (!service) {
    return {
      ok: false,
      issue: { field: "serviceId", code: "MENU_NOT_FOUND", message: `Unknown service "${serviceId}"` },
    };
  }
  if (!service.Active) {
    return {
      ok: false,
      issue: { field: "serviceId", code: "MENU_NOT_BOOKABLE", message: `Service "${serviceId}" is not currently bookable` },
    };
  }
  if (!Number.isFinite(service.DurationMinutes) || service.DurationMinutes <= 0) {
    return {
      ok: false,
      issue: { field: "serviceId", code: "MENU_NOT_BOOKABLE", message: `Service "${serviceId}" has an invalid duration` },
    };
  }
  return { ok: true, service };
}

export function resolveStaffSelection(
  staff: StaffRow[],
  staffId: string | typeof ANY_STAFF | undefined,
  config: Pick<AppConfig, "features" | "staffAnyAvailableOption">,
): { ok: true; selection: StaffSelectionResolution } | { ok: false; issue: ValidationIssue } {
  if (!config.features.staffSelection) {
    // Phase 0 §K: staffId is not accepted at all when the feature is off —
    // ignored if sent, never validated or surfaced as an error.
    return { ok: true, selection: { kind: "none" } };
  }

  const activeStaffInOrder = staff
    .filter((member) => member.Active)
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder);

  if (!staffId) {
    return {
      ok: false,
      issue: { field: "staffId", code: "REQUIRED_FIELD_MISSING", message: "Staff selection is required" },
    };
  }

  if (staffId === ANY_STAFF) {
    if (!config.staffAnyAvailableOption) {
      return {
        ok: false,
        issue: { field: "staffId", code: "STAFF_SELECTION_NOT_SUPPORTED", message: '"Any available staff" is not offered' },
      };
    }
    return { ok: true, selection: { kind: "any", eligibleStaff: activeStaffInOrder } };
  }

  const match = activeStaffInOrder.find((member) => member.StaffID === staffId);
  if (!match) {
    return {
      ok: false,
      issue: { field: "staffId", code: "STAFF_NOT_FOUND", message: `Unknown or inactive staff "${staffId}"` },
    };
  }
  return { ok: true, selection: { kind: "specific", staff: match } };
}

/** Business-hours + holiday evaluation for one calendar date (Phase 3C
 *  §22-24). A holiday always wins over that weekday's configured hours
 *  (Phase 3C §24). */
export function evaluateBusinessDay(
  date: string,
  config: Pick<AppConfig, "hours" | "holidays">,
): { open: true; interval: string } | { open: false; reason: "HOLIDAY" | "OUTSIDE_BUSINESS_HOURS" } {
  if (config.holidays.includes(date)) {
    return { open: false, reason: "HOLIDAY" };
  }
  const weekday = getWeekdayForDateString(date);
  const interval = config.hours[weekday];
  if (interval === "closed") {
    return { open: false, reason: "OUTSIDE_BUSINESS_HOURS" };
  }
  return { open: true, interval };
}

/** Past-date/lead-time and booking-horizon evaluation (Phase 3C §25-27),
 *  both explicitly Asia/Tokyo (§12). Uses the existing
 *  `reservation.minLeadHours`/`reservation.maxBookingDays` CONFIG fields
 *  (Phase 3A) rather than inventing new ones. Returns `null` when the
 *  date/time is acceptable. */
export function checkDateWindow(
  date: string,
  time: string,
  reservationSettings: AppConfig["reservation"],
  now: Date,
): ValidationIssue | null {
  const requestInstant = tokyoDateTimeToInstant(date, time);
  const earliestBookableInstant = now.getTime() + reservationSettings.minLeadHours * 60 * 60 * 1000;
  if (requestInstant < earliestBookableInstant) {
    return {
      field: "date",
      code: "PAST_DATE",
      message: "The requested date/time is in the past or inside the minimum lead time",
    };
  }

  const todayInTokyo = formatDateYYYYMMDDDashedInTokyo(now);
  const latestBookableDate = addDaysToTokyoDateString(todayInTokyo, reservationSettings.maxBookingDays);
  if (date > latestBookableDate) {
    return {
      field: "date",
      code: "OUTSIDE_BOOKING_WINDOW",
      message: "The requested date is beyond the booking horizon",
    };
  }

  return null;
}

export interface EvaluateReservationInput {
  request: ReservationRequest;
  /** Active + inactive services are both passed in — `resolveService`
   *  itself decides bookability (Phase 3C §56: the domain never fetches
   *  its own catalog data). */
  services: ServiceRow[];
  staff: StaffRow[];
  config: AppConfig;
  now: Date;
  /** Constructs the availability strategy for this specific candidate +
   *  resolved staff selection. The caller (a future orchestration phase)
   *  decides whether to hand back a `SharedAvailabilityStrategy` or a
   *  `StaffAvailabilityStrategy`, already fed with real busy intervals —
   *  `ReservationRules.ts` never constructs one itself and never touches
   *  `CalendarApp` (Phase 3C §53/§56, hard rule). */
  availabilityFor: (
    candidate: SlotCandidate,
    staffSelection: StaffSelectionResolution,
  ) => AvailabilityStrategy;
  random?: () => number;
}

export type ReservationEvaluationResult =
  | { ok: true; reservation: NormalizedReservation }
  | { ok: false; issues: ValidationIssue[] };

/** The domain's single composed entry point (Phase 3C §52): normalize ->
 *  validate shape -> resolve service -> resolve staff -> check date
 *  window -> check business day -> generate/match a slot candidate ->
 *  check availability -> map to a `NormalizedReservation`. Every step is
 *  delegated to a small function above/elsewhere in this file or a
 *  sibling module — this function itself only sequences them and decides
 *  which single-issue-array to return on the first failure.
 *
 *  IMPORTANT — this result is advisory, not a reservation guarantee
 *  (Phase 3C §75): a future submission workflow must re-check
 *  availability again while holding a reservation lock before actually
 *  persisting anything, since the busy-interval snapshot `availabilityFor`
 *  was built from can go stale between this evaluation and a real
 *  submission. */
export function evaluateReservationRequest(
  input: EvaluateReservationInput,
): ReservationEvaluationResult {
  const normalized = normalizeReservationRequest(input.request);

  const shapeIssues = validateReservationRequestShape(normalized);
  if (shapeIssues.length > 0) {
    return { ok: false, issues: shapeIssues };
  }

  const serviceResult = resolveService(input.services, normalized.serviceId);
  if (!serviceResult.ok) {
    return { ok: false, issues: [serviceResult.issue] };
  }

  const staffResult = resolveStaffSelection(input.staff, normalized.staffId, input.config);
  if (!staffResult.ok) {
    return { ok: false, issues: [staffResult.issue] };
  }

  const dateWindowIssue = checkDateWindow(normalized.date, normalized.time, input.config.reservation, input.now);
  if (dateWindowIssue) {
    return { ok: false, issues: [dateWindowIssue] };
  }

  const businessDay = evaluateBusinessDay(normalized.date, input.config);
  if (!businessDay.open) {
    return {
      ok: false,
      issues: [
        {
          field: "date",
          code: businessDay.reason,
          message: businessDay.reason === "HOLIDAY" ? "Selected date is a holiday" : "Selected date is outside business hours",
        },
      ],
    };
  }

  const candidates = generateCandidateSlots({
    date: normalized.date,
    businessHours: businessDay.interval,
    durationMinutes: serviceResult.service.DurationMinutes,
    slotIntervalMinutes: input.config.reservation.slotMinutes,
    isHoliday: false,
  });
  const candidate = candidates.find((slot) => slot.startTime === normalized.time);
  if (!candidate) {
    return {
      ok: false,
      issues: [
        {
          field: "time",
          code: "OUTSIDE_BUSINESS_HOURS",
          message: "Selected time does not fit within business hours for the requested service",
        },
      ],
    };
  }

  const availabilityStrategy = input.availabilityFor(candidate, staffResult.selection);
  const availability = availabilityStrategy.isAvailable({
    candidateStart: toTokyoLocalDateTimeString(candidate.date, candidate.startTime),
    candidateEnd: toTokyoLocalDateTimeString(candidate.date, candidate.endTime),
  });
  if (!availability.available) {
    return {
      ok: false,
      issues: [{ field: "date", code: availability.reason, message: "Selected time is no longer available" }],
    };
  }

  const reservation = buildNormalizedReservation({
    request: normalized,
    service: serviceResult.service,
    candidate,
    staffSelection: staffResult.selection,
    assignedStaffId: availability.assignedStaffId,
    now: input.now,
    random: input.random,
  });

  return { ok: true, reservation };
}
