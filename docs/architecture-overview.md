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

## Why no shared `packages/` yet

Per Phase 0 §B, `packages/` is intentionally deferred until the reusable
core is *extracted* from a working Project 1, not designed up front — see
[`roadmap.md`](roadmap.md).

## Module boundaries (Phase 0 §D/§T/§U)

The seven GAS boundary modules (`Code`, `Api`, `Validation`, `Sheets`,
`Calendar`, `Mail`, `SlotEngine`) and the availability-strategy seam are
defined in [`phase0-specification.md`](phase0-specification.md) §D/§T/§U.
Phase 3A populates `Code.ts` (entrypoints + dispatch wiring only), `Api.ts`
(routing/orchestration for `getConfig` only), and `Sheets.ts` (thin data
adapter). `Validation.ts`, `Calendar.ts`, `Mail.ts`, `SlotEngine.ts`, and
the `availability/` strategies remain unpopulated — later phases implement
the behavior they own.
