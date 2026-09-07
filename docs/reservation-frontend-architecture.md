# Reservation Frontend Architecture (Phase 6)

This document describes the browser-facing reservation wizard built in
`apps/salon-portfolio/web`, and the three new read-only GAS actions
(`getServices`, `getStaff`, `getAvailability`) it consumes alongside
Phase 4's `createReservation`. It assumes familiarity with
[`reservation-transaction-architecture.md`](reservation-transaction-architecture.md)
(the `createReservation` transaction this UI submits into, unchanged by
this phase) and [`reservation-domain-architecture.md`](reservation-domain-architecture.md)
(the pure domain layer both `createReservation` and the new
`getAvailability` action share).

## Page architecture

`app/reservation/page.tsx` is an `async` Server Component:

1. Calls `getRuntimeConfig()` (existing, Phase 3B) and `resolveSiteConfig()`
   to read `features.reservation`.
2. If off, renders `ReservationDisabledNotice` and stops — no API call is
   attempted at all in this state, and no `ReservationWizard` is mounted.
3. If on, derives the date picker's advisory `minDate`/`maxDate` bounds
   from `reservation.minLeadHours`/`maxBookingDays`, and renders
   `ReservationWizard` (a Client Component) inside the page's `Container`.

`ReservationWizard` itself owns no business logic — it is the only file
allowed to import every step component, and exists purely to render
`useReservationWizard`'s state through them and wire their callbacks.
Each step component (`ServiceSelection`, `StaffSelection`,
`DateSelection`, `TimeSlotSelection`, `CustomerInfoForm`,
`ReservationSummary`, `ReservationSuccess`, `ReservationErrorNotice`) is
independently unit-tested with plain props, never coupled to the hook
directly — the hook is `ReservationWizard`'s concern alone.

## Frontend/backend boundary

- `/api/gas` (existing Next.js route handler) stays the only
  browser→GAS boundary; `GAS_WEBAPP_URL` never reaches a Client Component
  — it is read only inside `lib/api/gasClient.ts`, which only
  `route.ts` and Server Components (`page.tsx`, `runtimeConfig.ts`) import.
- `lib/api/reservationClient.ts` is the one reservation API client — this
  phase adds `getServices`/`getStaff`/`getAvailability` to it rather than
  creating a second file, all built on one private `callAction<T>(action,
  payload?)` helper that POSTs to `/api/gas` and parses the
  `{ ok, data }` / `{ ok: false, error }` envelope. `submitReservation`
  (Phase 4) was reimplemented on top of the same helper with an unchanged
  external signature and request body — verified by its own pre-existing
  tests passing unmodified.
- `submissionId` idempotency: `useReservationWizard` generates one via
  `generateSubmissionId()` (prefers `crypto.randomUUID()`) the first time
  the customer reaches a submittable state, and reuses the *same* id
  across retries of the same time-slot selection — the identical contract
  `createReservation` already expected from Phase 4, unchanged here.
  Selecting a different date/time/service clears it so a genuinely new
  attempt gets a fresh id.

## Catalog flow

`useReservationWizard` loads `getServices()` and `getStaff()` together on
mount (`Promise.all`, one `catalogStatus: "loading" | "ready" | "error"`
covering both). `getStaff` returns `{ ok: true, data: [] }` — not an
error — when `features.staffSelection` is off, which is what makes the
"staff" wizard step conditionally absent: `steps` is computed once as
either `["service", "staff", "datetime", "customer", "review"]` or
`["service", "datetime", "customer", "review"]` depending on whether any
staff came back. A catalog load failure shows a full-wizard
`ReservationErrorNotice` with a retry, before any selection UI renders.

## Availability flow

`getAvailability` is called whenever service + date are both chosen (and
re-called whenever service, staff, or date changes), never eagerly and
never for a date that isn't yet selected (`availabilityStatus: "idle"`
covers that pre-selection state). It is advisory only — the same caveat
`evaluateAvailableSlots` documents server-side: a slot listed here can
still be lost to a race before `createReservation`'s own re-check under
`LockService`. `TimeSlotSelection` never claims otherwise; its empty-state
and error copy stay generic ("この日は予約可能な時間がありません" /
retry), never surfacing an internal availability-strategy reason.

`evaluateAvailableSlots` (`gas/src/ReservationRules.ts`) is
`evaluateReservationRequest`'s read-only sibling: same
`resolveService`/`resolveStaffSelection`/`evaluateBusinessDay`/
`checkDateWindow`/`generateCandidateSlots` building blocks, but returning
every open+available candidate for one date instead of validating one
specific request. `getAvailabilityAction` fetches Calendar busy events
once per distinct calendar id needed for the resolved staff selection —
not once per candidate slot — by injecting a `buildStrategy` callback
that receives the resolved `StaffSelectionResolution` and builds one
`AvailabilityStrategy` for the whole day.

## `createReservation` flow and its two success outcomes

The wizard submits through the exact same `submitReservation` call Phase
4 always exposed; nothing about the transaction itself changed. Two
distinct success shapes reach `ReservationSuccess`, which must not
conflate them (mirrors `reservation-transaction-architecture.md`'s "要確認
has two distinct outcomes" table):

| `submitReservation` result | `ReservationSuccess` copy |
|---|---|
| `{ reservationId }` | "ご登録のメールアドレスへ確認メールをお送りしました。" |
| `{ reservationId, needsConfirmation: true }` | "内容を確認の上、担当より必要に応じてご連絡いたします。" — never claims a confirmation email was sent, since Calendar event creation failed and only the owner was notified |

Both are still a real, accepted reservation — the wizard never demotes
`needsConfirmation: true` to a generic failure screen.

While a submission is in flight, `useReservationWizard.submit` guards
against double-submission with a synchronous ref check
(`submittingRef.current`) set before the first `await` — independent of
`ReservationSummary`'s own `disabled={confirming}` on the confirm button,
which is the visible half of the same guarantee.

## Feature-flag behavior

`features.reservation` off is handled entirely server-side in
`page.tsx` (see "Page architecture" above) — `ReservationDisabledNotice`
is a static, non-interactive component with no API call of its own.
`features.staffSelection` off is handled entirely inside the catalog flow
(see above) — there is no separate disabled-state component for it, since
skipping the "staff" step is the correct behavior, not an error state.

## Error handling

Every error message this UI ever renders — `ReservationErrorNotice`,
`TimeSlotSelection`'s error state, `CustomerInfoForm`'s field errors are
the one exception (client-side UX validation, see below) — comes straight
from a backend envelope: GAS's `ReservationErrorMapping.ts` (fixed,
per-`ReservationIssueCode` Japanese strings, Phase 0 §H/§N) or
`/api/gas/route.ts`'s own sanitization of local transport failures
(network error, malformed response). The frontend never re-maps a
backend-sourced `error.message` to different copy or appends to it —
`callAction<T>` passes the envelope through unchanged, and every consumer
renders `error.message` verbatim. `CustomerInfoForm`'s
`validateCustomerFields` is the one exception: client-side presentation
convenience only (required name/email, email shape), mirroring
`ContactForm.tsx`'s existing pattern — never a re-implementation of
`gas/src/Validation.ts`'s authoritative server-side check, which still
runs unconditionally inside `createReservation`.

## Future work

Not built in this phase (see [`roadmap.md`](roadmap.md)):

- **Phase 5 — Contact & cancellation workflows.** `createInquiry`,
  `requestCancellation`, and any cancellation-token UI. Still not started
  as of this phase.
- **Phase 7 — Reusable core extraction.** Nothing in this phase's
  frontend code was written with extraction in mind beyond what the
  existing design system (`Container`/`SectionHeading`/`Button`/
  `FormField`/`cn()`) already provides.
