import { minutesToTimeString, timeToMinutes } from "./Utils";

const HOURS_INTERVAL_PATTERN = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

export interface SlotCandidate {
  date: string;
  startTime: string;
  endTime: string;
}

/** One already-resolved day's inputs — the caller (ReservationRules)
 *  looks up the weekday's `BusinessHours` entry and holiday membership
 *  once and passes the result in; this keeps SlotEngine a pure function
 *  over primitives with no CONFIG-shape knowledge of its own. */
export interface SlotEngineInput {
  date: string;
  businessHours: string | "closed";
  durationMinutes: number;
  slotIntervalMinutes: number;
  isHoliday: boolean;
}

/** Generates candidate reservation start times for one day (Phase 0 §J
 *  Stage 1; Phase 3C §29-34). Pure — no GAS globals, no I/O. A candidate
 *  is included only if `[start, start+durationMinutes)` fits entirely
 *  inside the open interval; the walk steps by `slotIntervalMinutes`. */
export function generateCandidateSlots(input: SlotEngineInput): SlotCandidate[] {
  if (input.isHoliday) {
    return [];
  }
  if (input.businessHours === "closed") {
    return [];
  }
  if (!HOURS_INTERVAL_PATTERN.test(input.businessHours)) {
    return [];
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return [];
  }
  if (!Number.isFinite(input.slotIntervalMinutes) || input.slotIntervalMinutes <= 0) {
    return [];
  }

  const [openStr, closeStr] = input.businessHours.split("-");
  const openMinutes = timeToMinutes(openStr);
  const closeMinutes = timeToMinutes(closeStr);

  const candidates: SlotCandidate[] = [];
  for (
    let start = openMinutes;
    start + input.durationMinutes <= closeMinutes;
    start += input.slotIntervalMinutes
  ) {
    candidates.push({
      date: input.date,
      startTime: minutesToTimeString(start),
      endTime: minutesToTimeString(start + input.durationMinutes),
    });
  }
  return candidates;
}
