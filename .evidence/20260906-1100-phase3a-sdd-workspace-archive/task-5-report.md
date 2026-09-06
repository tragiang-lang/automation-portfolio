# Task 5 Report: Config Validator (Semantic/Business-Rule Checks)

## Summary

Successfully implemented `ConfigValidator.ts` with pure semantic validation for `AppConfig` objects. All 9 tests pass. No TypeScript errors. Commit created: `994d9b1`.

## Implementation Details

### Files Created

1. **`apps/salon-portfolio/gas/src/ConfigValidator.ts`** (104 lines)
   - Exports `ConfigValidationIssue` interface with `field` and `reason` properties
   - Exports `validateAppConfig(config: AppConfig): ConfigValidationIssue[]` function
   - Pure semantic validation (no side effects, never throws)
   - Returns empty array when config is valid

2. **`apps/salon-portfolio/gas/tests/ConfigValidator.test.ts`** (117 lines)
   - 9 test cases covering all validation rules
   - Uses `validConfig()` helper function for test data

### Validation Rules Implemented

| Rule | Code Location | Test Coverage |
|------|---------------|---|
| Timezone must be exactly "Asia/Tokyo" | Lines 32-37 | "rejects a timezone other than Asia/Tokyo" |
| slotMinutes must be positive (> 0) | Lines 38-43 | "rejects a non-positive slotMinutes or maxBookingDays" |
| minLeadHours must not be negative (>= 0) | Lines 44-49 | "rejects a negative minLeadHours" |
| maxBookingDays must be positive (> 0) | Lines 50-55 | "rejects a non-positive slotMinutes or maxBookingDays" |
| Business hours format (HH:MM-HH:MM or "closed") | Lines 57-66 | "rejects malformed business hours" |
| Holiday dates must be valid ISO-8601 and calendar-correct | Lines 68-72 | "rejects an invalid holiday date" |
| business.email must match email pattern | Lines 74-79 | "rejects a malformed business or owner-notification email" |
| emailOwnerNotifyAddress must match email pattern | Lines 80-85 | "rejects a malformed business or owner-notification email" |
| calendarId must not be empty string | Lines 87-89 | (implicit: included in valid config test) |
| staffAnyAvailableOption=true requires features.staffSelection=true | Lines 93-98 | "rejects staff.anyAvailableOption=true when features.staffSelection is false" + "allows staff.anyAvailableOption=false when features.staffSelection is false" |

### Helper Functions

1. **`isValidBusinessHoursValue(value: string): boolean`**
   - Validates individual day's hours format
   - Accepts "closed" or HH:MM-HH:MM pattern
   - Pattern: `/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/`

2. **`isValidCalendarDate(dateStr: string): boolean`**
   - Validates ISO-8601 date format (YYYY-MM-DD)
   - Checks calendar validity (e.g., rejects 2026-02-30)
   - Uses UTC-based date construction to avoid timezone issues

### Patterns Used

- `HOURS_PATTERN`: `/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/`
  - Validates HH:MM-HH:MM format (hours 00-23, minutes 00-59)
- `DATE_PATTERN`: `/^\d{4}-\d{2}-\d{2}$/`
  - Validates YYYY-MM-DD format
- `EMAIL_PATTERN`: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Simple email validation (required for Phase 3A §8)

## Test-Driven Development (TDD) Process

### RED Step
Ran test before implementation:
```
npx jest tests/ConfigValidator.test.ts
```
Output:
```
FAIL tests/ConfigValidator.test.ts
[96mtests/ConfigValidator.test.ts[0m:[93m2[0m:[93m35[0m - [91merror[0m[90m TS2307: Cannot find module '../src/ConfigValidator'
```
✓ Test failed as expected

### GREEN Step
Ran test after implementation:
```
npx jest tests/ConfigValidator.test.ts
```
Output:
```
PASS tests/ConfigValidator.test.ts
  validateAppConfig
    √ returns no issues for a fully valid config (3 ms)
    √ rejects a timezone other than Asia/Tokyo (1 ms)
    √ rejects a negative minLeadHours (1 ms)
    √ rejects a non-positive slotMinutes or maxBookingDays
    √ rejects malformed business hours (1 ms)
    √ rejects an invalid holiday date
    √ rejects a malformed business or owner-notification email (1 ms)
    √ rejects staff.anyAvailableOption=true when features.staffSelection is false (1 ms)
    √ allows staff.anyAvailableOption=false when features.staffSelection is false (1 ms)

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        1.609 s
```
✓ All 9 tests pass

### Typecheck
```
npm run typecheck
```
Output: (empty - no errors)
✓ No TypeScript errors

## Commit Details

**Commit SHA:** `994d9b1`
**Message:** `feat(gas): add pure CONFIG business-rule validator`
**Files Changed:** 2
- `apps/salon-portfolio/gas/src/ConfigValidator.ts` (+104 lines)
- `apps/salon-portfolio/gas/tests/ConfigValidator.test.ts` (+117 lines)

## Evidence Files

- `.evidence/test.log` - Full test run output with all 9 tests passing
- `.evidence/commit.txt` - Commit details and file stats
- `.evidence/diff.patch` - Full git diff showing all additions
- `.evidence/status.txt` - Working tree status (clean)

## Self-Review Checklist

- [x] Timezone literal check: "Asia/Tokyo" only (line 32-37)
- [x] slotMinutes range check: must be > 0 (line 38-43)
- [x] minLeadHours range check: must be >= 0 (line 44-49)
- [x] maxBookingDays range check: must be > 0 (line 50-55)
- [x] Business hours format per day: "closed" or "HH:MM-HH:MM" (line 57-66)
- [x] Holiday date format: YYYY-MM-DD + calendar validity (line 68-72)
- [x] business.email format: simple email pattern (line 74-79)
- [x] emailOwnerNotifyAddress format: simple email pattern (line 80-85)
- [x] calendarId non-empty: must not be empty string (line 87-89)
- [x] staffAnyAvailableOption/staffSelection combination: staffAnyAvailableOption=true requires staffSelection=true (line 93-98)
- [x] All 9 tests pass: ✓
- [x] TypeScript typecheck passes: ✓
- [x] No ESLint or formatting issues: ✓

## Concerns

None. Implementation follows the brief exactly, all validation rules are in place, and all tests pass.

## Configuration & Dependencies

- Uses `BUSINESS_HOURS_DAYS` constant from `./models/Config.ts` (already exported in Task 4)
- No additional dependencies added
- Pure TypeScript (no external libraries needed for validation)
- Follows Phase 3A §8 specification for semantic validation

## Notes

- The validator is pure (no side effects) and never throws, returning an enumerable failure list instead
- Designed to accept already-type-correct `AppConfig` objects (type validation is done elsewhere)
- Email pattern is simplified for Phase 3A §8 requirements; could be enhanced if needed later
- Date validation correctly handles leap years and month boundaries
- Business hours validation uses HOURS_PATTERN to enforce 24-hour format with valid ranges
