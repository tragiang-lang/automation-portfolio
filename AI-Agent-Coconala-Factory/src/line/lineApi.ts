/**
 * Thin LINE Messaging API adapter for the factory CLI. It knows HTTP
 * endpoints and nothing about workflows, industries or menus. Endpoints and
 * hosts follow the official reference (developers.line.biz/en/reference/
 * messaging-api, verified 2026-09-23):
 *
 *   POST   api.line.me       /v2/bot/richmenu/validate
 *   POST   api.line.me       /v2/bot/richmenu
 *   POST   api-data.line.me  /v2/bot/richmenu/{id}/content      (image/png | image/jpeg)
 *   GET    api-data.line.me  /v2/bot/richmenu/{id}/content
 *   GET    api.line.me       /v2/bot/richmenu/{id}
 *   DELETE api.line.me       /v2/bot/richmenu/{id}
 *   POST   api.line.me       /v2/bot/user/all/richmenu/{id}      (set default)
 *   GET    api.line.me       /v2/bot/user/all/richmenu           (default id; 404 when none)
 *   GET    api.line.me       /v2/bot/channel/webhook/endpoint
 *   POST   api.line.me       /v2/bot/channel/webhook/test
 *
 * Authentication: `Authorization: Bearer {channel access token}`. The token
 * is held in memory only and never appears in errors or logs.
 */

export const LINE_API = "https://api.line.me";
export const LINE_DATA_API = "https://api-data.line.me";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export class LineApiError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
    readonly lineMessage: string,
  ) {
    super(`LINE API ${operation} failed: HTTP ${status}${lineMessage ? ` (${lineMessage})` : ""}`);
    this.name = "LineApiError";
  }
}

export interface RichMenuObject {
  size: { width: number; height: number };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: { bounds: { x: number; y: number; width: number; height: number }; action: Record<string, unknown> }[];
}

export interface LineApi {
  validateRichMenu(menu: RichMenuObject): Promise<void>;
  createRichMenu(menu: RichMenuObject): Promise<string>;
  uploadRichMenuImage(richMenuId: string, image: Uint8Array, contentType: "image/png" | "image/jpeg"): Promise<void>;
  downloadRichMenuImage(richMenuId: string): Promise<Uint8Array>;
  getRichMenu(richMenuId: string): Promise<RichMenuObject & { richMenuId: string }>;
  deleteRichMenu(richMenuId: string): Promise<void>;
  setDefaultRichMenu(richMenuId: string): Promise<void>;
  /** null when no default rich menu is set with the Messaging API (LINE answers 404). */
  getDefaultRichMenuId(): Promise<string | null>;
  getWebhookEndpoint(): Promise<{ endpoint: string; active: boolean }>;
  testWebhookEndpoint(): Promise<{ success: boolean; statusCode: number; reason: string; detail: string }>;
}

async function lineMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" ? body.message.slice(0, 200) : "";
  } catch {
    return "";
  }
}

export function createLineApi(token: string, fetchImpl: FetchLike = fetch): LineApi {
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  const auth = { Authorization: `Bearer ${token}` };

  async function call(operation: string, url: string, init: RequestInit, allow404 = false): Promise<Response | null> {
    const response = await fetchImpl(url, { ...init, headers: { ...auth, ...(init.headers as Record<string, string> | undefined) } });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new LineApiError(operation, response.status, await lineMessage(response));
    return response;
  }
  const json = { "Content-Type": "application/json" };

  return {
    async validateRichMenu(menu) {
      await call("validateRichMenu", `${LINE_API}/v2/bot/richmenu/validate`, { method: "POST", headers: json, body: JSON.stringify(menu) });
    },
    async createRichMenu(menu) {
      const response = await call("createRichMenu", `${LINE_API}/v2/bot/richmenu`, { method: "POST", headers: json, body: JSON.stringify(menu) });
      const { richMenuId } = (await response!.json()) as { richMenuId?: string };
      if (!richMenuId) throw new LineApiError("createRichMenu", response!.status, "no richMenuId in the response");
      return richMenuId;
    },
    async uploadRichMenuImage(richMenuId, image, contentType) {
      await call("uploadRichMenuImage", `${LINE_DATA_API}/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: image as Uint8Array<ArrayBuffer>,
      });
    },
    async downloadRichMenuImage(richMenuId) {
      const response = await call("downloadRichMenuImage", `${LINE_DATA_API}/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, { method: "GET" });
      return new Uint8Array(await response!.arrayBuffer());
    },
    async getRichMenu(richMenuId) {
      const response = await call("getRichMenu", `${LINE_API}/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`, { method: "GET" });
      return (await response!.json()) as RichMenuObject & { richMenuId: string };
    },
    async deleteRichMenu(richMenuId) {
      await call("deleteRichMenu", `${LINE_API}/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`, { method: "DELETE" });
    },
    async setDefaultRichMenu(richMenuId) {
      await call("setDefaultRichMenu", `${LINE_API}/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, { method: "POST" });
    },
    async getDefaultRichMenuId() {
      const response = await call("getDefaultRichMenuId", `${LINE_API}/v2/bot/user/all/richmenu`, { method: "GET" }, true);
      return response ? (((await response.json()) as { richMenuId?: string }).richMenuId ?? null) : null;
    },
    async getWebhookEndpoint() {
      const response = await call("getWebhookEndpoint", `${LINE_API}/v2/bot/channel/webhook/endpoint`, { method: "GET" });
      return (await response!.json()) as { endpoint: string; active: boolean };
    },
    async testWebhookEndpoint() {
      const response = await call("testWebhookEndpoint", `${LINE_API}/v2/bot/channel/webhook/test`, { method: "POST", headers: json, body: "{}" });
      return (await response!.json()) as { success: boolean; statusCode: number; reason: string; detail: string };
    },
  };
}
