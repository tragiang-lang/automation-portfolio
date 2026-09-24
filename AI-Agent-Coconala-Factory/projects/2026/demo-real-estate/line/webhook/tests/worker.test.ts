import { describe, expect, it } from "vitest";
import { signLineBody, verifyLineSignature } from "../src/signature";
import { Env, gasForwardUrl, handleRequest } from "../src/worker";

// Synthetic values only. Never a real channel secret, webhook key or user id.
const SECRET = "synthetic-channel-secret-for-tests";
const ENV: Env = {
  LINE_CHANNEL_SECRET: SECRET,
  GAS_WEBAPP_URL: "https://script.google.com/macros/s/TEST_DEPLOYMENT_ID/exec",
  GAS_WEBHOOK_KEY: "k".repeat(32),
};
const PING = '{"destination":"U00000000000000000000000000000000","events":[]}';
const EVENT_BODY = JSON.stringify({
  destination: "U00000000000000000000000000000000",
  events: [
    {
      type: "postback",
      mode: "active",
      timestamp: 1790000000000,
      webhookEventId: "01TESTEVENT0000000000000000",
      deliveryContext: { isRedelivery: false },
      replyToken: "test-reply-token",
      source: { type: "user", userId: "U0000proxytest" },
      postback: { data: "wf=inquiry-basic-v1&e=default" },
    },
  ],
});

function harness() {
  const forwarded: { url: string; body: string }[] = [];
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p) };
  const fetchImpl = async (url: string, init: RequestInit) => {
    forwarded.push({ url, body: new TextDecoder().decode(init.body as Uint8Array) });
    return new Response("{}", { status: 200 });
  };
  const send = async (body: string, headers: Record<string, string>, env: Env = ENV, method = "POST") => {
    const response = await handleRequest(new Request("https://proxy.example.com/", { method, headers, body: method === "POST" ? body : undefined }), env, ctx, fetchImpl);
    await Promise.all(pending);
    return response;
  };
  return { forwarded, send };
}

describe("verifyLineSignature", () => {
  it("matches a signature computed independently with openssl", async () => {
    // printf '%s' "$PING" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64
    const reference = "ktKVN2GQelIvULD/41poqVqFWRTXG8sMyC9ycHgXmq8=";
    expect(await signLineBody(SECRET, PING)).toBe(reference);
    expect(await verifyLineSignature(SECRET, new TextEncoder().encode(PING), reference)).toBe(true);
  });

  it("rejects missing, malformed, wrong-secret and modified-body signatures", async () => {
    const body = new TextEncoder().encode(EVENT_BODY);
    const good = await signLineBody(SECRET, EVENT_BODY);
    expect(await verifyLineSignature(SECRET, body, good)).toBe(true);
    expect(await verifyLineSignature(SECRET, body, null)).toBe(false);
    expect(await verifyLineSignature(SECRET, body, "not base64 !!")).toBe(false);
    expect(await verifyLineSignature(SECRET, body, btoa("short"))).toBe(false);
    expect(await verifyLineSignature("another-synthetic-secret", body, good)).toBe(false);
    expect(await verifyLineSignature(SECRET, new TextEncoder().encode(EVENT_BODY.replace("inquiry", "reservation")), good)).toBe(false);
    expect(await verifyLineSignature("", body, good)).toBe(false);
  });
});

describe("proxy handleRequest", () => {
  it("valid signature: answers 200 and forwards the exact raw body to GAS with the internal key", async () => {
    const { forwarded, send } = harness();
    const response = await send(EVENT_BODY, { "x-line-signature": await signLineBody(SECRET, EVENT_BODY), "content-type": "application/json" });
    expect(response.status).toBe(200);
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0].body).toBe(EVENT_BODY);
    expect(forwarded[0].url).toBe(`https://script.google.com/macros/s/TEST_DEPLOYMENT_ID/exec?key=${"k".repeat(32)}`);
  });

  it("accepts the header in any letter case", async () => {
    const { forwarded, send } = harness();
    const response = await send(EVENT_BODY, { "X-Line-Signature": await signLineBody(SECRET, EVENT_BODY) });
    expect(response.status).toBe(200);
    expect(forwarded).toHaveLength(1);
  });

  it("invalid, missing, wrong-secret or modified: 401 and GAS is never called", async () => {
    const { forwarded, send } = harness();
    const good = await signLineBody(SECRET, EVENT_BODY);
    expect((await send(EVENT_BODY, {})).status).toBe(401);
    expect((await send(EVENT_BODY, { "x-line-signature": "AAAA" })).status).toBe(401);
    expect((await send(EVENT_BODY, { "x-line-signature": await signLineBody("another-synthetic-secret", EVENT_BODY) })).status).toBe(401);
    expect((await send(`${EVENT_BODY} `, { "x-line-signature": good })).status).toBe(401);
    expect(forwarded).toEqual([]);
  });

  it("empty webhook events (LINE verification ping): 200 without calling GAS", async () => {
    const { forwarded, send } = harness();
    const response = await send(PING, { "x-line-signature": await signLineBody(SECRET, PING) });
    expect(response.status).toBe(200);
    expect(forwarded).toEqual([]);
  });

  it("fails closed when not configured, and refuses non-POST and non-JSON bodies", async () => {
    const { forwarded, send } = harness();
    const sig = await signLineBody(SECRET, EVENT_BODY);
    expect((await send(EVENT_BODY, { "x-line-signature": sig }, { ...ENV, LINE_CHANNEL_SECRET: undefined })).status).toBe(500);
    expect((await send(EVENT_BODY, { "x-line-signature": sig }, { ...ENV, GAS_WEBHOOK_KEY: "short" })).status).toBe(500);
    expect((await send("", {}, ENV, "GET")).status).toBe(405);
    expect((await send("not json", { "x-line-signature": await signLineBody(SECRET, "not json") })).status).toBe(400);
    expect(forwarded).toEqual([]);
  });

  it("only forwards to an https script.google.com URL", () => {
    expect(gasForwardUrl({ ...ENV, GAS_WEBAPP_URL: "http://script.google.com/macros/s/x/exec" })).toBeNull();
    expect(gasForwardUrl({ ...ENV, GAS_WEBAPP_URL: "https://evil.example.com/exec" })).toBeNull();
    expect(gasForwardUrl({ ...ENV, GAS_WEBAPP_URL: "not a url" })).toBeNull();
  });
});
