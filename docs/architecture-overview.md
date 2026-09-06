# Architecture Overview

Status as of Phase 3A: CONFIG configuration system + Google Sheets data
layer implemented. The full target design (Calendar/Gmail adapters,
availability strategy, reservation/contact/cancellation workflows, API
contracts beyond `getConfig`) is specified in
[`phase0-specification.md`](phase0-specification.md) and is not repeated
here.

## High-level shape (target, per Phase 0)

```text
Browser → Next.js (apps/salon-portfolio/web)
            → HTTPS → GAS Web App (apps/salon-portfolio/gas)
                        → Google Sheets / Calendar / Gmail
```

As of Phase 3B, `apps/salon-portfolio/web` fetches `getConfig` from a
Server Component boundary (`lib/config/runtimeConfig.ts`), not from the
browser — see [`runtime-config-guide.md`](runtime-config-guide.md) for
the full data flow, ownership boundary, and fallback behavior.

## What exists after Phase 3A

- **`apps/salon-portfolio/web`** — unchanged since Phase 2C. Still on
  `config/demo-content.ts`; not yet connected to `getConfig` (Phase 3B).
- **`apps/salon-portfolio/gas`** — `Code.ts` now routes `doPost` through
  `Api.ts`'s action dispatcher (`doGet` is still the standalone Phase 1
  liveness check). Implemented this phase:
  - **Sheet layer:** `SheetNames.ts` (canonical tab names),
    `SheetSchemas.ts` (header/column definitions + row types for all nine
    Phase 0 §C tabs), `RowMapper.ts` (pure header-mapping and
    row↔object helpers), `Sheets.ts` (thin `SpreadsheetApp` adapter,
    reads the target spreadsheet from the `SPREADSHEET_ID` Script
    Property — see `config-and-sheets-guide.md`).
  - **CONFIG system:** `models/Config.ts` (`AppConfig`/`PublicConfig`
    types), `ConfigParser.ts` (pure type/shape parsing),
    `ConfigValidator.ts` (pure business-rule validation),
    `PublicConfig.ts` (strips `calendarId`/email settings before the
    frontend ever sees them), `ConfigStore.ts` (repository — reads
    CONFIG+HOLIDAYS via `Sheets.ts`, delegates to the parser/validator,
    throws `ConfigError` on bad data).
  - **API:** `models/ErrorCodes.ts` (Phase 0 §H's 10 codes +
    `CONFIG_INVALID`), `models/Api.ts` (`ApiRequest`/`ApiResponse`
    envelope), `Api.ts` (`getConfig` action handler + `handleApiRequest`
    dispatcher — the only action implemented in Phase 3A).
  - **IDs/timestamps:** `Utils.ts` (Asia/Tokyo timestamp helpers,
    fixed UTC+9 offset, no DST), `ids/ReservationId.ts`
    (`RES-YYYYMMDD-XXXXXX` generator — generator only, no reservation
    workflow uses it yet).
  - **Demo data:** `DemoSeed.ts` (pure demo rows for all nine sheets)
    + `SetupDemoSheets.ts` (`setupDemoSheets()` — manual-run only,
    never overwrites an existing sheet).
  - Still empty/unstarted: `availability/`, `Calendar.ts`, `Mail.ts`,
    `SlotEngine.ts`, `Validation.ts`, and every `models/*Request.ts`
    workflow DTO (`ReservationRequest`, `ContactRequest`,
    `CancellationRequest`) — all Phase 3B+.
- Jest covers every pure module above (parser, validator, public-config
  projection, row mapper, schema shape, ID generator, timestamp helper,
  API dispatch logic, demo-seed/schema consistency). `Sheets.ts` and
  `SetupDemoSheets.ts` are GAS-service wrappers and are intentionally not
  unit tested (Phase 0 §Q) — see `config-and-sheets-guide.md` for the
  manual verification steps.

## What Phase 3C added

Pure reservation-domain logic, still entirely disconnected from `Api.ts`'s
dispatcher — `Code.ts`/`Api.ts` are unchanged from Phase 3A, so nothing
routes a real request to any of this yet:

- **`models/ReservationRequest.ts`** — the client-facing `ReservationRequest`/
  `ReservationRecord`/`ReservationStatus` contracts (Phase 0 §E, §I) and the
  `ANY_STAFF` sentinel.
- **`models/ReservationDomain.ts`** — domain-internal types:
  `ReservationIssueCode`/`ValidationIssue` (fine-grained, distinct from the
  public `ErrorCodes.ts` union), `StaffSelectionResolution`, and the
  `NormalizedReservation` output shape.
- **`Validation.ts`** — common (Layer A), vertical-agnostic validation:
  `normalizeReservationRequest` + `validateReservationRequestShape`. No
  menu/staff/business-hours knowledge, so a future non-salon vertical can
  reuse it unchanged.
- **`ReservationRules.ts`** — salon-specific resolution and business rules:
  `resolveService`, `resolveStaffSelection`, `evaluateBusinessDay`,
  `checkDateWindow`, and the composed entry point
  `evaluateReservationRequest`.
- **`SlotEngine.ts`** — pure candidate-slot generation:
  `generateCandidateSlots`.
- **`ReservationMapper.ts`** — `buildNormalizedReservation`, the pure
  mapping from a validated request + resolved service/staff/candidate data
  into `NormalizedReservation`.
- **`availability/{AvailabilityStrategy, CalendarOverlapAvailability,
  SharedAvailabilityStrategy, StaffAvailabilityStrategy}.ts`** — the
  replaceable availability seam (Strategy pattern per Phase 0 §J/§K): the
  shared overlap primitive plus the no-staff-dimension and
  staff-selection strategies built on top of it.

Every module above is pure — no `SpreadsheetApp`/`CalendarApp`/`GmailApp`/
`LockService` call anywhere in this layer — and covered by Jest. See
[`reservation-domain-architecture.md`](reservation-domain-architecture.md)
for the full request→validation→resolution→business-rules→SlotEngine→
AvailabilityStrategy→NormalizedReservation flow, the availability
architecture, concurrency caveats, the future orchestration contract, and
documented current limitations.

## What Phase 4 added

Wires Phase 3C's pure domain layer to real Google services and adds the
`createReservation` action — `Code.ts` is unchanged; `Api.ts` gains its
first non-`getConfig` route:

- **`Calendar.ts`** — thin adapter (`getBusyEvents`, `createReservationEvent`),
  the only file that calls `CalendarApp`, plus the pure `toBusyInterval`
  mapping.
- **`Mail.ts`** — thin adapter (`sendEmail`), the only file that calls
  `GmailApp`.
- **`ReservationEmailTemplates.ts`** — pure Japanese email copy, kept
  separate from `Mail.ts` so the adapter stays vertical-agnostic.
- **`Catalog.ts`/`CatalogParser.ts`** — internal (non-public-action)
  SERVICES/STAFF reads, thin Sheets adapter + pure row coercion.
- **`ReservationRepository.ts`** — RESERVATIONS row builder (pure) +
  append/find/update-by-status Sheets operations (thin).
- **`Idempotency.ts`** — `CacheService`-backed fast path + the pure
  result-mapping used by the Sheet backstop.
- **`Logging.ts`** — ERROR_LOG/EMAIL_LOG row builders (pure) + writers
  (thin) — the first code path in this project that actually writes to
  either sheet.
- **`ReservationErrorMapping.ts`** — pure mapping from Phase 3C's
  fine-grained `ReservationIssueCode` onto the public `ErrorCode` union.
- **`availability/ReservationAvailabilityFactory.ts`** — pure wiring
  between a resolved `StaffSelectionResolution` and the existing
  `SharedAvailabilityStrategy`/`StaffAvailabilityStrategy` constructors.
- **`ids/CancellationToken.ts`** — pure cancellation-token generator.
- **`RuntimeProperties.ts`** — thin Script Properties reader for
  `SITE_BASE_URL` (deployment-environment value, not a CONFIG business
  rule).
- **`Api.ts`** — `createReservationAction` + `handleApiRequest`'s
  `"createReservation"` case: owns the `LockService` lifecycle (two
  short, sequential acquisitions — see below) and orchestrates every
  module above; contains no direct Sheets/Calendar/Gmail calls itself.
- **`apps/salon-portfolio/web`** — `lib/api/reservationClient.ts` +
  `types/reservation.ts`: a typed, tested client wrapper reaching
  `createReservation` through the existing `/api/gas` proxy. No
  reservation-page UI/UX work — `app/reservation/page.tsx` is still the
  Phase 3C placeholder (deliberately out of this phase's scope).

See [`reservation-transaction-architecture.md`](reservation-transaction-architecture.md)
for the full transaction sequence, lock scope, idempotency design,
Calendar interaction, the documented ANY_STAFF re-check trade-off, the one
Sheets+Calendar atomicity gap this system cannot fully close
automatically, and the security boundaries enforced end-to-end.

## Why no shared `packages/` yet

Per Phase 0 §B, `packages/` is intentionally deferred until the reusable
core is *extracted* from a working Project 1, not designed up front — see
[`roadmap.md`](roadmap.md).

## Module boundaries (Phase 0 §D/§T/§U)

The seven GAS boundary modules (`Code`, `Api`, `Validation`, `Sheets`,
`Calendar`, `Mail`, `SlotEngine`) and the availability-strategy seam are
defined in [`phase0-specification.md`](phase0-specification.md) §D/§T/§U.
Phase 3A populated `Code.ts` (entrypoints + dispatch wiring only), `Api.ts`
(routing/orchestration for `getConfig` only), and `Sheets.ts` (thin data
adapter). Phase 3C populated `Validation.ts` and `SlotEngine.ts` plus the
`availability/` strategies — as pure logic only, never wired into `Api.ts`'s
dispatcher (see "What Phase 3C added" above). Phase 4 populated `Calendar.ts`
and `Mail.ts` and wired everything into `Api.ts`'s `createReservation`
action (see "What Phase 4 added" above) — `Api.ts` now also owns the
`LockService` lifecycle for that action's critical sections.
