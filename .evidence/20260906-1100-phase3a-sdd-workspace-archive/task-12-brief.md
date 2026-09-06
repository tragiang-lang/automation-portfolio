## Task 12: Final verification and evidence capture

**Files:**
- Create: `.evidence/<yyyyMMdd-HHmm>-phase3a-gas-config-data-layer/{test.log,typecheck.log,gas-build.log,web-build.log,web-typecheck-lint.log,secret-scan.log,diff.patch,status.txt}`

No code changes in this task — verification only, per the evidence-reporting protocol and the Phase 3A prompt's §39/§40.

- [ ] **Step 1: Record the GAS test baseline delta**

Run: `cd apps/salon-portfolio/gas && npm test 2>&1 | tee ../../../.evidence/<dir>/test.log`
Expected: PASS. Baseline before this plan was 2 tests (`Health.test.ts` — confirmed via `.evidence/20260905-1620-phase1-foundation-scaffold/test.log`, still the last recorded GAS baseline since no GAS work happened between Phase 1 and Phase 3A). Confirm the new total equals 2 + every new `it(...)` added across Tasks 1–10.

- [ ] **Step 2: Typecheck the GAS package**

Run: `cd apps/salon-portfolio/gas && npm run typecheck 2>&1 | tee ../../../.evidence/<dir>/typecheck.log`
Expected: PASS, zero errors.

- [ ] **Step 3: Build the GAS bundle**

Run: `cd apps/salon-portfolio/gas && npm run build 2>&1 | tee ../../../.evidence/<dir>/gas-build.log`
Expected: PASS. Then confirm the bundle actually contains the new entrypoints:
`grep -c "doGet\|doPost\|setupDemoSheets\|handleApiRequest" build/Code.js` → expect each name to appear at least once.

- [ ] **Step 4: Confirm the untouched frontend still builds/typechecks/lints (no regression from this task)**

Run: `cd apps/salon-portfolio/web && npm run build 2>&1 | tee ../../../.evidence/<dir>/web-build.log`
Run: `cd apps/salon-portfolio/web && npm run lint 2>&1 | tee ../../../.evidence/<dir>/web-typecheck-lint.log`
Expected: both PASS, unchanged from before this task (no file under `apps/salon-portfolio/web` was modified in Tasks 1–11 — confirm with `git status -s apps/salon-portfolio/web` showing no output).

- [ ] **Step 5: Secret scan**

Run (from repo root):
```bash
git diff --name-only main -- apps/salon-portfolio/gas docs | xargs grep -InE "AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA )?PRIVATE KEY-----|[0-9]{20,}-[0-9a-z]{32}\.apps\.googleusercontent\.com" 2>&1 | tee .evidence/<dir>/secret-scan.log
```
Expected: no matches (empty file). Also manually confirm `SPREADSHEET_ID` never appears with a real value anywhere in `src/`, `tests/`, or `docs/` — only as the Script Property *name*, and that `docs/config-and-sheets-guide.md`'s calendar/email examples are the placeholder values from `DemoSeed.ts` (`primary`, `owner@example.com`), never a real production identifier.

- [ ] **Step 6: Capture diff and status**

Run:
```bash
git diff --stat > .evidence/<dir>/diffstat.txt
git diff > .evidence/<dir>/diff.patch
git status -s > .evidence/<dir>/status.txt
```

- [ ] **Step 7: Self-review against the Phase 3A scope rule (§2)**

Confirm, by reading the diff, that none of the following were touched:
`apps/salon-portfolio/web/**`, any `Calendar.ts`/`Mail.ts`/`SlotEngine.ts`/`Validation.ts`, any `availability/*`, any `ReservationRequest.ts`/`ContactRequest.ts`/`CancellationRequest.ts`, any `getServices`/`getStaff`/`healthCheck`-as-action/`createReservation`/`createInquiry`/`requestCancellation` handler, `.clasp.json`, or any `clasp push`/`clasp deploy` invocation.

- [ ] **Step 8: Report results to the user in the format the Phase 3A prompt's §41 specifies (sections A–Q)** and **stop** — do not proceed to Phase 3B, frontend integration, or any other follow-on work without explicit user approval (Phase 3A prompt §42).

---

## Self-Review Notes (writing-plans skill)

- **Spec coverage:** every phase0-specification.md §C sheet has a schema
  (Task 1); §D's `AppConfig` shape is implemented verbatim (Task 4); §G/§H's
  envelope and `getConfig` contract are implemented exactly, with the
  `calendarId`/email-settings exclusion from §H's example response
  enforced by `PublicConfig.ts` and tested (Task 6); §17's ID format and
  §18's timezone strategy are implemented and tested (Task 3); the Phase
  3A prompt's §25 testing checklist (parser, validator, schema, ID,
  public-config, serialization) is covered by Tasks 1, 3–8.
- **Placeholder scan:** no `TBD`/`implement later`/prose-only steps —
  every step above carries runnable code or an exact shell command.
- **Type consistency:** `ConfigRow`/`HolidayRow` (Task 1) are consumed
  identically in `ConfigStore.ts` (Task 7) and `DemoSeed.test.ts`
  (Task 10); `ConfigError` is defined once in `ConfigStore.ts` (Task 7)
  and imported by both `Api.ts` (Task 8) and its test; `AppConfig`/
  `PublicConfig` (Task 4) are the single types threaded through
  `ConfigParser`, `ConfigValidator`, `PublicConfig.ts`, `ConfigStore.ts`,
  and `Api.ts` without renaming.
