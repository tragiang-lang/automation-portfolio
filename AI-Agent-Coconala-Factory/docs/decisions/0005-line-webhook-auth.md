# 0005: LINE webhook authentication and API exposure

**Context.** LINE signs webhooks with `X-Line-Signature`, but Apps Script `doPost(e)` does not
expose request headers.

**Decision.** The webhook URL includes `?key=<WEBHOOK_KEY>` (Script Property, 16+ chars, 32+
recommended), compared in constant time. With no key configured, every LINE delivery is rejected. The JSON
API is disabled unless `API_ENABLED=true`, and only actions with `api` exposure are routable.

**Consequences.** Security depends on the secrecy of the webhook URL, which is documented in
SETUP.md and security.md. Phase 2 can put an HMAC-verifying proxy in front if needed.
