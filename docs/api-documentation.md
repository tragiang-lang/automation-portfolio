# API Documentation

Status as of Phase 5: five actions are implemented — `getConfig` (Phase
3A), `createReservation` (Phase 4, see
[`reservation-transaction-architecture.md`](reservation-transaction-architecture.md)
for its full transaction design), and `getServices`/`getStaff`/
`getAvailability` (Phase 5, added for the reservation wizard's menu/staff
pickers and advisory availability check — see
[`reservation-frontend-architecture.md`](reservation-frontend-architecture.md)).
The remaining action list, covered in
[`phase0-specification.md`](phase0-specification.md) §G/§H, is implemented
incrementally in later phases.

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

## Actions implemented

### `getConfig` (Phase 3A)

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

### `getServices` (Phase 5)

Requires `features.reservation`. Read-only — returns the public projection
of active `SERVICES` rows (`buildPublicServices`,
`gas/src/PublicCatalog.ts`), sorted by `DisplayOrder`. Never includes
`Active`/`StaffRequired` (internal-only columns).

```json
// request
{ "action": "getServices" }

// success response data
[
  { "serviceId": "SV001", "name": "まつげパーマ", "durationMinutes": 60, "price": 6600, "displayOrder": 1 },
  { "serviceId": "SV002", "name": "ジェルネイル", "durationMinutes": 90, "price": 8800, "displayOrder": 2 }
]

// failure — feature disabled
{ "ok": false, "error": { "code": "FEATURE_DISABLED", "message": "現在ご予約の受付を停止しています。" } }
```

### `getStaff` (Phase 5)

Requires `features.reservation`. Read-only — returns the public projection
of active `STAFF` rows (`buildPublicStaff`), sorted by `DisplayOrder`.
Never includes `CalendarID`/`Active`. Returns `{ "ok": true, "data": [] }`
(not an error) without reading the `STAFF` sheet at all when
`features.staffSelection` is off.

```json
// request
{ "action": "getStaff" }

// success response data
[{ "staffId": "ST001", "name": "鈴木", "displayOrder": 1 }]
```

### `getAvailability` (Phase 5)

Requires `features.reservation`. Read-only, advisory only — reuses
`evaluateAvailableSlots` (`ReservationRules.ts`) and the same
`availability/` strategy factory `createReservation` uses, fetching
Calendar busy events once per distinct calendar id needed (not once per
candidate slot). A closed business day/holiday returns an empty slot list,
not an error. Never a reservation guarantee — `createReservation`'s own
re-check under the lock remains authoritative; a slot listed here can
still be lost to a race.

```json
// request payload
{
  "action": "getAvailability",
  "payload": { "serviceId": "SV001", "staffId": "ST001 or \"ANY\" — optional", "date": "2026-09-10" }
}

// success response data
{ "date": "2026-09-10", "slots": [{ "time": "10:00" }, { "time": "10:30" }] }

// failure — unknown service/staff (validation, same codes as createReservation)
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "選択されたメニューが見つかりません。" } }
```

### `createReservation` (Phase 4)

Requires `features.reservation`. Full transaction flow — see
[`reservation-transaction-architecture.md`](reservation-transaction-architecture.md)
for the sequence, lock scope, idempotency, and failure-mode details this
section only summarizes.

```json
// request payload — ReservationRequest (Phase 0 §E)
{
  "action": "createReservation",
  "payload": {
    "submissionId": "a client-generated UUID, reused across retries of the same submission",
    "serviceId": "SV001",
    "staffId": "ST001 or \"ANY\" — omitted entirely when features.staffSelection is false",
    "date": "2026-09-10",
    "time": "10:00",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "phone": "09012345678",
    "notes": "optional"
  }
}

// success response data — confirmed
{ "reservationId": "RES-20260910-X8K2MP" }

// success response data — needs manual confirmation (Calendar event
// creation failed; the reservation itself is still real — see
// reservation-transaction-architecture.md's "要確認 has two distinct
// outcomes")
{ "reservationId": "RES-20260910-X8K2MP", "needsConfirmation": true }

// a retried request with the same submissionId returns the identical
// result above again — never a new reservation, never DUPLICATE_SUBMISSION
// surfaced as an error

// failure — the requested slot is genuinely unavailable (either resolved
// at the pre-lock check, or lost the availability race under the lock)
{ "ok": false, "error": { "code": "SLOT_UNAVAILABLE", "message": "選択された時間帯は直前に埋まってしまいました。お手数ですが、別の時間帯をお選びください。" } }

// failure — could not acquire the lock in time
{ "ok": false, "error": { "code": "SYSTEM_BUSY", "message": "只今混み合っております。少々時間をおいて再度お試しください。" } }

// failure — feature disabled
{ "ok": false, "error": { "code": "FEATURE_DISABLED", "message": "現在ご予約の受付を停止しています。" } }
```

## Any other action name

Returns a `VALIDATION_ERROR` — no other action is implemented yet
(`createInquiry`, `requestCancellation`, `checkAvailability`, `healthCheck`
as an *action* — see `roadmap.md` for what's next, per
`phase0-specification.md` §G).

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Unsupported action: \"checkAvailability\"." } }
```

## Error codes

The full Phase 0 §H list, plus one Phase 3A addition:

```text
VALIDATION_ERROR            (Layer A — malformed/unsupported request, or createReservation
                              shape/business-rule validation failure)
DUPLICATE_SUBMISSION        (Layer A — never surfaced as an error by design: a retried
                              submissionId replays the original success response instead,
                              per Phase 0 §P — see reservation-transaction-architecture.md)
SLOT_UNAVAILABLE            (Layer B — createReservation: unavailable at the pre-lock check,
                              or lost the availability race under the lock)
FEATURE_DISABLED            (Layer B — createReservation with features.reservation off)
INVALID_CANCELLATION_TOKEN  (Layer B — not yet triggered; requestCancellation is Phase 5)
SYSTEM_BUSY                 (Layer C — createReservation: LockService acquisition timed out)
CALENDAR_ERROR              (Layer C — reserved; a Calendar event-creation failure in
                              createReservation is not surfaced as this code — see
                              reservation-transaction-architecture.md's "要確認 has two
                              distinct outcomes")
SHEET_ERROR                 (Layer C — triggered by a missing/renamed required sheet column,
                              or a Sheet write failure in createReservation)
MAIL_ERROR                  (Layer C — reserved; an email-send failure in createReservation
                              is logged to EMAIL_LOG/ERROR_LOG but never surfaced as an API
                              error, since it always happens after the response is already
                              decided — see reservation-transaction-architecture.md)
INTERNAL_ERROR              (Layer C — unclassified failure)
CONFIG_INVALID              (Phase 3A addition — CONFIG/HOLIDAYS failed parsing or validation)
```

`getConfig`/`doGet` touch neither Calendar, Gmail, nor any Sheet write.
`createReservation` (Phase 4) is the first action that does all three —
see [`reservation-transaction-architecture.md`](reservation-transaction-architecture.md).
