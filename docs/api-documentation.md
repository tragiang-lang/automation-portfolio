# API Documentation

Status as of Phase 1: **no application API exists yet.** The full action
list, request/response envelope, and error codes are already designed in
[`phase0-specification.md`](phase0-specification.md) §G/§H and will be
implemented in a later phase (`Api.ts` action routing) — this document will
be filled in at that point rather than duplicating the spec now.

## What exists today

| Endpoint | Method | Purpose |
|---|---|---|
| `apps/salon-portfolio/web` → `/api/health` | `GET` | Next.js liveness check. Returns `{ status: "ok", service, timestamp }`. No auth, no business data. |
| `apps/salon-portfolio/gas` Web App → `doGet` / `doPost` | `GET` / `POST` | Apps Script liveness check. Returns `{ ok: true, data: { status: "ok", service, timestamp } }`. Both verbs currently return the same payload — there is no action routing yet. |

Neither endpoint touches Sheets, Calendar, Gmail, or CONFIG.
