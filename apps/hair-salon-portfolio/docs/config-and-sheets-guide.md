# Config & Sheets Guide — atelier ito (hair-salon-portfolio)

Technical reference for the Google Sheets spreadsheet that drives this app.
Every claim here is taken directly from the code in `apps/hair-salon-portfolio/gas/src/`
— file/line references are given so you can verify them yourself.

This app is a standalone deployment: its own Spreadsheet, its own GAS Web
App, its own Calendar. Nothing here is shared with `apps/salon-portfolio`.

## 1. The 9 sheet tabs

The spreadsheet must contain exactly these 9 tabs, named exactly as below
(`gas/src/SheetNames.ts:6-16`). Every tab name is read from this constant —
never hand-type a tab name into code. Headers must match exactly (character
for character) — they are validated before any row is read
(`gas/src/SheetSchemas.ts:212-222`, "missing headers" detection).

### CONFIG
Headers (`gas/src/SheetSchemas.ts:4`): `Key`, `Value`, `Description`

One row per setting. See §2 below for the full key list. `Description` is
free text for the sheet editor's own reference — the app never reads it.

### HOLIDAYS
Headers (`gas/src/SheetSchemas.ts:12`): `Date`, `Label`

One row per closed date. `Date` must be `YYYY-MM-DD`. `Label` is optional
free text (e.g. a holiday name); the app does not require it.

### SERVICES
Required headers (`gas/src/SheetSchemas.ts:19-27`): `ServiceID`, `Name`,
`DurationMinutes`, `Price`, `Active`, `StaffRequired`, `DisplayOrder`

Optional headers (`gas/src/SheetSchemas.ts:34`, added for richer Menu
display — safe to omit, a sheet without them still works):
`Description`, `Category`

One row per service (haircut, color, perm, etc.). See §3 below for how to
edit this safely.

### STAFF
Required headers (`gas/src/SheetSchemas.ts:48-54`): `StaffID`, `Name`,
`Active`, `CalendarID`, `DisplayOrder`

Optional headers (`gas/src/SheetSchemas.ts:62`, safe to omit): `Role`,
`Bio`, `ImagePath`

One row per stylist. `ImagePath`, when used, must point at a file already
placed under `apps/hair-salon-portfolio/web/public/images/staff/` (e.g.
`/images/staff/staff-05.jpg`) — it is never an arbitrary external URL
(`gas/src/SheetSchemas.ts:56-61`). See §3 below.

### RESERVATIONS
Headers (`gas/src/SheetSchemas.ts:76-93`): `ReservationID`, `SubmissionID`,
`CreatedAt`, `UpdatedAt`, `Name`, `Email`, `Phone`, `Date`, `Time`,
`ServiceID`, `StaffID`, `Notes`, `Status`, `CalendarEventID`, `EmailStatus`,
`CancellationToken`

Written automatically by the reservation flow. Do not hand-edit rows here
while the app is live — treat it as a log of what the system created.

### CANCELLATION_REQUESTS
Headers (`gas/src/SheetSchemas.ts:114-125`): `CancellationRequestID`,
`ReservationID`, `RequestedAt`, `RequesterName`, `RequesterEmail`, `Reason`,
`Status`, `ProcessedAt`, `ProcessedBy`, `Notes`

Written automatically when a customer requests a cancellation.

### INQUIRIES
Headers (`gas/src/SheetSchemas.ts:140-151`): `InquiryID`, `SubmissionID`,
`CreatedAt`, `Name`, `Email`, `Phone`, `Subject`, `Message`, `Source`,
`Status`

Written automatically by the contact-form flow.

### EMAIL_LOG
Headers (`gas/src/SheetSchemas.ts:166-176`): `EmailLogID`, `CreatedAt`,
`RelatedType`, `RelatedID`, `RecipientType`, `RecipientEmail`, `Subject`,
`Status`, `ErrorMessage`

Every notification email the system attempts (customer + owner, reservation
+ inquiry) is logged here, success or failure. Useful for confirming an
email actually went out.

### ERROR_LOG
Headers (`gas/src/SheetSchemas.ts:191-199`): `ErrorID`, `CreatedAt`,
`Action`, `Message`, `Stack`, `ContextJSON`, `Severity`

Internal error log. By design it never stores secrets or raw personal data
— `ContextJSON` may reference an ID but never contact details
(`gas/src/SheetSchemas.ts:189-190`).

All 9 tabs can be created with the correct headers (and CONFIG/HOLIDAYS/
SERVICES/STAFF pre-filled with the atelier ito demo data) by running the
`setupDemoSheets` function once from the Apps Script editor — see
`deployment.md`. It never overwrites or deletes an existing tab
(`gas/src/SetupDemoSheets.ts:5-7`).

## 2. CONFIG key namespace

Every key below is read from the CONFIG sheet's `Key`/`Value` columns by
`gas/src/ConfigParser.ts`. "Required" means: if the key is missing or
empty, `parseAppConfig` returns `{ ok: false }` and the whole config fails
to load (no partial/fallback config is ever used) — see
`gas/src/ConfigParser.ts:158-163, 247-249`. "Optional" keys simply resolve
to `undefined` and the app falls back to a built-in default at the point
where they're used.

| Key | Type | Required | Purpose |
|---|---|---|---|
| `business.name` | string | **Required** | Business name shown on the site (`ConfigParser.ts:198`). |
| `business.phone` | string | **Required** | Business phone number shown on the site (`ConfigParser.ts:199`). |
| `business.email` | string | **Required** | Business contact email shown on the site. Sent to the browser as part of the public config — see the warning at the end of this section. (`ConfigParser.ts:200`) |
| `business.address` | string | **Required** | Street address shown on the site (`ConfigParser.ts:201`). |
| `business.nameLatin` | string | Optional | Romanized business name, e.g. "atelier ito" (`ConfigParser.ts:205`). |
| `business.tagline` | string | Optional | Short tagline/catchphrase (`ConfigParser.ts:206`). |
| `business.postalCode` | string | Optional | Postal code shown alongside the address (`ConfigParser.ts:207`). |
| `hours.monday` | string | **Required** | Monday hours, `"HH:MM-HH:MM"` or `"closed"` (`ConfigParser.ts:210-218`). |
| `hours.tuesday` | string | **Required** | Same format, Tuesday. |
| `hours.wednesday` | string | **Required** | Same format, Wednesday. |
| `hours.thursday` | string | **Required** | Same format, Thursday. |
| `hours.friday` | string | **Required** | Same format, Friday. |
| `hours.saturday` | string | **Required** | Same format, Saturday. |
| `hours.sunday` | string | **Required** | Same format, Sunday. |
| `reservation.timezone` | string | **Required** | Must be exactly `"Asia/Tokyo"` — any other value fails validation (`ConfigParser.ts:220-227`, `ConfigValidator.ts:32-37`). |
| `reservation.slotMinutes` | number | **Required** | Length of one bookable time slot, in minutes (`ConfigParser.ts:228`). |
| `reservation.minLeadHours` | number | **Required** | Minimum hours of advance notice required to book (`ConfigParser.ts:229`). |
| `reservation.maxBookingDays` | number | **Required** | How many days into the future a customer can book (`ConfigParser.ts:230`). |
| `features.contactForm` | boolean | **Required** | Turns the contact/inquiry form on or off (`ConfigParser.ts:234`). |
| `features.reservation` | boolean | **Required** | Turns the reservation flow on or off (`ConfigParser.ts:235`). |
| `features.staffSelection` | boolean | **Required** | Whether customers can pick a specific stylist (`ConfigParser.ts:236`). |
| `features.calendar` | boolean | **Required** | Whether confirmed reservations are written to Google Calendar (`ConfigParser.ts:237`). |
| `features.emailNotification` | boolean | **Required** | Whether confirmation/notification emails are sent (`ConfigParser.ts:238`). |
| `staff.anyAvailableOption` | boolean | **Required** | Whether customers can choose "no preference / any available stylist" instead of naming one. Must not be `true` while `features.staffSelection` is `false` (`ConfigParser.ts:241`, `ConfigValidator.ts:92-97`). |
| `calendar.id` | string | **Required** | Fallback/shared Google Calendar ID reservations are written to when a staff row has no `CalendarID` of its own. Internal only — never sent to the browser (`ConfigParser.ts:242`, `models/Config.ts:114-115`). |
| `email.ownerNotifyAddress` | string | **Required** | The actual mailbox that receives owner-facing reservation and inquiry notifications (`ConfigParser.ts:243`, used at `Api.ts:536,543,810`). Internal only — never sent to the browser. See the warning below; do not confuse this with `business.email`. |
| `email.fromName` | string | **Required** | Display "From" name used on outgoing notification emails (`ConfigParser.ts:244`). Internal only — never sent to the browser. |
| `social.instagram` | string (URL) | Optional | Instagram link. Omit or leave blank to hide it (`ConfigParser.ts:105-126`). |
| `social.line` | string (URL) | Optional | LINE link. Omit or leave blank to hide it. |
| `social.x` | string (URL) | Optional | X (Twitter) link. Omit or leave blank to hide it. |
| `social.facebook` | string (URL) | Optional | Facebook link. Omit or leave blank to hide it. |
| `labels.service` | string | Optional | Overrides the word used for "service/menu item" in the UI, for reuse outside hair salons (`ConfigParser.ts:135`). |
| `labels.bookingCta` | string | Optional | Overrides the reservation call-to-action wording (`ConfigParser.ts:136`). |
| `labels.inquiryMessage` | string | Optional | Overrides the inquiry-form message-field label (`ConfigParser.ts:137`). |
| `content.heroSubheadline` | string | Optional | Hero section subheadline copy (`ConfigParser.ts:145`). |
| `content.conceptEyebrow` | string | Optional | Small heading above the Concept section title (`ConfigParser.ts:146`). |
| `content.conceptTitle` | string | Optional | Concept section title (`ConfigParser.ts:147`). |
| `content.conceptParagraph1` | string | Optional | Concept section, first paragraph (`ConfigParser.ts:148`). |
| `content.conceptParagraph2` | string | Optional | Concept section, second paragraph (`ConfigParser.ts:149`). |
| `content.serviceSubtitle` | string | Optional | Subtitle shown above the Menu/services list (`ConfigParser.ts:150`). |
| `content.ctaHeading` | string | Optional | Reservation CTA band heading (`ConfigParser.ts:151`). |
| `content.ctaMessage` | string | Optional | Reservation CTA band message (`ConfigParser.ts:152`). |
| `content.ctaClosingHeading` | string | Optional | Closing CTA band heading (`ConfigParser.ts:153`). |
| `content.ctaClosingMessage` | string | Optional | Closing CTA band message (`ConfigParser.ts:154`). |

Every optional key falls back to a built-in default wherever it's used, so
a CONFIG sheet that only has the required keys still works.

### `business.email` vs. `email.ownerNotifyAddress` — do not confuse these

These are two different keys with two different visibility rules, and it's
easy to mix them up:

- **`business.email`** is the business's own public contact email. It is
  part of `business`, and `business` is copied through unchanged into the
  public config response (`gas/src/PublicConfig.ts:6-18`, `business:
  config.business`) — so **this address is visible in the browser** (it is
  meant for display on the site).
- **`email.ownerNotifyAddress`** is the mailbox that actually receives
  reservation/inquiry owner-notification emails
  (`gas/src/Api.ts:536,543,810`). It is one of the three fields
  `buildPublicConfig` deliberately omits (`PublicConfig.ts:6-18` only
  copies `business`, `hours`, `holidays`, `features`,
  `staffAnyAvailableOption`, `reservation`, `socialLinks`, `labels`,
  `content` — `calendarId`, `emailOwnerNotifyAddress`, and `emailFromName`
  are left out on purpose, per the type definition at
  `models/Config.ts:119-122`). **This address is never sent to the
  browser.**

In the demo data both happen to be set to the same placeholder
(`owner@example.com`, `gas/src/DemoSeed.ts:36,59`) — set them to different
real addresses in production if the salon's public contact email should
differ from the mailbox that should receive booking/inquiry alerts.

## 3. Editing SERVICES and STAFF

Both sheets are read fresh on every request — there is no caching step to
restart or redeploy after an edit (`gas/src/Catalog.ts:24-46`).

**To add a service:** add a new row to SERVICES with a unique `ServiceID`
(e.g. `SV006`), `Name`, `DurationMinutes` (integer minutes), `Price`
(integer, no currency symbol), `Active` set to `TRUE`, `StaffRequired`
(`TRUE` if a stylist must be picked for this service, `FALSE` otherwise),
and a `DisplayOrder` number controlling where it appears in the list.
`Description` and `Category` are optional and can be left blank.

**To hide a service without deleting it:** set its `Active` cell to
`FALSE`. It stops appearing to customers but the row (and its history in
RESERVATIONS) is preserved.

**To change a price or duration:** edit the `Price` or `DurationMinutes`
cell directly — takes effect immediately, no code change.

**To add a stylist:** add a new row to STAFF with a unique `StaffID` (e.g.
`ST005`), `Name`, `Active` set to `TRUE`, an optional `CalendarID` (leave
blank to fall back to the CONFIG `calendar.id`), and a `DisplayOrder`.
`Role`, `Bio`, and `ImagePath` are optional; if used, `ImagePath` must
point at an image already committed under
`apps/hair-salon-portfolio/web/public/images/staff/`.

**To remove a stylist from the roster without deleting their row:** set
`Active` to `FALSE`.

## 4. Related docs

- `owner-guide.md` — the same information above, written for the salon
  owner in plain language, plus the end-to-end reservation/inquiry flow.
- `deployment.md` — how this app's Spreadsheet, GAS Web App, Calendar, and
  Next.js deployment are provisioned and connected.
