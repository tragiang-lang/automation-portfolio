/**
 * LINE webhook signature verification (Messaging API reference,
 * "Signature validation"): the `x-line-signature` header is the Base64
 * HMAC-SHA256 digest of the raw request body, keyed with the channel
 * secret. The body must be verified exactly as received: parse or
 * re-serialize it first and a genuine request looks tampered with.
 *
 * Web Crypto only (Cloudflare Workers, Node 20+). `crypto.subtle.verify`
 * compares in constant time.
 */

const encoder = new TextEncoder();

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function hmacKey(channelSecret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", encoder.encode(channelSecret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

/** true only for a well-formed signature that matches `rawBody` under `channelSecret`. */
export async function verifyLineSignature(channelSecret: string, rawBody: Uint8Array<ArrayBuffer>, signature: string | null): Promise<boolean> {
  if (!channelSecret || !signature) return false;
  const expected = decodeBase64(signature.trim());
  // SHA-256 digests are 32 bytes; anything else cannot match.
  if (!expected || expected.length !== 32) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(channelSecret, "verify"), expected, rawBody);
}

/** Computes a signature the way the LINE Platform does. Used by tests and local tooling only. */
export async function signLineBody(channelSecret: string, rawBody: Uint8Array<ArrayBuffer> | string): Promise<string> {
  const bytes = typeof rawBody === "string" ? encoder.encode(rawBody) : rawBody;
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(channelSecret, "sign"), bytes));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary);
}
