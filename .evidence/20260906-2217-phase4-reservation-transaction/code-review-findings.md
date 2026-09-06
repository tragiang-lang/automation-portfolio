# Phase 4 code review — findings and disposition

Reviewer: `general-purpose` subagent, dispatched via `superpowers:requesting-code-review`,
reviewing the uncommitted working tree against `HEAD` (`fc40866c9065f4f5dc29bfc032676eda685f3a9a`)
since no commits were made this session (commit authorization requires an
explicit separate instruction).

## Strengths (verbatim from reviewer)

- Both load-bearing design nuances (要確認's two outcomes; the concurrency-
  strengthening idempotency-claim lock) verified correctly implemented, not
  collapsed, by reading the code and the passing tests that assert them.
- Atomicity-limitation retry path verified: a client retry after
  `sheetUpdateFailedAfterCalendar` never creates a second Calendar event.
- All five modified/created docs cross-checked against the actual code —
  every claim held up.
- Test hygiene: pure functions kept real via `jest.requireActual`, only
  Sheets/Cache-touching functions mocked — matches and slightly improves on
  the plan's literal snippet.
- Security boundaries (server-resolved price/duration/staff, server-
  generated reservation id/cancellation token, no `GAS_WEBAPP_URL` leak)
  verified.
- Scope discipline confirmed via `git status -s` — no out-of-scope file
  touched.
- All suites passing, both typechecks clean, web lint clean (verified by
  the reviewer running them independently, not just trusting our logs).

## Issues raised, and what was done about each

### Critical — FIXED
**Unguarded `sendReservationEmailsForOutcome` call could turn an
already-successful, already-persisted reservation into a false
`INTERNAL_ERROR` response with no emails sent**, if `getSiteBaseUrl()`
threw (e.g. `SITE_BASE_URL` Script Property unset) while building the
cancellation-link email context — this happens *after* the reservation is
fully confirmed (Sheet row `受付済`, Calendar event created, idempotency
cache already populated with the true success), so the thrown error would
propagate past `createReservationActionInner` into
`createReservationAction`'s top-level catch and silently discard the
correct `response`.

Fix applied: wrapped the `sendReservationEmailsForOutcome` call in
`createReservationActionInner` (`apps/salon-portfolio/gas/src/Api.ts`) in
its own try/catch that logs a `critical`-severity `ERROR_LOG` entry and
never lets an email-side failure change the already-decided `response`.
Added a regression test,
`"a throw while building the email context (e.g. SITE_BASE_URL unset)
after a successful reservation still returns the real success response,
not a false failure"`, in `apps/salon-portfolio/gas/tests/Api.test.ts`,
which required changing the `RuntimeProperties` mock from a plain function
to a `jest.fn()` so a specific test can simulate the throw.

### Important #2 — FIXED
Calendar-id fallback logic (`assignedStaff.CalendarID || config.calendarId`)
was duplicated inline in `Api.ts` instead of reusing the existing
`resolveCalendarIdForStaff` from `availability/ReservationAvailabilityFactory.ts`
(which additionally trims whitespace — a behavior difference the inline
version didn't have). Fixed by importing and calling the existing function.

### Important #3 — DOCUMENTED (no code change needed)
The retry-after-atomicity-failure response (`ok:true {reservationId}`,
no `needsConfirmation` signal) for a row stuck at `処理中` was correct
behavior but under-documented. Added a "What a client retry looks like in
this state" paragraph to `docs/reservation-transaction-architecture.md`'s
Atomicity Limitation section.

### Important #4 — ACKNOWLEDGED, NOT CHANGED
The `as unknown as Record<string, unknown>` casts bridging `objectToRow<T>`
against concretely-typed row interfaces (`ReservationRow`, `ErrorLogRow`,
`EmailLogRow`) are the same pattern already used by `ConfigStore.ts` since
Phase 3A — consistent with the existing codebase, not a Phase-4-introduced
weakness. No change made; noted as a pre-existing, accepted trade-off.

### Minor #5 — FIXED
`SheetUpdateAfterCalendarCreateError` was a fully-implemented exception
class that was never thrown or caught anywhere (the actual design uses a
`CriticalSectionResult` discriminated union instead, which the reviewer
confirmed is the better pattern here). Deleted as dead code.

### Minor #6 — ACKNOWLEDGED, NOT CHANGED
`docs/roadmap.md`'s renumbering (old Phase 6 → 5, new Phase 6 inserted,
old Phase 7 kept at 7) was assessed as "genuinely minor" by the reviewer
since the struck-through old entries already serve as the history marker.
No change made.

## Final assessment after fixes

All Critical and both actionable Important findings addressed. Re-ran the
full suite after fixes: GAS 231/231 tests passing (was 230 before the
regression test was added), typecheck clean, build clean; web unaffected
by these fixes (71/71 tests, typecheck/lint/build all clean, unchanged
from before the review).
