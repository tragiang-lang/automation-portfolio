# Task 6: Public Configuration Projection — Report

## Summary

Successfully implemented `buildPublicConfig()` function that strips sensitive fields (`calendarId`, `emailOwnerNotifyAddress`, `emailFromName`) from `AppConfig` before exposing it as `PublicConfig` to the frontend.

## Implementation Details

### Files Created

1. **`apps/salon-portfolio/gas/tests/PublicConfig.test.ts`**
   - Two test cases:
     - "keeps every public field": verifies all 6 public fields are present and correct
     - "never includes calendarId or the owner-facing email settings": verifies private fields are absent via `not.toHaveProperty()` and serialized-string checks

2. **`apps/salon-portfolio/gas/src/PublicConfig.ts`**
   - Exported function: `buildPublicConfig(config: AppConfig): PublicConfig`
   - Returns object containing only: business, hours, holidays, features, staffAnyAvailableOption, reservation
   - All private fields are excluded by projection, never copied

## TDD Evidence

### RED: Test Fails (Step 2)
```
Exit code 1
[96mtests/PublicConfig.test.ts[0m:[93m2[0m:[93m35[0m - [91merror[0m[90m TS2307: [0mCannot find module '../src/PublicConfig' or its corresponding type declarations.
```
✓ Test fails as expected — module does not exist

### GREEN: Test Passes (Step 4)
```
PASS tests/PublicConfig.test.ts
  buildPublicConfig
    √ keeps every public field (3 ms)
    √ never includes calendarId or the owner-facing email settings (2 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```
✓ Both tests pass after implementation

## Self-Review Checklist

- ✓ `buildPublicConfig` returns exactly the 6 public fields (business, hours, holidays, features, staffAnyAvailableOption, reservation)
- ✓ Returns nothing else — private fields are strictly excluded via object projection
- ✓ Test verifies private fields are absent using:
  - `expect(result).not.toHaveProperty("calendarId")`
  - `expect(result).not.toHaveProperty("emailOwnerNotifyAddress")`
  - `expect(result).not.toHaveProperty("emailFromName")`
  - `expect(serialized).not.toContain("secret-calendar-id")` — string check proves even the value is absent
- ✓ Both tests pass

## Commit

```
[worktree-phase3a-gas-config-data-layer c4c4a95] feat(gas): add public/private CONFIG projection
 2 files changed, 76 insertions(+)
 create mode 100644 apps/salon-portfolio/gas/src/PublicConfig.ts
 create mode 100644 apps/salon-portfolio/gas/tests/PublicConfig.test.ts
```

Commit SHA: `c4c4a95`

## Concerns

None. Implementation follows the brief exactly, security requirements are met (private fields are genuinely absent, not just hidden), and all tests pass.
