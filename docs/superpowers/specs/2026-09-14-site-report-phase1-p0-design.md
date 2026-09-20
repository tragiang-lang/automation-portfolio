# Site Report — Phase 1 (P0) Design: 現場名 dropdown + 作業種別 master data

Status: approved by user 2026-09-14. Scope: the two MUST-FIX items only.
Phase 2 (full mobile form redesign — weather, work hours, progress, safety,
issues, photo categories, confirmation step) is explicitly out of scope for
this spec and will get its own brainstorming/spec cycle after Phase 1 ships.

## 1. Problem statement

1. `現場名` (site name) cannot properly be selected/changed. `GET_SITES`
   returns every SITES row regardless of `status`, so an INACTIVE site can
   appear in the picker. The picker (`SitePicker.tsx`) is a list of buttons,
   not a real dropdown control. Once a site is chosen, `ReportEntryShell`
   shows it as static text with no way back — the only way to pick a
   different site is to reload the whole app.
2. `作業種別` (work type) is a free-text `<input>` in `ReportForm.tsx`,
   validated only as non-empty on both client and server. No master data
   exists anywhere for it.

## 2. Verified baseline (do not restate without re-running)

- `apps/site-report/gas`: `npm test` → **199/199 passing** (15 suites).
- `apps/site-report/web`: `npm test` → **190/190 passing** (19 suites).
- Combined baseline: **389/389**. The brief's "199/199" figure covers only
  the `gas` package; the true combined baseline is 389, verified by running
  both suites directly on 2026-09-14 (not carried over from any prior
  report).

## 3. Current contract (source of truth before this change)

| Layer | Fact |
|---|---|
| `SITES` sheet | `siteId, siteCode, name, address, clientName, status, startDate, endDate, createdAt, updatedAt` (`SheetSchemas.ts`) |
| `GET_SITES` | Returns **every** SITES row that passes validation, regardless of `status` (`SitesRepository.buildSitesResult` does not filter). |
| `REPORTS` sheet | 12 columns, in order: `reportId, siteId, workerId, lineUserId, workerName, reportDate, workType, comment, photoCount, status, createdAt, updatedAt`. |
| `SUBMIT_REPORT` input | `siteId, workerId?, lineUserId, workerName, reportDate, workType, comment?, photos[]` — `workType` is an arbitrary non-empty string, no membership check. |
| `SubmitReportService.submitReport` | Looks up `siteId` via `buildSitesResult(getSiteRows())`, unfiltered — an INACTIVE site currently still resolves successfully. |
| Error codes | `VALIDATION_ERROR, CONFIG_INVALID, SHEET_ERROR, DATA_INVALID, SITE_NOT_FOUND, DRIVE_ERROR, INTERNAL_ERROR` (`Api.ts` `ERROR_CODES`). |
| `SitePicker.tsx` | Renders one `<button>` per site; `onSelect(site)` fires on click. No dropdown, no re-selection affordance elsewhere. |
| `ReportForm.tsx` | `作業種別` is a plain `<input type="text">`, bound to `ReportDraft.workType`. |
| Frontend load | `SiteReportScreen` calls `getSites()` alone once LIFF is ready. |

## 4. Target contract (end of Phase 1)

### 4.1 SITES / GET_SITES

`SitesRepository.buildSitesResult`'s `ok: true` branch filters the final
`sites` array to `status === "ACTIVE"` before returning. This is the single
change point: it fixes `GET_SITES`'s response *and* automatically makes
`SubmitReportService.submitReport`'s internal site lookup ACTIVE-only,
since both already call the same function. Row-level validation is
unchanged — a malformed/invalid row (ACTIVE or INACTIVE) still fails the
whole result before filtering ever runs, so no data-integrity check is
weakened.

An inactive/unknown `siteId` submitted to `SUBMIT_REPORT` now falls through
to the existing `site_not_found` → `SITE_NOT_FOUND` path. No new error code
needed for this part.

### 4.2 WORK_TYPES (new master data)

New sheet, columns: `code | name | status | sortOrder`. Same shape family
as `SITES`/`WORKERS` (a `status` of `ACTIVE`/`INACTIVE`, same convention as
`Validation.requireStatus`).

Seeded by `setupSiteReport()`, idempotently, with:

| sortOrder | code | name |
|---|---|---|
| 1 | SUMIDASHI | 墨出し |
| 2 | SURVEYING | 測量 |
| 3 | EXCAVATION | 掘削 |
| 4 | FOUNDATION | 基礎工事 |
| 5 | REBAR | 鉄筋工事 |
| 6 | FORMWORK | 型枠工事 |
| 7 | CONCRETE | コンクリート工事 |
| 8 | STRUCTURE | 躯体工事 |
| 9 | SCAFFOLDING | 足場工事 |
| 10 | EXTERIOR_WALL | 外壁工事 |
| 11 | ROOFING | 屋根工事 |
| 12 | WATERPROOFING | 防水工事 |
| 13 | PAINTING | 塗装工事 |
| 14 | INTERIOR | 内装工事 |
| 15 | MEP | 設備工事 |
| 16 | ELECTRICAL | 電気工事 |
| 17 | PLUMBING | 配管工事 |
| 18 | DEMOLITION | 解体工事 |
| 19 | LOGISTICS | 搬入・搬出 |
| 20 | CLEANING | 清掃 |
| 21 | INSPECTION | 検査 |
| 22 | OTHER | その他 |

All seeded rows start `status: ACTIVE`. Idempotency: same pattern as the
demo SITES row — `findRowIndexByColumnValue(headerMap, rows, "code", code)`
per candidate; only append codes not already present. An operator's own
added/edited/deactivated row is never touched or duplicated on rerun.

### 4.3 GET_WORK_TYPES (new action)

Mirrors `GET_SITES` exactly: `WorkTypesRepository.getWorkTypeRows()` (reads
the sheet) + `buildWorkTypesResult()` (pure: maps, validates, filters to
ACTIVE, sorts by `sortOrder` ascending) + `getWorkTypesAction()` in `Api.ts`
(same config-check-first / try-catch-map-errors shape as
`getSitesAction`). Dispatched in `handleApiRequest`'s existing switch.

### 4.4 REPORTS schema change — additive only

Per your constraint: the existing 12 columns and their order are untouched.
Exactly **one** new column is appended at the end:

`reportId, siteId, workerId, lineUserId, workerName, reportDate, workType, comment, photoCount, status, createdAt, updatedAt, workTypeName`

- `workType` (existing column, existing field name — **not renamed**) now
  carries a stable code (e.g. `EXTERIOR_WALL`) for new submissions instead
  of free Japanese text. Existing rows keep whatever free text they already
  have; nothing rewrites them.
- `workTypeName` (new, optional) carries the Japanese label
  (e.g. `外壁工事`) for new submissions, resolved server-side from the
  `WORK_TYPES` sheet — never trusted from client input — so the raw
  spreadsheet stays human-readable without a manual lookup. Old rows read
  back with `workTypeName` empty/undefined, which `RowMapper`'s existing
  `toOptionalString` already handles the same way every other optional
  column does.

**Migration mechanism (critical — see §6 finding):** `REQUIRED_HEADERS[SHEET_NAMES.REPORTS]`
stays pointed at the **original 12-column** list, never the new 13-column
`REPORTS_HEADERS` — `setupSiteReport()`'s generic per-sheet loop treats any
header row missing a "required" column as `SetupSchemaMismatchError` and
aborts the *entire* provisioning run (including WORK_TYPES creation/seeding
later in the same function), so making `workTypeName` "required" would
brick re-provisioning on every existing production spreadsheet the moment
this ships. Instead, `setupSiteReport()` gets one small, dedicated,
additive step after the generic loop: if the REPORTS header row does not
yet contain a `workTypeName` cell, append it in the very next free column
(`getRange(1, existingHeaderRow.length + 1).setValue("workTypeName")`) —
never touching any existing cell. This runs unconditionally (fresh sheet or
pre-existing) and is naturally idempotent, since a rerun finds the header
already present.

`SubmitReportInput` (the wire payload) is **unchanged** — still just
`workType: string`. The client sends the code; GAS resolves the matching
`WorkType` row (same existence-check pattern as `siteId`) and derives
`workTypeName` itself before writing the `ReportRow`. An unknown/inactive
code returns a new outcome/error, mirroring the site pattern exactly:

- `SubmitReportOutcome` gains `"work_type_not_found"` and
  `"work_types_unavailable"` (parallel to `"site_not_found"` /
  `"sites_unavailable"`).
- `ERROR_CODES` gains `WORK_TYPE_NOT_FOUND` (parallel to `SITE_NOT_FOUND`);
  the `sites_unavailable`-style case reuses `DATA_INVALID` the same way the
  site path does.

### 4.5 Admin notification

`AdminNotification.buildAdminNotificationEmail` currently prints
`Work type: ${report.workType}`. Since `workType` becomes a code, this
would show `EXTERIOR_WALL` to a human admin — a real regression. Fix:
print `report.workTypeName ?? report.workType` (falls back to the raw code
only for the theoretical case of a row with no name, which never happens
for a new submission since Phase 1's SubmitReportService always resolves
one before writing).

### 4.6 Frontend

- `types/api.ts`: add `WorkType` (mirrors `Site`), `GetWorkTypesResponseData`,
  `SITE_REPORT_ACTIONS.GET_WORK_TYPES`.
- `lib/api/siteReportWorkflows.ts`: add `getWorkTypes()`, same shape as
  `getSites()`.
- `SiteReportScreen.tsx`: loads `getSites()` and `getWorkTypes()` in
  parallel (`Promise.all`) during the existing loading step. Either
  failing surfaces the existing error/retry UI (copy distinguishes which
  failed only if both can independently fail — see open decision in the
  plan). Screen state carries `workTypes` alongside `sites`.
- `SitePicker.tsx`: internals become a real `<select>` (a leading disabled
  placeholder option, "現場を選択してください", then one `<option>` per
  ACTIVE site). Its external contract (`{ sites, onSelect }` props,
  `onSelect(site)` fires once) is unchanged — only the rendered control
  changes from a button list to a dropdown. Exactly one ACTIVE site still
  auto-advances straight to `report-entry` (no dropdown tap needed) — the
  brief explicitly allows this as long as the user can still change it
  afterward, which the next point provides.
- `ReportEntryShell.tsx`: the `現場` section gains a "現場を変更" button
  that returns to the site-selection screen (reusing the already-loaded
  `sites` list, no refetch). If any draft field differs from a fresh draft,
  show a concrete-consequence confirmation ("現在入力中の内容は失われます。
  現場を変更しますか？") before navigating away, per the project's UI/UX
  rule on destructive actions.
- `ReportForm.tsx`: `作業種別` becomes a `<select>` populated from the
  fetched `WorkType[]` (Japanese `name` shown, `code` is the value),
  required. New prop: `workTypes: WorkType[]`.
- `reportValidation.ts`: unchanged rule shape — `workType` still just
  checked for non-empty. Membership is enforced by the `<select>` itself
  client-side and authoritatively by GAS server-side, matching how `siteId`
  is already handled (no client-side membership re-check there either).

## 5. Backward compatibility

- No existing SITES/REPORTS/REPORT_PHOTOS row is altered, reordered, or
  deleted by `setupSiteReport()` or by any runtime code path.
- Existing REPORTS rows remain fully readable: `workTypeName` is a new
  optional column, and `RowMapper.rowsToObjects`'s `optionalColumns`
  mechanism (already used for exactly this kind of backward-compatible
  addition — see its own doc comment) is the intended mechanism, not the
  required-columns path, so a sheet that predates this column never throws
  `MissingHeadersError`.
- `GET_SITES`'s response shape (`{ sites: Site[] }`) is unchanged — only
  which rows appear changes (ACTIVE-only instead of all).
- `SUBMIT_REPORT`'s request shape is unchanged — only the accepted/expected
  *values* for `workType` change (a known code, not arbitrary text). A
  worker's LIFF app must be redeployed with the new dropdown before this
  matters in practice, but nothing about the wire contract itself breaks an
  old client that still sends free text — it would simply now receive
  `WORK_TYPE_NOT_FOUND` instead of succeeding, which is the intended
  tightening.

## 6. Hidden dependencies / assumptions found during re-check (step 2)

- **Critical:** `setupSiteReport()`'s generic per-sheet header loop treats
  any "required" column absent from an existing, non-empty header row as
  `SetupSchemaMismatchError` and throws immediately, aborting the whole
  function — including every sheet processed after REPORTS in
  `Object.values(SHEET_NAMES)` order. Naively appending `workTypeName` to
  `REPORTS_HEADERS` *and* reusing that same constant for
  `REQUIRED_HEADERS[REPORTS]` would mean re-running `setupSiteReport()`
  against any existing production spreadsheet throws before WORK_TYPES is
  ever created or seeded — a hard operational blocker discovered only by
  tracing `describeSheetHeaderState`/`REQUIRED_HEADERS`'s actual runtime
  behavior, not obvious from the schema table alone. Resolved in §4.4 by
  keeping `REQUIRED_HEADERS[REPORTS]` on the original 12 columns and adding
  a dedicated, additive backfill step for the 13th.
- No existing GAS test fixture uses `status: "INACTIVE"` for a SITES row
  (only `"ACTIVE"` and the invalid `"PENDING"` are used today) — the new
  ACTIVE-filter is a genuine behavior change but does not break any
  existing assertion; it only needs new tests, not modified ones, on the
  GAS side.
- `apps/site-report/web/components/site-report/SiteReportScreen.test.tsx`
  has ~5 separate local `selectSiteAndReachReportEntry()` helper functions
  (one per `describe` block: site selection, report entry form, photo
  pipeline, submission) that all currently do
  `fireEvent.click(await screen.findByRole("button", { name: /Shibuya Tower/ }))`
  against a **single-site** fixture. Replacing the button list with a
  dropdown, combined with the auto-advance-on-one-site behavior, means
  every one of these helpers changes from "find and click a button" to
  "nothing — the screen is already report-entry". This is mechanical
  (each helper touched once, all its callers unaffected) but the diff
  touches noticeably more of this file than the feature itself would
  suggest — flagged here rather than discovered mid-implementation.
- `ReportForm.test.tsx`'s `VALID_DRAFT` fixture and every test in that file
  reference `作業種別` as a text `<input>` (`fireEvent.change(...)`,
  `.toHaveValue("Inspection")` with an arbitrary string). These all need
  rewriting against a `<select>` with a real `WorkType[]` fixture — the
  component's prop signature is gaining a required `workTypes` prop, which
  is a breaking change to every existing call site/test of `ReportForm`.
- `apps/site-report/gas/src/AdminNotification.ts` and its test are the one
  place outside the "site" parallel that needs a deliberate touch (§4.5) —
  easy to miss since it is not part of the GET_SITES/SUBMIT_REPORT/Setup
  trio the rest of this feature mirrors.
- A file referenced repeatedly in existing code comments,
  `docs/site-report-architecture-overview.md`, does not actually exist in
  the repository. Out of scope to fix in Phase 1 (not something this
  feature broke), but noted so nobody spends time searching for it.
- `apps/site-report/gas` currently has an uncommitted, unrelated
  in-progress change set (`START_HERE.md`, `esbuild.config.js`,
  `SheetStore.ts`, `index.ts` modified; `SETUP.md`, `Setup.ts`,
  `Setup.test.ts` untracked) predating this task. Phase 1's implementation
  must not be squashed into or lost inside that pre-existing diff — the
  plan calls this out explicitly as a git-hygiene risk.

## 7. Non-goals (explicitly deferred to Phase 2)

Weather, work hours, work location/quantity/unit, progress %, safety
section (安全確認/KY活動/事故・ヒヤリハット), 問題・課題, 明日の予定,
備考, photo categories, the confirmation-before-submit step, and any
restructuring of the screen into the full sectioned mobile form. None of
these are touched by Phase 1.
