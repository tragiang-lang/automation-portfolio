# Task 10: Demo Seed Data and Safe Setup Utility — Complete Report

## Summary

Implemented safe, non-production demo data (`DEMO_SHEETS` in `DemoSeed.ts`) and a manual GAS setup utility (`setupDemoSheets()` in `SetupDemoSheets.ts`) that creates demo sheets in the target spreadsheet without destructive operations. All 5 test suites for DEMO_SHEETS pass, verifying schema integrity and end-to-end config validation. Code.ts successfully wired with the new module. Full test suite passes with 74 tests, build succeeds with `setupDemoSheets` included in the bundle.

---

## Files Implemented

| File | Purpose | Status |
|------|---------|--------|
| `apps/salon-portfolio/gas/src/DemoSeed.ts` | Demo data: `DEMO_SHEETS` (9 sheet seeds, 4 seeded with demo rows, 5 transactional) | ✓ Created |
| `apps/salon-portfolio/gas/src/SetupDemoSheets.ts` | Manual-run GAS wrapper: `setupDemoSheets()` creates sheets, never overwrites | ✓ Created |
| `apps/salon-portfolio/gas/tests/DemoSeed.test.ts` | 5 test suites: coverage, headers, row length, transactional emptiness, config validation | ✓ Created |
| `apps/salon-portfolio/gas/src/Code.ts` | Added import + globalThis attachment for `setupDemoSheets` (delta applied) | ✓ Modified |

---

## TDD Evidence

### Step 1–2: Test Fails (RED)

**Command:**
```bash
cd apps/salon-portfolio/gas && npx jest tests/DemoSeed.test.ts
```

**Output (initial):**
```
FAIL tests/DemoSeed.test.ts
  ● Test suite failed to run

    [96mtests/DemoSeed.test.ts[0m:[93m3[0m:[93m29[0m - [91merror[0m[90m TS2307: [0mCannot find module '../src/DemoSeed' or its corresponding type declarations.
```

**Status:** RED — Module not found, as expected.

---

### Step 3–4: Test Passes (GREEN)

**Command:**
```bash
cd apps/salon-portfolio/gas && npx jest tests/DemoSeed.test.ts
```

**Output (after implementing DemoSeed.ts and fixing test TypeScript issues):**
```
PASS tests/DemoSeed.test.ts
  DEMO_SHEETS
    √ covers every canonical sheet name exactly once (3 ms)
    √ each seed's headers match that sheet's REQUIRED_HEADERS (1 ms)
    √ every demo row has exactly as many cells as there are headers (3 ms)
    √ transactional sheets (RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG, ERROR_LOG) get no fabricated rows (1 ms)
    √ the CONFIG demo rows produce a valid AppConfig end-to-end (2 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        1.392 s
```

**Status:** GREEN — All 5 test suites pass, including critical end-to-end config validation.

---

## Typecheck & Build Evidence

### Typecheck

**Command:**
```bash
cd apps/salon-portfolio/gas && npm run typecheck
```

**Output:**
```
> salon-portfolio-gas@0.1.0 typecheck
> tsc --noEmit
```

**Status:** PASS — No TypeScript errors.

### Build

**Command:**
```bash
cd apps/salon-portfolio/gas && npm run build
```

**Output:**
```
> salon-portfolio-gas@0.1.0 build
> node esbuild.config.js
```

**Status:** PASS — Build succeeded silently (no errors).

### Build Verification

**Command:**
```bash
grep -c setupDemoSheets build/Code.js
```

**Output:**
```
2
```

**Status:** PASS — `setupDemoSheets` present in bundle (2 occurrences: function definition + globalThis attachment).

---

## Full Test Suite Evidence

**Command:**
```bash
cd apps/salon-portfolio/gas && npm test
```

**Output Summary:**
```
PASS tests/Utils.test.ts
PASS tests/SheetSchemas.test.ts
PASS tests/ConfigParser.test.ts
PASS tests/ConfigValidator.test.ts
PASS tests/ReservationId.test.ts
PASS tests/PublicConfig.test.ts
PASS tests/RowMapper.test.ts
PASS tests/Api.test.ts
PASS tests/Health.test.ts
PASS tests/ConfigStore.test.ts
PASS tests/DemoSeed.test.ts

Test Suites: 11 passed, 11 total
Tests:       74 passed, 74 total
Snapshots:   0 total
Time:        3.998 s
```

**Status:** PASS — All 11 test suites pass, 74 tests total (including new DemoSeed tests). No regression.

---

## Git Commit Evidence

**Command:**
```bash
git add apps/salon-portfolio/gas/src/DemoSeed.ts apps/salon-portfolio/gas/src/SetupDemoSheets.ts apps/salon-portfolio/gas/src/Code.ts apps/salon-portfolio/gas/tests/DemoSeed.test.ts
git commit -m "feat(gas): add safe demo-data seed and setupDemoSheets utility"
```

**Output:**
```
[worktree-phase3a-gas-config-data-layer 1776078] feat(gas): add safe demo-data seed and setupDemoSheets utility
 4 files changed, 185 insertions(+)
 create mode 100644 apps/salon-portfolio/gas/src/DemoSeed.ts
 create mode 100644 apps/salon-portfolio/gas/src/SetupDemoSheets.ts
 create mode 100644 apps/salon-portfolio/gas/tests/DemoSeed.test.ts
```

**Commit SHA:** `1776078` (full: `1776078...`)  
**Status:** DONE — Committed to branch `worktree-phase3a-gas-config-data-layer`.

---

## Self-Review Checklist

✓ **DEMO_SHEETS covers all 9 canonical sheet names exactly once**
  - CONFIG, HOLIDAYS, SERVICES, STAFF, RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG, ERROR_LOG
  - Test: "covers every canonical sheet name exactly once" — PASS
  
✓ **Headers match REQUIRED_HEADERS per sheet**
  - Test: "each seed's headers match that sheet's REQUIRED_HEADERS" — PASS
  
✓ **All demo rows have correct cell count**
  - Test: "every demo row has exactly as many cells as there are headers" — PASS
  
✓ **Transactional sheets are empty**
  - RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG, ERROR_LOG all have `rows: []`
  - Test: "transactional sheets...get no fabricated rows" — PASS
  
✓ **CONFIG demo data produces valid AppConfig**
  - 24 CONFIG rows (business info, hours, reservation settings, features, calendar, email config)
  - 2 HOLIDAYS rows (date + label, no empty optional fields)
  - Test: "the CONFIG demo rows produce a valid AppConfig end-to-end" — PASS
  - No `buildAppConfigFromRawRows()` throws — config is valid
  
✓ **setupDemoSheets() is non-destructive**
  - Code path: checks `spreadsheet.getSheetByName(seed.name)` first
  - If exists: reports "skipped (already exists): {name}" and continues
  - If missing: inserts new sheet, sets headers, appends rows if any
  - Never overwrites or deletes
  
✓ **Code.ts unchanged except for new import + globalThis attachment**
  - `doGet` and `doPost` functions unchanged — byte-for-byte identical to Task 9 commit
  - Only additions: import line and final globalThis attachment
  - Verified: Code.ts still has correct structure and exports
  
✓ **Full test suite passes**
  - 74 tests, all pass
  - No regression (Health.test.ts still passes)
  - DemoSeed.test.ts: 5/5 pass
  
✓ **Build succeeds with setupDemoSheets in bundle**
  - `npm run build` — PASS
  - `grep setupDemoSheets build/Code.js` — 2 matches (function + globalThis)

---

## Demo Data Quality Notes

**CONFIG rows:** 24 keys covering all required categories:
- Business info: name, phone, email, address (4 rows)
- Hours: Mon–Sun (7 rows)
- Reservation settings: timezone, slot minutes, min lead, max booking days (4 rows)
- Features flags: contactForm, reservation, staffSelection, calendar, emailNotification (5 rows)
- Staff: anyAvailableOption (1 row)
- Calendar: id (1 row)
- Email: ownerNotifyAddress, fromName (2 rows)

**HOLIDAYS rows:** 2 rows with realistic Japanese dates:
- 2026-01-01 "元日" (New Year's Day)
- 2026-01-02 "年始休業" (New Year's closure)

**SERVICES rows:** 3 realistic nail salon services:
- SV001: Hand gel nails (60 min, ¥6,000, requires staff)
- SV002: Foot gel pedi (90 min, ¥8,000, requires staff)
- SV003: Paraffin pack (20 min, ¥1,500, no staff required)

**STAFF rows:** 3 staff members, all active:
- ST001–ST003, Japanese names, display orders 1–3

**Transactional sheets:** Headers only, no fake data (correct per Phase 3A §21/§22).

---

## Concerns

None identified. All requirements met, tests pass, build succeeds, commit clean.

---

## Evidence Files

Full raw output saved to:
- `.evidence/2026-0906-task10-demo-seed/test.log` — Full jest output
- `.evidence/2026-0906-task10-demo-seed/diff.patch` — Full git diff
- `.evidence/2026-0906-task10-demo-seed/status.txt` — git status -s + --stat

