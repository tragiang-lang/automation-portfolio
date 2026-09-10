import { ReservationRequest } from "./models/ReservationRequest";
import { NormalizedReservation, StaffSelectionResolution } from "./models/ReservationDomain";
import { SlotCandidate } from "./SlotEngine";
import { ServiceRow } from "./SheetSchemas";
import { generateReservationId } from "./ids/ReservationId";

export interface BuildNormalizedReservationInput {
  /** Already normalized/validated (Validation.ts) request. */
  request: ReservationRequest;
  /** Server-resolved service — the sole source of `durationMinutes`,
   *  `price`, and `serviceName` (Phase 3C §17/§51: the client is never
   *  trusted for these). */
  service: ServiceRow;
  candidate: SlotCandidate;
  staffSelection: StaffSelectionResolution;
  /** Set only once an `AvailabilityStrategy` has resolved a concrete
   *  staff member (including "any available" -> first free). */
  assignedStaffId?: string;
  now: Date;
  random?: () => number;
}

/** Pure mapping from a validated request + resolved service/staff data
 *  into the domain's output shape (Phase 3C §50). Never fetches anything
 *  itself; every input is already resolved by the caller. */
export function buildNormalizedReservation(
  input: BuildNormalizedReservationInput,
): NormalizedReservation {
  return {
    reservationId: generateReservationId(input.now, input.random),
    submissionId: input.request.submissionId,
    customerName: input.request.name,
    email: input.request.email,
    phone: input.request.phone,
    date: input.candidate.date,
    startTime: input.candidate.startTime,
    endTime: input.candidate.endTime,
    serviceId: input.service.ServiceID,
    serviceName: input.service.Name,
    durationMinutes: input.service.DurationMinutes,
    price: input.service.Price,
    staffSelection: input.staffSelection,
    assignedStaffId: input.assignedStaffId,
    notes: input.request.notes,
  };
}
