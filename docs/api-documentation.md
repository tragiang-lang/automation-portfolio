# API Documentation

Status as of Phase 3A: one action (`getConfig`) is implemented. The full
action list, covered in [`phase0-specification.md`](phase0-specification.md)
§G/§H, is implemented incrementally in later phases.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `apps/salon-portfolio/web` → `/api/health` | `GET` | Next.js liveness check. Unchanged since Phase 1. |
| `apps/salon-portfolio/gas` Web App → `doGet` | `GET` | Apps Script liveness check. Unchanged since Phase 1 — returns `{ ok: true, data: { status, service, timestamp } }`. Not part of the action dispatch below. |
| `apps/salon-portfolio/gas` Web App → `doPost` | `POST` | Action dispatch, per Phase 0 §G. Body: `{ "action": string, "payload"?: object }`. |

## Envelope (Phase 0 §H)

```json
// success
{ "ok": true, "data": { } }

// failure
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "設定情報の読み込みに失敗しました。管理者にお問い合わせください。" } }
```

## Actions implemented in Phase 3A

### `getConfig`

Always available (no feature flag). Reads CONFIG + HOLIDAYS, parses and
validates them, and returns the public projection of `AppConfig`
(`calendarId`, `emailOwnerNotifyAddress`, `emailFromName` are never
included — Phase 3A §20).

```json
// request
{ "action": "getConfig" }

// success response data
{
  "business": { "name": "Demo Salon", "phone": "03-0000-0000", "email": "owner@example.com", "address": "東京都千代田区1-1-1" },
  "hours": { "monday": "10:00-19:00", "...": "...", "sunday": "closed" },
  "holidays": ["2026-01-01", "2026-01-02"],
  "features": { "contactForm": true, "reservation": true, "staffSelection": true, "calendar": true, "emailNotification": true },
  "staffAnyAvailableOption": true,
  "reservation": { "timezone": "Asia/Tokyo", "slotMinutes": 30, "minLeadHours": 1, "maxBookingDays": 60 }
}

// failure response (malformed/invalid CONFIG sheet data)
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "設定情報の読み込みに失敗しました。管理者にお問い合わせください。" } }
```

## Any other action name

Returns a `VALIDATION_ERROR` — no other action is implemented yet
(`getServices`, `getStaff`, `getAvailableSlots`, `checkAvailability`,
`createReservation`, `createInquiry`, `requestCancellation`, `healthCheck`
as an *action* — all Phase 3B+, per `phase0-specification.md` §G).

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Unsupported action: \"getServices\"." } }
```

## Error codes

The full Phase 0 §H list, plus one Phase 3A addition:

```text
VALIDATION_ERROR            (Layer A — used today for a malformed/unsupported request)
DUPLICATE_SUBMISSION        (Layer A — not yet triggered by any implemented action)
SLOT_UNAVAILABLE            (Layer B — not yet triggered)
FEATURE_DISABLED            (Layer B — not yet triggered)
INVALID_CANCELLATION_TOKEN  (Layer B — not yet triggered)
SYSTEM_BUSY                 (Layer C — not yet triggered)
CALENDAR_ERROR              (Layer C — not yet triggered)
SHEET_ERROR                 (Layer C — triggered by a missing/renamed required sheet column)
MAIL_ERROR                  (Layer C — not yet triggered)
INTERNAL_ERROR              (Layer C — unclassified `getConfig` failure)
CONFIG_INVALID              (Phase 3A addition — CONFIG/HOLIDAYS failed parsing or validation)
```

Neither `getConfig` nor `doGet` touches Calendar, Gmail, or writes to any
Sheet.
