# Roadmap — Project 1: `salon-portfolio`

Phase numbering follows this project's own planning conversation, not a
fixed template.

- [x] **Phase 0 — Architecture & specification.** Approved; see
      [`phase0-specification.md`](phase0-specification.md).
- [x] **Phase 1 — Project foundation & tooling.** Next.js app scaffolded
      (TypeScript, App Router, ESLint, Tailwind, Jest); GAS project
      scaffolded (TypeScript, esbuild, clasp, Jest); directory structure
      from Phase 0 §B created; health/smoke checks on both sides. No
      business logic. Committed at `9114b03`.
- [x] **Phase 2A — UI/UX specification (design only).** Approved; see
      [`phase2a-ui-ux-specification.md`](phase2a-ui-ux-specification.md).
      Design concept, color system, typography, spacing, breakpoints, page
      structure, per-section behavior, component architecture, data/
      presentation split, accessibility/performance/animation rules,
      reusability plan, anti-patterns, and a visual-review checklist. No
      UI code, no dependencies installed.
- [x] **Phase 2B — Real LP UI implementation.** All sections from Phase 2A
      §17 built into `apps/salon-portfolio/web` (`Header` → `Hero` →
      `Concept` → `Menu` → `Staff` → `Gallery` → `ReservationCtaBand` →
      `SalonFeatures` → `CustomerFlow` → `FAQ` → `Access` → `Contact` →
      `Footer`), wired to temporary demo content in
      `config/demo-content.ts` until Phase 3's `getConfig`/`getServices`/
      `getStaff` exist. Frontend UI only — no reservation backend, GAS
      API, Sheets, Calendar, Gmail, `getConfig`, auth, Supabase, or real
      form submission. Lint/typecheck/tests/production build all pass.
- [x] **Phase 3A — GAS configuration + data layer.** `ConfigStore.ts`,
      `ConfigParser.ts`/`ConfigValidator.ts`, `Sheets.ts`/`RowMapper.ts`,
      `SheetSchemas.ts` for all nine Phase 0 §C tabs, `Api.ts`'s
      `getConfig` action + dispatcher, `Utils.ts`/`ids/ReservationId.ts`,
      and `DemoSeed.ts`/`SetupDemoSheets.ts`. Frontend is still on
      `config/demo-content.ts` — not wired to real GAS yet.
- [x] **Phase 3B — Frontend CONFIG integration.** `web/app/layout.tsx`
      (via `generateMetadata`) and `web/app/page.tsx` now source
      `business`/`hours`/`holidays`/`features`/`staffAnyAvailableOption`/
      `reservation` from the real `getConfig` action, through
      `lib/api/gasClient.ts` -> `lib/validation/runtimeConfigValidator.ts`
      -> `lib/config/runtimeConfig.ts` -> `lib/config/resolveSiteConfig.ts`.
      Explicit `runtime`/`demo-fallback`/`runtime-error` status, with a
      visible notice on the error path. Generic `app/api/gas/route.ts`
      proxy added for future browser-initiated actions (unused so far).
      No GAS changes. See
      [`runtime-config-guide.md`](runtime-config-guide.md).
- [x] **Phase 3C — Reservation domain, validation & availability
      foundation.** `Validation.ts` (common field validation),
      `ReservationRules.ts` (salon-specific resolution + business-hours/
      holiday/date-window rules + the composed
      `evaluateReservationRequest` entry point), `SlotEngine.ts` (pure
      slot generation), `availability/` (`AvailabilityStrategy` interface,
      `CalendarOverlapAvailability`, `SharedAvailabilityStrategy`,
      `StaffAvailabilityStrategy`), `ReservationMapper.ts`,
      `models/ReservationRequest.ts`/`models/ReservationDomain.ts`. Zero
      Google service calls anywhere in this layer — see
      [`reservation-domain-architecture.md`](reservation-domain-architecture.md).
      No `createReservation` action, no Sheets/Calendar/Gmail writes, no
      `LockService`, no frontend change (the reservation page has no form
      yet to reconcile). Inserted ahead of the original Phase 4/5 split
      because this pure-domain layer has no dependency on the
      Sheets/Calendar adapters Phase 4 will add.
- [x] **Phase 4 — Reservation API & Transaction Workflow.** Implements the
      full `createReservation` transaction in one phase, superseding the
      narrower Phase 4/5 split drafted above (kept struck through, not
      deleted, for history): `Calendar.ts`/`Mail.ts` thin adapters, an
      internal (non-public-action) SERVICES/STAFF catalog repository
      (`Catalog.ts`), Sheet-backed idempotency (`Idempotency.ts` +
      `ReservationRepository.ts`'s `SubmissionID` backstop),
      `LockService`-protected availability re-check
      (`ReservationAvailabilityFactory.ts`), Calendar event creation,
      RESERVATIONS state transitions (処理中 → 受付済/要確認), and
      post-lock email notifications (`ReservationEmailTemplates.ts`). See
      [`reservation-transaction-architecture.md`](reservation-transaction-architecture.md)
      for the full design, including the documented ANY_STAFF re-check
      trade-off and the one Sheets+Calendar atomicity gap this system
      cannot fully close automatically.

      ~~Phase 4 — Sheets/Calendar/Gmail adapters. `Sheets.ts`,
      `Calendar.ts`, `Mail.ts` as thin wrappers (Phase 0 §T), plus the
      SERVICES/STAFF catalog actions.~~

      ~~Phase 5 — Reservation submission workflow. Wires Phase 3C's
      `evaluateReservationRequest` to real data: `getServices`/`getStaff`
      actions (Phase 4), a real `Calendar.ts`-backed `BusyInterval[]`
      supply for `availabilityFor`, the `createReservation` transaction
      flow (`phase0-specification.md` §U: `処理中` row -> `LockService` ->
      re-check availability -> Calendar event -> `受付済`/`要確認`),
      idempotency (§P).~~

      Note: `getServices`/`getStaff` as standalone public API actions
      remain unbuilt at this point — deliberately out of scope, since
      there is no picker UI yet to consume them. `Api.ts`'s
      `createReservation` orchestration reads SERVICES/STAFF internally
      through `Catalog.ts` instead. These two actions are deferred to
      whichever future phase builds the reservation form UI (built in
      Phase 6, below).
- [ ] **Phase 5 — Contact & cancellation workflows.** `createInquiry`,
      `requestCancellation` (Phase 0 §L), email workflow (§M).
- [x] **Phase 6 — Reservation form UI.** The actual browser-facing
      reservation wizard (service -> staff -> date/time -> customer info ->
      confirmation) wired to `web/lib/api/reservationClient.ts` (Phase 4).
      Shipped: two new thin GAS public actions reusing existing Phase
      3C/4 building blocks with zero changes to `createReservation`
      (`getServices`/`getStaff` — deferred projections of `Catalog.ts`,
      finally built as standalone actions — and `getAvailability`, a new
      read-only/advisory composed availability query,
      `ReservationRules.ts::evaluateAvailableSlots`); a five-step
      `ReservationWizard` client component tree under
      `apps/salon-portfolio/web/components/reservation/` driven by one
      `useReservationWizard` state hook; `app/reservation/page.tsx`
      replacing its Phase 3C placeholder. No contact/cancellation work —
      that remains Phase 5 above, still not started. See
      [`reservation-frontend-architecture.md`](reservation-frontend-architecture.md).

      Note on numbering: the task brief that produced this phase's plan
      called it "Phase 5", since contact/cancellation work hadn't been
      assigned a number in that conversation yet — this project's own
      roadmap numbering (established above, before that plan was written)
      keeps it as Phase 6. No other phase is renumbered.
- [ ] **Phase 7 — Reusable core extraction.** Move the generic parts
      (Phase 0's "Explicit Classification", extended by Phase 2A §18/§23)
      into `packages/`, once a second vertical makes the boundary concrete
      instead of speculative. Japanese operations guide (Phase 0 §S) also
      ships around this point.

Phase 6 (the reservation form UI) is the newest code in the repo; Phase 5
(contact & cancellation workflows) is next and has not been started.
