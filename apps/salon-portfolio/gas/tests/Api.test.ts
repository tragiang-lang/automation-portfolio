jest.mock("../src/ConfigStore", () => {
  const actual = jest.requireActual("../src/ConfigStore");
  return { ...actual, getConfig: jest.fn() };
});

import {
  buildErrorResponse,
  buildSuccessResponse,
  getConfigAction,
  handleApiRequest,
  mapConfigErrorToResponse,
  mapMissingHeadersErrorToResponse,
  parseApiRequest,
} from "../src/Api";
import { ConfigError, getConfig } from "../src/ConfigStore";
import { MissingHeadersError } from "../src/RowMapper";
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

describe("mapMissingHeadersErrorToResponse", () => {
  it("maps to a stable SHEET_ERROR without leaking the missing header names", () => {
    const error = new MissingHeadersError(["Key", "Value"]);
    const response = mapMissingHeadersErrorToResponse(error);
    expect(response).toEqual({
      ok: false,
      error: {
        code: "SHEET_ERROR",
        message:
          "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。",
      },
    });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("Key");
    expect(serialized).not.toContain("Value");
  });
});

describe("getConfigAction", () => {
  afterEach(() => {
    (getConfig as jest.Mock).mockReset();
  });

  it("maps a MissingHeadersError thrown by ConfigStore.getConfig to SHEET_ERROR", () => {
    (getConfig as jest.Mock).mockImplementation(() => {
      throw new MissingHeadersError(["Key", "Value"]);
    });
    const response = getConfigAction();
    expect(response).toEqual({
      ok: false,
      error: {
        code: "SHEET_ERROR",
        message:
          "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。",
      },
    });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("Key");
    expect(serialized).not.toContain("Value");
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
