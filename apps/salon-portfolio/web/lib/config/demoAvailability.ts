import { SERVICES } from "@/config/demo-content";
import { DEMO_RUNTIME_CONFIG } from "@/lib/config/runtimeConfig";
import type { AvailabilityRequest, AvailableTimeSlot } from "@/types/reservation";
import type { BusinessHours } from "@/types/content";

const WEEKDAYS: (keyof BusinessHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DEFAULT_DURATION_MINUTES = 60;

/** Deterministic, non-cryptographic string hash — used only to pick a
 *  stable, varied-looking subset of demo slots per date/service/staff, not
 *  for anything security-sensitive. Same input always yields the same
 *  output (no `Math.random`, no `Date.now`). */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function weekdayForDate(date: string): keyof BusinessHours {
  const [year, month, day] = date.split("-").map(Number);
  const dayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAYS[dayIndex];
}

function durationForService(serviceId: string): number {
  const service = SERVICES.find((candidate) => candidate.serviceId === serviceId);
  return service?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
}

/**
 * Pure, deterministic demo availability generator (explicit demo mode —
 * see `lib/config/reservationDemoMode.ts`). Stands in for the real
 * `getAvailability` GAS action (`gas/src/Api.ts::getAvailabilityAction`),
 * which checks actual Google Calendar busy events — this function makes no
 * network call and never claims to reflect a real calendar; it only needs
 * to produce a plausible, stable set of advisory slots for demo browsing
 * (the Reservation Wizard already treats every slot as advisory only,
 * `lib/api/reservationClient.ts`).
 *
 * Reuses `config/demo-content.ts`'s `SERVICES` (for duration) and
 * `runtimeConfig.ts`'s `DEMO_RUNTIME_CONFIG` (for business hours and
 * `slotMinutes`) rather than duplicating either. Same input (date,
 * serviceId, staffId) always produces the same slots.
 */
export function getDemoAvailability(request: AvailabilityRequest): AvailableTimeSlot[] {
  // A configured holiday always wins over that weekday's hours — same
  // precedence as the real GAS logic (gas/src/ReservationRules.ts::evaluateBusinessDay).
  if (DEMO_RUNTIME_CONFIG.holidays.includes(request.date)) return [];

  const hours = DEMO_RUNTIME_CONFIG.hours[weekdayForDate(request.date)];
  if (hours === "closed") return [];

  const [openTime, closeTime] = hours.split("-");
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  const durationMinutes = durationForService(request.serviceId);
  const slotMinutes = DEMO_RUNTIME_CONFIG.reservation.slotMinutes;
  const lastStartMinutes = closeMinutes - durationMinutes;

  if (lastStartMinutes < openMinutes) return [];

  const candidateStarts: number[] = [];
  for (let start = openMinutes; start <= lastStartMinutes; start += slotMinutes) {
    candidateStarts.push(start);
  }

  // Deterministically thin the candidate list so demo availability doesn't
  // look like "every slot of the day is open" — varies by date/service/
  // staff, never by wall-clock time.
  const seed = hashString(`${request.date}|${request.serviceId}|${request.staffId ?? ""}`);

  return candidateStarts
    .filter((_, index) => (index + seed) % 3 !== 0)
    .map((start) => ({ time: formatMinutesAsTime(start) }));
}
