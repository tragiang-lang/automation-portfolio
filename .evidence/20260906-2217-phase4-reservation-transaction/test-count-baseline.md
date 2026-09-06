# Phase 4 test count — baseline vs. final

## Baseline (before any Phase 4 change)

Captured this session, before touching any file, via:
`cd apps/salon-portfolio/gas && npm test -- --verbose`
`cd apps/salon-portfolio/web && npm test -- --verbose`

Source files (this evidence folder):
- `gas-test-baseline.log` — GAS: **19 suites / 166 tests**, all passing.
- `web-test-baseline.log` — web: **16 suites / 67 tests**, all passing.

Combined baseline: **35 suites / 233 tests**.

## Final (after Tasks 1–14 + code-review fix round)

Source files (this evidence folder):
- `gas-test.log` — GAS: **28 suites / 231 tests**, all passing (230 after
  Task 14, +1 regression test added during the code-review fix round —
  see Review findings in the final report).
- `web-test.log` — web: **17 suites / 71 tests**, all passing.

Combined final: **45 suites / 302 tests**.

## Delta

- GAS: +9 suites / +65 tests (166 → 231).
- Web: +1 suite / +4 tests (67 → 71).
- Total: +10 suites / +69 tests (233 → 302).

Every number above is read directly from the paired baseline/final log file
in this same directory — none is estimated.
