## Task 8: API envelope, error codes, and the `getConfig` dispatcher

**Files:**
- Create: `apps/salon-portfolio/gas/src/models/ErrorCodes.ts`
- Create: `apps/salon-portfolio/gas/src/models/Api.ts`
- Create: `apps/salon-portfolio/gas/src/Api.ts`
- Test: `apps/salon-portfolio/gas/tests/Api.test.ts`

**Interfaces:**
- Consumes: `ConfigError`, `getConfig` from `./ConfigStore`; `buildPublicConfig` from `./PublicConfig`; `PublicConfig` from `./models/Config`.
- Produces (`models/ErrorCodes.ts`): `ERROR_CODES` const (10 codes from phase0-specification.md §H plus `CONFIG_INVALID`), `ErrorCode` type.
- Produces (`models/Api.ts`): `ApiRequest { action: string; payload?: unknown }`; `ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }`.
- Produces (`Api.ts`): `parseApiRequest(rawBody: string | undefined)`; `buildSuccessResponse<T>(data: T): ApiResponse<T>`; `buildErrorResponse(code, message): ApiResponse<never>`; `mapConfigErrorToResponse(error: ConfigError): ApiResponse<never>`; `getConfigAction(): ApiResponse<PublicConfig>`; `handleApiRequest(rawBody: string | undefined): ApiResponse`.

- [ ] **Step 1: Write `models/ErrorCodes.ts`**

```ts
/**
 * Application-level API error codes (Phase 0 §H, extended per Phase 3A
 * §9 with CONFIG_INVALID — the code list is documented there as
 * "extensible"). Every code maps to a fixed, safe-to-show Japanese
 * message in Api.ts — never a raw exception message.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  INVALID_CANCELLATION_TOKEN: "INVALID_CANCELLATION_TOKEN",
  SYSTEM_BUSY: "SYSTEM_BUSY",
  CALENDAR_ERROR: "CALENDAR_ERROR",
  SHEET_ERROR: "SHEET_ERROR",
  MAIL_ERROR: "MAIL_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Phase 3A addition: CONFIG sheet data failed parsing/validation. */
  CONFIG_INVALID: "CONFIG_INVALID",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

- [ ] **Step 2: Write `models/Api.ts`**

```ts
import { ErrorCode } from "./ErrorCodes";

/** Shared request/response envelope for every action (Phase 0 §H). */
export interface ApiRequest {
  action: string;
  payload?: unknown;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

- [ ] **Step 3: Write the failing test `tests/Api.test.ts`**

```ts
import {
  buildErrorResponse,
  buildSuccessResponse,
  handleApiRequest,
  mapConfigErrorToResponse,
  parseApiRequest,
} from "../src/Api";
import { ConfigError } from "../src/ConfigStore";
import { ERROR_CODES } from "../src/models/ErrorCodes";

describe("parseApiRequest", () => {
  it("parses a well-formed request", () => {
    const result = parseApiRequest('{"action":"getConfig","payload":{}}');
    expect(result).toEqual({
      ok: true,
      request: { action: "getConfig", payload: {} },
    });
  });

  it("rejects an empty or missing body", () => {
    expect(parseApiRequest(undefined).ok).toBe(false);
    expect(parseApiRequest("").ok).toBe(false);
    expect(parseApiRequest("   ").ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    expect(parseApiRequest("{not json").ok).toBe(false);
  });

  it("rejects a body missing a non-empty action field", () => {
    expect(parseApiRequest("{}").ok).toBe(false);
    expect(parseApiRequest('{"action":""}').ok).toBe(false);
    expect(parseApiRequest('{"action":123}').ok).toBe(false);
    expect(parseApiRequest("[1,2,3]").ok).toBe(false);
  });
});

describe("response builders", () => {
  it("buildSuccessResponse wraps data in the ok envelope", () => {
    expect(buildSuccessResponse({ a: 1 })).toEqual({
      ok: true,
      data: { a: 1 },
    });
  });

  it("buildErrorResponse wraps a code/message in the error envelope", () => {
    expect(buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "bad request")).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "bad request" },
    });
  });
});

describe("mapConfigErrorToResponse", () => {
  it("maps to a stable CONFIG_INVALID error without leaking the raw issues", () => {
    const error = new ConfigError([
      { field: "calendar.id", reason: "missing or empty string" },
    ]);
    const response = mapConfigErrorToResponse(error);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("CONFIG_INVALID");
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("calendar.id");
      expect(serialized).not.toContain("missing or empty string");
    }
  });
});

describe("handleApiRequest dispatch", () => {
  it("returns VALIDATION_ERROR for malformed request bodies", () => {
    const response = handleApiRequest("{not json");
    expect(response).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is not valid JSON.",
      },
    });
  });

  it("returns VALIDATION_ERROR for an unsupported action name", () => {
    const response = handleApiRequest('{"action":"deleteEverything"}');
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("VALIDATION_ERROR");
      expect(response.error.message).toContain("deleteEverything");
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Api.test.ts`
Expected: FAIL — `Cannot find module '../src/Api'`.

- [ ] **Step 5: Write `Api.ts`**

```ts
import { ApiRequest, ApiResponse } from "./models/Api";
import { ERROR_CODES, ErrorCode } from "./models/ErrorCodes";
import { ConfigError, getConfig } from "./ConfigStore";
import { buildPublicConfig } from "./PublicConfig";
import { PublicConfig } from "./models/Config";

/** Parses and shape-checks the raw POST body. Pure — never touches GAS
 *  globals — so the dispatch logic is Jest-testable independent of
 *  Sheets access (Decision 3: no DI seam manufactured — this is a plain
 *  function over a plain string, not an injected interface). */
export function parseApiRequest(
  rawBody: string | undefined,
): { ok: true; request: ApiRequest } | { ok: false; message: string } {
  if (!rawBody || rawBody.trim().length === 0) {
    return { ok: false, message: "Request body is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, message: "Request body is not valid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as { action?: unknown }).action !== "string" ||
    (parsed as { action: string }).action.trim().length === 0
  ) {
    return {
      ok: false,
      message: 'Request body must include a non-empty "action" field.',
    };
  }
  return { ok: true, request: parsed as ApiRequest };
}

export function buildSuccessResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function buildErrorResponse(
  code: ErrorCode,
  message: string,
): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}

/** Maps a caught ConfigError to the stable public error contract — never
 *  forwards `issues` (server-side diagnostic detail only) to the caller
 *  (Phase 3A §9). The issues are logged to the execution transcript
 *  (Phase 0 §O layer 1) for the developer to inspect manually; ERROR_LOG
 *  sheet persistence is Phase 3B+ (Phase 3A §34: establish the schema,
 *  don't wire every function into it yet). */
export function mapConfigErrorToResponse(
  error: ConfigError,
): ApiResponse<never> {
  console.error("[getConfig] CONFIG_INVALID:", JSON.stringify(error.issues));
  return buildErrorResponse(
    ERROR_CODES.CONFIG_INVALID,
    "設定情報の読み込みに失敗しました。管理者にお問い合わせください。",
  );
}

/** `getConfig` action handler (Phase 0 §G/§H, Phase 3A §19). Thin: reads
 *  real CONFIG/HOLIDAYS sheets via ConfigStore, maps to the public
 *  projection, and translates a ConfigError into the stable error
 *  envelope. Not unit tested directly (it touches SpreadsheetApp through
 *  ConfigStore.getConfig) — ConfigStore's own parsing/validation logic
 *  and mapConfigErrorToResponse above carry the tested behavior. */
export function getConfigAction(): ApiResponse<PublicConfig> {
  try {
    const config = getConfig();
    return buildSuccessResponse(buildPublicConfig(config));
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    console.error("[getConfig] unexpected error:", error);
    return buildErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "サーバーエラーが発生しました。",
    );
  }
}

/** Single POST entrypoint's dispatch logic (Phase 0 §G: "all actions
 *  share one endpoint, routed by an `action` field"). Only `getConfig`
 *  is implemented in Phase 3A (§2 scope rule) — every other action name
 *  is rejected as a validation error; there is nothing else to route to
 *  yet (getServices/getStaff/createReservation/etc. are Phase 3B+). */
export function handleApiRequest(rawBody: string | undefined): ApiResponse {
  const parsed = parseApiRequest(rawBody);
  if (!parsed.ok) {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, parsed.message);
  }
  switch (parsed.request.action) {
    case "getConfig":
      return getConfigAction();
    default:
      return buildErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported action: "${parsed.request.action}".`,
      );
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Api.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/salon-portfolio/gas/src/models/ErrorCodes.ts apps/salon-portfolio/gas/src/models/Api.ts apps/salon-portfolio/gas/src/Api.ts apps/salon-portfolio/gas/tests/Api.test.ts
git commit -m "feat(gas): add API envelope, error codes, and getConfig dispatcher"
```

---

