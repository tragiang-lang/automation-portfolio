# Task 8 Report: API Envelope, Error Codes, and getConfig Dispatcher

## Summary

Implemented complete API envelope infrastructure with error codes and the `getConfig` action dispatcher for the salon-portfolio Google Apps Script backend.

## Implementation Details

### Files Created

1. **`apps/salon-portfolio/gas/src/models/ErrorCodes.ts`** (22 lines)
   - Exported `ERROR_CODES` constant with 11 error codes:
     - 10 Phase 0 codes: VALIDATION_ERROR, DUPLICATE_SUBMISSION, SLOT_UNAVAILABLE, FEATURE_DISABLED, INVALID_CANCELLATION_TOKEN, SYSTEM_BUSY, CALENDAR_ERROR, SHEET_ERROR, MAIL_ERROR, INTERNAL_ERROR
     - 1 Phase 3A addition: CONFIG_INVALID
   - Exported `ErrorCode` type derived from the object keys

2. **`apps/salon-portfolio/gas/src/models/Api.ts`** (11 lines)
   - Exported `ApiRequest` interface with `action: string` (required) and `payload?: unknown` (optional)
   - Exported `ApiResponse<T>` discriminated union type:
     - Success: `{ ok: true; data: T }`
     - Error: `{ ok: false; error: { code: ErrorCode; message: string } }`

3. **`apps/salon-portfolio/gas/src/Api.ts`** (109 lines)
   - `parseApiRequest()`: Pure function that validates and parses raw POST body JSON
     - Rejects undefined, empty, or whitespace-only bodies
     - Rejects malformed JSON
     - Rejects non-object or array bodies
     - Rejects missing or empty-string `action` field
   - `buildSuccessResponse()`: Wraps data in ok envelope
   - `buildErrorResponse()`: Wraps error code/message in error envelope
   - `mapConfigErrorToResponse()`: Converts ConfigError to stable error response
     - Logs `issues` array to console.error for developer inspection
     - Returns generic Japanese message to client (never leaks diagnostic details)
   - `getConfigAction()`: Handler for getConfig action
     - Calls `getConfig()` and `buildPublicConfig()`
     - Catches ConfigError and maps it via `mapConfigErrorToResponse()`
     - Catches unexpected errors and returns INTERNAL_ERROR
   - `handleApiRequest()`: Main dispatcher
     - Routes "getConfig" action to `getConfigAction()`
     - All other actions return VALIDATION_ERROR (Phase 3A scope: only getConfig implemented)

4. **`apps/salon-portfolio/gas/tests/Api.test.ts`** (93 lines)
   - parseApiRequest tests (4 specs):
     - ✓ Parses well-formed request
     - ✓ Rejects empty/missing/whitespace-only body
     - ✓ Rejects malformed JSON
     - ✓ Rejects missing or non-string or empty action field
   - Response builder tests (2 specs):
     - ✓ buildSuccessResponse wraps data correctly
     - ✓ buildErrorResponse wraps code/message correctly
   - mapConfigErrorToResponse tests (1 spec):
     - ✓ Maps to CONFIG_INVALID and doesn't leak issues in response
   - handleApiRequest dispatch tests (2 specs):
     - ✓ Returns VALIDATION_ERROR for malformed JSON
     - ✓ Returns VALIDATION_ERROR for unsupported actions

## Test Results (GREEN phase)

```
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        1.468 s
```

Test output excerpt:
```
PASS tests/Api.test.ts
  parseApiRequest
    √ parses a well-formed request (3 ms)
    √ rejects an empty or missing body
    √ rejects malformed JSON
    √ rejects a body missing a non-empty action field (1 ms)
  response builders
    √ buildSuccessResponse wraps data in the ok envelope
    √ buildErrorResponse wraps a code/message in the error envelope (1 ms)
  mapConfigErrorToResponse
    √ maps to a stable CONFIG_INVALID error without leaking the raw issues (21 ms)
  handleApiRequest dispatch
    √ returns VALIDATION_ERROR for malformed request bodies (1 ms)
    √ returns VALIDATION_ERROR for an unsupported action name (3 ms)
```

## Typecheck Results

```
> salon-portfolio-gas@0.1.0 typecheck
> tsc --noEmit
```

No errors. All files typecheck successfully.

## Self-Review Checklist

- [x] ERROR_CODES includes all 10 Phase 0 codes plus CONFIG_INVALID (11 total)
- [x] parseApiRequest correctly:
  - [x] Rejects undefined/empty/whitespace-only bodies
  - [x] Rejects malformed JSON
  - [x] Rejects missing/non-string/empty action field
  - [x] Accepts valid requests
- [x] handleApiRequest correctly:
  - [x] Dispatches "getConfig" to getConfigAction()
  - [x] Rejects all other actions with VALIDATION_ERROR
- [x] mapConfigErrorToResponse never leaks issues array:
  - [x] Issues logged to console.error only
  - [x] Returned response contains only stable error code and Japanese message
  - [x] Test verifies serialized response excludes field names and reasons
- [x] All 9 tests pass
- [x] Typecheck passes with no errors

## Git Commit

```
Commit:  5a9901a
Message: feat(gas): add API envelope, error codes, and getConfig dispatcher
Files:   4 created
  - apps/salon-portfolio/gas/src/models/ErrorCodes.ts
  - apps/salon-portfolio/gas/src/models/Api.ts
  - apps/salon-portfolio/gas/src/Api.ts
  - apps/salon-portfolio/gas/tests/Api.test.ts
```

## Notes

- `parseApiRequest` is a pure function (Decision 3) — it does not touch GAS globals, making it testable independent of Sheets access
- `mapConfigErrorToResponse` logs diagnostic details (`error.issues`) to console.error per Phase 0 §O layer 1 guidance; ERROR_LOG sheet persistence is deferred to Phase 3B+
- `getConfigAction` depends on ConfigStore (Task 7) and PublicConfig (Task 6) — both already complete and committed
- All error messages to clients use fixed, safe Japanese text; never raw exception messages
- No scope creep: Only "getConfig" action is implemented; other Phase 3B+ actions (getServices, getStaff, createReservation, etc.) are explicitly routed to VALIDATION_ERROR as documented

## Concerns

None. All requirements met, all tests pass, typecheck passes, commit successful.
