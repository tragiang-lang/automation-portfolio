## Task 11: Documentation updates

**Files:**
- Modify: `docs/architecture-overview.md`
- Modify: `docs/folder-structure.md`
- Modify: `docs/api-documentation.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/changelog.md`
- Create: `docs/config-and-sheets-guide.md`

No test step (documentation-only task); verify with a read-through at the end.

- [ ] **Step 1: Replace `docs/architecture-overview.md` in full**

```markdown
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
```

- [ ] **Step 2: Replace `docs/folder-structure.md` in full**

```markdown
# Folder Structure

This reflects what actually exists on disk after Phase 3A (not the full
Phase 0 target — see [`phase0-specification.md`](phase0-specification.md)
§B for what later phases still add). Generated/dependency directories
(`node_modules/`, `.next/`, `build/`, `.swc/`) are omitted.

```text
Coconala-Web-Services/
├── README.md
├── MASTER_PROMPT_INSTRUCTION_LP_AUTOMATION_SAAS.md
├── .gitignore
├── docs/
│   ├── phase0-specification.md
│   ├── phase2a-ui-ux-specification.md
│   ├── architecture-overview.md
│   ├── folder-structure.md          # this file
│   ├── api-documentation.md
│   ├── config-and-sheets-guide.md   # new in Phase 3A
│   ├── roadmap.md
│   └── changelog.md
│
└── apps/
    └── salon-portfolio/
        ├── web/                              # Next.js frontend — unchanged since Phase 2C
        │   └── ... (see git history; not touched in Phase 3A)
        │
        └── gas/                              # GAS backend, TypeScript
            ├── src/
            │   ├── Code.ts                    # doGet (liveness) / doPost (→ Api.ts dispatch)
            │   ├── Health.ts                  # pure health-check payload
            │   ├── Api.ts                     # getConfig action handler + doPost dispatcher
            │   ├── ConfigStore.ts             # CONFIG+HOLIDAYS repository (Sheets + parser + validator)
            │   ├── ConfigParser.ts            # pure CONFIG type/shape parsing
            │   ├── ConfigValidator.ts         # pure CONFIG business-rule validation
            │   ├── PublicConfig.ts            # AppConfig -> PublicConfig projection
            │   ├── Sheets.ts                  # thin SpreadsheetApp adapter
            │   ├── SheetNames.ts              # canonical sheet-name constants
            │   ├── SheetSchemas.ts            # per-sheet headers + row types (all 9 tabs)
            │   ├── RowMapper.ts               # pure header-map / row<->object helpers
            │   ├── DemoSeed.ts                # pure demo data for all 9 sheets
            │   ├── SetupDemoSheets.ts         # setupDemoSheets() — manual-run, non-destructive
            │   ├── Utils.ts                   # Asia/Tokyo timestamp helpers
            │   ├── availability/              # empty — scaffolded only (Phase 3B+)
            │   ├── models/
            │   │   ├── Config.ts              # AppConfig / PublicConfig / FeatureFlags / ...
            │   │   ├── ErrorCodes.ts          # ERROR_CODES + CONFIG_INVALID
            │   │   └── Api.ts                 # ApiRequest / ApiResponse envelope
            │   └── ids/
            │       └── ReservationId.ts       # RES-YYYYMMDD-XXXXXX generator
            ├── tests/
            │   ├── Health.test.ts
            │   ├── SheetSchemas.test.ts
            │   ├── RowMapper.test.ts
            │   ├── Utils.test.ts
            │   ├── ReservationId.test.ts
            │   ├── ConfigParser.test.ts
            │   ├── ConfigValidator.test.ts
            │   ├── PublicConfig.test.ts
            │   ├── ConfigStore.test.ts
            │   ├── Api.test.ts
            │   ├── DemoSeed.test.ts
            │   └── availability/              # empty — scaffolded only (Phase 3B+)
            ├── appsscript.json
            ├── .clasp.json.example            # template; real .clasp.json is gitignored
            ├── esbuild.config.js
            ├── jest.config.js
            ├── tsconfig.json
            └── package.json
```

Not yet created (deferred to later phases, per Phase 0 §B notes):
`packages/` and `.claude/` at the repo root — neither is needed until
there is working Project 1 code to extract a reusable core from, or
project-specific rules/skills to add. `Calendar.ts`, `Mail.ts`,
`SlotEngine.ts`, `Validation.ts`, the `availability/` strategies, and the
`ReservationRequest`/`ContactRequest`/`CancellationRequest` workflow DTOs
are Phase 3B+.
```

- [ ] **Step 3: Replace `docs/api-documentation.md` in full**

```markdown
# API Documentation

Status as of Phase 3A: one action (`getConfig`) is implemented. The full
action list, covered in [`phase0-specification.md`](phase0-specification.md)
§G/§H, is implemented incrementally in later phases.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `apps/salon-portfolio/web` → `/api/health` | `GET` | Next.js liveness check. Unchanged since Phase 1. |
| `apps/salon-portfolio/gas` Web App → `doGet` | `GET` | Apps Script liveness check. Unchanged since Phase 1 — returns `{ ok: true, data: { status, service, timestamp } }`. Not part of the action dispatch below. |
| `apps/salon-portfolio/gas` Web App → `doPost` | `POST` | Action dispatch, per Phase 0 §G. Body: `{ "action": string, "payload"?: object }`. |

## Envelope (Phase 0 §H)

```json
// success
{ "ok": true, "data": { } }

// failure
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "設定情報の読み込みに失敗しました。管理者にお問い合わせください。" } }
```

## Actions implemented in Phase 3A

### `getConfig`

Always available (no feature flag). Reads CONFIG + HOLIDAYS, parses and
validates them, and returns the public projection of `AppConfig`
(`calendarId`, `emailOwnerNotifyAddress`, `emailFromName` are never
included — Phase 3A §20).

```json
// request
{ "action": "getConfig" }

// success response data
{
  "business": { "name": "Demo Salon", "phone": "03-0000-0000", "email": "owner@example.com", "address": "東京都千代田区1-1-1" },
  "hours": { "monday": "10:00-19:00", "...": "...", "sunday": "closed" },
  "holidays": ["2026-01-01", "2026-01-02"],
  "features": { "contactForm": true, "reservation": true, "staffSelection": true, "calendar": true, "emailNotification": true },
  "staffAnyAvailableOption": true,
  "reservation": { "timezone": "Asia/Tokyo", "slotMinutes": 30, "minLeadHours": 1, "maxBookingDays": 60 }
}

// failure response (malformed/invalid CONFIG sheet data)
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "設定情報の読み込みに失敗しました。管理者にお問い合わせください。" } }
```

## Any other action name

Returns a `VALIDATION_ERROR` — no other action is implemented yet
(`getServices`, `getStaff`, `getAvailableSlots`, `checkAvailability`,
`createReservation`, `createInquiry`, `requestCancellation`, `healthCheck`
as an *action* — all Phase 3B+, per `phase0-specification.md` §G).

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Unsupported action: \"getServices\"." } }
```

## Error codes

The full Phase 0 §H list, plus one Phase 3A addition:

```text
VALIDATION_ERROR            (Layer A — used today for a malformed/unsupported request)
DUPLICATE_SUBMISSION        (Layer A — not yet triggered by any implemented action)
SLOT_UNAVAILABLE            (Layer B — not yet triggered)
FEATURE_DISABLED            (Layer B — not yet triggered)
INVALID_CANCELLATION_TOKEN  (Layer B — not yet triggered)
SYSTEM_BUSY                 (Layer C — not yet triggered)
CALENDAR_ERROR              (Layer C — not yet triggered)
SHEET_ERROR                 (Layer C — not yet triggered)
MAIL_ERROR                  (Layer C — not yet triggered)
INTERNAL_ERROR              (Layer C — unclassified `getConfig` failure)
CONFIG_INVALID              (Phase 3A addition — CONFIG/HOLIDAYS failed parsing or validation)
```

Neither `getConfig` nor `doGet` touches Calendar, Gmail, or writes to any
Sheet.
```

- [ ] **Step 4: In `docs/roadmap.md`, replace the "Phase 3" bullet**

Old:
```markdown
- [ ] **Phase 3 — CONFIG system.** `ConfigStore.ts`, the `CONFIG`/`HOLIDAYS`
      sheet reader, `getConfig` action, `AppConfig` type (Phase 0 §D);
      wires real business content into the Phase 2B UI.
```

New:
```markdown
- [x] **Phase 3A — GAS configuration + data layer.** `ConfigStore.ts`,
      `ConfigParser.ts`/`ConfigValidator.ts`, `Sheets.ts`/`RowMapper.ts`,
      `SheetSchemas.ts` for all nine Phase 0 §C tabs, `Api.ts`'s
      `getConfig` action + dispatcher, `Utils.ts`/`ids/ReservationId.ts`,
      and `DemoSeed.ts`/`SetupDemoSheets.ts`. Frontend is still on
      `config/demo-content.ts` — not wired to real GAS yet.
- [ ] **Phase 3B — Frontend CONFIG integration.** Replace
      `web/config/demo-content.ts` with a real `getConfig` fetch; no new
      GAS actions.
```

Also update the trailing note at the bottom of the file:

Old:
```markdown
Phase 2B is the newest code in the repo; Phase 3 (`ConfigStore`/`getConfig`)
is the next phase and has not been started.
```

New:
```markdown
Phase 3A is the newest code in the repo; Phase 3B (frontend `getConfig`
integration) is the next phase and has not been started.
```

- [ ] **Step 5: Prepend a new entry to `docs/changelog.md`'s `[Unreleased]` section, above the existing "Added — Phase 2B" entry**

```markdown
### Added — Phase 3A: GAS configuration + data layer

- `apps/salon-portfolio/gas/src/SheetNames.ts` + `SheetSchemas.ts`:
  canonical names and column/header definitions for all nine Phase 0 §C
  sheets (`CONFIG`, `HOLIDAYS`, `SERVICES`, `STAFF`, `RESERVATIONS`,
  `CANCELLATION_REQUESTS`, `INQUIRIES`, `EMAIL_LOG`, `ERROR_LOG`).
- `RowMapper.ts`: pure header-mapping and row↔object serialization,
  with explicit missing-header detection (`MissingHeadersError`).
- `Sheets.ts`: thin `SpreadsheetApp` adapter (`getSheet`, `getHeaderMap`,
  `readRawRows`, `appendRow`, `updateRow`), reading the target spreadsheet
  from the new `SPREADSHEET_ID` Script Property convention (documented in
  `docs/config-and-sheets-guide.md`) rather than a hard-coded ID.
- `models/Config.ts`, `ConfigParser.ts`, `ConfigValidator.ts`,
  `PublicConfig.ts`, `ConfigStore.ts`: the full CONFIG pipeline — strict
  boolean/number/string parsing (no "yes"/"no"/"1"/"0"), business-rule
  validation (timezone, ranges, business-hours format, holiday dates,
  the staff-selection/any-available-staff combination), and a
  public/private projection so `calendarId` and the owner-facing email
  settings never leave the server.
- `models/ErrorCodes.ts`, `models/Api.ts`, `Api.ts`: the shared
  `{ok,data}`/`{ok:false,error}` envelope, Phase 0 §H's 10 error codes
  plus a new `CONFIG_INVALID` code, and the `getConfig` action + `doPost`
  dispatcher (every other action name returns `VALIDATION_ERROR` — no
  other action exists yet).
- `Code.ts`: `doPost` now routes through `Api.ts`'s dispatcher; `doGet`
  is unchanged (still the Phase 1 liveness check).
- `Utils.ts` (Asia/Tokyo timestamp helpers, fixed UTC+9 offset — Japan has
  no DST) and `ids/ReservationId.ts` (`RES-YYYYMMDD-XXXXXX` generator,
  injectable date/random source) — generator only, no reservation
  workflow calls it yet.
- `DemoSeed.ts` + `SetupDemoSheets.ts`: safe, non-destructive demo data
  for all nine sheets and a manual-run `setupDemoSheets()` utility that
  never overwrites an existing sheet.
- `docs/config-and-sheets-guide.md`: new operator/developer guide for the
  CONFIG sheet and the sheet data layer.
- 60+ new Jest tests across the parser, validator, row mapper, schema
  definitions, ID generator, timestamp helper, API dispatch logic, and
  demo-seed/schema consistency. `Sheets.ts` and `SetupDemoSheets.ts` are
  GAS-service wrappers and are intentionally not unit tested (Phase 0 §Q)
  — see the new guide for manual verification steps.
- Not included (deliberately out of scope, per the Phase 3A task
  prompt): reservation/contact/cancellation workflows, Calendar, Gmail,
  authentication, Supabase, frontend `getConfig` integration,
  `getServices`/`getStaff`/`healthCheck` actions, `clasp push`.
```

- [ ] **Step 6: Write `docs/config-and-sheets-guide.md`**

```markdown
# CONFIG & Sheets Data Layer Guide

Covers the Phase 3A data foundation: the `CONFIG` sheet, the Google
Sheets schema, and how to set up a scratch spreadsheet for development.
This does **not** cover reservations, Calendar, or Gmail — those ship in
later phases (see `roadmap.md`).

## For the salon owner: editing CONFIG

`CONFIG` is a simple three-column sheet: **Key** (do not edit — code
reads this exact text), **Value** (edit this), **Description** (a short
Japanese note explaining what the row controls). Every key currently
supported:

| Key | 説明 | 値の例 |
|---|---|---|
| `business.name` | 店舗名 | `Demo Salon` |
| `business.phone` | 電話番号 | `03-0000-0000` |
| `business.email` | 店舗メール | `owner@example.com` |
| `business.address` | 住所 | `東京都千代田区1-1-1` |
| `hours.monday` 〜 `hours.sunday` | 曜日ごとの営業時間 | `10:00-19:00` または `closed`（定休日） |
| `reservation.timezone` | タイムゾーン（変更不可） | `Asia/Tokyo` |
| `reservation.slotMinutes` | 予約枠の単位（分） | `30` |
| `reservation.minLeadHours` | 予約締切（何時間前まで受付） | `1` |
| `reservation.maxBookingDays` | 予約可能期間（何日先まで） | `60` |
| `features.contactForm` | 問い合わせ受付 | `true` / `false` |
| `features.reservation` | 予約受付 | `true` / `false` |
| `features.staffSelection` | スタッフ指名の可否 | `true` / `false` |
| `features.calendar` | カレンダー連携 | `true` / `false` |
| `features.emailNotification` | メール通知 | `true` / `false` |
| `staff.anyAvailableOption` | 「指名なし（お任せ）」の表示 | `true` / `false`（`features.staffSelection` が `false` のときは `false` にすること） |
| `calendar.id` | 共有カレンダーID（開発者向け・非公開） | `primary` |
| `email.ownerNotifyAddress` | 通知メール宛先（非公開） | `owner@example.com` |
| `email.fromName` | 送信者表示名（非公開） | `Demo Salon` |

Only `true`/`false` (exact spelling) are accepted for yes/no values — a
checkbox cell typed as TRUE/FALSE in Sheets works automatically.

`HOLIDAYS` is a separate sheet: one row per closed date, `Date`
(`YYYY-MM-DD`) + `Label` (free text, e.g. `年末年始`).

## Which fields the website can see

`getConfig` returns `business`, `hours`, `holidays`, `features`,
`staffAnyAvailableOption`, and `reservation` — **never** `calendar.id`,
`email.ownerNotifyAddress`, or `email.fromName`. Those three stay
server-side only.

## For developers: sheet schema reference

All nine sheets, their canonical names, and required headers are defined
centrally in `apps/salon-portfolio/gas/src/SheetSchemas.ts` — never
duplicate a header list elsewhere. Summary:

| Sheet | Purpose |
|---|---|
| `CONFIG` | Business config, key/value/description (this guide, above). |
| `HOLIDAYS` | Closed dates. |
| `SERVICES` | Salon menu/service catalog. |
| `STAFF` | Stylist catalog + optional per-staff Calendar ID. |
| `RESERVATIONS` | Reservation records (schema only — no workflow yet). |
| `CANCELLATION_REQUESTS` | Cancellation requests (schema only). |
| `INQUIRIES` | Contact-form submissions (schema only). |
| `EMAIL_LOG` | Outgoing email audit trail (schema only). |
| `ERROR_LOG` | Server-side error audit trail (schema only). |

## Setting up a scratch spreadsheet for development

This is a **standalone** Apps Script project (not bound to one specific
Spreadsheet), so it needs to be told which Spreadsheet to use:

1. Create a new Google Sheet (developer-owned scratch/demo spreadsheet —
   never a customer's production sheet).
2. Copy its ID from the URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`).
3. In the Apps Script editor (Project Settings → Script Properties), add
   a property named `SPREADSHEET_ID` with that ID as the value.
4. In the Apps Script editor, select `setupDemoSheets` from the function
   dropdown and click Run. It creates all nine sheets with headers and
   safe demo data (transactional sheets get headers only) — it never
   touches a sheet that already exists.

## Manual verification (Sheets.ts / SetupDemoSheets.ts are not Jest-tested)

Per Phase 0 §Q, GAS-service-calling modules stay thin and are verified by
hand, not by Jest:

1. Run `setupDemoSheets` against a scratch spreadsheet (above) and
   confirm all nine tabs appear with the expected headers.
2. Run it a second time and confirm every sheet is reported "skipped
   (already exists)" — no data is duplicated or overwritten.
3. Deploy the Web App (or run `doPost` from the Apps Script editor with a
   test event object `{ postData: { contents: '{"action":"getConfig"}' } }`)
   and confirm the response matches the shape in `api-documentation.md`.
4. Edit one CONFIG value to something invalid (e.g. set
   `reservation.slotMinutes` to `abc`) and re-run `getConfig`; confirm the
   response is `{ ok: false, error: { code: "CONFIG_INVALID", ... } }`
   and that the execution transcript (View → Logs) shows the specific
   field issue — never shown to the client.

## Operations note (Phase 0 §S)

Production customer deployments use the customer's own Google
account/Workspace, Spreadsheet, and Apps Script project — the developer
is granted collaborator/editor access only. This guide's scratch-sheet
setup is for development and portfolio-demo use only.
```

- [ ] **Step 7: Commit**

```bash
git add docs/architecture-overview.md docs/folder-structure.md docs/api-documentation.md docs/roadmap.md docs/changelog.md docs/config-and-sheets-guide.md
git commit -m "docs: document Phase 3A CONFIG system and Sheets data layer"
```

---

