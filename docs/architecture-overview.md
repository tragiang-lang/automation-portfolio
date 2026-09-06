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
dispatcher (see "What Phase 3C added" above). `Calendar.ts` and `Mail.ts`
remain unpopulated; later phases implement the behavior they own.
