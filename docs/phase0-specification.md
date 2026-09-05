# Phase 0 Specification — Project 1 (Nail / Eyelash Salon)

Status: **DRAFT — awaiting approval. No Phase 1 code has been written.**

Note on provenance: this session started with a cleared context and no
architecture-plan file existed anywhere in the repository (only
`MASTER_PROMPT_INSTRUCTION_LP_AUTOMATION_SAAS.md` was present). This document
is therefore authored fresh, directly from the master instruction file plus
the six decisions approved for Project 1, rather than "updated" from a prior
artifact. If an earlier plan existed in a previous session, it was not
persisted to disk — treat this document as the source of truth going forward.

---

## A. Re-check against MASTER_PROMPT_INSTRUCTION_LP_AUTOMATION_SAAS.md

Compliance check, section by section, against the six approved decisions:

| Master section | Requirement | Status |
|---|---|---|
| §3 Core Architecture | Browser → Next.js → GAS Web App → Sheets/Calendar/Gmail | Followed as-is. No Supabase in v1 (not justified by any approved decision). |
| §5 Principle 2 (reusable core / customizable logic) | 50–60% reusable, 40–50% vertical-specific | Followed: staff-selection togglability (Decision 1) and the availability-strategy seam are the concrete mechanism that keeps the core reusable. |
| §9 Form Architecture | Client validation → HTTPS → server validation → business rules → write → calendar → email → response | Followed exactly; matches the `createReservation` transaction flow in §E below. |
| §10 Data models | `ReservationRequest`, `ContactSubmission`, industry extensions | Decision 5 (single service per reservation) means Project 1 does **not** need the "extends" inheritance style shown in the master doc for multi-item bookings — `serviceId` stays a single scalar field, not an array. This is a deliberate, approved narrowing, not a deviation. |
| §11 Sheets design | Human-readable tabs, stable IDs, not row-number IDs | Followed. Decision 4 (`RES-YYYYMMDD-XXXXXX`) satisfies "stable internal ID, not sequential public number" directly. |
| §12 Calendar integration | Calendar is source of truth for conflicts; no fake confirmation before Calendar succeeds | Followed; this is the reason the transaction flow in §E creates the Calendar event **before** marking the row 受付済. |
| §13 Gmail integration | Customer + owner emails on success | Followed for reservations; Decision 6 extends the same pattern to the new Contact workflow. |
| §14 API design | Action-based endpoint, explicit action list | Followed; §7 below is a strict superset of the master's example list (adds `getStaff`, `requestCancellation`). |
| §18 Idempotency | Must protect against duplicate submissions, high priority for reservations | Followed via `submissionId` (Decision 3 test-tooling context assumes this exists; it is now specified concretely in §D/§O below). |
| §35 Feature flags | Modular capability flags, "do not force one massive package" | Decision 1 makes `features.staffSelection` the first concrete instance of this mechanism; the same CONFIG-flag pattern is reused for `features.reservation`, `features.contactForm`, etc. |
| §36 Salon architecture | LP → Services → Staff(optional) → Reservation → GAS → Availability/Sheets/Calendar/Gmail | Followed; "Staff (optional)" in the master diagram is exactly Decision 1. |
| §41 Expected reusability | Extract Core UI / Form system / Validation / API client / GAS API base / Sheet & Calendar & Gmail utilities after Project 1 | This spec's directory structure (§B) already separates these into modules that are reusable-by-construction, so extraction later is a move, not a rewrite. |

No conflicts were found between the six approved decisions and the master
instruction — the decisions are all narrowings or concretizations of choices
the master document deliberately left open ("the exact API design may vary by
project", "use actual project requirements", "do not necessarily implement
this exact mechanism").

One deliberate scope reduction versus the master doc, called out explicitly
per master §21/§45 honesty requirement: the master's example `getServices`
action is kept, but this spec treats **services and staff as separate
resources from CONFIG**, not folded into `getConfig`. Rationale in §D.

---

## B. Final Directory Structure

```text
Coconala-Web-Services/
├── MASTER_PROMPT_INSTRUCTION_LP_AUTOMATION_SAAS.md
├── README.md                                # created in Phase 1
├── docs/
│   ├── phase0-specification.md              # this file
│   ├── architecture-overview.md             # created/updated in Phase 1
│   ├── folder-structure.md                  # created in Phase 1
│   ├── api-documentation.md                 # created in Phase 1
│   ├── roadmap.md                           # created in Phase 1
│   └── changelog.md                         # created in Phase 1
│
├── apps/
│   └── salon-portfolio/                     # Project 1: Nail / Eyelash Salon
│       ├── web/                             # Next.js frontend
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                 # LP
│       │   │   ├── contact/page.tsx
│       │   │   ├── reservation/page.tsx
│       │   │   ├── reservation/cancel/page.tsx   # Decision 2
│       │   │   └── thanks/page.tsx
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── sections/
│       │   │   ├── forms/
│       │   │   ├── reservation/
│       │   │   └── ui/
│       │   ├── lib/
│       │   │   ├── api/                     # thin fetch client, one function per API action
│       │   │   ├── validation/              # client-side mirrors of server rules (UX only, never trusted)
│       │   │   ├── constants/
│       │   │   └── utils/
│       │   ├── types/                       # shared request/response contract types (source-of-truth copies live in gas/src/models, mirrored here)
│       │   ├── config/                      # presentation-only: theme tokens, copy, image paths — NOT business config (see §F)
│       │   └── public/{images,icons}/
│       │
│       └── gas/                             # GAS backend, TypeScript
│           ├── src/
│           │   ├── Code.ts                  # doGet/doPost entrypoints only
│           │   ├── Api.ts                   # orchestration, routing, logging, error boundary
│           │   ├── Validation.ts            # common validation + delegates to vertical rules
│           │   ├── Sheets.ts                # Sheets read/write adapter only
│           │   ├── Calendar.ts              # Calendar query/create adapter only
│           │   ├── Mail.ts                  # email sending only
│           │   ├── SlotEngine.ts            # pure slot generation (no GAS globals)
│           │   ├── availability/
│           │   │   ├── AvailabilityStrategy.ts        # interface
│           │   │   ├── StaffAvailabilityStrategy.ts   # per-staff / "any available" resolution
│           │   │   └── SharedAvailabilityStrategy.ts  # single shared calendar, no staff dimension
│           │   ├── models/
│           │   │   ├── ReservationRequest.ts
│           │   │   ├── ContactRequest.ts
│           │   │   ├── CancellationRequest.ts
│           │   │   ├── ReservationRecord.ts # persisted-row shape, distinct from the request DTO
│           │   │   └── Config.ts            # AppConfig type (§C)
│           │   ├── ids/
│           │   │   └── ReservationId.ts     # RES-YYYYMMDD-XXXXXX generator
│           │   ├── ConfigStore.ts           # reads/parses the CONFIG sheet into AppConfig, caches it
│           │   └── Utils.ts                 # date/timezone normalization, misc pure helpers
│           ├── tests/                       # Jest, mirrors src/ 1:1 for pure modules only
│           │   ├── SlotEngine.test.ts
│           │   ├── Validation.test.ts
│           │   ├── ReservationId.test.ts
│           │   ├── availability/StaffAvailabilityStrategy.test.ts
│           │   ├── availability/SharedAvailabilityStrategy.test.ts
│           │   └── ConfigStore.test.ts
│           ├── build/                       # esbuild output (gitignored), bundled into one Code.gs for clasp push
│           ├── appsscript.json
│           ├── .clasp.json                  # gitignored; one per environment (see §Q Deployment)
│           ├── esbuild.config.js
│           ├── jest.config.js
│           ├── package.json
│           └── tsconfig.json
│
├── packages/                                # deferred until Phase 7 (post Project-1 extraction, master §41)
│   └── (empty in Phase 0 — do not create yet)
│
└── .claude/
```

Notes:
- `apps/salon-portfolio/gas/src` module list is a literal 1:1 mapping of the
  boundaries fixed in §D — no module in this list may absorb another
  module's responsibility.
- `packages/` is named in advance so that Phase 7 extraction (master §41)
  moves code into an existing, agreed location rather than requiring a new
  structural decision later. It stays empty until then — do not scaffold
  it in Phase 1.

---

## C. Final Google Sheets Schema

Tabs (only those required by Project 1; matches master §11's "only create
tabs actually required"):

```text
CONFIG
SERVICES
STAFF
HOLIDAYS
RESERVATIONS
CANCELLATION_REQUESTS
INQUIRIES
EMAIL_LOG
ERROR_LOG
```

### CONFIG
Two-column key/value sheet (human-editable, per master §11 "designed for
human use first"), plus a description column so the business owner
understands each row without reading code.

| Key | Description |
|---|---|
| `business.name` | Displayed business name |
| `business.phone` | Displayed phone number |
| `business.email` | Displayed contact email |
| `business.address` | Displayed address |
| `hours.monday` … `hours.sunday` | `"10:00-19:00"` or `"closed"` |
| `reservation.timezone` | Always `Asia/Tokyo` for Project 1 |
| `reservation.slotMinutes` | Slot granularity, e.g. `30` |
| `reservation.minLeadHours` | Minimum lead time before a bookable slot |
| `reservation.maxBookingDays` | Booking horizon |
| `features.contactForm` | `TRUE`/`FALSE` |
| `features.reservation` | `TRUE`/`FALSE` |
| `features.staffSelection` | `TRUE`/`FALSE` — Decision 1 switch |
| `features.calendar` | `TRUE`/`FALSE` |
| `features.emailNotification` | `TRUE`/`FALSE` |
| `staff.anyAvailableOption` | `TRUE`/`FALSE` — show "Any available staff" (Decision 1) |
| `calendar.id` | Google Calendar ID used when `features.staffSelection = FALSE`, or the fallback/shared calendar |
| `email.ownerNotifyAddress` | Where owner notifications are sent |
| `email.fromName` | Display name used on outgoing mail |

### HOLIDAYS
`Date` (`YYYY-MM-DD`) | `Label` (free text, e.g. `年末年始`) — kept as its own
tab rather than a CONFIG value because holiday lists grow and are edited far
more often than the rest of CONFIG.

### SERVICES
`ServiceID` | `Name` | `DurationMinutes` | `Price` | `Active` | `StaffRequired` | `DisplayOrder`

### STAFF
`StaffID` | `Name` | `Active` | `CalendarID` (optional, per-staff calendar; blank = use `calendar.id`) | `DisplayOrder`

### RESERVATIONS
`ReservationID` | `SubmissionID` | `CreatedAt` | `UpdatedAt` | `Name` | `Email` | `Phone` | `Date` | `Time` | `ServiceID` | `StaffID` | `Notes` | `Status` | `CalendarEventID` | `EmailStatus` | `CancellationToken`

- `Status` ∈ the state machine in §H.
- `CancellationToken`: a separate random value from `ReservationID`'s own
  random suffix (see §D rationale), used only in the cancellation link.

### CANCELLATION_REQUESTS
`CancellationRequestID` | `ReservationID` | `RequestedAt` | `RequesterName` | `RequesterEmail` | `Reason` | `Status` (`受付` / `対応済`) | `ProcessedAt` | `ProcessedBy` | `Notes`

Kept as its own tab (not columns bolted onto RESERVATIONS) so that a future
automated-cancellation feature (explicitly deferred by Decision 2) has a
natural place to attach processing metadata without another migration.

### INQUIRIES
`InquiryID` | `SubmissionID` | `CreatedAt` | `Name` | `Email` | `Phone` | `Subject` | `Message` | `Source` | `Status`

Stored in its own tab, never mixed into RESERVATIONS — direct requirement of
Decision 6.

### EMAIL_LOG
`EmailLogID` | `CreatedAt` | `RelatedType` (`Reservation`/`Inquiry`/`Cancellation`) | `RelatedID` | `RecipientType` (`Customer`/`Owner`) | `RecipientEmail` | `Subject` | `Status` (`Sent`/`Failed`) | `ErrorMessage`

### ERROR_LOG
`ErrorID` | `CreatedAt` | `Action` | `Message` | `Stack` | `ContextJSON` | `Severity`

No personal data beyond what's already in RESERVATIONS/INQUIRIES is logged
here (master §20/§21 constraint).

---

## D. CONFIG Schema (parsed shape)

`ConfigStore.ts` reads the CONFIG + HOLIDAYS tabs and produces a typed
`AppConfig` object — this, not the raw sheet, is what `Api.ts` and the
`getConfig` action work with:

```ts
// gas/src/models/Config.ts

export interface BusinessHours {
  monday: string | 'closed';
  tuesday: string | 'closed';
  wednesday: string | 'closed';
  thursday: string | 'closed';
  friday: string | 'closed';
  saturday: string | 'closed';
  sunday: string | 'closed';
}

export interface FeatureFlags {
  contactForm: boolean;
  reservation: boolean;
  staffSelection: boolean;
  calendar: boolean;
  emailNotification: boolean;
}

export interface ReservationSettings {
  timezone: 'Asia/Tokyo';
  slotMinutes: number;
  minLeadHours: number;
  maxBookingDays: number;
}

export interface AppConfig {
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  hours: BusinessHours;
  holidays: string[];          // ["2026-01-01", "2026-01-02", ...]
  features: FeatureFlags;
  staffAnyAvailableOption: boolean;
  reservation: ReservationSettings;
  calendarId: string;          // fallback/shared calendar id
}
```

Rationale for keeping `SERVICES` and `STAFF` **out** of `AppConfig` /
`getConfig`: they are catalog data (can grow, change independently, and are
each fetched by their own action — `getServices`, `getStaff`). Folding them
into `getConfig` would make the config payload's shape depend on catalog
size and would blur "site-wide configuration" (CONFIG sheet) from "sellable
item lists" (SERVICES/STAFF sheets). Both are still CONFIG-driven in the
broader sense (master §25); they're just not part of the `AppConfig` type.

---

## E. ReservationRequest Model

```ts
// gas/src/models/ReservationRequest.ts

/** Sentinel staffId meaning "no specific staff — assign any available one". */
export const ANY_STAFF = 'ANY' as const;

export interface ReservationRequest {
  submissionId: string;         // client-generated UUID, idempotency key (master §18)
  serviceId: string;            // Decision 5: exactly one service per reservation
  staffId?: string | typeof ANY_STAFF; // omitted entirely when features.staffSelection = false
  date: string;                 // YYYY-MM-DD, Asia/Tokyo, normalized server-side regardless of client tz
  time: string;                 // HH:mm, 24h
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

/** Persisted row shape — distinct from the request DTO on purpose:
 *  the request is what the client sends; the record is what exists
 *  once business rules and integration results have been applied. */
export interface ReservationRecord extends ReservationRequest {
  reservationId: string;        // RES-YYYYMMDD-XXXXXX (Decision 4)
  createdAt: string;            // ISO 8601, Asia/Tokyo
  updatedAt: string;
  status: ReservationStatus;    // see §H
  calendarEventId?: string;
  emailStatus: 'pending' | 'sent' | 'failed';
  cancellationToken: string;    // separate random value from reservationId's suffix
}
```

---

## F. ContactRequest Model

```ts
// gas/src/models/ContactRequest.ts

export interface ContactRequest {
  submissionId: string;         // idempotency key, same mechanism as reservations
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  source?: string;              // e.g. which page/campaign the form was on
}

export interface ContactRecord extends ContactRequest {
  inquiryId: string;
  createdAt: string;
  status: 'new' | 'acknowledged'; // v1 always ends at 'acknowledged' once emails send; a real lead-status workflow is out of scope (that belongs to the Consultant vertical, master §2 Project C)
}
```

And the cancellation-request model, needed by the same workflow (Decision 2):

```ts
// gas/src/models/CancellationRequest.ts

export interface CancellationRequest {
  reservationId: string;
  cancellationToken: string;    // must match ReservationRecord.cancellationToken
  requesterName: string;
  requesterEmail: string;
  reason?: string;
}

export interface CancellationRecord extends CancellationRequest {
  cancellationRequestId: string;
  requestedAt: string;
  status: '受付' | '対応済';
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}
```

---

## G. API Action List

| Action | Purpose | Requires feature flag |
|---|---|---|
| `getConfig` | Business info, hours, holidays, feature flags, reservation settings | — always available |
| `getServices` | Active services catalog | `features.reservation` |
| `getStaff` | Active staff catalog | `features.reservation && features.staffSelection` |
| `getAvailableSlots` | Bookable time slots for a date + service (+ staff) | `features.reservation` |
| `checkAvailability` | Fast re-check of one specific slot before submit | `features.reservation` |
| `createReservation` | Full reservation transaction (§I) | `features.reservation` |
| `createInquiry` | Contact form submission | `features.contactForm` |
| `requestCancellation` | Record a cancellation request (§K) | `features.reservation` |
| `healthCheck` | Liveness/config-sanity check | — always available |

All actions share one endpoint (`doPost`), routed by an `action` field, per
master §14.

---

## H. API Request/Response Contracts

Consistent envelope (master §16), used by every action:

```json
// success
{ "ok": true, "data": { } }

// failure
{ "ok": false, "error": { "code": "SLOT_UNAVAILABLE", "message": "選択された時間帯はご利用いただけません。" } }
```

Per-action bodies:

**`getConfig`**
```json
// request
{ "action": "getConfig", "payload": {} }
// response data
{ "business": {...}, "hours": {...}, "holidays": ["2026-01-01"], "features": {...}, "staffAnyAvailableOption": true, "reservation": {...} }
```

**`getServices`**
```json
// response data
{ "services": [ { "serviceId": "SV001", "name": "ジェルネイル", "durationMinutes": 60, "price": 6000, "staffRequired": true } ] }
```

**`getStaff`**
```json
// response data
{ "staff": [ { "staffId": "ST001", "name": "田中" } ], "anyAvailableOption": true }
```

**`getAvailableSlots`**
```json
// request payload
{ "date": "2026-09-10", "serviceId": "SV001", "staffId": "ANY" }
// response data
{ "slots": ["10:00", "10:30", "11:00"] }
```

**`checkAvailability`**
```json
// request payload
{ "date": "2026-09-10", "time": "10:30", "serviceId": "SV001", "staffId": "ST001" }
// response data
{ "available": true }
```

**`createReservation`**
```json
// request payload = ReservationRequest (§E)
// response data
{ "reservationId": "RES-20260910-X8K2MP" }
// or, on the 要確認 outcome (§I failure cases) — still ok:true, the row exists:
{ "reservationId": "RES-20260910-X8K2MP", "needsConfirmation": true }
```

**`createInquiry`**
```json
// request payload = ContactRequest (§F)
// response data
{ "inquiryId": "INQ-20260910-4F9QZR" }
```

**`requestCancellation`**
```json
// request payload = CancellationRequest (§F)
// response data
{ "cancellationRequestId": "CXL-20260910-2B7TVW" }
```

**`healthCheck`**
```json
// response data
{ "status": "ok", "version": "<deployment id or timestamp>" }
```

Error codes (extensible, mirrors master §17 three-layer model):

```text
VALIDATION_ERROR        (Layer A)
DUPLICATE_SUBMISSION    (Layer A — idempotency)
SLOT_UNAVAILABLE        (Layer B)
FEATURE_DISABLED        (Layer B — action called while its flag is off)
INVALID_CANCELLATION_TOKEN (Layer B)
SYSTEM_BUSY             (Layer C — lock acquisition failed)
CALENDAR_ERROR          (Layer C)
SHEET_ERROR             (Layer C)
MAIL_ERROR              (Layer C)
INTERNAL_ERROR          (Layer C — unclassified)
```

---

## I. Reservation State Machine

```text
                 ┌───────────────────────────────────────┐
                 │              createReservation          │
                 └───────────────────┬─────────────────────┘
                                     ▼
                                 処理中  (row appended, pre-lock)
                                     │
                   ┌─────────────────┼──────────────────────┐
                   ▼ lock+slot+cal OK                        ▼ calendar create fails after lock
                受付済                                     要確認
                   │                                          │
        (customer submits cancellation request)      (manual staff review via Sheet)
                   ▼                                          │
            キャンセル依頼あり                     ── manually resolved back to ──▶ 受付済
                   │
   (future, NOT implemented in v1 — Decision 2)
                   ▼
              キャンセル済
```

Notes:
- A row is only ever created once the request has passed validation and
  idempotency checks — a rejected submission never reaches 処理中 (it's just
  an API error response, no row, no state).
- `キャンセル依頼あり` is a status value on the RESERVATIONS row; the
  authoritative detail of the request itself lives in CANCELLATION_REQUESTS
  (§C). This keeps "is this reservation cancellation-pending" a single glance
  on the RESERVATIONS tab while the request record can hold its own
  processing lifecycle (`受付` / `対応済`) independently.
- `キャンセル済` is listed for completeness/data-model readiness (Decision 2:
  "design the data model so automated cancellation can be added later") but
  no code path sets it in v1; today only a human manually retiring a row
  would use it.

---

## J. Calendar Availability Algorithm

Two-stage, matching the module boundaries in §D:

**Stage 1 — `SlotEngine.ts` (pure, no GAS globals, Jest-testable):**

```text
generateCandidateSlots(date, serviceDurationMinutes, businessHours, holidays, slotMinutes, minLeadHours, maxBookingDays, now)
  → string[] (HH:mm candidates)

1. Reject if date is a holiday (HOLIDAYS tab) or outside [now, now+maxBookingDays].
2. Look up businessHours for date's weekday; if "closed", return [].
3. Walk the open interval in `slotMinutes` steps; a candidate is valid only
   if [candidate, candidate+serviceDurationMinutes) fits entirely inside the
   open interval.
4. Drop any candidate earlier than now + minLeadHours.
5. Return the remaining candidates in chronological order.
```

**Stage 2 — `availability/*Strategy.ts` (thin, calls `Calendar.ts`):**

```text
filterByCalendar(candidates, date, serviceDurationMinutes, staffId | ANY_STAFF)
  → string[]

- SharedAvailabilityStrategy (features.staffSelection = false):
    fetch busy events for calendarId in [date 00:00, date 24:00),
    remove any candidate whose [start, start+duration) overlaps a busy event.

- StaffAvailabilityStrategy (features.staffSelection = true):
    if staffId is a specific id: same as above, against that staff's
      CalendarID (fallback to calendarId if blank).
    if staffId === ANY_STAFF: for each active staff in DisplayOrder,
      compute that staff's free candidates; a slot is available overall if
      at least one staff is free for it. getAvailableSlots returns the union;
      createReservation later re-resolves to the *specific* staff that is
      actually assigned (first free, in DisplayOrder), never leaves "ANY"
      persisted on the row.
```

`getAvailableSlots` = Stage 1 then Stage 2. `checkAvailability` runs the same
two stages narrowed to one candidate (fast path, used as the client's last
check right before submit — still not trusted; the authoritative re-check
happens under lock in `createReservation`, §K).

---

## K. Staff Selection Logic

Direct implementation of Decision 1:

- Configurable: `features.staffSelection` (CONFIG). When `false`:
  - `getStaff` returns `FEATURE_DISABLED`.
  - `staffId` is not accepted on `ReservationRequest` (ignored if sent).
  - Availability uses `SharedAvailabilityStrategy` against `calendarId` only.
  - Frontend must not render the staff-selection wizard step at all (a
    disabled feature is a UI-absent feature, not a greyed-out one — matches
    the "not have kiến trúc buộc mọi vertical show tính năng không cần" spirit
    of the global architecture rules).
- When `true`:
  - `getStaff` returns active staff, plus `anyAvailableOption` (from
    `staff.anyAvailableOption` CONFIG key).
  - Frontend renders a staff step with each staff member + (if enabled) an
    "Any available staff" (お任せ) choice, which serializes as
    `staffId: "ANY"`.
  - `StaffAvailabilityStrategy` handles both the specific-staff and
    any-available resolution as described in §J.
  - The concrete staff assigned for "ANY" is decided at `createReservation`
    time under lock (§L step 5), not at `getAvailableSlots` time, since the
    set of free staff can change between browsing and submitting.

This is the concrete instance of the Strategy pattern called for by the
availability module boundary — swapping `SharedAvailabilityStrategy` for
`StaffAvailabilityStrategy` (selected once, from CONFIG, at `Api.ts`
start-up) is the entire mechanism by which a non-staff vertical (e.g. a
future restaurant project) reuses this core without staff concepts leaking
into it.

---

## L. Cancellation-Request Workflow

Direct implementation of Decision 2 (no automatic Calendar cancellation in
v1; request is recorded and the owner is notified):

1. The reservation confirmation email (sent after `createReservation`
   succeeds) contains a cancellation link:
   `.../reservation/cancel?reservationId=RES-...&token=<cancellationToken>`.
   The link carries the token, **not** a lookup call — the cancel page
   renders straight from the query-string values already known (date, time,
   service — also included in the link as display-only params) rather than
   exposing a new "fetch reservation by id" read endpoint. This keeps the
   "no full self-service management" boundary literal: the page can only
   ever submit a cancellation, never browse or edit.
2. Customer confirms on that page (optionally adding a reason) →
   `requestCancellation` is called with `{ reservationId, cancellationToken, requesterName, requesterEmail, reason? }`.
3. Server validates:
   - `reservationId` exists.
   - `cancellationToken` matches the stored one exactly
     (`INVALID_CANCELLATION_TOKEN` otherwise — do not reveal whether the
     `reservationId` itself exists when the token is wrong).
   - Row status is not already `キャンセル依頼あり` or a terminal state
     (idempotent: a second identical request is accepted but does not
     duplicate the CANCELLATION_REQUESTS row — matches master §18's general
     duplicate-submission concern).
4. On success: append a CANCELLATION_REQUESTS row (`Status = 受付`), set the
   RESERVATIONS row `Status = キャンセル依頼あり`, `UpdatedAt = now`.
5. Notify the **business owner** by email (per Decision 2 — literal scope,
   no customer acknowledgement email is required here, unlike the Contact
   workflow in §M which explicitly does require one).
6. No Calendar event is touched. The owner manually cancels the Calendar
   event and later updates `CANCELLATION_REQUESTS.Status = 対応済` by hand
   (Sheet edit) — this manual step is intentionally out of API scope for v1.

---

## M. Email Workflow

| Trigger | Customer email | Owner email | Logged to EMAIL_LOG |
|---|---|---|---|
| `createReservation` → 受付済 | Yes — confirmation + cancellation link | Yes | Both |
| `createReservation` → 要確認 | **No** — never send a confirmation for a reservation that isn't actually confirmed (master §12) | Yes — distinct "needs attention" wording, links to the ERROR_LOG entry | Owner send only |
| `createInquiry` | Yes — acknowledgement (Decision 6) | Yes — notification (Decision 6) | Both |
| `requestCancellation` | No (out of Decision 2's literal scope) | Yes | Owner send only |

Rules:
- Email sends happen **outside** the `LockService` lock (§N step 9) and
  after persistence is fully complete — never before (master §12/§19,
  reinforced by the transaction flow requirement).
- A failed send (`MAIL_ERROR`) never rolls back the reservation/inquiry/
  cancellation-request that triggered it — the record already exists and
  must not be lost (master §18's "never silently lose a reservation",
  generalized here to inquiries and cancellation requests). The failure is
  written to EMAIL_LOG (`Status = Failed`, `ErrorMessage`) and ERROR_LOG.
- Emails never include internal identifiers beyond what the customer needs
  (no `SubmissionID`, no raw `CalendarEventID`) — master §13.

---

## N. Error Handling

Three layers exactly as master §17 defines them, mapped onto this project's
concrete checks:

- **Layer A — client validation** (mirrored, not trusted, in
  `web/lib/validation`): required fields, email format, phone format, valid
  date, `notes` length cap.
- **Layer B — business validation** (`Validation.ts`, delegating to
  vertical-specific rules where needed): outside business hours, holiday,
  slot unavailable, feature disabled for the requested action, invalid
  cancellation token, duplicate submission.
- **Layer C — infrastructure** (`Api.ts` catches; adapters throw typed
  errors, never raw exceptions, up to `Api.ts`): Sheets write failure,
  Calendar failure, Gmail failure, lock acquisition failure, missing/invalid
  CONFIG value.

`Api.ts` is the single boundary that:
1. Catches everything (no exception ever reaches the HTTP response raw).
2. Maps internal error objects to the `{code, message}` contract (§H),
   with Japanese `message` text and an internal-only `code`.
3. Writes an ERROR_LOG row for every Layer C error (and for Layer B errors
   worth auditing, e.g. repeated `SLOT_UNAVAILABLE` on the same slot, which
   may indicate a race rather than user error).
4. Never includes a stack trace or raw exception message in the
   client-facing response (master §16).

---

## O. Logging Strategy

GAS has no Serilog; the equivalent here is two layers:

1. **Execution transcript** (`console.log`/`console.error`, visible in Apps
   Script's own executions log) — for every action: action name,
   submissionId (not personal data), duration, outcome. Useful for live
   debugging, not durable/human-facing.
2. **ERROR_LOG sheet** — durable, human-visible-enough (business owner can
   at least see "something happened on this date") for every Layer C error
   and any Layer B error flagged as audit-worthy (see §N.3). This is the
   sheet a non-technical owner's operations guide (master §33) points them
   to when something looks wrong.

No personal data (email, phone, message content) is written to the
execution transcript — only to the sheets that already legitimately hold it
(RESERVATIONS, INQUIRIES, CANCELLATION_REQUESTS). `ContextJSON` in
ERROR_LOG may reference a `reservationId`/`inquiryId` but must not duplicate
the customer's contact details verbatim (master §20 "avoid leaking personal
data in logs").

---

## P. Spam / Idempotency Strategy

**Idempotency (`submissionId`):**
- Client generates a UUID once per form-fill (not per click) and reuses it
  across retries of the same logical submission.
- Before appending a row, `Api.ts` checks a `CacheService` entry keyed by
  `submissionId` (fast path, short TTL, e.g. 10 minutes) — if present,
  return the previously-recorded result (`reservationId`/`inquiryId`)
  without writing again (`DUPLICATE_SUBMISSION` semantics are hidden from
  the caller — it is not an error state, it is the same success response
  replayed).
- The Sheet itself is the durable backstop: `Api.ts` also checks the last
  N rows (or a maintained index) for a matching `SubmissionID` column value,
  covering the case where `CacheService` has already expired or the
  execution that set it never finished (e.g. GAS execution timeout).

**Spam protection (documented constraint, not invented capability):**
- GAS Web Apps do not reliably expose the caller's IP address — IP-based
  rate limiting is **not available** and this spec does not claim it is.
- Mitigations that are actually available and are used instead:
  - A honeypot field (hidden from real users via CSS, never rendered
    focusable) — any non-empty value on submit silently rejects as spam
    without revealing the check to the caller.
  - A minimum-fill-time check: client records form-open timestamp, submits
    it; server rejects submissions filled in under a low threshold
    (e.g. 3 seconds) as almost-certainly automated.
  - `submissionId` reuse itself doubles as a coarse per-browser-session
    throttle once combined with the honeypot/fill-time checks.
- Both mitigations apply to `createReservation` and `createInquiry`; neither
  applies to `requestCancellation` since it is gated behind an unguessable
  token already (§L).

---

## Q. Test Strategy

Direct implementation of Decision 3:

- **Unit tests (Jest + TypeScript):** every module in `gas/src` that
  contains no direct `SpreadsheetApp`/`CalendarApp`/`GmailApp`/`LockService`
  call — `SlotEngine`, `Validation`, `ReservationId`, both availability
  strategies (fed plain in-memory "busy events" arrays, not real Calendar
  reads), `ConfigStore`'s parsing logic (fed a plain 2D array standing in
  for sheet `getDataRange().getValues()` output, not a real Sheet).
- **No dependency-injection interfaces are introduced solely to enable
  testing** (explicit constraint from Decision 3) — the pure modules are
  already pure by construction (plain functions/classes over plain data),
  so no seam needs to be manufactured for them.
- **Google-service-calling modules stay thin** (`Sheets.ts`, `Calendar.ts`,
  `Mail.ts`, and the lock-acquisition portion of `Api.ts`): each is a
  near-literal wrapper over the corresponding GAS global service, ideally
  under ~10 lines per function, with the actual decision logic pushed into
  the pure modules that call them. These are covered by:
  - a manual integration test script (documented steps, run by hand against
    a sandbox Spreadsheet/Calendar/Gmail account before every deploy to a
    real customer), and
  - the manual E2E checklist already specified in master §29, extended with
    the cancellation and contact-form cases from Decisions 2 and 6.
- **Bundling:** `esbuild` bundles `gas/src/**` into a single `Code.gs` under
  `gas/build/`; Jest runs against the TypeScript sources directly (via
  `ts-jest` or esbuild-jest transform), never against the bundle.
- **Deployment:** `clasp push` deploys the contents of `gas/build/` (plus
  `appsscript.json`) to the bound Apps Script project.

---

## R. Deployment Structure

- One Apps Script project per environment, each with its own `.clasp.json`
  (gitignored — contains the target script ID):
  - **Portfolio/demo:** developer-owned Spreadsheet + Calendar + Gmail
    (master Principle 3 exception for portfolio work).
  - **Customer production:** an Apps Script project **bound to the
    customer's own Spreadsheet**, created under the customer's Google
    account/Workspace; the developer is granted editor/developer access
    only (master Principle 3).
- Frontend: Vercel project per environment, same ownership split (developer
  account for portfolio, customer's own Vercel account for production where
  practical, master §32).
- Build/deploy sequence (manual in Phase 0/1; CI can be added later, not
  required by any approved decision yet):
  ```text
  gas/:  npm run build (esbuild)  →  clasp push  →  clasp deploy (new version)
  web/:  vercel deploy (or git-push-triggered Vercel deploy)
  ```
- Environment separation (master Principle 4): demo data never touches a
  customer's production Sheet/Calendar/Gmail, enforced structurally by each
  environment being a genuinely separate Google account/Apps Script project,
  not a flag inside shared infrastructure.

---

## S. Customer Hand-off Considerations

- Ownership transfer follows master Principle 3 exactly: customer ends up
  owning the domain, Google account/Workspace, production Sheet, Calendar,
  Gmail, and (where practical) the Vercel project; the developer retains
  only the access needed to maintain the system.
- Because CONFIG (+ SERVICES/STAFF/HOLIDAYS tabs) is the single source of
  truth (§F), the following are changeable by the business owner **without
  any developer involvement or code change**:
  - business hours, holidays;
  - services (add/remove/reprice/rename, toggle `Active`);
  - staff (add/remove, toggle `Active`, toggle `staff.anyAvailableOption`);
  - whether staff selection is offered at all (`features.staffSelection`);
  - owner notification email address.
- What still requires developer involvement in v1 (documented honestly,
  not hidden): processing a cancellation request (manual Calendar deletion
  + `CANCELLATION_REQUESTS.Status` update), recovering a `要確認` row, and
  anything that would need a new CONFIG key or a new vertical's business
  rule module.
- A Japanese-language operations guide (master §33) must ship alongside
  Phase 1, covering: where to see reservations/inquiries/cancellation
  requests, how to edit hours/holidays/services/staff, how to change the
  notification email, what a `要確認` row means and what to do about it,
  and how to request maintenance. This guide is a Phase 1/Phase 6
  deliverable, not part of this Phase 0 spec.

---

## T. Module Boundary Check (§D of the request)

Verified against the directory structure in §B — no module violates its
assigned responsibility:

| Module | Responsibility | Confirmed scope |
|---|---|---|
| `Mail.ts` | Email sending only | Wraps `GmailApp.sendEmail`; does not decide *whether* to send (that's `Api.ts`) or *what template* beyond simple string templating passed in. |
| `Sheets.ts` | Google Sheets access only | Append/read/update row helpers per tab; no business rules, no validation. |
| `Calendar.ts` | Calendar event query/create adapter only | `getBusyEvents(calendarId, range)`, `createEvent(...)`; does not decide availability (that's the availability strategies). |
| `SlotEngine.ts` | Pure slot generation logic | Takes plain data in, returns plain candidate slots out; no GAS globals, no I/O — confirmed Jest-testable per §Q. |
| Availability strategy (`availability/*.ts`) | Availability calculation | Combines `SlotEngine` output with `Calendar.ts` busy-event reads; contains the staff-vs-shared branching (§J/§K), nothing else. |
| `Validation.ts` | Common validation + delegated vertical validation | Layer A/B checks (§N); delegates any truly vertical-specific rule to a small per-vertical validator it calls, never inlines vertical logic itself. |
| `Api.ts` | Orchestration, logging, error handling | Routes actions, owns the lock lifecycle (§U), calls the above modules in order, maps outcomes to the response contract (§H), writes ERROR_LOG — contains no Sheets/Calendar/Mail API calls of its own. |

`ConfigStore.ts` and the `models/`/`ids/` folders are intentionally left off
this table because they weren't named in the request's boundary list; they
sit alongside `Validation.ts`/`Api.ts` as supporting pure/adapter modules
respectively and don't overlap any of the seven named responsibilities.

---

## U. `createReservation` Transaction Flow (§E of the request)

```text
1. Validate request                         (Validation.ts, Layer A+B)
     └─ fail → return VALIDATION_ERROR / FEATURE_DISABLED, no row written

2. Validate idempotency / submissionId       (Api.ts + CacheService, §P)
     └─ already processed → return the SAME success response as before,
        no new row, no error surfaced to the caller

3. Append reservation row, Status = 処理中    (Sheets.ts)
     └─ if this write itself fails → SHEET_ERROR, no partial state exists
        (nothing to roll back — the row never existed)

4. Acquire LockService lock
     └─ fail to acquire (timeout) → SYSTEM_BUSY
        — the 処理中 row from step 3 is LEFT AS-IS (not deleted): a human
        can see it, and a subsequent retry with the same submissionId will
        be caught by step 2 as already-processed once step 3-9 eventually
        completes for it via a later successful attempt. If no later
        attempt ever completes, the row surfaces to the owner as a
        long-stuck 処理中 row via ERROR_LOG monitoring (§O) — never
        silently dropped.

5. Re-check availability under the lock      (availability strategy)
     └─ no longer available → mark row's Status update NOT needed (row
        stays 処理中 → immediately corrected to a rejected outcome: since
        master §12 requires no fake confirmation, this path returns
        SLOT_UNAVAILABLE and updates the row to a final, clearly-labeled
        non-success state rather than leaving 処理中 dangling — Status is
        set to 要確認 with an ERROR_LOG note "lost race, needs manual
        cleanup", since deleting rows is avoided (audit trail preference,
        master §11 human-readable Sheets). Release lock, return error.

     (If "ANY" staff was requested, this is also the point where a specific
     staffId is resolved — first free staff in DisplayOrder — and written
     onto the row in step 7.)

6. Create Calendar event                     (Calendar.ts)
     └─ fails → row stays 処理中 in the Sheet at this instant; go to step 7B

7A. (success path) Update Sheet row: CalendarEventID + Status = 受付済
                                                        (Sheets.ts)
7B. (calendar failure path) Update Sheet row: Status = 要確認, write
     ERROR_LOG entry with the exception detail                (Sheets.ts)
     — the reservation is NEVER lost: the row exists either way, just
       flagged for manual attention instead of confirmed.

8. Release lock                              (finally block, always runs,
                                               success or any failure above)

9. Send emails OUTSIDE the lock               (Mail.ts, §M)
     - 受付済ath → customer confirmation + owner notification
     - 要確認 path → owner "needs attention" email only, NEVER a customer
       confirmation (master §12)
     - a send failure here does not touch Sheet state again — already final
```

Failure-case summary (as required):

- **Lock failure → `SYSTEM_BUSY`.** Row from step 3 remains, uncorrupted.
- **Calendar failure after Sheet write → row marked `要確認` + ERROR_LOG.**
  Never silently lost.
- **Never silently lose a reservation:** every exit path from step 3 onward
  leaves a row in the Sheet with a truthful status; nothing is deleted.
- **Never send the customer a confirmation email before persistence is
  fully complete:** step 9 only sends the customer email on the `受付済`
  branch, which is only reached after steps 3–7A have all succeeded.

---

## V. Frontend Configuration Access (§F of the request)

- The frontend obtains all business configuration through a single
  `getConfig` call (§G/§H), made once per page load (or cached briefly
  client-side) — never by hard-coding business hours, holidays, feature
  flags, or reservation settings into the Next.js bundle.
- `web/config/` (see §B) holds **presentation-only** values: theme tokens
  (colors/spacing per the global UI rules), static copy that is not
  business-configurable (e.g. section headings), image/icon paths. It must
  never contain business hours, pricing, staff names, or feature flags —
  those always come from `getConfig`/`getServices`/`getStaff` at runtime.
- `SERVICES` and `STAFF` are fetched via their own actions (§G), not part of
  `getConfig`'s payload (rationale in §D) — but both are still entirely
  CONFIG-sheet-driven from the business owner's point of view; the split is
  an API-shape decision, not a "some of this is hard-coded" exception.

---

## Explicit Classification (§C of the request)

**Generic / reusable across future verticals (restaurant, consultant, etc.):**
- `Code.ts`, `Api.ts` (orchestration shape), `Validation.ts` (common part),
  `Sheets.ts`, `Calendar.ts`, `Mail.ts`, `ConfigStore.ts`, `Utils.ts`,
  `ids/ReservationId.ts`, the `AvailabilityStrategy` interface itself, the
  API envelope (§H), the state-machine *shape* (processing → confirmed /
  needs-review), the idempotency mechanism (§P), the spam mitigations (§P),
  the email-outside-lock rule, the Sheets tab set for
  `EMAIL_LOG`/`ERROR_LOG`, and the overall directory layout (§B).

**Salon-specific (Project 1 only):**
- `StaffAvailabilityStrategy`'s specific "any available, first free in
  DisplayOrder" resolution policy (a restaurant vertical will likely use a
  capacity-based strategy instead, not this one);
  the `SERVICES`/`STAFF` sheet shapes as salon menu/stylist concepts
  specifically (a restaurant vertical would use `SERVICES` for courses and
  would not need `STAFF` at all — this is exactly what `features.staffSelection = false` is for);
  all Japanese copy specific to the salon vertical;
  the reservation form's specific step order (service → staff → date/time).

**Belongs in CONFIG (business owner editable, no code change):**
- Everything listed in §C's CONFIG/SERVICES/STAFF/HOLIDAYS tabs, in full —
  this is the complete list, not a partial example.

**Must NOT be hard-coded (explicit negative list):**
- Business hours, holidays, slot length, lead time, booking horizon,
  timezone string beyond the `Asia/Tokyo` default assumption itself, owner
  notification address, whether staff selection is offered, whether the
  "any available staff" option is offered, the shared/fallback calendar ID,
  any service/staff data (names, durations, prices, active status).

---

## Open Items Deferred Past Phase 0 (not decisions needed now, just named)

- Automated Calendar cancellation (Decision 2 explicitly defers this; data
  model in §C/§I is ready for it).
- Multi-service bookings (Decision 5 explicitly defers this).
- A CI pipeline for the manual integration tests in §Q (nothing in the six
  decisions requires this yet).
- The Japanese operations guide content itself (master §33) — a Phase 1/6
  deliverable, structure only acknowledged here (§S).

---

**This document produces no code and touches no existing file other than
itself. Awaiting approval before Phase 1 implementation begins.**
