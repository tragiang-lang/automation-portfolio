# Reusable Assets Audit (Phase 1A)

Read-only inspection of `apps/salon-portfolio` and `apps/hair-salon-portfolio`,
done 2026-09-23 as the first step of the factory's Phase 1. **No file in
either app was modified.** The factory copies no app wholesale and neither app
depends on the factory.

## Method

- Listed the source trees of both apps (`gas/src`, `gas/tests`, `web/lib`,
  `web/types`, `docs/`).
- Read these files in full: `Code.ts`, `SheetNames.ts`, `SheetSchemas.ts`,
  `RowMapper.ts`, `Sheets.ts`, `Logging.ts`, `Idempotency.ts`,
  `InquiryIdempotency.ts`, `InquiryValidation.ts`, `ids/InquiryId.ts`,
  `ids/ReservationId.ts`, `models/ErrorCodes.ts`, `models/Api.ts`,
  `RuntimeProperties.ts`, `availability/AvailabilityStrategy.ts`,
  `availability/ReservationAvailabilityFactory.ts`, and the tooling configs
  (`package.json`, `esbuild.config.js`, `jest.config.js`, `tsconfig.json`,
  `appsscript.json`, `.gitignore`).
- Read these files in part: `Api.ts` (the dispatch and the lock/idempotency
  claim, lines 1–140 and 600–640), `ConfigParser.ts`, `models/Config.ts`,
  `ReservationRules.ts`, `SlotEngine.ts`, `Utils.ts`,
  `web/types/design-config.ts`, `web/lib/config/resolveDesignConfig.ts`,
  `web/app/globals.css` (the tokens), and `docs/owner-guide.md`.
- Ran `diff -rq` between the two apps' `gas/src`. 15 files differ, and
  hair-salon adds cancellation and per-staff conflict handling. Both apps
  share the same inquiry path and the same availability primitives.
- Cross-checked the earlier monorepo analyses
  `docs/core-assets-feature-reuse.md` and
  `docs/core-assets-salon-dependencies.md`. This audit agrees with them where
  they overlap.
- Also looked at `apps/site-report/gas/esbuild.config.js`. It holds the fix
  for the Apps Script Editor's function discovery, which is a GAS build
  concern that is not specific to salons.

## Important finding: no LINE or Rich Menu code exists

A search for `LINE`, `richmenu`, and `リッチメニュー` in both apps finds only
the `social.line` CONFIG key, which is a footer link. **The workspace has no
Rich Menu, LINE webhook, or Messaging API code.** Everything LINE-related in
this factory is new. It is designed from the public LINE Messaging API
constraints (rich-menu size limits, area bounds, action types), not extracted
from existing code.

## Classification

### 1. Reusable as-is (the pattern or code shape carries over unchanged)

| Asset | Source | How the factory uses it |
|---|---|---|
| Header-mapped row ↔ object mapping (`buildHeaderMap`, `assertRequiredHeaders`, `rowsToObjects`, `objectToRow`, `findRowIndexByColumnValue`) | `gas/src/RowMapper.ts` | Rewritten as `core-assets/gas-modules/src/lib/rowMapper.ts` with the same contract: fail on missing headers, ignore extra columns, never write `"undefined"`. |
| API envelope `{ ok: true, data } \| { ok: false, error: { code, message } }` | `gas/src/models/Api.ts` | Generated GAS uses the same shape, so a Phase 2 web client can call either stack the same way. |
| Safe public error messages: a fixed Japanese message per error code, with raw exception text logged only on the server | `Api.ts` `mapConfigErrorToResponse`, `mapMissingHeadersErrorToResponse` | `lib/result.ts`: `ERROR_MESSAGES_JA` per code. The router never forwards `error.message`. |
| Idempotency as a CacheService fast path, a Sheet backstop, and a short `LockService` claim | `Idempotency.ts`, `InquiryIdempotency.ts`, `Api.ts:605–636` | Generalized into `services/idempotency.ts` (`claimOnce`), keyed by a namespaced `submissionId`. A LINE webhook's `webhookEventId` serves as the submission ID. |
| ID format `PREFIX-YYYYMMDD-XXXXXX` with an injectable clock and random source | `ids/ReservationId.ts`, `ids/InquiryId.ts` | `lib/ids.ts`: one generator with a prefix parameter. It lives in a neutral module, which removes the old `InquiryId → ReservationId` import coupling. |
| Fixed UTC+9 Tokyo time helpers (no `Intl` dependency under ES2019) | `Utils.ts` | `lib/time.ts` uses the same approach. |
| Strict CONFIG value parsing: booleans only from `true`/`false`, numbers only from a strict decimal pattern, first duplicate key wins | `ConfigParser.ts` | `config/configReader.ts`. |
| "Thin GAS adapter, not unit tested; pure logic, unit tested" split | `Sheets.ts`, `Logging.ts`, `Idempotency.ts` comments | Formalized in the factory: every Google global sits behind an interface in `services/context.ts`, GAS implementations live in `services/gas/`, and tests use in-memory fakes. |
| esbuild IIFE bundle plus **top-level footer wrappers** so the Apps Script Editor can find `doGet`/`doPost`/setup functions | `apps/site-report/gas/esbuild.config.js` | The generated `esbuild.config.js` emits the same footer pattern. Without it, deployed projects show "no functions" in the Editor. |
| `.clasp.json` gitignored, with `.clasp.json.example` committed | both apps' `gas/.gitignore` | Generated GAS projects follow the same rule. |
| Script Properties for deployment values (`SPREADSHEET_ID`, `SITE_BASE_URL`), never hard-coded | `Sheets.ts`, `RuntimeProperties.ts` | Extended to `LINE_CHANNEL_ACCESS_TOKEN` and `WEBHOOK_KEY`. |

### 2. Reusable after abstraction (the mechanism is good but the current shape is salon-coupled)

| Asset | Source | Coupling | Abstraction applied |
|---|---|---|---|
| Sheet schema as `SHEET_NAMES` + header tuples + a `REQUIRED_HEADERS` map | `SheetNames.ts`, `SheetSchemas.ts` | Defined in TypeScript and specific to one app. Types and required/optional status live only in code. | Moved to **data**: `core-assets/spreadsheet-schemas/*.json` with typed columns, required flags, defaults, enums, a primary key, indexes, and references. Generated GAS gets a `generated/schema.ts` built from that data. |
| Inquiry validation | `InquiryValidation.ts` | Imports `ValidationIssue` from the reservation domain model. | `validation/validators.ts` has its own `ValidationIssue`. `createInquiry` uses it and has no reservation imports. |
| Monolithic `AppConfig` | `ConfigParser.ts`, `models/Config.ts` | Every feature's keys are required up front (hours, reservation, calendar, staff…). | Each workflow declares only the `configKeys` it needs. The schema generator merges them, and the CONFIG sheet is seeded from that list. |
| `Logging.relatedType` union (`"Reservation" \| "Inquiry" \| …`) | `Logging.ts` | Salon vocabulary. | Uses a plain `relatedType: string`. |
| Slot generation over business hours | `SlotEngine.ts` | Clean, but sits next to staff/calendar strategies. | `services/slots.ts` keeps only the basic single-resource version. Staff and calendar remain **extension points** (see `docs/architecture.md`). |
| `AvailabilityStrategy` interface and `intervalsOverlap` | `availability/AvailabilityStrategy.ts` | Tied to staff and calendar resolution. | The factory uses a basic overlap check against the RESERVATIONS sheet. The strategy seam is the documented place to add Calendar/staff later. |
| Business terminology overrides (`BusinessLabels`: service, bookingCta, inquiryMessage) | `models/Config.ts` | Salon copy is the fallback. | Industry profiles carry `terminology`, so a restaurant says 「メニュー」 or 「ご来店予約」. Rich Menu labels come from the industry profile, not from salon copy. |
| Design presets (theme + typography + variants registry, with an allow-list resolver where invalid overrides are ignored) | `web/types/design-config.ts`, `resolveDesignConfig.ts` | Web/Next.js-specific (Tailwind CSS vars, section variants) and named after salon looks (`kinari`, `femme`, `noir`). | Only the **idea** carries over: a registry of named presets plus validated brand overrides. The factory's presets (`quiet-luxury`, `minimal-modern`, …) describe Rich Menu visual direction rather than web sections. |
| Contrast checks on color tokens | `web/lib/utils/contrastRatio.ts` (read only by name and test) | Web-only. | Re-implemented in `src/lib/contrast.ts`. QA fails a design spec whose label text does not reach WCAG AA against its tile. |

### 3. Industry-specific (belongs in an industry profile, not the core)

- Staff selection, "any available staff" (`指名なし`), per-staff Google
  Calendar IDs (`STAFF.CalendarID`). These describe how salons work.
- Service catalog columns `StaffRequired` and `DurationMinutes`. Duration is
  generic, but a restaurant uses party size instead.
- Salon marketing copy (`BusinessContent` hero/concept text) and the salon
  email wording in `ReservationEmailTemplates.ts`.
- `要確認` (needs confirmation) handling after a calendar-write race. It is
  specific to the salon calendar flow.

In the factory, these belong in `core-assets/industries/<industry>/…json`
(recommended workflows, terminology, required data) or wait for a future
workflow version. They are not in the core engine.

### 4. Application-specific (tied to the Next.js web apps; not extracted in Phase 1)

- Everything under `web/`: the reservation wizard, React components, the
  Next.js `/api/gas` proxy, the demo-mode catalog, hero/menu/gallery section
  variants, and `globals.css` Tailwind tokens.
- Cancellation-token URLs built from `SITE_BASE_URL` (they assume a website
  exists).
- The `getConfig` → `PublicConfig` projection for a website frontend.

These belong to **Phase 2** (Next.js / LIFF) and were left out on purpose.

### 5. Do not extract

- `Api.ts` (982 lines) as a unit. It mixes dispatch, orchestration,
  locking, calendar, and email. Only the patterns listed above were taken.
- The `DemoSeed.ts` / `SetupDemoSheets.ts` demo data. It is salon-specific,
  and the factory must never ship customer-like data in templates. The
  factory generates an **empty** spreadsheet setup from the schema instead.
- The `Jest` + `ts-jest` setup, used as-is. See ADR-0002 for why the
  factory uses Vitest instead.
- The two salon apps' duplicated GAS trees (15 files already diverged).
  This is the drift a versioned core-asset system is meant to prevent.

## Topic checklist (as requested)

| Topic | Finding |
|---|---|
| Booking concepts | Slot generation, overlap check, lead time, booking window, holidays, and status lifecycle → `reservation-basic-v1` (basic subset). |
| Inquiry concepts | Validate, idempotent claim, append, notify owner, and a safe response → `inquiry-basic-v1`. |
| Workflow definitions | **None exist as data.** Workflows live only in `Api.ts` code paths. The factory adds a data-first workflow schema. |
| Action definitions | Action names exist only as `switch` cases in `Api.ts` (`getConfig`, `createReservation`, …). The factory adds a registry with input/output schemas. |
| Configuration-driven architecture | Strong precedent (CONFIG sheet, feature flags, label overrides). Generalized per workflow. |
| Spreadsheet schemas | Code-defined headers → data-defined, versioned schemas. |
| GAS patterns | Thin adapters, pure core, Script Properties, IIFE bundle + footer wrappers. |
| Validation rules | Field-level `ValidationIssue` lists with stable codes. Carried over. |
| Error handling | Stable codes and fixed safe messages. ERROR_LOG writing must never throw. Carried over. |
| Idempotency | Cache + Sheet backstop + Lock. Generalized. |
| Testing strategy | Tests run against TS sources and never against the bundle, with Google globals kept out of unit tests. Kept, with Vitest and in-memory fakes. |
| Design tokens | Preset registry + validated override pattern. Abstracted to Rich Menu design presets. |
| Rich Menu concepts | **None exist.** Built new. |
| Client setup documentation | `docs/owner-guide.md`, `config-and-sheets-guide.md`, and `deployment.md` show the right tone for non-technical owners. The generated `SETUP.md`/`DELIVERY.md` follow it, in Japanese, for the end client. |
