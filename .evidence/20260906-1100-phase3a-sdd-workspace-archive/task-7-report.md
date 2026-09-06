# Task 7 Report: ConfigStore Repository

## Summary

Successfully implemented ConfigStore repository (`apps/salon-portfolio/gas/src/ConfigStore.ts`) that ties together the entire configuration data layer pipeline built in previous tasks. All 4 unit tests pass, typecheck passes with zero errors.

## Files Created

1. **`apps/salon-portfolio/gas/tests/ConfigStore.test.ts`** (65 lines)
   - Contains 4 test cases covering all scenarios:
     - Valid config parsing from raw rows
     - Parse-level error handling (missing required key)
     - Error carrying field issues for diagnostics
     - Validation-level error handling (semantic validation)

2. **`apps/salon-portfolio/gas/src/ConfigStore.ts`** (75 lines)
   - Exports `ConfigError` class extending Error with issues field
   - Exports `buildAppConfigFromRawRows()` - pure function for testing
   - Exports `getConfig()` - thin orchestration layer reading from SpreadsheetApp
   - Proper error propagation at both parse and validation layers

## Implementation Details

### ConfigError Class
- Custom Error subclass with `issues` property holding ConfigFieldIssue[] | ConfigValidationIssue[]
- Used for server-side diagnostics only (never sent to client per Phase 3A §9)

### buildAppConfigFromRawRows()
- Pure function, fully unit-testable, no SpreadsheetApp dependency
- Pipeline: raw rows → buildRawConfigMap → parseAppConfig → validateAppConfig
- Throws ConfigError at first failure (parse or validation layer)
- All 4 test cases verify this behavior correctly

### getConfig()
- Thin orchestration only - not unit tested (no Jest tests)
- Reads CONFIG and HOLIDAYS sheets via Sheets.ts adapter
- Extracts holiday dates and delegates to buildAppConfigFromRawRows()
- All SpreadsheetApp touches confined here (Phase 0 §Q compliance)

## TDD Evidence

### Step 1: Failing Test Run (RED)
```
Command: cd apps/salon-portfolio/gas && npx jest tests/ConfigStore.test.ts
Result: FAIL - "Cannot find module '../src/ConfigStore'"
```

### Step 2: Implementation Complete
Implemented both ConfigStore.ts following the brief exactly (with type assertion fix for rowsToObjects generic constraint).

### Step 3: Passing Test Run (GREEN)
```
Command: cd apps/salon-portfolio/gas && npx jest tests/ConfigStore.test.ts
Result: PASS - 4 passed, 4 total
  √ builds a valid AppConfig from valid rows (6 ms)
  √ throws ConfigError when a required key is missing (parse-level) (9 ms)
  √ throws ConfigError carrying the field issues, for server-side logging only (1 ms)
  √ throws ConfigError when a value is well-typed but semantically invalid (validation-level) (1 ms)
```

## Typecheck Results

```
Command: cd apps/salon-portfolio/gas && npm run typecheck
Result: PASS - No output, zero errors
```

## Git Commit

```
Commit: 0fda947
Message: feat(gas): add ConfigStore repository tying Sheets + parser + validator together
Files: 2 changed, 142 insertions(+)
  - apps/salon-portfolio/gas/src/ConfigStore.ts (created)
  - apps/salon-portfolio/gas/tests/ConfigStore.test.ts (created)
```

## Self-Review Findings

### buildAppConfigFromRawRows Correctness
✓ Correctly calls buildRawConfigMap → parseAppConfig → validateAppConfig in order
✓ Throws ConfigError with issues at parse-level failure (missing required key)
✓ Throws ConfigError with issues at validation-level failure (semantic constraint)
✓ Returns parsed and validated AppConfig on success

### getConfig Correctness
✓ Reads CONFIG sheet via getSheet → getHeaderMap → readRawRows → rowsToObjects
✓ Reads HOLIDAYS sheet the same way
✓ Extracts holiday dates with proper filtering (trim, non-empty)
✓ Delegates to buildAppConfigFromRawRows with both inputs
✓ Properly configured to never touch SpreadsheetApp except in this function

### Test Coverage
✓ All 4 test cases pass
✓ Tests verify parse-level error handling and field issue propagation
✓ Tests verify validation-level error handling
✓ Tests verify successful parsing of valid configuration

### TypeScript Compliance
✓ All imports resolve correctly
✓ Type assertions used for rowsToObjects generic constraint (Record<string, unknown> requirement)
✓ Double cast (as unknown as ConfigRow[]) required due to interface property typing in SheetSchemas
✓ No compilation errors or warnings from tsc

## Known Issue & Resolution

### TypeScript Generic Constraint Issue
The `rowsToObjects<T>` function requires `T extends Record<string, unknown>`, but `ConfigRow` and `HolidayRow` interfaces from SheetSchemas.ts don't have index signatures, so TypeScript doesn't consider them as extending the Record type.

**Solution Applied:** Used double type assertions `as unknown as ConfigRow[]` to bypass the constraint checker. This is safe because:
- `rowsToObjects` at runtime constructs Record<string, unknown> objects
- The assertions correctly inform TypeScript of the intended types
- No runtime behavior change

This is an existing constraint in the SheetSchemas interface definitions (which cannot be modified per task constraints), and the brief's code pattern matches this reality.

## Concerns

None. All requirements met:
- Tests written first (TDD)
- All 4 tests pass
- Typecheck passes
- Commit created
- No external files modified
- Code follows brief exactly (with necessary type assertion fix)
