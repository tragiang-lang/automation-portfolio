# 0008: LINE signature verification in a minimal Cloudflare Worker proxy

**Context.** LINE requires webhook receivers to verify `x-line-signature`, a Base64
HMAC-SHA256 of the raw request body keyed with the channel secret, before processing events.
Apps Script `doPost(e)` exposes the body and query parameters but no request headers (Apps
Script web app docs, checked 2026-09-23), so GAS cannot perform this check. ADR 0005's
`?key=` URL parameter authenticates the caller of the GAS URL. It is not signature verification.

**Decision.** Add a small, generic Cloudflare Worker (`core-assets/line-webhook-proxy`, copied
byte for byte into each project's `line/webhook/`):

- It verifies the signature on the untouched body bytes with Web Crypto. The comparison is
  constant-time via `crypto.subtle.verify`.
- It rejects missing, malformed, wrong-secret and modified requests with 401 and never calls GAS.
- It answers 200 to LINE, then forwards the same bytes to the GAS web app with `?key=WEBHOOK_KEY` in `waitUntil`.
- It answers verification pings (`events: []`) with 200 and does not forward them.
- It fails closed (500) when not configured, and only forwards to `https://script.google.com`.
- Its secrets are Worker secrets (`LINE_CHANNEL_SECRET`, `GAS_WEBAPP_URL`, `GAS_WEBHOOK_KEY`), never files.

Why Cloudflare Workers: the runtime has Web Crypto and `waitUntil` built in, needs no server,
has a free tier, and deploys with one CLI (`wrangler`). The Worker has no dependencies. Any
equivalent edge runtime could host the same ~100 lines. Nothing in the proxy knows workflows,
industries or clients.

**Consequences.**
- The production webhook is LINE → proxy → GAS. GAS keeps the fail-closed key check (ADR 0005)
  as the proxy→GAS authentication.
- LINE gets its 200 before GAS runs. If GAS fails, the Worker logs it and LINE does not
  redeliver. Records are idempotent per `webhookEventId`, so a manual resend is safe.
  We accepted this trade-off because LINE's docs recommend async processing and GAS cold starts are slow.
- A third runtime (Cloudflare) joins Google and LINE. Setup and rollback steps are in the
  generated `LINE_SETUP.md` and `ROLLBACK.md`.
