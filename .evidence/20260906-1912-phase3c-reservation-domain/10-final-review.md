# Phase 3C — Final Self-Review

Reviewed against this plan's Global Constraints and the conversation's §88
Critical/Important/Minor checklist. Every item below was checked either by
a per-task reviewer subagent (12 tasks, all Approved on first pass, zero
fix-loop rounds needed) or directly by the controller in this final pass.

## Critical

| Item | Status |
|---|---|
| Timezone bugs | Clean. `tokyoDateTimeToInstant`/`getWeekdayForDateString`/`addDaysToTokyoDateString` hand-verified (Task 1 review) including a dedicated UTC-vs-Tokyo regression test in `checkDateWindow` (Task 11 review, hand-traced by the reviewer against the actual `Utils.ts` arithmetic). |
| Incorrect overlap logic | Clean. `intervalsOverlap`'s half-open-interval rule hand-verified against all 6 boundary cases including both touching-endpoint non-overlap cases (Task 4 review). |
| Past-date bugs | Clean. `checkDateWindow` uses `tokyoDateTimeToInstant`/injected `now`, never a bare `Date.now()` (Task 11 review). |
| Holiday bypass | Clean. `evaluateBusinessDay` checks `holidays.includes(date)` before the weekday-hours lookup, verified in both Task 11 and Task 12 review (hand-traced holiday-block scenario). |
| Business-hours bypass | Clean. Slot-candidate matching (`generateCandidateSlots(...).find(slot => slot.startTime === normalized.time)`) is the sole authority for "does this time fit" — hand-traced in Task 12 review for a duration that would cross closing time. |
| Client-controlled duration/price | Clean. `buildNormalizedReservation` sources `durationMinutes`/`price`/`serviceName` exclusively from the resolved `ServiceRow`, never the request — field-by-field traced by a security-focused Task 9 review. |
| Client-controlled staff authority | Clean. `assignedStaffId` only ever comes from an `AvailabilityStrategy`'s own resolution (first-free-in-`DisplayOrder` for "ANY", the validated specific id otherwise) — never copied from the raw request. |
| Accidental Google service calls | Clean. Final grep across every new module (`07-google-service-grep.txt`) found only comments disclaiming such calls — zero live `SpreadsheetApp`/`CalendarApp`/`GmailApp`/`PropertiesService`/`LockService` references. |
| Reservation API accidentally implemented | Clean. No `createReservation` action, no `Api.ts`/`Code.ts` change — `evaluateReservationRequest` is a pure domain function, not wired to any HTTP entrypoint. |
| Secrets exposed | Clean. No new CONFIG keys, no credentials, no `.env`-shaped content added anywhere in the diff. |

## Important

| Item | Status |
|---|---|
| Duplicated validation | One deliberate, disclosed exception: `Validation.ts`'s new `isValidCalendarDateString`-based date check duplicates the shape (not the code) of `ConfigValidator.ts`'s private, unexported `isValidCalendarDate` — different modules, different semantic domain (reservation dates vs. config holiday dates), and touching `ConfigValidator.ts` was out of this plan's scope (already-approved Phase 3A file). Judged acceptable; not touched. |
| Duplicated types | None found. `ReservationIssueCode`/`ValidationIssue`/`NormalizedReservation` are new, distinct from `ConfigValidationIssue`/`AppConfig` — no redefinition of `ServiceRow`/`StaffRow`/`AppConfig`/`ANY_STAFF`-equivalent anywhere. |
| Monolithic ReservationService | Avoided by construction: 6 new src files (`Validation.ts`, `SlotEngine.ts`, `ReservationMapper.ts`, `ReservationRules.ts`, plus 4 files under `availability/`), each with one responsibility, composed only at `evaluateReservationRequest`'s thin sequencing body. |
| Excessive abstraction | None found — no DI framework, no factory-of-factories; `AvailabilityStrategy` is the only interface, and it exists because Phase 0's own approved spec calls for a swappable Shared/Staff strategy. |
| Hard-coded salon hours/holidays | None. All business-hours/holiday/lead-time/booking-horizon values are consumed from `AppConfig`, never literal in code. |
| Nondeterministic/brittle date tests | None. Every test that needs "now" passes an explicit `Date`; no test reads the wall clock. |
| Unclear "Any Available" behavior | Clean — `StaffAvailabilityStrategy` resolves it deterministically (first free in caller-supplied order) and the composition threads the resolved `assignedStaffId` through to the output; "ANY" itself is never persisted. |
| Poor domain/infrastructure separation | Clean — confirmed by the Google-service grep above; every Google-touching adapter this domain will eventually need (`Calendar.ts`, catalog fetch) is explicitly deferred and documented, not stubbed in. |

## Minor (parked, no action needed)

- Task 3: `SlotEngine`'s malformed-hours-string guard clause (`HOURS_INTERVAL_PATTERN` failing) has no dedicated test — the guard is correct and trivial, and its behavior is exercised transitively by `ReservationRules`'s business-day tests. A brief-level gap, not an implementer gap.
- Task 4: one implementer created an unrequested `.evidence/20260906-phase3c-task4/` folder; removed during this final pass (see cleanup note below).
- Task 3 (separately): another implementer created an unrequested `.evidence/20260906-1530-task3-slotengine/` folder; also removed.
- Task 10: `ValidationIssue.message` strings mix English (`ReservationRules.ts`) and Japanese (`Validation.ts`) — consistent with pre-existing codebase variance (`ConfigValidator.ts` is English, `Api.ts`'s public-facing messages are Japanese); `message` is documented as internal/optional, never the public envelope.
- Task 11: the new `import { evaluateBusinessDay, checkDateWindow } ...` line sits mid-file rather than grouped at the top — a direct, literal consequence of the plan's own "append" instructions; Task 12's implementer already consolidated all of `ReservationRules.ts`'s accumulated imports into one clean block per module.
- Task 12: the plan's own literal test code for two `evaluateReservationRequest` scenarios declared an unused `candidate` parameter that fails this repo's `noUnusedParameters: true` tsconfig — a plan defect (mine), not an implementer defect. Fixed by renaming to `_candidate`, following the codebase's existing underscore-prefix convention; verified as a pure identifier rename with zero behavioral change by the Task 12 reviewer.
- Task 13: doc citation style ("Phase 3C §NN") mirrors an internal task-numbering scheme baked into source comments, not a published external spec section — could confuse a reader unfamiliar with the source; matches existing codebase convention, not a new defect.

## Cleanup performed during this final pass

Removed two untracked, unrequested per-task evidence folders (`.evidence/20260906-1530-task3-slotengine/`, `.evidence/20260906-phase3c-task4/`) that two implementer subagents created despite not being asked to — both were pure duplicates of information already captured in this consolidated evidence folder and in the task reports under `.superpowers/sdd/2026-09-06-phase3c-reservation-domain/`. No tracked file was affected.

## Definition of Done cross-check (conversation §91)

All Domain/Availability/Architecture/Testing/Security/Documentation boxes
are satisfied per the task-by-task evidence above and the source-verified
documentation from Task 13. Scope boxes (no reservation API, no Sheets
writes, no Calendar API calls, no Calendar event creation, no
`LockService`, no Gmail, no deployment, no auth, no Supabase, no UI
redesign) are all satisfied — confirmed by the diff-stat in
`09-git-diff-stat.txt` touching only the 22 GAS domain files + 3 docs, and
the Google-service grep finding zero live calls.
