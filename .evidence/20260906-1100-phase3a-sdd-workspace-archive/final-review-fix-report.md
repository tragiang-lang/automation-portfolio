# Phase 3A Final Review — Fix Wave Report

Worktree: `D:\ClaudeCodeProjects\GAS-Project\Coconala-Web-Services\.claude\worktrees\phase3a-gas-config-data-layer`
Branch: `worktree-phase3a-gas-config-data-layer`
Base commit: `dfe6c5f`

Evidence folder: `.evidence/20260906-1200-phase3a-final-review-fixes/`
- `test.log` — full `npm test` output after all fixes (82/82 passing)
- `typecheck.log` — full `tsc --noEmit` output (empty = clean)
- `build.log` — full `npm run build` output (empty = clean)
- `status.txt` — full `git status`
- `diff.patch` — full `git diff` for every changed file

Baseline (before this fix wave): confirmed live by `git stash`-ing all
changes and running `npm test` at HEAD (`dfe6c5f`) in this same worktree:
**74/74 passing**. Restored via `git stash pop` immediately after.

## Finding 1 (Critical) — HOLIDAYS.Date stringify bug

**Changed:**
- `apps/salon-portfolio/gas/src/Utils.ts` — added a private helper
  `tokyoDateParts(date)` (shared Y/M/D breakdown, single UTC+9 offset
  computation) and a new exported `formatDateYYYYMMDDDashedInTokyo(date)`
  that formats a Date as `YYYY-MM-DD` in the Tokyo calendar day. The
  existing `formatDateYYYYMMDDInTokyo` was refactored to use the same
  private helper (output unchanged — its own 3 existing tests in
  `tests/Utils.test.ts` still pass unmodified) rather than duplicating the
  offset arithmetic.
- `apps/salon-portfolio/gas/src/ConfigStore.ts:53-69` — extracted a new
  exported, pure `normalizeHolidayDates(rows: HolidayRow[]): string[]`
  that formats a `Date`-instance cell via the new Tokyo dashed formatter,
  falls back to the previous `String(...).trim()` behavior for
  already-string cells, and filters empty results. `getConfig()` (line
  ~92) now calls this instead of the old inline `.map/.filter`.
- `apps/salon-portfolio/gas/src/ConfigStore.ts:80-83` and `:92-95` — added
  a 2-3 line comment at each `as unknown as ConfigRow[]` /
  `as unknown as HolidayRow[]` cast site explaining the cast is needed
  because these row interfaces have concrete field types, not an index
  signature, so they aren't directly assignable from
  `rowsToObjects<T extends Record<string, unknown>>`'s generic result.

**Tests added:**
- `apps/salon-portfolio/gas/tests/Utils.test.ts` —
  `formatDateYYYYMMDDDashedInTokyo`: rollover case
  `new Date("2025-12-31T15:00:00.000Z")` → `"2026-01-01"` (Tokyo is UTC+9,
  so 15:00 UTC on Dec 31 is 00:00 JST on Jan 1); zero-padding case.
- `apps/salon-portfolio/gas/tests/ConfigStore.test.ts` —
  `normalizeHolidayDates`: (1) native `Date` cell formats correctly
  including the same Tokyo rollover case, (2) a plain string cell
  `" 2026-01-01 "` passes through trimmed, (3) empty/undefined cells are
  filtered out.
- Result: all pass (see `test.log`).

**Confirms the fix:** the rollover-case test is the exact scenario the
finding describes — a `Date` object from `Range.getValues()` that
`String()` would previously mangle into a non-`YYYY-MM-DD` string (e.g.
`"Thu Jan 01 2026 00:00:00 GMT+0900 ..."`), failing
`ConfigValidator.ts`'s date-pattern check. `normalizeHolidayDates` now
detects `instanceof Date` and formats it correctly before it ever reaches
the validator, so `getConfig` no longer fails with `CONFIG_INVALID` for
correctly-entered sheet dates.

## Finding 2 (Important) — reservation.timezone discarded

**Changed:** `apps/salon-portfolio/gas/src/ConfigParser.ts:153-163`.
`requireString("reservation.timezone")`'s return value is now captured
into `const timezone` and used (cast to the literal type) as
`reservation.timezone`, instead of being thrown away in favor of a
hard-coded `"Asia/Tokyo"` literal. The "missing" issue-collection side
effect of `requireString` is preserved (still called, just once now,
with its value used).

**Test added:** `apps/salon-portfolio/gas/tests/ConfigParser.test.ts` —
new case in the `parseAppConfig` describe block: raw config with
`"reservation.timezone": "America/New_York"` now produces
`result.ok === true` with `result.config.reservation.timezone ===
"America/New_York"` (parser doesn't reject it — matches the finding's
explicit expectation that ConfigValidator, not the parser, enforces the
value). Passes (see `test.log`).

Checked `apps/salon-portfolio/gas/tests/ConfigValidator.test.ts`'s
existing `"rejects a timezone other than Asia/Tokyo"` test (uses
`@ts-expect-error` to force `config.reservation.timezone = "UTC"` on an
already-built `AppConfig` object) — this test operates entirely at the
`ConfigValidator.validateAppConfig` level, independent of
`ConfigParser.ts`, so it is unaffected by this change and still passes
unmodified (confirmed in the same full test run).

**Confirms the fix:** the new parser-level test proves the value now
actually flows from the raw sheet cell through to `AppConfig`, making
`ConfigValidator`'s `timezone !== "Asia/Tokyo"` branch reachable through
the real `getConfig` pipeline (previously unreachable except by directly
mutating an already-built config object, as the `@ts-expect-error` test
did).

## Finding 3 (Important) — stale README.md

**Changed:** `README.md`
- Lines 7-10: removed the "Phase 1 only ... CONFIG system ... exists yet"
  framing; now states the README covers Phase 1 and Phase 3A, and that
  reservation/contact business logic + Calendar/Gmail integration remain
  unimplemented.
- Lines 53-55 (new, in the GAS backend section): added a pointer —
  "See `docs/config-and-sheets-guide.md` for the required `SPREADSHEET_ID`
  Script Property and demo-data setup — every call fails without it."
- Lines 75-82 ("What this codebase deliberately does NOT include yet",
  renamed from "What Phase 1 deliberately does NOT include"): removed
  "Sheets" and "the CONFIG system (`getConfig`)" from the exclusion list
  (both now implemented); kept Calendar/Gmail integration, authentication,
  real LP UI, and Supabase as still-accurate exclusions (per the finding's
  instruction not to touch those); added a closing parenthetical noting
  `getConfig`, backed by Sheets, is implemented as of Phase 3A.

**Confirms the fix:** `git diff -- README.md` (in `diff.patch`) shows only
these targeted line changes — no rewrite, no unrelated exclusions touched
(Calendar/Gmail/reservations text is untouched aside from being kept in
place). README no longer contradicts the shipped `getConfig` action, and
now documents the required Script Property.

## Finding 4 (Important) — Sheet-layer failures collapse to INTERNAL_ERROR

**Changed:** `apps/salon-portfolio/gas/src/Api.ts`
- Line 6: `import { MissingHeadersError } from "./RowMapper";`
- Lines 66-80 (new): `mapMissingHeadersErrorToResponse(error)` — mirrors
  `mapConfigErrorToResponse`'s structure: `console.error`s
  `"[getConfig] SHEET_ERROR: missing headers: <names>"` server-side only,
  returns `buildErrorResponse(ERROR_CODES.SHEET_ERROR, "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。")`
  — the missing header names never appear in the returned message.
- Lines 97-99 (in `getConfigAction`'s catch block): added
  `if (error instanceof MissingHeadersError) { return
  mapMissingHeadersErrorToResponse(error); }` before the generic
  `INTERNAL_ERROR` fallback.

**Test added:** `apps/salon-portfolio/gas/tests/Api.test.ts`
- Added `jest.mock("../src/ConfigStore", ...)` (keeps all real exports via
  `jest.requireActual`, replaces only `getConfig` with a `jest.fn()`) so
  `getConfigAction` can be exercised without touching `SpreadsheetApp`.
- `describe("mapMissingHeadersErrorToResponse", ...)`: unit-level test
  mirroring the existing `mapConfigErrorToResponse` test — asserts
  `{ ok: false, error: { code: "SHEET_ERROR", message: "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。" } }`
  and that the serialized response does not contain the missing header
  names `"Key"`/`"Value"`.
- `describe("getConfigAction", ...)`: mocks `getConfig` to throw
  `new MissingHeadersError(["Key", "Value"])` and asserts
  `getConfigAction()` returns the same `SHEET_ERROR` envelope with no
  leaked header names.
- Both pass (see `test.log`).

**Doc updated:** `docs/api-documentation.md` line 75 — `SHEET_ERROR`'s
annotation changed from `"(Layer C — not yet triggered)"` to
`"(Layer C — triggered by a missing/renamed required sheet column)"`,
matching the format of the other rows in that table.

**Confirms the fix:** `SHEET_ERROR` (previously unused anywhere per the
finding) is now reachable via the real `getConfigAction` catch chain when
`RowMapper.rowsToObjects`/`assertRequiredHeaders` throws
`MissingHeadersError` (e.g. an operator renames a CONFIG/HOLIDAYS header
column) — distinct from both `CONFIG_INVALID` (well-formed sheet, bad
data) and the generic `INTERNAL_ERROR` fallback, and the client-facing
message carries no header names.

## Verification summary

- `npm test` (from `apps/salon-portfolio/gas`): **82/82 passing**
  (74 baseline + 8 new: 3 `normalizeHolidayDates` + 2
  `formatDateYYYYMMDDDashedInTokyo` + 1 `ConfigParser` timezone
  passthrough + 2 `Api.ts` SHEET_ERROR tests).
- `npm run typecheck`: clean, zero errors.
- `npm run build`: clean, zero errors.
- No files under `apps/salon-portfolio/web/**` touched.
- No files/logic outside the four findings touched (`Calendar.ts`,
  `Mail.ts`, `SlotEngine.ts`, `Validation.ts`, `availability/*` all
  untouched — confirmed via `git status -s` / `diff.patch`).

## Shortfalls

None. All four findings fixed as specified; nothing skipped or partially
done.
