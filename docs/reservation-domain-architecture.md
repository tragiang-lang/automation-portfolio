# Reservation Domain Architecture (Phase 3C)

Phase 3C builds the pure decision core that will eventually sit behind the
`createReservation` action: given a request and server-side catalog/config
data, decide whether the request is structurally valid, resolvable against
real services/staff, inside business hours, inside the booking window, and
against a supplied availability snapshot. No Google service (`SpreadsheetApp`,
`CalendarApp`, `GmailApp`, `LockService`) is called anywhere in this layer —
every dependency is passed in by the caller, which today is only Jest tests.
`Api.ts`/`Code.ts` are unchanged; nothing routes to this domain yet. See
[`architecture-overview.md`](architecture-overview.md) for where this fits
against the rest of the GAS package, and
[`phase0-specification.md`](phase0-specification.md) for the target design
this phase implements a slice of.

## 1. Request → NormalizedReservation flow

The composed entry point is `ReservationRules.ts`'s
`evaluateReservationRequest`, which sequences every stage below and returns
on the first failure:

```text
ReservationRequest (models/ReservationRequest.ts)
  |
  v
normalizeReservationRequest            Validation.ts
  (trim every string field, lowercase email, "" -> undefined
   for optional fields)
  |
  v
validateReservationRequestShape        Validation.ts
  (Layer A: required fields, formats, length caps -- no
   salon-specific knowledge, no catalog/CONFIG lookups)
  | issues.length > 0 -> return { ok: false, issues }
  v
resolveService                         ReservationRules.ts
  (serviceId -> ServiceRow: exists, Active, valid
   DurationMinutes; MENU_NOT_FOUND / MENU_NOT_BOOKABLE)
  | not ok -> return { ok: false, issues: [issue] }
  v
resolveStaffSelection                  ReservationRules.ts
  (staffId + config.features.staffSelection ->
   StaffSelectionResolution: "none" / "specific" / "any";
   STAFF_NOT_FOUND / STAFF_SELECTION_NOT_SUPPORTED /
   REQUIRED_FIELD_MISSING)
  | not ok -> return { ok: false, issues: [issue] }
  v
checkDateWindow                        ReservationRules.ts
  (minLeadHours / maxBookingDays vs. now, both Asia/Tokyo;
   PAST_DATE / OUTSIDE_BOOKING_WINDOW)
  | issue -> return { ok: false, issues: [issue] }
  v
evaluateBusinessDay                    ReservationRules.ts
  (HOLIDAYS membership wins over that weekday's
   BusinessHours entry; HOLIDAY / OUTSIDE_BUSINESS_HOURS)
  | not open -> return { ok: false, issues: [issue] }
  v
generateCandidateSlots                 SlotEngine.ts
  (pure walk of the open interval in slotMinutes steps;
   candidate must fit entirely inside [open, close))
  | no candidate matches request.time
  |   -> return { ok: false, issues: [OUTSIDE_BUSINESS_HOURS] }
  v
availabilityFor(candidate, staffSelection).isAvailable(...)
                                        availability/*.ts
  (caller-supplied AvailabilityStrategy; checks the
   candidate against a BusyInterval[] snapshot the caller
   already fetched)
  | not available
  |   -> return { ok: false, issues: [CALENDAR_CONFLICT /
  |        STAFF_NOT_AVAILABLE / NO_STAFF_AVAILABLE] }
  v
buildNormalizedReservation             ReservationMapper.ts
  (maps validated request + resolved ServiceRow +
   resolved candidate + resolved staff assignment into the
   output shape; ID via ids/ReservationId.ts)
  v
NormalizedReservation (models/ReservationDomain.ts)
  { ok: true, reservation }
```

Every box above is a plain function over data the caller supplies —
`ReservationRules.ts` never reads a Sheet, calendar, or config source
itself; `services`, `staff`, `config`, and the `availabilityFor` factory are
all parameters on `EvaluateReservationInput`. This is what lets the whole
flow run under Jest with zero GAS globals mocked.

## 2. Availability architecture

```text
AvailabilityStrategy (interface)         availability/AvailabilityStrategy.ts
  isAvailable(candidateStart, candidateEnd) -> AvailabilityResult
  also defines BusyInterval { start, end, staffId? } and
  intervalsOverlap() -- the half-open-interval overlap test
  ([start, end) x [start, end), pure string comparison since
  both operands are YYYY-MM-DDTHH:mm)
       |
       v
CalendarOverlapAvailability               availability/CalendarOverlapAvailability.ts
  isSlotFreeOfConflicts(candidate, existingEvents) -- the one
  overlap-checking primitive every strategy below shares
  createCalendarOverlapAvailability(existingEvents) -- wraps
  it as an AvailabilityStrategy for a single calendar's worth
  of busy intervals
       |
       +-- SharedAvailabilityStrategy    availability/SharedAvailabilityStrategy.ts
       |     createSharedAvailabilityStrategy(busyIntervals)
       |     A thin naming wrapper over CalendarOverlapAvailability
       |     for the no-staff-dimension case (features.staffSelection
       |     = false): every candidate checks against one shared
       |     calendar's busy intervals only.
       |
       +-- StaffAvailabilityStrategy     availability/StaffAvailabilityStrategy.ts
             createStaffAvailabilityStrategy({ staffSelection,
               eligibleStaffIdsInOrder, busyIntervalsByStaffId })
             - specific staffId: checks that staff's busy intervals
               only; STAFF_NOT_AVAILABLE on conflict.
             - ANY_STAFF: walks eligibleStaffIdsInOrder (already
               sorted by DisplayOrder) and returns the first staff
               member with no conflict, with assignedStaffId set to
               that concrete id -- "ANY" is never itself returned as
               an assignment. NO_STAFF_AVAILABLE if none are free.

       (future, not built in this phase)
       v
Calendar.ts adapter (Phase 4/5)
  Will call CalendarApp.getCalendarById(...).getEvents(...) and map
  the result into BusyInterval[] -- the shape every strategy above
  already expects. Until that adapter exists, BusyInterval[] can only
  come from a test fixture or a future orchestration caller that
  builds it some other way.
```

No module in this phase calls `CalendarApp`. `BusyInterval[]` is the
explicit seam: everything above it is pure and tested; everything that would
produce a real one (a `Calendar.ts` adapter reading Google Calendar) is
Phase 4/5 work, deliberately not started here (Phase 3C §37/§53).

Staff/service compatibility is not filtered anywhere in this stage —
`StaffAvailabilityStrategy`'s `eligibleStaffIdsInOrder` is expected to
already be the full active-staff list in `DisplayOrder`, because the
current `STAFF` sheet schema has no compatibility column (see
"Current limitations" below).

## 3. Concurrency

Availability evaluated by `evaluateReservationRequest` in this phase is
advisory only, not a reservation guarantee. The busy-interval snapshot it is
fed can go stale between evaluation and an actual submission. The future
submission workflow must re-check availability again while holding a
reservation lock (`LockService`) before persisting anything — see
`phase0-specification.md` §U step 5.

This is why `NormalizedReservation.assignedStaffId` is documented (in
`models/ReservationDomain.ts`) as advisory at evaluation time: two
concurrent evaluations against the same stale snapshot can both resolve the
same "any available" staff member to the same person, and only the
orchestration phase's lock-protected re-check (§U step 5) is authoritative
about who actually gets the slot.

## 4. Future orchestration contract

Phase 3C does not implement `createReservation` — no action is registered,
no Sheets/Calendar/Gmail write exists, no `LockService` call exists anywhere
in this package. The flow below is reproduced from
`phase0-specification.md` §U as the authoritative version; nothing here
changes it, and implementing it is Phase 5's job:

```text
createReservation(request)
  1. Validate request           -- reuses this phase's
                                    evaluateReservationRequest
       fail -> VALIDATION_ERROR / FEATURE_DISABLED, no row written
  2. Validate idempotency / submissionId (Api.ts + CacheService, §P)
       already processed -> return the same success response, no new row
  3. Append RESERVATIONS row, Status = 処理中           (Sheets.ts)
  4. Acquire LockService lock
       fail -> SYSTEM_BUSY; the 処理中 row is left as-is
  5. Re-check availability under the lock       (availability strategy)
       no longer available -> Status = 要確認, ERROR_LOG note,
         release lock, return SLOT_UNAVAILABLE
       ("ANY" staff resolved to a concrete staffId here, written in step 7)
  6. Create Calendar event                       (Calendar.ts)
       fails -> go to step 7B
  7A. success -> update row: CalendarEventID + Status = 受付済 (Sheets.ts)
  7B. calendar failure -> update row: Status = 要確認 + ERROR_LOG (Sheets.ts)
  8. Release lock                                (finally, always runs)
  9. Send emails OUTSIDE the lock                (Mail.ts, §M)
       受付済 -> customer confirmation + owner notification
       要確認 -> owner "needs attention" only, never a customer confirmation
```

See `phase0-specification.md` §U for the full failure-case rationale
(why the 処理中 row is never deleted, why the customer email only ever sends
on the `受付済` branch, etc.) — this section exists so a reader of this
document does not need to reverse-engineer the contract from the domain
code alone; the domain code (`evaluateReservationRequest`) already
implements step 1's validation, and everything from step 2 onward is
unbuilt.

## 5. Current limitations / documented assumptions

- **`BusinessHours` (`models/Config.ts`) supports exactly one interval per
  weekday** (`"HH:mm-HH:mm" | "closed"`, enforced by `SlotEngine.ts`'s
  `HOURS_INTERVAL_PATTERN`). There is no split-hours/lunch-break support —
  a salon closed 12:00-13:00 cannot express that today. This was not
  attempted in this phase; it would require both a `Config.ts` schema
  change and a `SlotEngine.ts` change to walk multiple intervals per day.
- **`SERVICES`/`STAFF` have no staff/service compatibility column.**
  `resolveStaffSelection`'s "any available staff" therefore treats every
  active `StaffRow` as eligible for every `ServiceRow` — a service that
  only some staff can perform cannot be modeled yet. `StaffAvailabilityStrategy`
  documents this explicitly (`eligibleStaffIdsInOrder` is simply "all
  active staff in `DisplayOrder`", not "staff qualified for this service").
- **`ServiceRow.StaffRequired`'s intended behavior is not yet specified
  anywhere** (not in `phase0-specification.md`, not in this phase's plan)
  and is not read or interpreted by any function in this domain layer —
  `resolveService`/`resolveStaffSelection`/`evaluateReservationRequest` all
  ignore it. It exists only as a schema column (`SheetSchemas.ts`).
- **No honeypot/minimum-fill-time field on `ReservationRequest`.** Phase 0
  §E's anti-spam mechanism (§P) is a raw-payload-boundary concern — it
  belongs on a future `Api.ts` handler that receives the untyped HTTP body
  before it is ever parsed into a `ReservationRequest`, not inside this
  typed domain model. `ReservationRequest` (`models/ReservationRequest.ts`)
  has no such field, and no code in this phase implements or simulates that
  check.

## 6. Frontend impact

None. `web/app/reservation/page.tsx` is still the Phase 1 placeholder
(`PagePlaceholder` with a "coming in a later phase" message) — it has no
form and no `ReservationRequest`-shaped state to reconcile against this
phase's types. There is nothing on the frontend for this phase to touch, so
no frontend file was changed.
