# site-report Architecture Overview

> **Setting this project up from scratch, or just need to run it?** See
> [`apps/site-report/START_HERE.md`](../apps/site-report/START_HERE.md) —
> the beginner-friendly setup and operations handbook (Google Sheets/Drive,
> GAS deployment, LINE Developers/LIFF, environment variables, local dev,
> Vercel, first end-to-end test, troubleshooting). This document instead
> covers *why* the app is built the way it is, task by task.

Status: Task 12 (MVP verification & production hardening) — the app's
core MVP loop is complete end to end and has been re-audited: LIFF login →
site selection → report form + photos → real `SUBMIT_REPORT` submission →
success (with an explicit "create another report" action) / error
feedback. Server-side LINE authentication/authorization still does not
exist, and nothing is persisted client-side (no draft/offline queue) —
see this file's Task 12 section for the full readiness assessment and
what remains intentionally out of scope.

## Purpose

`apps/site-report` is the foundation for a LIFF (LINE Front-end Framework)
現場報告アプリ (site report app) MVP: field workers submit a report (site,
work type, comment, photos) from a LINE-embedded browser; the backend
records it and notifies an administrator. This is Project 2 in this repo
(Project 1 is `apps/salon-portfolio`).

## Domain boundary

`site-report` is the construction domain: `Site`, `Worker`, `SiteReport`,
`ReportPhoto`. It shares no business logic, types, or Sheets schema with
`apps/salon-portfolio`'s salon domain (Reservation/CustomerInquiry/Menu/
Staff/Gallery). Anything shared between the two projects is a generic,
domain-agnostic technical pattern only — see "Shared conventions" below.

## Why there is no shared `packages/` yet

This repo has no root `package.json`, no workspace/monorepo tooling, and no
`packages/` directory — `docs/architecture-overview.md`'s "Why no shared
`packages/` yet" section documents this as a deliberate decision:
extraction into a shared package happens after a second real project
exists to extract commonalities *from*, not before. `apps/site-report` is
that second project, but extracting `packages/gas-core` is a separate,
future task — not part of this foundation scaffold, and out of scope for
a task that must not touch `apps/salon-portfolio`.

## Shared conventions (not shared code)

`apps/site-report/gas` is fully independent of `apps/salon-portfolio/gas`
(own `package.json`, `tsconfig.json`, `node_modules`, esbuild/clasp/Jest
config). It reuses two things from the salon project:

- **Conventions**, followed but re-implemented with construction-domain
  content: the `ApiRequest`/`ApiResponse` envelope shape (`src/Api.ts`),
  the `SHEET_NAMES` + per-sheet `*_HEADERS`/row-interface/`REQUIRED_HEADERS`
  pattern (`src/SheetNames.ts`, `src/SheetSchemas.ts`), and the typed
  config-shape-plus-raw-key-constants pattern (`src/Config.ts`).
- **`RowMapper.ts`**, copied verbatim (byte-identical to
  `apps/salon-portfolio/gas/src/RowMapper.ts`, including its test) — the
  only file with zero salon-specific content, so reusing it as-is instead
  of reinventing it satisfies the "reuse existing generic infrastructure"
  rule without creating a package boundary that doesn't exist.

## web / gas separation

```text
apps/site-report/web/   Next.js (LIFF host), calls the gas backend over
                          HTTPS once an action exists to call.
apps/site-report/gas/    Google Apps Script backend, construction domain.
```

As of Task 6: `gas` is unchanged from Task 5 (CONFIG/RowMapper/Validation
foundation, `GET_SITES`, `SUBMIT_REPORT`); `web` gained its first real
logic beyond the Task 1 placeholder home page and `GET /api/health` — the
LIFF foundation described below.

## CONFIG + Sheets Schema Foundation (Task 2)

**CONFIG sheet structure:** unchanged `Key | Value` two-column layout
(`SheetSchemas.ts`'s `CONFIG_HEADERS`). Required keys (`Config.ts`'s
`SITE_REPORT_CONFIG_KEYS`): `BUSINESS_NAME`, `ADMIN_EMAIL`,
`DRIVE_ROOT_FOLDER_ID`, `TIMEZONE` — every one currently a required,
non-empty string; no semantic format check (email shape, real IANA
timezone name) exists yet, only presence-and-non-empty.

**Where configuration lives:** the target spreadsheet is read from the
`SPREADSHEET_ID` Script Property — the same property name
`apps/salon-portfolio/gas` uses, not a new key — because this is likewise
a standalone Apps Script project with no "active spreadsheet" for a Web
App request. No `.env`, no filesystem config, nothing Node-specific; this
is pure Apps Script (`SheetStore.ts`).

**Loading path:** `SheetStore.ts` (thin `SpreadsheetApp` adapter:
`getConfiguredSpreadsheet`/`getSheetByName`/`getRequiredSheet`/
`getHeaderRow`/`readRawRows`, plus the pure `assertSheetFound`/
`requireHeaders` helpers used for all five sheets, not just CONFIG) →
`ConfigParser.ts` (pure: `buildRawConfigMap` + `parseSiteReportConfig`) →
`ConfigStore.ts` (`buildSiteReportConfigFromRawRows` pure/tested,
`getSiteReportConfig()` thin/untested orchestration — mirrors
`apps/salon-portfolio/gas`'s `Sheets.ts`/`ConfigParser.ts`/`ConfigStore.ts`
split, including its "don't mock SpreadsheetApp — keep the real-touching
functions thin enough not to need a test" convention).

**Duplicate/unexpected key decisions** (explicit, matching salon's own
`buildRawConfigMap`): a duplicate `Key` row — first occurrence wins, later
duplicates silently ignored; a `Key` outside `SITE_REPORT_CONFIG_KEYS` —
silently ignored, never rejected, so a future key or a descriptive column
never breaks parsing.

**Header validation:** `SheetStore.requireHeaders(name, headerRow)`
checks `SheetSchemas.REQUIRED_HEADERS[name]` for all five sheets
(CONFIG/SITES/WORKERS/REPORTS/REPORT_PHOTOS), throwing
`RowMapper.MissingHeadersError` for a missing required column. Extra/
unrecognized columns are always accepted (only presence of the required
set is checked) — same tolerance as the CONFIG key policy above.

**What Task 2 still did not do:** no `Api.ts` wiring, no CRUD for
SITES/WORKERS/REPORTS/REPORT_PHOTOS, no semantic/format validation beyond
non-empty.

## Domain models, RowMapper, Validation (Task 3)

`src/models/{Site,Worker,Report,ReportPhoto}.ts` — plain domain types
structurally mirroring their Task 1 `*Row` schema. `RowMapper.ts` adds
`mapSiteRow`/`mapWorkerRow`/`mapReportRow`/`mapReportPhotoRow`: pure
structural coercion (trim text, empty-cell → `undefined` for optional
fields, `Date` → ISO string, numeric parsing) from a `*Row` to its domain
model, throwing `MalformedRowValueError` for a value that cannot be
coerced into the field's type at all (never silently producing a
valid-looking object from bad input). `Validation.ts` adds
`validateSiteRow`/`validateWorkerRow`/`validateReportRow`/
`validateReportPhotoRow`: pure business-rule checks (required-but-empty,
disallowed status, malformed date/timestamp format) over the *same* raw
`*Row` shape, returning a `ValidationIssue[]` (`{ field, reason }`) rather
than throwing. Deliberately two independent passes over the same input,
not a pipeline — a bad status value, for example, is rejected by
`mapSiteRow` (`MalformedRowValueError`) before `validateSiteRow` would
otherwise also flag it as a business-rule issue.

## `GET_SITES` (Task 4)

The first real `Api.ts` action, wired into `doPost` via
`handleApiRequest(rawBody)` (`src/index.ts`), same
`{ action, payload? }` request / `{ ok, data | error }` response envelope
Task 1 defined. `getSitesAction()` calls `getSiteReportConfig()` first —
an invalid CONFIG fails the whole action, since every action must respect
Task 2's config validation even where GET_SITES itself has no per-sheet
config key — then `SitesRepository.getSiteRows()`, the thin,
not-unit-tested Sheets read (`getConfiguredSpreadsheet` →
`getRequiredSheet(SITES)` → `requireHeaders` → `readRawRows` →
`rowsToObjects` into `SiteRow[]`, preserving Spreadsheet row order).
`Api.ts`'s `buildSitesResult(rows)` is
the pure, Jest-tested core: for each row, `mapSiteRow` then
`validateSiteRow`; the first row either function rejects fails the whole
result (`kind: "malformed"` or `kind: "invalid"`) rather than dropping or
silently defaulting that one row. Error mapping mirrors salon's `Api.ts`:
`SiteReportConfigError` → `CONFIG_INVALID`, `MissingHeadersError` →
`SHEET_ERROR`, a failed `buildSitesResult` → `DATA_INVALID`, anything else
→ `INTERNAL_ERROR` — no raw issues/exception details ever reach the
client.

## `SUBMIT_REPORT` (Task 5)

The first write workflow. `Api.ts` stays thin (parse envelope → call the
service → map result to response) — the whole
validate→resolve-site→upload→persist→notify workflow lives in
`SubmitReportService.ts`'s `submitReport(input)`, not in `Api.ts` itself.

**Request contract:** `models/SubmitReportInput.ts`'s `SubmitReportInput`/
`SubmitReportPhotoInput` — a dedicated shape, not the persisted
`ReportRow`/`SiteReport` (a submission never carries server-generated
fields: `reportId`, `photoCount`, `status`, `createdAt`/`updatedAt`).
**Photo representation is an explicitly flagged assumption**: photos are
`{ fileName, mimeType, base64Data }` inside the JSON `payload` — the
smallest representation consistent with what already exists (`doPost`
only ever reads one JSON string body; there is no multipart upload path
anywhere in the project, and `apps/site-report/web` has no upload UI yet
to define one). A future LIFF upload flow may need to revisit this (size
limits, resumable/direct-to-Drive uploads).

**Validation** (`SubmitReportService.parseSubmitReportInput`, pure):
required `siteId`/`lineUserId`/`workerName`/`workType`/`reportDate`
(calendar-date format), optional `workerId`/`comment`, and a `photos`
array whose entries each need non-empty `fileName`/`mimeType` and valid
base64 `base64Data`. Zero photos is valid (`ReportRow.photoCount`/
`validateReportRow` already treat 0 as valid — Task 3), so photos are
never required, and no maximum is enforced since none is documented
anywhere in the schema. This runs before anything else — nothing is
written if it fails.

**Site lookup** (Task 5 §8): reuses `SitesRepository.buildSitesResult`/
`getSiteRows` — the exact same function GET_SITES's `getSitesAction` uses
(relocated from `Api.ts` to `SitesRepository.ts` in this task specifically
so both actions can share it without a circular `Api.ts`↔service import;
`Api.ts` re-exports both names unchanged, so this was a pure move, not a
behavior change). No separate Sites lookup exists. **Worker lookup is
deliberately not implemented**: `ReportRow`/`SiteReport` already declare
`lineUserId`/`workerName` required and `workerId` optional with no
WORKERS-sheet relationship enforced anywhere (`Validation.validateReportRow`
never checks `workerId` — Task 3's own comment says so explicitly), so a
submission carries its own worker identity (as a LIFF/LINE profile would
supply it) rather than requiring a pre-registered Worker record.

**Report/photo IDs** (`ids/ReportId.ts`): `generateReportId`/
`generatePhotoId`, format `RPT-<epoch-ms>-<10-char-suffix>` /
`PHO-<epoch-ms>-<10-char-suffix>`, same injectable-`now`/`random` style as
salon's `ids/ReservationId.ts` (re-implemented, not shared) but without
timezone-aware date formatting (not needed here, and site-report has no
`Utils.ts` to provide it). One `reportId` is generated per submission and
reused for the REPORTS row, every REPORT_PHOTOS row, and the API response.

**Drive upload** (`DriveStorage.ts`, thin/untested): `uploadReportPhoto`
uploads into `SiteReportConfig.driveRootFolderId` (Task 2 CONFIG — already
existed, no CONFIG change was needed for this task) with filename
`{reportId}_{sequence}_{sanitizedOriginalName}` (unsafe characters
replaced). All-or-nothing: any photo failing to upload cleans up (trashes,
never permanently deletes) every photo this same submission already
uploaded, and the submission fails before any Sheet write — so
`ReportRow.photoCount` is always the count actually uploaded, never the
raw requested count (Task 5 §18).

**Persistence** (`ReportsRepository.ts`, thin/untested): `appendReportRow`
then, for every uploaded photo, `appendReportPhotoRow` — both reuse
`RowMapper.objectToRow` and the existing `REPORTS_HEADERS`/
`REPORT_PHOTOS_HEADERS` schema, appended via a new `SheetStore.appendRow`
(the one genuinely new piece of Sheets infrastructure this task needed —
Task 2/4 only ever *read* Sheets).

**Notification** (`AdminNotification.ts` pure content +
`sendAdminNotification` thin / `Mail.ts` thin `GmailApp` wrapper,
mirroring salon's `Mail.ts`+`ReservationEmailTemplates.ts` split): sent to
`SiteReportConfig.adminEmail` (also already existed) after successful
persistence. **Policy**: a notification failure never fails an
already-persisted submission and never retries any part of the workflow
(no duplicate report is ever created) — the response's
`notificationSent: boolean` is how the client learns the email may not
have gone out.

**Partial-failure policy** (Task 5 §19): validation failure → nothing
written. Drive upload failure → cleanup already-uploaded files for this
submission, nothing else written. REPORTS write failure → cleanup all
uploaded files (no REPORT_PHOTOS/email). REPORT_PHOTOS write failure →
cleanup uploaded files; **the already-written REPORTS row is not, and
cannot safely be, rolled back** — `SheetStore.ts` has no "delete this
exact Sheet row" primitive, and building one safely (locating the row by
reportId without racing a concurrent append) is out of scope for this
task. This is a known, accepted limitation: a REPORTS row with no matching
REPORT_PHOTOS rows can exist if this specific failure occurs. Cleanup
itself never throws out of `submitReport` — a cleanup failure is logged
and swallowed, preserving the original failure as the primary error.

**Error codes added**: `SITE_NOT_FOUND` (siteId not in an otherwise-valid
SITES sheet) and `DRIVE_ERROR`; `sites_unavailable`/REPORTS/REPORT_PHOTOS
write failures reuse the existing `DATA_INVALID`/`SHEET_ERROR` codes
GET_SITES already established.

## LIFF initialization + LINE profile foundation (Task 6)

`apps/site-report/web/lib/liff.ts` is the only place that may call
`liff.init()`/`liff.isLoggedIn()`/`liff.login()`/`liff.getProfile()`
directly; every other module works only with the application-level types
in `apps/site-report/web/types/liff.ts`.

**State model** (`LiffState`, discriminated on `status`):
`loading | login-required | ready { profile } | error { error }`. A
`LiffState` is what `initializeSiteReportLiff()` (module-cached — a
second/concurrent caller never triggers a duplicate `liff.init()`/
`getProfile()` call) resolves to; it never fetches config-app data and
never calls the GAS backend.

**Login is explicit, not automatic.** An unauthenticated user resolves to
`login-required`; `initializeSiteReportLiff()` never calls `liff.login()`
itself. `loginToSiteReport()` is the separate function a future UI calls
after seeing `login-required` — this avoids any risk of an automatic-login
loop, and keeps "start LINE login" a deliberate user-triggered action.

**Profile normalization**: `normalizeLiffProfile()` turns the raw LIFF SDK
profile into `SiteReportLiffUser { userId, displayName, pictureUrl?,
statusMessage? }` — required fields validated (not silently defaulted;
a missing/invalid field resolves to `LIFF_PROFILE_INVALID`), optional
fields left `undefined` rather than faked, `userId` copied through
unchanged (never hashed/transformed). No access token, and no other raw
SDK field, is ever copied into this type or logged.

**Errors** are a fixed, machine-readable `LiffErrorCode` set
(`LIFF_CONFIG_MISSING`, `LIFF_INIT_FAILED`, `LIFF_LOGIN_STATUS_FAILED`,
`LIFF_LOGIN_FAILED`, `LIFF_PROFILE_FAILED`, `LIFF_PROFILE_INVALID`,
`LIFF_UNAVAILABLE_SSR`) plus a safe, user-showable `message`; the original
thrown error (if any) is only ever passed to `console.error` inside
`createLiffError`, never attached to the returned object. `@line/liff` is
loaded via a dynamic `import()` inside `lib/liff.ts`'s functions (never at
module-evaluation time) and every entry point checks
`typeof window === "undefined"` first, so a server-rendered evaluation of
this module cannot crash or reach the SDK.

**Config**: `NEXT_PUBLIC_LIFF_ID` (must be public — the LIFF SDK runs in
the browser), documented in `apps/site-report/web/.env.example`.

**GET_SITES/SUBMIT_REPORT preparation, not integration.** Task 6 also adds
`apps/site-report/web/types/api.ts` (the `GET_SITES`/`SUBMIT_REPORT`
request/response shapes, hand-mirrored from `apps/site-report/gas/src/
Api.ts` and `models/SubmitReportInput.ts` — no field invented, no photo
format change, no idempotency field added) and
`apps/site-report/web/lib/api/siteReportClient.ts` (a generic
`callSiteReportAction<T>()`, a direct port of `apps/salon-portfolio/web/
lib/api/gasClient.ts`'s established fetch/parse/error-code behavior, kept
server-only via a non-`NEXT_PUBLIC_` `GAS_WEBAPP_URL`). As of Task 6,
neither action was called anywhere yet; Task 7 (below) adds the typed
`getSites()`/`submitReport()` wrappers, still with no UI calling them. A
safe "delete/locate one Sheet row by id" primitive (to close the
REPORT_PHOTOS-write-failure limitation above) remains a candidate for
whenever a second write workflow needs the same capability, rather than
being built speculatively now.

## Site Report API workflow layer (Task 7)

```text
lib/liff.ts                    — LIFF init / LINE profile (Task 6)
lib/api/siteReportClient.ts    — generic HTTP → GAS action (Task 6)
lib/api/siteReportWorkflows.ts — typed GET_SITES / SUBMIT_REPORT (Task 7)
future UI/application layer    — not implemented yet
```

`apps/site-report/web/lib/api/siteReportWorkflows.ts` adds two thin
functions on top of Task 6's `callSiteReportAction<T>()` — no HTTP/fetch/
envelope logic is duplicated:

- **`getSites(): Promise<SiteReportClientResult<GetSitesResponseData>>`**
  calls `callSiteReportAction(SITE_REPORT_ACTIONS.GET_SITES, {})`. Task 7
  inspected the actual GAS handler (`apps/site-report/gas/src/Api.ts`'s
  `getSitesAction()`) and confirmed it takes no arguments and never reads
  a payload at all — so `getSites()` takes no parameters either. This is
  a deliberate correction of an initial task assumption that `GET_SITES`
  might need a `userId`; the real contract has no such field, and one was
  not invented to satisfy that assumption.
- **`submitReport(input: SubmitReportInput): Promise<SiteReportClientResult<SubmitReportResponseData>>`**
  calls `callSiteReportAction(SITE_REPORT_ACTIONS.SUBMIT_REPORT, input)`,
  passing `input` through unchanged as the request payload (matching
  `submitReportAction(rawPayload)`'s exact expected shape). No field is
  added, renamed, or transformed.

**Explicitly**:
- Neither function initializes LIFF or imports `lib/liff.ts` — LIFF
  (authentication/profile) and this workflow layer (transport-level
  actions) are separate boundaries. A future UI/application layer is
  what combines a `SiteReportLiffUser` with these functions (e.g. passing
  `profile.userId` as `SubmitReportInput.lineUserId`).
- Neither function contains UI logic.
- GAS remains authoritative for business validation — no client-side
  re-implementation of `SubmitReportService.parseSubmitReportInput`'s
  rules exists; TypeScript's `SubmitReportInput` type is the only
  client-side structural check.
- Errors are never swallowed: both functions return
  `callSiteReportAction`'s result (success or `{ ok: false, error }`)
  unchanged, and let a rejected promise (e.g. `GAS_WEBAPP_URL` not
  configured) propagate rather than catching it into a fake empty
  result.
- UI/application orchestration (site picker, report form, photo upload,
  wiring a logged-in LINE profile to these calls) remains a later task.

## LIFF site-selection & report-entry-shell screen (Task 8)

```text
lib/liff.ts                    — LIFF init / LINE profile (Task 6)
lib/api/siteReportWorkflows.ts — typed GET_SITES / SUBMIT_REPORT (Task 7)
components/site-report/        — UI/application orchestration (Task 8, this)
app/page.tsx                   — renders SiteReportScreen
```

`components/site-report/SiteReportScreen.tsx` is the first real screen in
this app beyond the Task 1 placeholder. It is a small Client Component
(`"use client"`) rendered from `app/page.tsx`, which itself stays a Server
Component — the interactive/browser-only boundary is scoped to
`SiteReportScreen` alone, not the whole route.

**Flow:**

```text
mount
  → initializeSiteReportLiff()
      → login-required   → explicit "LINEでログイン" button → loginToSiteReport()
      → error             → LIFF error message shown
      → ready { profile } → getSites()
                              → rejects / { ok:false }  → error message + 再試行 (retry) button
                              → { ok:true, sites: [] }  → empty-state message + 再試行 button
                              → { ok:true, sites: [N] } → SitePicker → user selects a Site
                                                             → ReportEntryShell { selectedSite }
```

**State model**: one local discriminated `ScreenState` in
`SiteReportScreen.tsx` (`liff-loading | login-required | liff-error |
sites-loading | sites-error | sites-empty | site-selection | report-entry`),
plain `useState`/`useCallback` — no state-machine library, no global store.
It reuses Task 6's `LiffState`/`SiteReportLiffUser`/`LiffError` and Task
6/7's `Site` rather than redefining them.

**Orchestration boundary, unchanged from Task 6/7**: `SiteReportScreen` calls
only `initializeSiteReportLiff()`/`loginToSiteReport()` (`lib/liff.ts`) and
`getSites()` (`lib/api/siteReportWorkflows.ts`) — it never calls
`liff.*`/`callSiteReportAction`/`fetch` directly, and never imports
`@line/liff`. `initializeSiteReportLiff()`'s cached promise means mounting
this screen is the first and only place that triggers LIFF initialization.

**Login stays explicit**: on `login-required`, the screen renders a button;
`loginToSiteReport()` is called only from that button's `onClick`, never from
an effect. The call's returned promise is not awaited for a state
transition — per Task 6, a successful login redirects the browser, so there
is nothing meaningful to await here; a rejection (e.g. called outside a
browser context) is caught and ignored, leaving the user on the same screen.

**`GET_SITES` is called with no arguments** — `getSites()` takes no
parameters (Task 7 already confirmed the GAS handler reads no payload), so
Task 8 does not invent a `userId`/profile argument for it. Both rejected
promises and `{ ok: false, error }` responses map to the same `sites-error`
state (never silently treated as an empty list); the retry button in both
`sites-error` and `sites-empty` re-invokes `getSites()` directly — no
automatic retry loop, no full page reload, no LIFF re-initialization.

**Site selection** carries the actual `Site` object selected (from the
`sites-selection` state's list) straight into `report-entry`'s
`selectedSite` — never a partial/reconstructed object. `SitePicker.tsx`
renders only fields that exist on `Site` (`types/api.ts`): `name`,
`siteCode`, and `address` when present; nothing invented for a site missing
optional fields.

**`ReportEntryShell.tsx` is a shell only**, matching the explicit Step 12
scope: it confirms the selected site and lays out placeholder sections for
report content and photos, each stating the feature is not built yet. Its
one button is a genuinely `disabled` `<button>` — not a styled-to-look
disabled control — and `submitReport()` is not imported or called anywhere
in Task 8's code. `lineUserId` for a future submission will come from the
`SiteReportLiffUser.profile` already carried through every screen state;
Task 8 does not read or forward it beyond keeping it in state.

**Explicitly out of scope for Task 8** (unchanged from the task brief):
`SUBMIT_REPORT` calls, submit button behavior, photo upload/camera/
compression, report or draft persistence, offline mode, optimistic updates,
retry loops beyond a single manual retry action, and any GAS/salon-portfolio
change.

**Styling**: mobile-portrait-first plain CSS (`site-report.module.css`, a
CSS Module — this app has no Tailwind/design-system dependency, so none was
introduced). Tap targets are >=48px, spacing follows the 4px/8px scale, and
colors are defined for both `prefers-color-scheme: light` and `dark` (no
separate dark-mode toggle exists in this app yet, so only the OS-level
media query is handled).

**Testing**: `lib/liff.ts` and `lib/api/siteReportWorkflows.ts` are mocked
by relative path (`jest.mock("../../lib/liff", ...)`), not the `@/` alias —
matching Task 6/7's existing test convention, since `jest.mock`'s string
argument is not rewritten by `next/jest`'s SWC path-alias transform the way
a normal `import ... from "@/..."` is (an alias there fails to resolve at
runtime). `@testing-library/react` + `@testing-library/jest-dom` were added
as devDependencies (mirroring `apps/salon-portfolio/web`'s existing choice)
since this is the first component-rendering test in this app.

## Report form & draft validation (Task 9)

```text
Selected Site
    ↓
ReportDraft { workerName, workType, reportDate, comment }
    ↓
client-side shape validation (validateReportDraft, UX-only)
    ↓
[future Task 11] mapped into SubmitReportInput, alongside
  selectedSite.siteId and profile.userId
```

**Contract inspection finding (Task 9 §1) — reported, not silently
followed**: the task brief's own example `ReportDraft` listed only
`workType`/`reportDate`/`comment`. Inspecting the actual contract
(`apps/site-report/gas/src/models/SubmitReportInput.ts` and
`SubmitReportService.parseSubmitReportInput`) found a fourth required
field this task's `ReportDraft` therefore also had to include:
`workerName: string` (required, non-empty, no format check beyond that).
Two more `SubmitReportInput` fields were deliberately **not** turned into
form inputs, for reasons specific to each:

- **`workerId?: string`** — the model's own comment states it is present
  "only once an admin has linked the submitting LINE user to a registered
  Worker record"; there is nothing a report-entry form could ask the user
  to supply, so `ReportDraft` omits it entirely (a later task's mapping to
  `SubmitReportInput` simply leaves it `undefined`, which is valid — the
  same optionality `ReportRow`/`Validation.validateReportRow` already
  established in Task 3).
- **`lineUserId: string`** — required, but explicitly excluded from the
  UI per Task 9 §12: it comes from the authenticated LIFF profile
  (`SiteReportLiffUser.userId`), never a user-editable field. `siteId` is
  likewise contextual (the already-selected `Site`), not part of
  `ReportDraft`.
- **`photos: SubmitReportPhotoInput[]`** — Task 10's job.

**`ReportDraft`** (`components/site-report/reportDraft.ts`):
`{ workerName, workType, reportDate, comment }`, all `string` — deliberately
not `SubmitReportInput` itself and never exported as one, so nothing
downstream can mistake an in-progress draft for a submission-ready payload.
`reportDate` is a plain `YYYY-MM-DD` string taken directly from a native
`<input type="date">`'s `value` and never round-tripped through
`new Date(...)`, which can shift a date-only string by a day depending on
the viewer's timezone/time of day. `createInitialReportDraft(profile)`
builds the starting draft when a site is first selected: `workerName`
defaults to `profile.displayName` (a convenience default, still a plain
editable text field — a worker's LINE display name is not guaranteed to be
the name they want recorded on a report), `reportDate` defaults to today's
*local* calendar date (`getTodayLocalDateString`, built from `Date`'s local
`getFullYear`/`getMonth`/`getDate` fields rather than the UTC-based
`toISOString()`, to avoid landing on the wrong day near local midnight),
and `workType`/`comment` start empty — no work-type enum exists anywhere in
the actual contract to default to or constrain against, so none was
invented.

**Validation** (`components/site-report/reportValidation.ts`,
`validateReportDraft(draft) -> { valid, errors }`): a small pure function,
unit-tested independently of any component. Mirrors only the
required-field/format rules `SubmitReportService.parseSubmitReportInput`
already enforces for the fields this screen collects — `workerName`/
`workType`/`reportDate` non-empty, `reportDate` a real `YYYY-MM-DD`
calendar date (the same regex-plus-`Date.UTC`-round-trip check as GAS's
`isValidCalendarDateString`, re-implemented rather than imported, the same
way `SubmitReportService.ts` itself re-implements it from `Validation.ts`
rather than importing across an unrelated module for one regex — here
applied across the wider web/gas package boundary). `comment` has no rule
at all: the contract marks it optional with no documented length limit, so
`ReportDraftErrors` has no `comment` field and none was invented. This
validation is UX-only — GAS remains authoritative, and nothing here
replaces or duplicates its business rules beyond this shape check.

**State ownership**: the draft lives in `SiteReportScreen`'s `report-entry`
state variant (`{ profile, sites, selectedSite, draft }`), not inside
`ReportForm` or `ReportEntryShell` — matching Task 8's existing
"state lives in the screen, components are controlled" pattern and Task 9
§3's preference against introducing any new state layer. Selecting a site
(`handleSelectSite`) always creates a fresh `createInitialReportDraft`; there
is no "go back and change the selected site" navigation anywhere yet
(Task 8's model), so no separate reset path was needed. `ReportForm` itself
holds only ephemeral per-field "has this been touched" state, used solely to
decide when to display a validation message (Task 9 §9: no error is shown
before a field's first blur, so the form never opens looking broken).

**Component split**: `ReportEntryShell` (site confirmation + `ReportForm` +
photo placeholder + the still-`disabled` submit button carried over from
Task 8) vs. `ReportForm` (the four editable fields only). This mirrors
`SiteReportScreen`/`SitePicker`'s existing shell-vs.-control split rather
than folding everything into one file or fragmenting each `<input>` into
its own component.

**Explicitly unchanged from Task 8's scope boundary**: `submitReport()` is
not imported or called anywhere in `ReportForm.tsx`/`ReportEntryShell.tsx`/
`SiteReportScreen.tsx`; `GET_SITES` is still called with no
payload/`userId` (Task 7); no photo `<input>`, `navigator.mediaDevices`,
`FileReader`, or `canvas` usage exists anywhere in this app. No new runtime
dependency was added — `ReportForm`/`reportValidation`/`reportDraft` use
only React state, TypeScript, and native `<input>`/`<textarea>` elements.

## Photo pipeline (Task 10)

```text
<input type="file" accept="..." multiple>
    ↓
validatePhotoFile()            (photoValidation.ts, pure)
    ↓
compressPhotoFile()            (photoCompression.ts, browser I/O isolated
    ↓                           behind BrowserImageOps)
processSelectedPhotoFiles()    (photoPipeline.ts — orchestrates the above
    ↓                           for a whole selection, order-preserving)
ReportDraft.photos             (reportDraft.ts — addPhotosToDraft/
    ↓                           removePhotoFromDraft, immutable)
PhotoPreviewList                (preview + remove, controlled)
    ↓
[future Task 11] mapped into SubmitReportPhotoInput[], no field
  renamed/added, alongside the rest of ReportDraft -> SubmitReportInput
```

**Contract inspection (Task 10 §1) — reported, not silently assumed.**
Before writing any code, `apps/site-report/gas/src/models/
SubmitReportInput.ts` and `SubmitReportService.parseSubmitReportInput`/
`submitReport` were read directly (not `types/api.ts`'s mirror alone, to
catch any drift between the two — none was found):

- **`SubmitReportPhotoInput`** is exactly `{ fileName: string; mimeType:
  string; base64Data: string }` — base64-encoded content, no `data:` URI
  prefix. `types/api.ts`'s copy matches it exactly; no discrepancy.
- **MIME type**: `parseSubmitReportInput` requires `mimeType` to be a
  non-empty string and nothing else — no allowlist, no format check.
  `uploadReportPhoto()` (`DriveStorage.ts`) passes it straight into
  `Utilities.newBlob(bytes, mimeType, fileName)` with no validation of its
  own. **GAS enforces no MIME allowlist whatsoever.**
- **Size**: no field, check, or comment anywhere in `SubmitReportInput.ts`,
  `parseSubmitReportInput`, or `uploadReportPhoto()` limits an individual
  photo's size, the number of photos, or the total payload size.
  **GAS enforces no size limit whatsoever** — the only per-photo check is
  that `base64Data` is syntactically valid base64
  (`isValidBase64`: non-empty, length a multiple of 4, base64 alphabet).
- **Photo count**: `SubmitReportInput.photos`'s own comment states "zero
  or more ... no maximum is enforced ... do not invent arbitrary limits"
  (Task 5), matching `ReportRow.photoCount`/`validateReportRow` already
  treating 0 as valid (Task 3). **No maximum exists.**
- **Format compatibility**: since GAS validates no format at all, any
  `mimeType` string paired with valid base64 bytes is contract-compatible
  — a client re-encoding to JPEG is exactly as valid as passing the
  original format through unchanged.
- **Ordering**: `SubmitReportInput.photos` is a plain array with no
  ordering field; `SubmitReportService.submitReport` uploads photo `index`
  in array order and names each Drive file
  `{reportId}_{index+1}_{sanitizedOriginalName}` — so **array order is
  semantically meaningful** (it becomes each photo's Drive filename
  sequence number), which is exactly why Task 10 treats "never reorder a
  selection batch" as a hard requirement, not a cosmetic nicety.
- **Filename/metadata**: `fileName` is required and is sanitized
  server-side (unsafe characters replaced) before use as part of the Drive
  filename; no other metadata (EXIF, GPS, capture time) is read or stored
  anywhere in the contract.

**No discrepancy was found** between `types/api.ts`'s mirrored types and
the actual GAS source — both agree exactly. Nothing here required
reporting a conflict or choosing one side over the other.

**Everything Task 10 enforces beyond the above is therefore a client-side
UX/optimization decision, explicitly not a GAS requirement**
(`components/site-report/photoValidation.ts`'s and `photoCompression.ts`'s
own doc comments repeat this so the distinction survives future edits):

- `ACCEPTED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]`
  — a conservative allowlist of formats every browser can decode (for
  compression) and Drive can serve back as a viewable image. GAS would
  accept any string; this is not a re-implementation of a server rule.
- `MAX_ORIGINAL_PHOTO_SIZE_BYTES = 15 MiB` — a guard against feeding an
  unreasonably large original into the canvas-based compressor (which
  decodes the whole image into memory before it can shrink it), not a
  server limit.
- No maximum photo count is enforced anywhere in the web app either,
  matching the contract's own "do not invent arbitrary limits" stance.

**`ReportDraftPhoto`** (`components/site-report/reportDraft.ts`, added to
`ReportDraft.photos: ReportDraftPhoto[]`): `{ id, fileName, mimeType,
base64Data, size, previewUrl }`. The first three plus `base64Data` are
exactly `SubmitReportPhotoInput`'s shape — a future Task 11 mapping is a
direct `{ fileName, mimeType, base64Data }` pick per photo, no
transformation. `id` (local-only, never sent to GAS; unrelated to any
Drive `fileId`/`ReportPhoto.photoId`, both server-generated) and
`size`/`previewUrl` (UI-only) exist solely for this screen. `size` is the
*compressed* byte count — an informational hint only, since GAS enforces
no size limit.

**Preview URL choice — data URL, not `URL.createObjectURL`.** Documented
trade-off, not an oversight: a `data:` URI built from `mimeType`+
`base64Data` needs no `URL.revokeObjectURL` lifecycle management (nothing
to leak if a component unmounts without cleanup), at the cost of a small,
bounded amount of duplicated memory per photo (the same bytes held once as
`base64Data` for the future submission and once, formatted, as
`previewUrl`) — acceptable for the handful of photos one report realistically
carries, and it avoids an entire class of "revoked-too-early" or
"never-revoked" bugs `URL.createObjectURL` would otherwise require testing
for.

**Compression boundary** (`components/site-report/photoCompression.ts`).
Real browser I/O (`FileReader.readAsDataURL`, `Image` decode, `<canvas>`
draw + `toDataURL`) is isolated behind a `BrowserImageOps` interface with
exactly three methods (`readAsDataUrl`/`loadImage`/`drawAndExport`);
production code uses `defaultBrowserImageOps`, tests inject a fake — jsdom
has no native canvas backend (`getContext("2d")` returns `null`), so the
real path could never run under Jest regardless. The *policy* — target
dimension math (`calculateTargetDimensions`), data-URL parsing
(`parseDataUrl`), byte-size estimation (`estimateBase64ByteSize`) — is pure
and directly unit-tested. Policy: long edge capped at 1600px (aspect ratio
preserved, no upscaling), re-encoded as JPEG at quality 0.8 **regardless of
the original format** — valid because GAS validates no format at all;
transparency in an original PNG is lost on re-encode, an accepted
trade-off for jobsite photos. A failure at any browser step (unreadable
file, undecodable image, no 2D canvas context) rejects the returned
promise rather than throwing synchronously or silently producing a bad
photo.

**Selection-batch orchestration** (`components/site-report/
photoPipeline.ts`, `processSelectedPhotoFiles`). Runs
`validatePhotoFile` then `compressPhotoFile` for every file in one
`Promise.all`, then walks the *original* `files` array order to build the
result — so a selection `[A, B, C, D]` produces `photos` in that exact
order no matter which file's compression promise settles first (verified
directly: a test resolves them D, C, A, B and asserts the output is still
A, B, C, D). A rejected file (bad MIME/size) or a failed compression
becomes one entry in `errors` and is simply skipped — it never discards or
reorders the rest of the batch. `createPhotoId()` is a plain
counter+`Date.now()` string (`photo-<ms>-<n>`), not a UUID library, per
Task 10's explicit scope rule.

**Preview/remove UI**: `PhotoUploader.tsx` (the file input + per-selection
error list + a `role="status"` "processing" message) and
`PhotoPreviewList.tsx` (one thumbnail + accessible remove button per
photo, `写真を削除: <fileName>` as the button's accessible name, keyed by
`ReportDraftPhoto.id` — never array index, so identity survives removing a
photo from the middle of the list). Both are fully controlled: neither
holds `ReportDraft.photos` itself, only `PhotoUploader`'s own transient
per-selection `errors`/`isProcessing` state, which is never treated as
photo data. `ReportEntryShell.tsx` wires both into the same
`draft`/`onDraftChange` contract `ReportForm` already uses
(`addPhotosToDraft`/`removePhotoFromDraft`, both pure and immutable —
tested for order-preservation, non-mutation, and leaving every other
`ReportDraft` field untouched), so `SiteReportScreen`'s draft state stays
the single source of truth; no second, divergent photo state was
introduced anywhere.

**Explicitly out of scope for Task 10** (unchanged from the task brief):
`submitReport()`/`SUBMIT_REPORT` are not imported or called anywhere in
`PhotoUploader.tsx`/`PhotoPreviewList.tsx`/`photoPipeline.ts`/
`ReportEntryShell.tsx`/`SiteReportScreen.tsx`; no draft/report persistence,
no server-side upload, no `navigator.mediaDevices`/native camera API, no
EXIF/location extraction, no image cropping/editing, and no drag-and-drop
reordering (the project has no existing drag-and-drop dependency/
convention to build on). No new runtime dependency was added — the file
input is a native `<input type="file" accept="..." multiple>`, and
compression uses only `FileReader`/`Image`/`<canvas>`, already-native
browser APIs.

## Submission integration (Task 11)

```text
LIFF profile.userId
        +
selectedSite.siteId
        +
ReportDraft (workerName/workType/reportDate/comment)
        +
ReportDraft.photos
        ↓
buildSubmitReportInput()        (submitReportMapper.ts, pure)
        ↓
submitReportDraft()             (submission.ts — guard, mapper, workflow
        ↓                        call, result → SubmissionState)
lib/api/siteReportWorkflows.submitReport()   (Task 7, unchanged)
        ↓
GAS SUBMIT_REPORT
        ↓
SubmissionState { idle | submitting | success | error }
        ↓
ReportEntryShell (submit button + error/success UI)
```

**Contract re-confirmation (Task 11 §1-3) — re-read, not assumed from
Task 9/10's notes.** `apps/site-report/gas/src/models/SubmitReportInput.ts`,
`SubmitReportService.parseSubmitReportInput`, and `Api.ts`'s
`SubmitReportResponseData`/`mapSubmitReportOutcomeToResponse` were read
again directly for this task:

- `SubmitReportInput`/`SubmitReportPhotoInput` are unchanged from Task 10's
  findings — `types/api.ts`'s mirror still matches exactly. **No
  discrepancy.**
- `SubmitReportResponseData` is exactly `{ reportId: string; photoCount:
  number; notificationSent: boolean }` (`Api.ts`) — `types/api.ts`'s copy
  matches exactly. **No discrepancy.** No `submittedAt`/`driveUrl`/
  `receiptUrl` exists anywhere in the contract, so none is shown.
- `lib/api/siteReportWorkflows.ts`'s `submitReport(input)` returns
  `Promise<SiteReportClientResult<SubmitReportResponseData>>` —
  `{ ok: true; data } | { ok: false; error: { code, message } }`; it does
  **not** throw for a business/API error (only `ok: false`), but
  `callSiteReportAction`'s own `fetch`/`GAS_WEBAPP_URL`-missing/JSON-parse
  failures still reject the promise — both paths are handled (see
  `submission.ts` below).

**Mapper** (`components/site-report/submitReportMapper.ts`,
`buildSubmitReportInput({ site, profile, draft })`): pure, synchronous,
no API calls/React state/validation/navigation. Maps `site.siteId` →
`siteId`, `profile.userId` → `lineUserId`, the four `ReportDraft` text
fields straight across, and `draft.photos.map(...)` → `photos` picking
only `fileName`/`mimeType`/`base64Data` per photo (dropping the UI-only
`id`/`size`/`previewUrl`) — in the same order `draft.photos` is in,
never re-sorted. `workerId` is omitted from the result entirely (not set
to `undefined`) — `ReportDraft` has never collected one (Task 9's own
contract inspection: it only exists once an admin links a Worker record,
which this app has no flow for), and no worker lookup was added. `comment`
is passed through unchanged, including an empty string — GAS's own
`parseSubmitReportInput` already treats `""` identically to `undefined`,
so duplicating that normalization client-side would be redundant, not
more correct. Never mutates `site`/`profile`/`draft`/`draft.photos`
(tested directly: object/array identity and contents are asserted
unchanged after a call).

**Submission orchestration** (`components/site-report/submission.ts`):
adds one layer beyond the mapper, `submitReportDraft({ site, profile,
draft, submit? })`, so the async "call the workflow and turn the result
into UI state" logic is unit-testable without rendering React at all —
Task 11 §26's "mapper tests → payload correctness, screen tests →
orchestration correctness" split, extended with a third layer for the
result-mapping logic in between. `submit` defaults to the real
`lib/api/siteReportWorkflows.submitReport`, injectable only for tests —
the real call path from a render is still exactly `SiteReportScreen →
submitReportDraft → lib/api/siteReportWorkflows.submitReport →
siteReportClient.callSiteReportAction → fetch`, never a direct `fetch`/
`callSiteReportAction` from a component. Behavior:
  - Missing `site` or `profile` → `{ status: "error" }`, `submit` never
    called (Task 11 §24). **Currently unreachable through
    `SiteReportScreen`'s own state machine** — its `report-entry` variant's
    types already guarantee both are present — so this is an invariant
    guard for any future direct caller of `submitReportDraft`, not a
    replacement for that type guarantee; it is still exercised directly
    by `submission.test.ts` since `submitReportDraft` accepts
    `Site | null | undefined`/`SiteReportLiffUser | null | undefined`.
  - `submit` resolves `{ ok: true, data }` → `{ status: "success", result:
    data }`.
  - `submit` resolves `{ ok: false, error }` → `{ status: "error",
    message: error.message }` — the same server-provided message
    `sites-error` already shows verbatim elsewhere in this app (Task 8),
    not re-worded.
  - `submit` rejects (network failure, `GAS_WEBAPP_URL` missing, etc.) →
    a fixed, generic Japanese message — the raw error/stack is never
    shown to the user.

**`SubmissionState`** (`submission.ts`): `{ status: "idle" } | { status:
"submitting" } | { status: "success"; result: SubmitReportResponseData }
| { status: "error"; message: string }` — one discriminated union, not
`isSubmitting`/`isSuccess`/`hasError` booleans that could contradict each
other.

**`SiteReportScreen`** owns `submission: SubmissionState` and
`submitAttempted: boolean` inside its `report-entry` state variant
(reset to idle/`false` whenever a new site is selected — a fresh draft
gets a fresh submission state). `handleSubmit`:
  1. Guards against a second concurrent submit: if `submission.status` is
     already `"submitting"`, returns immediately.
  2. Sets `submitAttempted: true` (so `ReportForm` starts showing every
     invalid field's error, not just already-blurred ones) — this always
     happens, valid or not.
  3. Runs the existing `validateReportDraft(draft)` (Task 9) — no second
     validation system. Invalid → returns; `submitReportDraft`/
     `submitReport` is never called.
  4. Sets `submission: { status: "submitting" }` **synchronously, before
     `await`ing** `submitReportDraft(...)` — the UI enters the submitting
     state immediately on click, not only once the network call starts
     resolving.
  5. Awaits `submitReportDraft({ site: selectedSite, profile, draft })`
     and writes the resulting `SubmissionState` back once it settles.
  **Double-submit guard is a plain state check** (`submission.status ===
  "submitting"`), not a `ref` — `handleSubmit` is `useCallback`'d against
  `[state]`, so it is recreated with the latest `state` on every render;
  this relies on React 18 flushing the synchronous "submitting" state
  update (step 4, set before the `await`) for one discrete click event
  before the next discrete click event's handler runs, which is what
  React's automatic-batching/sync-lane handling of discrete user input
  (click) does. Verified directly, not just assumed: `SiteReportScreen.
  test.tsx`'s "calls submitReport only once for two rapid submit clicks"
  test fires two `fireEvent.click`s with no `await` in between and asserts
  `submitReport` was called exactly once. (An earlier `useRef`-based guard
  was tried first and reverted — it triggered `eslint-plugin-react-hooks`'s
  `react-hooks/refs` rule, which flags a ref read appearing anywhere in a
  render-scoped closure that is later passed as a prop, even inside an
  otherwise-correct event handler; the state-based guard has identical
  behavior, verified by the same test, without that lint conflict.)

**`ReportForm`'s `showAllErrors` prop** (Task 11 §13): defaults `false`
(Task 9's original per-field-blur behavior, unchanged). When `true`
(`SiteReportScreen` passes `submitAttempted`), every field's
`validateReportDraft` error shows regardless of whether that specific
field has been blurred — reuses the exact same validation result, no
second validation system, no new error message.

**Submit button** (`ReportEntryShell.tsx`): enabled while idle/error/
success, `disabled` only while `submission.status === "submitting"`
(label switches to "送信中..."). This is a deliberate reading of two
task requirements in tension: §12 describes the button as "enabled when
the report is valid," but §13 requires a click on an *invalid* draft to
run validation and reveal field errors — which is only possible if the
button can be clicked at all. Disabling it whenever the draft is invalid
would make §13's flow (and the "does not call submitReport and shows
validation errors for an invalid draft" test) unreachable, and is also
weaker accessibility practice (a disabled control gives no indication of
*why* it's disabled). The button therefore stays clickable except while
a submission is actually in flight.

**Success/error UI**: an error renders the server-provided (or generic
fallback) message in a `role="alert"` box; a success renders a fixed
Japanese message plus `受付番号: {reportId}` — the one field from
`SubmitReportResponseData` that is actually meaningful to show a user;
`photoCount`/`notificationSent` are not surfaced in the UI (nothing in
the task or contract calls for showing them). The draft is never cleared
and the screen never auto-navigates after success or auto-retries after
failure — the same submit button remains available for another attempt
either way, and editing any field or the photo list at any point (before
or after a submit attempt, success, or failure) never resets `submission`
or `submitAttempted` on its own; only a fresh `handleSubmit` call
overwrites `submission`.

**Explicitly out of scope for Task 11** (unchanged from the task brief):
draft/localStorage/IndexedDB persistence, an offline/background/auto-retry
submission queue, server-side idempotency or double-submit prevention (the
double-submit guard above is a client-side UI convenience only — it does
nothing to stop two different browser tabs, or a client retry after a
timed-out-but-actually-successful request, from both reaching GAS; Task 5
already documented server-side idempotency as a known, deferred
limitation, and this task does not change that), any GAS action/schema
change, camera/native media APIs, and post-success navigation (left as an
explicit future UX decision — see below). No new dependency was added.

**Regression**: Tasks 6-10's own test suites are unchanged in behavior —
`ReportEntryShell.test.tsx`'s render calls gained three new required props
(`submission`/`submitAttempted`/`onSubmit`) since the submit control is no
longer a permanently-`disabled` placeholder, and its "renders a genuinely
disabled submit control" test was replaced with "renders an enabled submit
control while idle" (Task 11 makes the button real, so a test asserting it
stays disabled forever is no longer describing this app's actual
behavior) — every other Task 8/9/10 assertion (LIFF states, `GET_SITES`
orchestration, site selection, report field editing/validation, the photo
pipeline) is unchanged.

## MVP verification & production hardening (Task 12)

A re-audit of the complete MVP built in Tasks 6–11, not a new feature.
Baseline before any change (`npm test`/`typecheck`/`build`/`lint`, all in
`apps/site-report/web`): **172/172 tests passing, 0 typecheck errors,
build passing, lint passing with 0 errors** (1 pre-existing warning,
`@next/next/no-img-element` on Task 10's data-URL preview `<img>` —
unchanged by this task, still intentional). Two real issues were found
and fixed; everything else audited was already correct and is documented
as such rather than changed without reason.

**Contract re-audit**: `apps/site-report/gas/src/models/
SubmitReportInput.ts`, `SubmitReportService.ts`, and `Api.ts` were read
again in full. Every finding from Task 10/11 (exact `SubmitReportInput`/
`SubmitReportPhotoInput`/`SubmitReportResponseData` shapes, no MIME/size/
count limit anywhere in GAS, `SiteReportClientResult`'s `{ok:true,data} |
{ok:false,error}` shape, `submitReport()` never throwing for a business
error) still holds — **no discrepancy, no drift**. One inaccuracy in this
task's own brief, not the repo: it names
`apps/site-report/gas/src/services/SubmitReportService.ts` — no
`services/` subdirectory exists; the actual, unchanged path is
`apps/site-report/gas/src/SubmitReportService.ts`.

### Fix 1 — post-success UX (§7, Option A)

**Finding**: after a successful submission, the form stayed fully
editable with the same re-clickable "レポートを送信" button — nothing
stopped a user from submitting the exact same already-persisted draft a
second time (each click would create a genuinely new GAS-side report row;
this is a real, user-reachable duplicate-submission path, not a
theoretical one).

**Decision**: Option A, the smallest of the three offered that actually
closes this path. On `submission.status === "success"`,
`ReportEntryShell` now renders a confirmation (site name, the existing
success message, `受付番号: {reportId}`) and a single `別のレポートを
作成` ("create another report") button in place of the form/photo
pipeline/submit button entirely — not merely a disabled submit button
next to the still-visible old draft (Option B), since leaving the
already-submitted values on screen with no forward action reads as
"stuck," not "done." Activating it (`SiteReportScreen`'s
`handleCreateAnother`, the **only** place a draft is ever reset after
success) builds a fresh `createInitialReportDraft(profile)` for the same
`selectedSite` and resets `submission`/`submitAttempted` to idle/`false`
— the same convenience defaults as selecting a site for the first time.
Never automatic: no timer, no redirect, no resubmission — confirmed by a
test asserting `submitReport` is still called exactly once after
activating "create another."

**Tests added (TDD — written and confirmed RED before this change)**: 6
— `ReportEntryShell.test.tsx` gained "shows a success message with the
reportId," "hides the report form and photo pipeline after success,"
"shows a create-another action after success," "calls onCreateAnother
when activated," "still shows the selected site after success" (5, one
of which — the reportId assertion — strengthens a pre-existing test
rather than adding a new one); `SiteReportScreen.test.tsx` gained
"resets to a fresh draft and idle submission when creating another report
after success" and "does not call submitReport again just from creating
another report" (2). Net new: 6 (178 total, up from 172).

### Fix 2 — global `box-sizing` (§9/§10/§11, mobile audit)

**Finding**: `site-report.module.css` had no global `box-sizing: border-
box` reset — only `.input`/`.textarea` set it individually. Under the
browser default (`content-box`), every other element that combines
padding/border with a container-driven width renders **wider than its
container**: `.siteItem` (`width: 100%` + `padding: 12px 16px` + a 1px
border), `.section`/`.errorBox`/`.successBox` (block children of a
`flex-direction: column` container, stretched to the cross-axis width by
the default `align-items: stretch` + padding), and every `.button`/
`.buttonSecondary` rendered directly inside `.screen`/`.reportEntry`
(same stretch-plus-padding overflow, including the LINE-login button, the
`GET_SITES` retry button, the submit button, and the new "create another"
button). This is a genuine, code-verified horizontal-overflow bug on any
viewport, most visible on a narrow phone — not a hypothetical edge case.
**Fix**: `*, *::before, *::after { box-sizing: border-box; }` added to
`app/globals.css`, plus `overflow-wrap: break-word` on `body` as a
defensive measure for a long unbroken token (an English site/company
name with no spaces) in worker/site-name text — Japanese text already
wraps between any two characters by default, so this only matters for
non-CJK runs, but nothing in the app constrains what a worker types.
Neither change alters any element's already-explicit padding values, so
no visual spacing changes — it only stops the rendered box from exceeding
them.

**Why this has no Jest test**: jsdom does not implement CSS layout
(`getBoundingClientRect`/computed box-model sizes are not meaningfully
computed), and this repo has no visual-regression/browser-automation
tooling for either `site-report/web` or `salon-portfolio/web` to extend.
Per this task's own §10 ("do not add a browser automation framework
unless one already exists and is clearly usable") and §16 ("if a real
issue can be detected through unit/integration tests, add the smallest
regression test" — implying: if it cannot, don't force one), this fix is
verified by direct CSS box-model inspection (documented above) and left
as an explicit manual-verification item (see the checklist below), not
faked with an assertion that would not actually exercise real layout.

### Configuration & security audit (§4, §15) — no code change

- **`.env.example`**: contained one stale claim ("nothing in this app
  calls [`GAS_WEBAPP_URL`] yet as of Task 6") — false since Task 11 wired
  real submission through it. Corrected in place, and expanded to state
  explicitly that the value must be the full deployed Apps Script Web App
  URL ending in `/exec` (Deploy → New deployment → Web app), since
  `siteReportClient.ts` sends it to `fetch()` completely unchanged and
  appends no path itself.
- **No secret is hardcoded anywhere in `apps/site-report/web` source**:
  `NEXT_PUBLIC_LIFF_ID` (a LIFF app ID, not a secret — same public-ID
  status as any OAuth client ID meant to run client-side) and
  `GAS_WEBAPP_URL` (server-only; correctly *not* `NEXT_PUBLIC_`-prefixed,
  so it is never bundled into browser code — verified by re-reading
  `siteReportClient.ts`'s own doc comment and its literal
  `process.env.GAS_WEBAPP_URL` read, which only executes in
  server/Node contexts) are the only two configuration values anywhere in
  this app; both come from `.env.local`, never committed. `git ls-files`
  confirms no `.env`/`.env.local` file is tracked anywhere in this repo
  (only `.env.example` files, containing empty placeholders); the root
  `.gitignore` covers `.env`, `.env.local`, and `.env.*.local`.
  `.clasp.json` (holds a real Apps Script project ID) is likewise
  gitignored, matching `apps/salon-portfolio/gas`'s existing convention —
  unaffected by this task since `apps/site-report/gas` was not touched.
- **Submission path re-verified single**: grepped every file under
  `apps/site-report/web` for `fetch(`/`callSiteReportAction(` outside
  `lib/api/siteReportClient.ts` itself and its own test, and for
  `submitReport(`/`SUBMIT_REPORT` outside `lib/api/siteReportWorkflows.ts`
  and `components/site-report/submission.ts` — none found. The path
  remains exactly `SiteReportScreen → submission.ts → siteReportWorkflows.ts
  → siteReportClient.ts → fetch`, with no second/duplicate client.
- **Stale documentation, not a security issue, also fixed**: the root
  `README.md`'s `site-report` section still described the app as a
  "Task 1 foundation scaffold" with "no `GET_SITES`, `SUBMIT_REPORT`, or
  LIFF logic" — inaccurate since Task 4 (`GET_SITES`) and badly so since
  Task 11 (real submission). Corrected to describe the actual current MVP
  scope and explicitly list what remains deferred. `app/layout.tsx`'s
  `<meta name="description">` had the same "foundation scaffold (Task 1)"
  staleness, also corrected.

### Photo pipeline re-audit (§9) — no code change, already correct

Re-verified directly against `photoValidation.ts`/`photoCompression.ts`/
`photoPipeline.ts`'s current source and their own doc comments, all still
accurate as of Task 10: the accepted-MIME allowlist and the 15 MiB
original-size guard are both documented in-source as **client-side UX/
optimization policy, explicitly not a GAS limit** (GAS enforces neither);
`base64Data` never carries a `data:` prefix (`parseDataUrl` strips it);
`processSelectedPhotoFiles` preserves selection order via `Promise.all` +
a final in-order walk, verified by its own out-of-order-resolution test;
a failed compression becomes an `errors` entry, never a partially-broken
photo silently added to `ReportDraft.photos`; `PhotoPreviewList`'s remove
button and `submitReportMapper.ts`'s field-picking (only `fileName`/
`mimeType`/`base64Data` survive into `SubmitReportPhotoInput`) are both
still exactly as documented in the Task 10/11 sections above. Nothing
here needed a change.

### Validation-flow re-audit (§6) — no code change, already correct

Walked every transition in `SiteReportScreen.tsx`'s `ScreenState`
machine against its existing test suite: `liff-loading` → `login-
required`/`liff-error`/`ready`; `ready` → `sites-loading` →
`site-selection`/`sites-empty`/`sites-error` (both a rejected `getSites()`
and an `{ok:false}` result map to `sites-error`, never silently treated
as empty); `site-selection` → `report-entry` (fresh draft, idle
submission); inside `report-entry`, `validateReportDraft` gates every
submit attempt, `submitReportDraft`'s missing-site/profile guard is
structurally unreachable through this state machine (documented already
in the Task 11 section, re-confirmed unchanged) but still exercised
directly by `submission.test.ts`, and the state-based double-submit guard
(not a `ref`) is verified by its own rapid-double-click test. All of this
was already correct; Task 12 changed none of it.

### Real-device / manual verification checklist

Nothing below has been performed in this session — no real LINE account,
deployed GAS Web App, LIFF channel, iPhone, or Android device is
reachable from this environment. This is a to-do list for whoever
performs that verification, not a report of results:

```text
[ ] LIFF opens on iPhone Safari (inside LINE's in-app browser)
[ ] LIFF opens on Android Chrome (inside LINE's in-app browser)
[ ] LINE login completes and redirects back into the LIFF app
[ ] the authenticated LINE profile resolves (workerName pre-fills)
[ ] GET_SITES loads the real SITES sheet's rows
[ ] site selection transitions into the report-entry screen
[ ] required-field / calendar-date validation shows errors as expected
[ ] the file input opens the real photo picker (and, where the OS/browser
    offers it, the camera) on both platforms
[ ] a selected photo compresses and previews correctly
[ ] photo removal updates the preview list correctly
[ ] a real submission reaches GAS and a REPORTS row is created
[ ] GAS receives exactly the documented payload shape (siteId/lineUserId/
    workerName/reportDate/workType/comment/photos[], no extra fields)
[ ] uploaded photos appear in Drive in the same order they were added
[ ] the success screen shows the real reportId, and "別のレポートを作成"
    resets the form for a new report against the same site
[ ] a deliberately induced API error (e.g. an invalid siteId) shows a
    readable error and leaves the draft/photos intact for retry
[ ] the layout is usable at a narrow phone width (no horizontal
    scrolling of any card/section/button — the Fix 2 box-sizing
    correction above is what this specifically checks)
```

### Coconala packaging readiness (§14) — audit only, no marketing copy

The technical documentation (`docs/site-report-architecture-overview.md`
plus this section, `README.md`) is sufficient for a technically literate
buyer/implementer to understand: what the product does (a LIFF site-
report submission form: LINE login → site selection → report + photos →
GAS-backed persistence + admin email notification); the three components
required (a LINE Developers LIFF channel, a deployed Apps Script Web App,
and hosting for the Next.js frontend with `NEXT_PUBLIC_LIFF_ID`/
`GAS_WEBAPP_URL` configured); what the buyer must configure themselves
(the CONFIG sheet's `BUSINESS_NAME`/`ADMIN_EMAIL`/`DRIVE_ROOT_FOLDER_ID`/
`TIMEZONE`, the SITES sheet's rows, the LIFF channel's endpoint URL,
`.clasp.json`'s real script ID); and what is explicitly deferred (listed
below). This is a documentation-sufficiency judgment only — no
Coconala-facing listing copy was written, per this task's explicit scope.

### Deferred / known limitations (unchanged set, restated for clarity)

- **Server-side idempotency / duplicate-submission prevention**: still
  not implemented (a known limitation since Task 5). Fix 1 above closes
  the specific "same rendered draft, same button, clicked twice" path at
  the UI layer, but does nothing for two separate browser tabs, or a
  client retry after a request that actually succeeded server-side but
  appeared to time out — both would still create two GAS-side reports.
- Draft/localStorage/IndexedDB persistence, an offline/background sync
  queue, submission history, an admin dashboard, analytics/monitoring,
  and native camera/EXIF/cropping functionality — all explicitly out of
  scope for Task 12 (and every prior task), not implemented.
- Server-side LINE authentication/authorization (verifying a LIFF ID
  token server-side before trusting `lineUserId`) does not exist — GAS
  currently trusts whatever `lineUserId` the client sends.
