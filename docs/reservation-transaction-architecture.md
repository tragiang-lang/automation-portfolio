# Reservation Transaction Architecture (Phase 4)

This document describes how `createReservation` turns a validated
`ReservationRequest` into a persisted, safely-confirmed reservation. It
assumes familiarity with [`reservation-domain-architecture.md`](reservation-domain-architecture.md)
(the pure domain layer this orchestration calls) and
[`phase0-specification.md`](phase0-specification.md) §U (the master
transaction-flow spec).

## Sequence

```text
1. getConfig() + features.reservation check         (FEATURE_DISABLED if off)
2. getServiceRows()/getStaffRows()                    (Catalog.ts)
3. evaluateReservationRequest(...)                    (ReservationRules.ts, unchanged)
     -> fail: mapReservationIssueToErrorResponse -> VALIDATION_ERROR / SLOT_UNAVAILABLE
     -> ok: NormalizedReservation (advisory assignedStaffId already resolved)
4. claimSubmissionOrGetExisting(submissionId, appendPendingRow)
     - short LockService acquisition (5s timeout)
     - CacheService hit, or RESERVATIONS SubmissionID-column scan hit
       -> return that same result, no new row (idempotent replay)
     - otherwise: append the row, Status = 処理中, inside this same short lock
     -> lock timeout: SYSTEM_BUSY, no row written
5. Acquire the main critical-section lock (10s timeout)
     -> timeout: SYSTEM_BUSY; the 処理中 row from step 4 is left as-is
6. runReservationCriticalSection (inside the lock):
     a. Re-check availability, narrowed to the single staff (or none)
        already advisory-picked in step 3 — a *fresh* Calendar read.
        -> unavailable: row -> 要確認, ERROR_LOG "lost race", release lock,
           return ok:false SLOT_UNAVAILABLE (see "要確認 has two distinct
           outcomes" below)
     b. Create the Calendar event.
        -> throws: row -> 要確認, ERROR_LOG with the exception message,
           release lock, return ok:true {reservationId, needsConfirmation:true}
     c. Mark the row 受付済 + CalendarEventID.
        -> throws: return sheetUpdateFailedAfterCalendar (see "Atomicity
           limitation" below); release lock; return ok:false SHEET_ERROR
7. Release the critical-section lock (finally — always runs)
8. Cache the response (if success) so an idempotent retry replays it
9. Send emails OUTSIDE both locks (Mail.ts + ReservationEmailTemplates.ts)
     - confirmed: customer confirmation + owner notification
     - either 要確認 branch: owner "needs attention" only, never a customer
       confirmation
     - sheetUpdateFailedAfterCalendar / unexpectedError: no email at all
       (state is not reliably known; the CRITICAL ERROR_LOG entry is the
       correct channel)
     - a send failure here never touches the reservation's Sheet status
       again — only RESERVATIONS.EmailStatus (sent/failed) is updated
```

## State machine

`処理中 → 受付済` (normal success) and `処理中 → 要確認` (either failure
branch inside the lock) are the only transitions this phase implements,
exactly the values already defined in `gas/src/models/ReservationRequest.ts`'s
`ReservationStatus` union — no new status value was introduced.
`キャンセル依頼あり`/`キャンセル済` remain unused, as before (a later phase's
concern).

## 要確認 has two distinct outcomes — do not conflate them

| Cause | Row status | Caller-facing response |
|---|---|---|
| Lost the availability race under the lock | `要確認` | `ok:false`, `SLOT_UNAVAILABLE` — the slot is genuinely gone; tell the customer to pick another time |
| Calendar event creation throws | `要確認` | `ok:true`, `{reservationId, needsConfirmation:true}` — the reservation is real, just not yet confirmed in Calendar |

Both still get an owner "needs attention" email and an ERROR_LOG entry;
they differ only in what the *customer's own request* is told.

## Lock scope

Two separate `LockService.getScriptLock()` acquisitions occur per request,
sequentially, never nested:

1. **Idempotency claim lock** (`claimSubmissionOrGetExisting`, 5s timeout) —
   wraps only "check the Sheet backstop for an existing SubmissionID row,
   then append the pending row if none exists". This is a deliberate
   strengthening beyond `docs/phase0-specification.md` §U's literal step
   order (which places the append before any lock) — closing the race
   where two truly-simultaneous requests carrying the same `submissionId`
   could otherwise both pass the idempotency check and both append a row.
2. **Critical-section lock** (`runReservationCriticalSection`, 10s timeout) —
   wraps the availability re-check, Calendar event creation, and the final
   Sheet status update.

Email sending happens after both locks are released.

## Idempotency

- Fast path: `CacheService.getScriptCache()`, keyed by
  `reservation-submission:<submissionId>`, 10-minute TTL
  (`Idempotency.ts::buildIdempotencyCacheKey`/`getCachedReservationResult`/
  `setCachedReservationResult`).
- Durable backstop: a `SubmissionID`-column scan of the RESERVATIONS sheet
  (`ReservationRepository.ts::findReservationBySubmissionId`, built on
  `RowMapper.ts::findRowIndexByColumnValue`), covering an expired cache
  entry or an execution that never finished.
- Concurrent-duplicate safety: see "Lock scope" above — the backstop check
  and the row append happen inside the same short lock, so two
  simultaneous identical submissions cannot both append a row.

## Calendar interaction

`Calendar.ts` is the only file that calls `CalendarApp`. It is queried
twice per successful request: once pre-lock (advisory, inside
`evaluateReservationRequest`'s `availabilityFor` callback) and once again
under the critical-section lock (the authoritative re-check) — both go
through the same `availability/ReservationAvailabilityFactory.ts` pure
wiring, so a specific staff's own `CalendarID` (falling back to the shared
`AppConfig.calendarId` when blank) is used consistently in both places and
in the final event creation.

**Known limitation (ANY_STAFF re-check):** the critical-section re-check
narrows to the single staff already advisory-picked before the lock,
rather than re-running the full "first free staff in DisplayOrder" search
a second time under the lock. Re-implementing that search outside
`ReservationRules.ts` would duplicate Phase 3C logic, which this phase's
task brief explicitly forbids. Consequence: if that one advisory-picked
staff became busy in the (typically sub-second) gap between the advisory
check and lock acquisition, while a *different* eligible staff is still
genuinely free for the same slot, this implementation rejects the request
as `SLOT_UNAVAILABLE` (`要確認`, audit row kept) rather than reassigning to
that other staff. The customer can simply retry, which picks a fresh
advisory candidate. This is a conservative, documented trade-off — it
never double-books and never silently drops a reservation — not a
correctness bug.

## Atomicity limitation (Sheets + Calendar have no shared transaction)

If the Calendar event is created successfully but the immediately-following
Sheet update (marking `受付済` + `CalendarEventID`) itself throws, the
implementation:

- does **not** retry the Sheet update within the same request (a second
  write attempt after a Sheets-layer failure is unlikely to succeed
  differently and risks a different partial state),
- does **not** create a second Calendar event on any later retry — the
  `submissionId` idempotency backstop only matches once a RESERVATIONS row
  exists with that `SubmissionID`; the `処理中` row created back in step 4
  *is* that anchor, so a client retry with the same `submissionId` after
  this failure finds that pre-existing row (still `処理中`, since the final
  update never landed) and replays it via `mapReservationRowToResult`
  rather than re-running the whole transaction,
- logs a `critical`-severity `ERROR_LOG` entry containing both the
  `reservationId` and the orphaned `calendarEventId`, and
- returns `ok:false SHEET_ERROR` to the caller.

**This is the one gap this system does not fully close automatically** —
recovery is manual: an operator finds the `ERROR_LOG` row, locates the
Calendar event by the logged `calendarEventId`, and manually sets the
RESERVATIONS row's `Status`/`CalendarEventID` to match. This is
deliberately left as a documented manual-recovery path rather than an
automated retry.

**What a client retry looks like in this state:** if the customer's client
retries with the same `submissionId` after this failure, `claimSubmissionOrGetExisting`
finds the pre-existing row and returns `mapReservationRowToResult` on it —
which maps a still-`処理中` row the same as a `受付済` row (`needsConfirmation`
omitted), i.e. the retry gets back `ok:true {reservationId}` with no signal
that anything is unusual. This is not misleading to the customer (their
Calendar event is genuinely real), but it does mean the stuck `処理中` row
itself is only discoverable by an operator through the `ERROR_LOG` entry —
scanning RESERVATIONS for old `処理中` rows alone cannot distinguish
"abandoned mid-flight" from "orphaned after a real Calendar success" without
cross-referencing `ERROR_LOG`.

## Email behavior

`Mail.ts` is a 3-line `GmailApp.sendEmail` wrapper with zero salon
knowledge; all Japanese subject/body copy lives in the separately-tested,
pure `ReservationEmailTemplates.ts`. Every send attempt is logged to
`EMAIL_LOG` (`Logging.ts::logEmail`) regardless of outcome, and a failed
send additionally gets a `warning`-severity `ERROR_LOG` entry. A failed
send never re-triggers a Sheet status change beyond
`RESERVATIONS.EmailStatus` (`sent`/`failed`) — the reservation's own
`Status` (受付済/要確認) is already final by the time email sending starts.

## Testing approach (a documented, minimal-footprint deviation)

The existing convention in this codebase (`docs/phase0-specification.md`
§Q) is that Google-service-calling modules (`Sheets.ts`, and now
`Calendar.ts`/`Mail.ts`/`Catalog.ts`/the Sheets-touching half of
`ReservationRepository.ts`/`Idempotency.ts`/`Logging.ts`) are thin and are
**not** unit tested directly — that convention is preserved unchanged here.
`gas/tests/Api.test.ts`'s `createReservationAction` suite, however, tests
the orchestration in `Api.ts` by `jest.mock()`-ing those adapter *modules*
(exactly the same technique the pre-existing `getConfigAction` tests
already used for `ConfigStore.getConfig`) plus a plain object stub assigned
to the global `LockService` for that one test file. This is not a
manufactured DI interface — no constructor injection, no new abstraction —
it is Jest's standard ES-module mock applied to module boundaries that
already existed. It is the only way to exercise the full lock/idempotency/
Calendar-failure/Sheet-failure/email-failure matrix without touching real
Google services, and that matrix is a hard requirement for this phase.

## Security boundaries

- Price, duration, and service name are always read from the
  server-resolved `ServiceRow` (`Catalog.ts`/`ReservationRules.resolveService`)
  — never from the raw request payload, which has no field for them to
  begin with (`gas/src/models/ReservationRequest.ts::ReservationRequest`).
- Staff eligibility/assignment is always resolved from the server-side
  STAFF catalog (`ReservationRules.resolveStaffSelection`); an unknown or
  inactive `staffId` is rejected before any row is written.
- The reservation id is always server-generated
  (`ids/ReservationId.ts::generateReservationId`), never accepted from the
  client.
- `submissionId` is required and used only as an idempotency key — it is
  never itself trusted as an authorization token or exposed in any
  customer-facing email.
- No Script Property, GAS deployment URL, or raw exception message is ever
  placed in a client-facing response — every failure path funnels through
  `buildErrorResponse` with one of the existing fixed `ErrorCode`/Japanese
  message pairs.
- The frontend never calls `CalendarApp`/`GmailApp`/`SpreadsheetApp`
  directly and never learns `GAS_WEBAPP_URL` — `lib/api/reservationClient.ts`
  only ever talks to this Next.js app's own `/api/gas` route.

## Deployment note

`createReservation`'s cancellation-link construction requires a
`SITE_BASE_URL` Script Property (`RuntimeProperties.ts::getSiteBaseUrl`),
alongside the existing `SPREADSHEET_ID` property — set it to this Next.js
deployment's own public base URL (e.g. `https://example.vercel.app`, no
trailing slash) before `createReservation` is exercised against a real
Spreadsheet/Calendar/Gmail account.
