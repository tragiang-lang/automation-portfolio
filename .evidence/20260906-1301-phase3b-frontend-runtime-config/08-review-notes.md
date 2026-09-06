# Phase 3B — Task 11: Final QA Evidence (Tier 1 Summary)

Evidence dir: `.evidence/20260906-1301-phase3b-frontend-runtime-config/`

## Build / Test / Lint / Typecheck

| Check | Result | Log |
|---|---|---|
| Typecheck (`npx tsc --noEmit`) | PASS (empty output, exit 0) | `typecheck.log` |
| Lint (`npx eslint .`) | PASS (empty output, exit 0, 0 warnings) | `lint.log` |
| Test (`npx jest`) | PASS — 16 suites / 67 tests, 0 failures | `test.log` |
| Build (`npx next build`) | PASS — `/` prerendered as static (○) via demo-fallback path (`GAS_WEBAPP_URL` unset), no thrown error during static generation | `build.log` |

## Test count: before → after

- **Before** (cited baseline, per task instructions — controller ran `npx jest` in this worktree before Task 1 was dispatched): **9 test suites / 26 tests, all passing.**
- Corroborating trace: `.evidence/20260906-1200-task1-runtime-config/full-test.log` records **10 suites / 33 tests** immediately after Task 1 added exactly 1 new suite (`lib/config/runtimeConfig` did not exist yet at that point — the +1 suite/+7 tests there is `types`/first client test), consistent with a 9/26 starting point.
- **After** (this task, `test.log`): **16 test suites / 67 tests, all passing.**
- Delta: **+7 suites, +41 tests**, 0 regressions, 0 failures.

### New test files added across Tasks 1-7 (confirmed via `git show c15a02f:<path>` returning "not found", i.e. genuinely new files, not modified)

- `apps/salon-portfolio/web/app/api/gas/route.test.ts` — 9 tests
- `apps/salon-portfolio/web/components/layout/RuntimeConfigNotice.test.tsx` — 2 tests
- `apps/salon-portfolio/web/components/layout/SiteFooter.test.tsx` — 2 tests
- `apps/salon-portfolio/web/lib/api/gasClient.test.ts` — 7 tests
- `apps/salon-portfolio/web/lib/config/resolveSiteConfig.test.ts` — 4 tests
- `apps/salon-portfolio/web/lib/config/runtimeConfig.test.ts` — 5 tests
- `apps/salon-portfolio/web/lib/validation/runtimeConfigValidator.test.ts` — 10 tests
- `apps/salon-portfolio/web/components/layout/SiteHeader.test.tsx` (pre-existing file, 2 new tests added; 3 tests pre-existed and are unchanged)

Total new: 9+2+2+7+4+5+10+2 = **41**, matching 26 → 67 exactly.

### New test method names (full list, verbatim `it(...)` titles)

`app/api/gas/route.test.ts`:
- forwards a well-formed request to callGasAction and returns its result
- defaults payload to {} when omitted
- returns a VALIDATION_ERROR envelope for malformed JSON
- returns a VALIDATION_ERROR envelope when action is missing or empty
- returns an INTERNAL_ERROR envelope, never a raw error, when callGasAction throws
- sanitizes NETWORK_ERROR message and does not leak secrets/URLs to client
- sanitizes HTTP_ERROR message
- sanitizes INVALID_RESPONSE message
- forwards GAS-originated failure responses unchanged (e.g., CONFIG_INVALID)

`components/layout/RuntimeConfigNotice.test.tsx`:
- renders nothing when show is false
- renders a calm Japanese notice when show is true

`components/layout/SiteFooter.test.tsx`:
- shows the reservation button when features.reservation is true
- hides the reservation button when features.reservation is false

`components/layout/SiteHeader.test.tsx` (new tests only):
- shows the reservation buttons by default
- hides the header and mobile-nav reservation buttons when reservationEnabled is false

`lib/api/gasClient.test.ts`:
- returns the parsed success envelope on a 200 ok response
- returns the parsed error envelope when GAS reports ok:false
- returns a NETWORK_ERROR result when fetch rejects
- returns an HTTP_ERROR result for a non-2xx response without parsing its body
- returns an INVALID_RESPONSE result when the response body is not valid JSON
- returns an INVALID_RESPONSE result when the body doesn't match the envelope shape
- throws when GAS_WEBAPP_URL is not configured

`lib/config/resolveSiteConfig.test.ts`:
- takes business name/phone/email/address/hours from the runtime config
- keeps nameLatin/tagline/postalCode/socialLinks from the frontend-owned demo config
- maps the three UI-relevant feature flags and drops the backend-only ones
- carries staffAnyAvailableOption through unchanged

`lib/config/runtimeConfig.test.ts`:
- returns demo-fallback when GAS_WEBAPP_URL is not set
- returns runtime with the parsed config on success
- returns runtime-error when GAS reports ok:false
- returns runtime-error when the response fails shape validation
- returns runtime-error when callGasAction throws

`lib/validation/runtimeConfigValidator.test.ts`:
- accepts a fully valid config
- rejects a non-object value
- rejects a missing business field
- rejects a business field with the wrong type
- rejects hours missing a day
- rejects holidays that aren't an array of strings
- accepts an empty holidays array
- rejects a feature flag with a non-boolean value
- rejects a reservation settings object with a non-Asia/Tokyo timezone
- rejects a reservation settings object with a non-numeric field

## Git status / diff stat

`git status -s` (see `status.txt`):
```
?? .evidence/20260906-1200-task1-runtime-config/
?? .evidence/20260906-1301-phase3b-frontend-runtime-config/
?? .evidence/20260906-task10-docs-typecheck-env/
?? .evidence/20260906-task4-resolve-site-config/
?? .evidence/20260906-task7-gate-reservation-cta/
?? .evidence/20260906-task9-page-runtime-config/
?? docs/superpowers/plans/2026-09-06-phase3b-frontend-runtime-config.md
```
No tracked application file is dirty — everything shown is untracked evidence/plan bookkeeping. See "Findings" below re: the per-task evidence folders.

`git diff --stat c15a02faaf6c2d3bbb50ef4eacd5a4e8e309850b..HEAD` (see `diff-stat.txt`): 27 files changed, 1310 insertions(+), 42 deletions(-). Full stat saved to `diff-stat.txt` (not reproduced here per this task's instruction to omit the full diff).

## Claim-to-evidence mapping

| Phase 3B requirement | Evidence |
|---|---|
| GAS API client (`callGasAction`) fetches `getConfig`, no-store, throws on missing `GAS_WEBAPP_URL` | `lib/api/gasClient.ts` + `lib/api/gasClient.test.ts` (7 tests, all passing in `test.log`) |
| Structural validation of `getConfig` response shape | `lib/validation/runtimeConfigValidator.ts` + `runtimeConfigValidator.test.ts` (10 tests) |
| Runtime/demo-fallback/runtime-error tri-state loader, deduped via `cache()` | `lib/config/runtimeConfig.ts` (`export const getRuntimeConfig = cache(loadRuntimeConfig)`, line 81) + `runtimeConfig.test.ts` (5 tests) |
| Mapping runtime config onto existing `SiteConfig` view-model without renaming fields | `lib/config/resolveSiteConfig.ts` + `resolveSiteConfig.test.ts` (4 tests) |
| `app/layout.tsx` / `app/page.tsx` call the cached `getRuntimeConfig`, never `loadRuntimeConfig` directly | Confirmed by grep: both files import and call only `getRuntimeConfig` (layout.tsx lines 55, 64; page.tsx line 36) |
| Reservation CTA gated on `features.reservation` | `components/layout/SiteHeader.tsx`/`SiteFooter.tsx`/`MobileNav.tsx` + `SiteHeader.test.tsx` (2 new tests) + `SiteFooter.test.tsx` (2 tests) |
| Runtime-error notice UI, distinct from demo-fallback (no banner in fallback) | `components/layout/RuntimeConfigNotice.tsx` + `.test.tsx` (2 tests); dev-server smoke check confirms banner text absent when status is demo-fallback (`dev-server-check.log`) |
| Generic `/api/gas` proxy route, secrets never leak to client on error | `app/api/gas/route.ts` + `route.test.ts` (9 tests, incl. explicit "does not leak secrets/URLs to client" assertions) |
| No `NEXT_PUBLIC_*` var introduced; `GAS_WEBAPP_URL` server-only | Self-review grep of full diff — only the env var *name* and fake test placeholder values (`https://example.com/exec`, `SECRET123`) appear, no real secret; `.env.example` comment explicitly warns against `NEXT_PUBLIC_` prefix |
| No new npm dependency | `git diff <base>..HEAD -- '**/package.json' '**/package-lock.json'` shows only one added line: `"typecheck": "tsc --noEmit"` in `web/package.json`; no `package-lock.json` change at all |
| Docs updated (`runtime-config-guide.md`, `roadmap.md`, `architecture-overview.md`, `changelog.md`) | Present in `diff-stat.txt`: `docs/runtime-config-guide.md` (+126), `docs/changelog.md` (+41), `docs/roadmap.md` (+19/-3ish), `docs/architecture-overview.md` (+5) |
| Production build succeeds, demo-fallback path exercised at static-generation time | `build.log` — `/` listed as `○ (Static)`, build exits 0, no thrown error |
| Manual smoke: demo business name renders, reservation buttons visible, no error banner | `dev-server-check.log` — HTTP 200, "凛" present, `/reservation` links present, 0 matches for the notice banner string |

## Self-review findings (Step 7/8)

- **Secrets:** No real `GAS_WEBAPP_URL` value or other secret appears anywhere in the diff. All occurrences are the env-var *name*, doc-comment prose, or fake test placeholders (`https://example.com/exec`, `https://script.google.com/macros/s/SECRET123/exec` — a synthetic value used only inside a unit test to prove the sanitizer strips it). PASS.
- **`NEXT_PUBLIC_*`:** none introduced. The only matches in the diff are a `.env.example` comment and two doc-comment/guide sentences stating that no such variable exists. PASS.
- **`getRuntimeConfig()` vs `loadRuntimeConfig`:** confirmed by direct grep — `app/layout.tsx` (lines 55, 64) and `app/page.tsx` (line 36) import and call only `getRuntimeConfig`; `loadRuntimeConfig` is never imported outside `lib/config/runtimeConfig.ts` itself and its test file. PASS.
- **New `"use client"` directives:** none added by this plan's work — the two diff matches on the string are doc-comment prose stating its absence, not new directives. PASS.
- **New npm dependencies:** none. Only the `typecheck` script line added to `web/package.json`; `package-lock.json` untouched. PASS.
- **`PublicRuntimeConfig` naming consistency:** the type is defined once in `types/runtime-config.ts` and reused unchanged (no re-declaration/renaming) across `runtimeConfigValidator.ts`, `runtimeConfig.ts`, and `resolveSiteConfig.ts`. PASS.
- **Observation (not a defect, not fixed — outside this task's scope):** the per-task evidence folders for Tasks 1, 4, 7, 9, and 10 (`.evidence/20260906-1200-task1-runtime-config/`, `20260906-task4-resolve-site-config/`, `20260906-task7-gate-reservation-cta/`, `20260906-task9-page-runtime-config/`, `20260906-task10-docs-typecheck-env/`) and `docs/superpowers/plans/2026-09-06-phase3b-frontend-runtime-config.md` are still untracked in git (shown in `status.txt`). This task commits only its own evidence directory per its explicit instructions; the other folders were left as found since committing them was not part of this task's scope and application code was not touched to accommodate it.

## What Phase 3B did **not** do (explicit scope boundary, mirrors `docs/runtime-config-guide.md`'s closing section)

- No reservation submission flow (booking creation/edit/cancel logic) was built or changed.
- No Google Calendar integration.
- No Gmail/email sending integration.
- No contact-form submission backend.
- No authentication/authorization system.
- No Supabase or any other database integration.
- No deployment/hosting changes (no Vercel config, no CI/CD changes).
- No visual redesign — layout, typography, and styling are unchanged from Phase 2.
- No changes to the GAS (Google Apps Script) backend — Phase 3B only *consumes* the existing `getConfig` action added in Phase 3A; no `.gs` file was touched.
- No `SERVICES`/`STAFF` sheet data or holiday-list *display* wiring (explicitly deferred; only `business`/`hours`/`holidays`/`features`/`staffAnyAvailableOption` are consumed, per Task 10's documented rationale).
