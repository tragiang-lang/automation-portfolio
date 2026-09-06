# Task 4 Report: Config domain types and pure parser

## Summary

Successfully implemented Task 4 of Phase 3A following TDD discipline. Created domain types for runtime configuration and a pure parser with strict field validation, plus 18 passing tests covering all parser functions and error cases.

## Files Created

1. **`apps/salon-portfolio/gas/src/models/Config.ts`** (89 lines)
   - TypeScript interfaces for runtime configuration shape
   - Exports: `BusinessHours`, `BUSINESS_HOURS_DAYS` (readonly tuple), `FeatureFlags`, `ReservationSettings`, `AppConfig`, `PublicConfig`, `RawConfigMap`
   - `PublicConfig` is an `Omit<AppConfig>` type that excludes internal fields (`calendarId`, `emailOwnerNotifyAddress`, `emailFromName`)

2. **`apps/salon-portfolio/gas/src/ConfigParser.ts`** (192 lines)
   - Pure parser functions: `buildRawConfigMap()`, `parseStrictBoolean()`, `parseStrictNumber()`, `parseNonEmptyString()`, `parseJsonSafely()`, `parseAppConfig()`
   - Types: `ConfigFieldIssue { field: string; reason: string }`, `ConfigParseResult` (discriminated union)
   - No side effects, no I/O, pure functions throughout
   - Strict validation: rejects "yes"/"no"/"1"/"0" for booleans, rejects "Infinity" and thousands separators for numbers
   - All 24 config fields validated in `parseAppConfig()`: business (name/phone/email/address), hours (7 days), reservation (timezone/slotMinutes/minLeadHours/maxBookingDays), features (5 flags), staff.anyAvailableOption, calendar.id, email fields

3. **`apps/salon-portfolio/gas/tests/ConfigParser.test.ts`** (162 lines)
   - 18 passing tests organized into 6 test suites
   - Tests all parser primitives (buildRawConfigMap, parseStrictBoolean, parseStrictNumber, parseNonEmptyString, parseJsonSafely)
   - Tests `parseAppConfig()` with valid config, missing keys, malformed booleans, malformed numbers
   - Helper function `validRawConfig()` provides a complete, well-typed baseline

4. **Deleted:** `apps/salon-portfolio/gas/src/models/.gitkeep` (removed as per Step 7)

## TDD Flow Evidence

### Step 3: RED — Test fails before implementation
```
$ cd apps/salon-portfolio/gas && npx jest tests/ConfigParser.test.ts
  ✗ FAIL tests/ConfigParser.test.ts
    Cannot find module '../src/ConfigParser' or its corresponding type declarations.
```

### Step 5: GREEN — All tests pass after implementation
```
$ cd apps/salon-portfolio/gas && npx jest tests/ConfigParser.test.ts
  ✓ PASS tests/ConfigParser.test.ts
  
Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Snapshots:   0 total
```

### Step 6: Typecheck passes
```
$ cd apps/salon-portfolio/gas && npm run typecheck
  > tsc --noEmit
  (no output — no errors)
```

## Test Summary

All 18 tests PASS:

**buildRawConfigMap (3 tests)**
- trims keys and keeps values as-is
- first occurrence of a duplicate key wins
- ignores rows with an empty key

**parseStrictBoolean (3 tests)**
- accepts a native boolean
- accepts the exact strings true/false, any case, trimmed
- rejects ambiguous values (yes/no/1/0/empty string)

**parseStrictNumber (3 tests)**
- accepts a native finite number
- accepts a strict numeric string (with decimals)
- rejects non-numeric or malformed strings (Infinity, comma separators, empty)

**parseNonEmptyString (2 tests)**
- trims and accepts a non-empty string
- treats whitespace-only and non-string values as missing

**parseJsonSafely (3 tests)**
- parses valid JSON
- returns undefined for malformed JSON (no throw)
- returns undefined for empty or non-string input

**parseAppConfig (4 tests)**
- parses a complete, well-typed raw config
- reports every missing required key as an issue (tested with 2 missing keys)
- reports a malformed boolean as an issue instead of coercing it
- reports a malformed number as an issue instead of coercing it

## Code Transcription Verification

All field names and validation logic transcribed exactly as specified in the brief:

✓ All 7 business hours fields (monday–sunday)
✓ All 4 business info fields (name, phone, email, address)
✓ All 5 feature flags (contactForm, reservation, staffSelection, calendar, emailNotification)
✓ All 4 reservation settings (timezone fixed as "Asia/Tokyo", slotMinutes, minLeadHours, maxBookingDays)
✓ Strict boolean pattern: `/^(true|false)$/i` — rejects yes/no/1/0
✓ Strict number pattern: `/^-?\d+(\.\d+)?$/` — accepts integers and decimals, rejects Infinity/hex/separators
✓ Non-empty string validation: trims, rejects whitespace-only
✓ JSON safe parser: never throws, returns undefined on error
✓ ConfigParseResult discriminated union: `{ ok: true; config: AppConfig } | { ok: false; issues: ConfigFieldIssue[] }`

## Git Commit

```
[worktree-phase3a-gas-config-data-layer aeb95cb] feat(gas): add AppConfig types and pure CONFIG parser
 4 files changed, 444 insertions(+)
 create mode 100644 apps/salon-portfolio/gas/src/ConfigParser.ts
 delete mode 100644 apps/salon-portfolio/gas/src/models/.gitkeep
 create mode 100644 apps/salon-portfolio/gas/src/models/Config.ts
 create mode 100644 apps/salon-portfolio/gas/tests/ConfigParser.test.ts
```

Commit follows the exact syntax from brief Step 7, with proper git add, git rm, and commit message.

## Self-Review Findings

No issues found:

✓ All 24 configuration keys present and correctly named (dotted notation)
✓ All 18 tests in brief pass (verified twice)
✓ TDD red→green sequence followed exactly
✓ Test output is clean (no warnings, no flakes)
✓ Typecheck passes with no errors
✓ All error messages match brief specifications
✓ No mutations or deviations from brief code
✓ Config types align with phase0-specification.md §D requirements
✓ PublicConfig correctly omits internal fields (calendarId, emailOwnerNotifyAddress, emailFromName)
✓ Parser never throws; always returns discriminated union result

## Notes

- CRLF warnings from git are expected on Windows; do not affect functionality
- The parser is intentionally strict (no coercion of ambiguous values like "yes"/"1") to fail fast on misconfigured sheets
- `ConfigValidator.ts` (future task) will handle semantic/range/logical-combination checks; this task is type/presence only
- `parseJsonSafely<T>` is a generic reusable primitive for future CONFIG keys that may need JSON values (Phase 3A §33 reusability)
