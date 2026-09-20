# Site Report — Start Here

This is the setup and operations handbook for `apps/site-report`: a LIFF
(LINE Front-end Framework) 現場報告アプリ (site report app) MVP. It takes you
from a clean machine to a real, working end-to-end submission — LINE login
→ site selection → report + photos → Google Sheets/Drive + admin email.

**Who this is for**: a developer comfortable with TypeScript/Next.js/Google
Apps Script, who has never used LIFF or the LINE Developers console before.

**What this is not**: a design/architecture document (see
[`docs/site-report-architecture-overview.md`](../../docs/site-report-architecture-overview.md)
for that — this handbook links to it instead of repeating it) or a
manual-QA report (the device-testing sections below are a script to follow,
not a claim that testing has already happened).

**How to read this**: top to bottom, once, for a first setup. After that,
use the table of contents to jump to whichever part you need — most people
come back for [Troubleshooting](#14-troubleshooting) or
[Environment Variables](#8-environment-variables).

## Table of contents

1. [The big picture](#1-the-big-picture)
2. [What is LIFF?](#2-what-is-liff)
3. [Prerequisites](#3-prerequisites)
4. [Project structure — where to look](#4-project-structure--where-to-look)
5. [Part A — Google Sheets & Drive setup](#5-part-a--google-sheets--drive-setup)
6. [Part B — GAS setup & deployment](#6-part-b--gas-setup--deployment)
7. [Part C — LINE Developers & LIFF setup](#7-part-c--line-developers--liff-setup)
8. [Environment variables](#8-environment-variables)
9. [Part D — local development](#9-part-d--local-development)
10. [Local browser testing vs. real LIFF testing](#10-local-browser-testing-vs-real-liff-testing)
11. [Part E — Vercel deployment](#11-part-e--vercel-deployment)
12. [Part F — first real end-to-end test](#12-part-f--first-real-end-to-end-test)
13. [Part G — real device testing](#13-part-g--real-device-testing)
14. [Troubleshooting](#14-troubleshooting)
15. [Debugging flow](#15-debugging-flow)
16. [Security notes](#16-security-notes)
17. [Customer / Coconala deployment](#17-customer--coconala-deployment)
18. [Clean-install self-check](#18-clean-install-self-check)
19. [Where to go next](#19-where-to-go-next)

---

## 1. The big picture

```text
                              LINE app
                                 │
                                 ▼
                        LIFF application shell
                    (LINE opens this URL for you)
                                 │
                                 ▼
                     Next.js Web App (apps/site-report/web)
                                 │
                ┌────────────────┴────────────────┐
                │                                  │
                ▼                                  ▼
        LINE profile (LIFF SDK,               GAS Web App
        runs in the browser)             (apps/site-report/gas)
                │                                  │
                │                    ┌─────────────┼─────────────┐
                │                    ▼             ▼             ▼
                │              Google Sheets  Google Drive    Gmail
                │              (SITES/REPORTS/  (report      (admin
                │               REPORT_PHOTOS/   photos)      notification
                │               CONFIG)                        email)
                │
                └──────────────────────→ lineUserId (sent as part
                                          of the report submission)
```

| Component | Owns | Lives in |
|---|---|---|
| **LINE** | The app itself (LINE client, Android/iOS/desktop) | Not part of this repo |
| **LIFF** | Running the web app inside LINE's in-app browser, exposing a LINE profile to it | Configured in the LINE Developers console; consumed by `lib/liff.ts` |
| **Next.js Web App** | The actual UI — LIFF login screen, site picker, report form, photo pipeline, calling the GAS backend | `apps/site-report/web` |
| **GAS Web App** | Business logic: validating a submission, resolving the site, uploading photos, writing rows, sending the admin email | `apps/site-report/gas` |
| **Google Sheets** | CONFIG, SITES, WORKERS (defined, not yet used by any action), REPORTS, REPORT_PHOTOS | One spreadsheet you create |
| **Google Drive** | Stores the uploaded report photos | One folder you create |
| **Gmail** | Sends the admin notification email after a successful submission (`GmailApp.sendEmail`, via `AdminNotification.ts`/`Mail.ts`) | Same Google account as the Sheets/Drive |

Full design rationale, every task's decisions, and the current list of
deferred features live in
[`docs/site-report-architecture-overview.md`](../../docs/site-report-architecture-overview.md).
This handbook only covers **how to get it running and keep it running**.

---

## 2. What is LIFF?

If you have never touched LINE development, start here.

**LIFF** = **L**INE **F**ront-end **F**ramework. It is LINE's way of
running a normal web application *inside* the LINE app, and letting that
web application know which LINE user opened it.

```text
LINE user
   │  taps a LIFF link/button inside LINE
   ▼
LINE opens a LIFF app
   │  (really: it opens a URL, in an embedded browser, and injects
   │   a small SDK — @line/liff — that the page can call)
   ▼
The page calls liff.init() → liff.getProfile()
   │
   ▼
The page now has: profile.userId, profile.displayName, ...
   │
   ▼
Site Report web app uses profile.userId as the report's
"submitted by" identity (lineUserId)
```

Concretely, in this project: `apps/site-report/web` **is a normal Next.js
application**. The only LIFF-specific code is `lib/liff.ts`, which calls
`liff.init()`/`liff.isLoggedIn()`/`liff.login()`/`liff.getProfile()` and
turns the result into this app's own types (`LiffState`,
`SiteReportLiffUser`). Nothing else in the app is allowed to touch the raw
`@line/liff` SDK.

**What LIFF is *not*:**

- It is **not** the GAS backend — GAS is a completely separate Google
  Apps Script Web App, reached over a normal HTTPS `fetch`, unrelated to
  LIFF.
- It is **not** Google Sheets, Drive, or a database.
- It is **not** the Next.js application itself — it is the *mechanism*
  LINE uses to open that application and hand it a logged-in user.
- It does **not** replace this project's own API layer
  (`lib/api/siteReportWorkflows.ts`) — LIFF only ever produces a LINE
  profile; every `GET_SITES`/`SUBMIT_REPORT` call still goes through this
  app's own GAS client, independent of LIFF.

One more mental model, matching this app's actual code path:

```text
mount SiteReportScreen
  → initializeSiteReportLiff()        (lib/liff.ts)
      → login-required → user taps "LINEでログイン" → loginToSiteReport()
      → ready { profile }             (profile.userId, profile.displayName)
                → getSites()          (lib/api/siteReportWorkflows.ts — NOT LIFF)
                → user fills the form + photos
                → submitReport(...)   (lib/api/siteReportWorkflows.ts — NOT LIFF)
                      → lineUserId: profile.userId   (the one thing LIFF
                                                       contributes to the
                                                       submitted payload)
```

---

## 3. Prerequisites

### Required for development

| Item | Why |
|---|---|
| Node.js 20+ and npm | Runs both `web` (Next.js) and `gas` (esbuild/Jest/clasp) |
| Git | Repository access |
| A Google account | Owns the Sheets/Drive/Apps Script project |
| A personal LINE account | Needed later, to actually test LIFF login on a device |

### Required for the Google integration (GAS backend)

| Item | Why |
|---|---|
| A Google Spreadsheet | Holds CONFIG/SITES/WORKERS/REPORTS/REPORT_PHOTOS (§5) |
| A Google Drive folder | Destination for uploaded report photos |
| Google Apps Script (via [clasp](https://github.com/google/clasp)) | Hosts and deploys the backend as a Web App |

### Required only for real LIFF testing (not for local UI development)

| Item | Why |
|---|---|
| A LINE Developers account | To create a Provider / LINE Login Channel / LIFF app |
| A LIFF app + LIFF ID | Required for `liff.init()` to succeed at all |
| An HTTPS deployment of the Next.js app | LIFF's endpoint URL must be HTTPS — `localhost` cannot be opened from inside the real LINE app |
| A phone with the LINE app installed | To actually open the LIFF app as a real user |

### Optional

| Item | Why |
|---|---|
| A Vercel account | The natural way to get an HTTPS deployment of `apps/site-report/web` (§11) — any other HTTPS host works too, this project has no Vercel-specific code |

Nothing here is invented beyond what the current code actually needs — see
§5–§7 for exactly which values each of these turns into.

---

## 4. Project structure — where to look

```text
apps/site-report/
├── START_HERE.md              ← you are here
├── web/                        Next.js frontend (LIFF host)
│   ├── app/
│   │   ├── page.tsx             renders <SiteReportScreen /> (Server Component)
│   │   ├── layout.tsx           root HTML shell, <title>現場報告アプリ</title>
│   │   └── api/health/route.ts  GET liveness check
│   ├── components/site-report/
│   │   ├── SiteReportScreen.tsx  the whole screen's state machine (Client Component)
│   │   ├── SitePicker.tsx        renders the list of sites from GET_SITES
│   │   ├── ReportEntryShell.tsx  site confirmation + form + photos + submit button
│   │   ├── ReportForm.tsx        the 4 editable report fields
│   │   ├── PhotoUploader.tsx     file input + per-selection errors
│   │   ├── PhotoPreviewList.tsx  thumbnails + remove button
│   │   ├── reportDraft.ts        ReportDraft type + pure draft-mutation helpers
│   │   ├── reportValidation.ts   pure client-side field validation (UX only)
│   │   ├── photoValidation.ts    client-side MIME/size policy (UX only, not a GAS rule)
│   │   ├── photoCompression.ts   canvas-based resize/re-encode
│   │   ├── photoPipeline.ts      orchestrates validate+compress for a whole selection
│   │   ├── submitReportMapper.ts ReportDraft + site + profile → SubmitReportInput
│   │   └── submission.ts         calls submitReport(), turns the result into UI state
│   ├── lib/
│   │   ├── liff.ts               the ONLY file allowed to call the raw @line/liff SDK
│   │   └── api/
│   │       ├── siteReportClient.ts     generic POST {action,payload} → GAS
│   │       └── siteReportWorkflows.ts  typed getSites()/submitReport()
│   ├── types/
│   │   ├── api.ts                hand-mirrored GAS request/response contracts
│   │   └── liff.ts                LiffState/SiteReportLiffUser/LiffError
│   └── .env.example               documents both env vars (§8)
│
├── gas/                         Google Apps Script backend (construction domain)
│   ├── src/
│   │   ├── index.ts              doGet/doPost entrypoints only — no logic here
│   │   ├── Api.ts                action dispatch (GET_SITES/SUBMIT_REPORT) + error mapping
│   │   ├── SubmitReportService.ts the whole validate→resolve→upload→persist→notify workflow
│   │   ├── SitesRepository.ts    reads+maps+validates the SITES sheet
│   │   ├── ReportsRepository.ts  appends REPORTS/REPORT_PHOTOS rows
│   │   ├── DriveStorage.ts       uploads/trashes a photo in Drive
│   │   ├── AdminNotification.ts  builds the admin email content
│   │   ├── Mail.ts               thin GmailApp.sendEmail wrapper
│   │   ├── ConfigStore.ts / ConfigParser.ts / Config.ts   CONFIG sheet → SiteReportConfig
│   │   ├── SheetStore.ts         thin SpreadsheetApp adapter (reads the SPREADSHEET_ID Script Property)
│   │   ├── SheetNames.ts / SheetSchemas.ts   sheet names + required headers, all 5 tabs
│   │   ├── RowMapper.ts          generic row↔object mapping (shared convention with salon-portfolio)
│   │   ├── Validation.ts         business-rule validation per sheet row
│   │   ├── models/               Site, Worker, Report, ReportPhoto, SubmitReportInput
│   │   └── ids/ReportId.ts       reportId/photoId generation
│   ├── appsscript.json           Web App deployment manifest (§6)
│   └── .clasp.json.example       template for the real, gitignored .clasp.json
│
└── (this file's sibling: docs/site-report-architecture-overview.md,
    at the repo root, has the full design history per task)
```

**When something goes wrong, start from the symptom and work backward
through this list** — §15 turns this into an explicit flow.

---

## 5. Part A — Google Sheets & Drive setup

### 5.1 What you need to create

| Resource | Required? | Purpose |
|---|---|---|
| One Google Spreadsheet | **Yes** | Holds all 5 sheets below |
| `CONFIG` sheet/tab | **Yes** | App configuration (business name, admin email, Drive folder, timezone) |
| `SITES` sheet/tab | **Yes** | The list of construction sites a worker can pick from |
| `WORKERS` sheet/tab | Schema-defined, **not currently read or written by any code path** | Reserved for a future "linked worker" feature (`workerId` is optional and never looked up today — create the tab for future-proofing, but nothing breaks today if you skip it) |
| `REPORTS` sheet/tab | **Yes** | Every submitted report is appended here |
| `REPORT_PHOTOS` sheet/tab | **Yes, once any report includes a photo** | One row per uploaded photo — only touched when `photos.length > 0` for a submission |
| One Google Drive folder | **Yes** | Destination for uploaded photos (`CONFIG`'s `DRIVE_ROOT_FOLDER_ID`) |
| A Script Property named `SPREADSHEET_ID` | **Yes** | Tells the standalone Apps Script project which spreadsheet to open (there is no "active spreadsheet" for a Web App request) |

### 5.2 Exact sheet headers (row 1)

These come directly from `apps/site-report/gas/src/SheetSchemas.ts` — extra
columns are always tolerated (only the presence of these is checked), but
these exact header names, spelled exactly like this, must exist:

**`CONFIG`** (two columns, human-editable key/value pairs):

| Key | Value |
|---|---|

**`SITES`**:

`siteId | siteCode | name | address | clientName | status | startDate | endDate | createdAt | updatedAt`

- `status` must be exactly `ACTIVE` or `INACTIVE` for **every** row — if
  even one row in `SITES` has an empty/blank/other status value (or any
  other required field empty/malformed), **the entire `GET_SITES` call
  fails for every user**, not just that one row (see §14).
- `siteId`, `siteCode`, `name`, `status`, `createdAt`, `updatedAt` are
  required; `address`, `clientName`, `startDate`, `endDate` are optional.
- `createdAt`/`updatedAt` must be a valid ISO 8601 timestamp; `startDate`/
  `endDate`, if present, must be `YYYY-MM-DD`.

**`WORKERS`** (create for future use — not read anywhere today):

`workerId | lineUserId | displayName | email | role | status | createdAt | updatedAt`

**`REPORTS`** (written by the backend — you do not fill this in yourself):

`reportId | siteId | workerId | lineUserId | workerName | reportDate | workType | comment | photoCount | status | createdAt | updatedAt`

**`REPORT_PHOTOS`** (written by the backend):

`photoId | reportId | fileId | fileUrl | fileName | mimeType | createdAt`

### 5.3 Required `CONFIG` rows

Every one of these is a required, non-empty string — `ConfigParser.ts`
only checks presence, no format/semantic validation (an invalid email
shape or non-IANA timezone name is not rejected):

| Key | Example value | Used for |
|---|---|---|
| `BUSINESS_NAME` | `Acme Construction` | Included nowhere in the current API responses, but required to be present — kept for consistency with the shared CONFIG convention and available for a future notification/report template |
| `ADMIN_EMAIL` | `admin@example.com` | Where the post-submission notification email is sent (`GmailApp.sendEmail`) |
| `DRIVE_ROOT_FOLDER_ID` | `1AbCdEfGhIjKlMnOpQrStUvWxYz` | The Google Drive folder ID report photos are uploaded into |
| `TIMEZONE` | `Asia/Tokyo` | Present as a required key; not currently read by any date-formatting code in this app (dates are handled as calendar-date strings, not timezone-converted) |

A duplicate `Key` row: the first occurrence wins, later duplicates are
silently ignored. A `Key` outside this list is silently ignored (never
rejected) — so you can add your own descriptive/notes columns freely.

### 5.4 Getting `DRIVE_ROOT_FOLDER_ID`

1. In Google Drive, create (or pick) a folder for report photos.
2. Open it; the URL looks like
   `https://drive.google.com/drive/folders/<FOLDER_ID>`.
3. Copy `<FOLDER_ID>` into the `CONFIG` sheet's `DRIVE_ROOT_FOLDER_ID` row.
4. Make sure the Google account that will run the deployed Web App (see
   §6's "execute as" setting) has edit access to this folder.

### 5.5 Getting `SPREADSHEET_ID` and setting the Script Property

1. Open your spreadsheet; the URL looks like
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.
2. Copy `<SPREADSHEET_ID>`.
3. In the Apps Script editor (opened from §6 below): **Project Settings**
   (the gear icon) → **Script Properties** → **Add script property** →
   name it exactly `SPREADSHEET_ID`, value = the ID you copied.

> The exact console labels ("Project Settings", "Script Properties") can
> change over time — if you don't see this option where described, look
> for the current Apps Script editor's equivalent settings/properties
> panel for the same concept: a key/value pair the running script can read
> via `PropertiesService.getScriptProperties()`.

---

## 6. Part B — GAS setup & deployment

### 6.1 Install and build

```bash
cd apps/site-report/gas
npm install
npm run typecheck   # tsc --noEmit
npm test            # Jest — runs against src/**/*.ts directly, never the built bundle
npm run build        # esbuild -> build/Code.js + build/appsscript.json
```

### 6.2 Connect to a real Apps Script project

`.clasp.json` is gitignored (it holds a real Apps Script project ID) —
`.clasp.json.example` is the template:

```json
{
  "scriptId": "REPLACE_WITH_YOUR_APPS_SCRIPT_PROJECT_ID",
  "rootDir": "build"
}
```

Two ways to get a real one:

```bash
npx clasp login                                              # once per machine/account
npx clasp create --type webapp --title "Site Report" --rootDir build
# — or, to attach to an Apps Script project that already exists —
cp .clasp.json.example .clasp.json    # then edit in the real scriptId
```

### 6.3 Push the code

```bash
npm run push         # = npm run build && clasp push
```

This uploads `build/Code.js` (the esbuild bundle) and
`build/appsscript.json` (the manifest — see below) to the Apps Script
project.

### 6.4 The deployment manifest (`appsscript.json`)

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  }
}
```

- `access: "ANYONE_ANONYMOUS"` — the LIFF app calls this URL from the
  browser with no Google login of its own, so the endpoint must accept
  anonymous requests.
- `executeAs: "USER_DEPLOYING"` — the script always runs as *you* (the
  Google account that deployed it), which is what gives it permission to
  read/write your Sheets and Drive folder regardless of who is calling it.

### 6.5 Authorize permissions

The first time you run or deploy, the Apps Script editor will prompt you
to authorize the script's use of Sheets/Drive/Gmail (`GmailApp`,
`DriveApp`, `SpreadsheetApp`, `PropertiesService`). Approve this with the
same Google account that owns the spreadsheet and Drive folder from §5.

### 6.6 Deploy as a Web App

1. In the Apps Script editor: **Deploy** → **New deployment**.
2. Select type **Web app**.
3. **Execute as**: *Me* (your account) — matches `executeAs:
   "USER_DEPLOYING"` above.
4. **Who has access**: *Anyone* — matches `access: "ANYONE_ANONYMOUS"`.
5. Deploy, and copy the **Web app URL** it gives you. It ends in `/exec`:

   ```text
   https://script.google.com/macros/s/AKfycb.../exec
   ```

6. This exact URL — unmodified, including the trailing `/exec` — is what
   goes into the frontend's `GAS_WEBAPP_URL` (§8).

> Exact wording in the deploy dialog ("New deployment", "Execute as", "Who
> has access") reflects the current Apps Script editor and may shift over
> time. Look for the same three concepts: deployment type = Web app,
> execution identity = you, access = anyone.

### 6.7 Why `/exec` matters

`apps/site-report/web/lib/api/siteReportClient.ts`'s `callSiteReportAction`
sends its request to `GAS_WEBAPP_URL` **completely unchanged** — it never
appends `/exec` or any other path itself. If the value you configure is
missing `/exec`, or is a `/dev` (testing) deployment URL instead of the
real `/exec` deployment, every API call will fail or hit stale code.

### 6.8 Redeploying after a code change

Every `gas` source change needs both a rebuild/push **and** a new
deployment version to actually take effect at the existing `/exec` URL:

```bash
npm run push                    # build + clasp push (uploads new code)
```

Then, in the Apps Script editor: **Deploy** → **Manage deployments** →
pick the existing Web app deployment → **Edit** (pencil icon) → **New
version** → **Deploy**. This keeps the same `/exec` URL, so you do not
need to update `GAS_WEBAPP_URL` again.

---

## 7. Part C — LINE Developers & LIFF setup

### 7.1 Conceptual hierarchy

```text
LINE Developers (your account on the console)
      │
      ▼
Provider                  (an organization/grouping — you create one)
      │
      ▼
LINE Login Channel        (the "app" that owns login capability)
      │
      ▼
LIFF app                  (one entry inside that channel)
      │
      ▼
LIFF ID                   (e.g. 1234567890-AbCdEfGh — what NEXT_PUBLIC_LIFF_ID needs)
```

### 7.2 Steps

1. Go to the LINE Developers console and sign in (or create an account).
2. Create a **Provider** (a namespace for your channels — e.g. your
   company/project name).
3. Under that Provider, create a **LINE Login** channel.
4. Inside that channel, find the **LIFF** tab/section and add a new LIFF
   app.
5. Configure:
   - **Endpoint URL** — the HTTPS URL of your deployed Next.js app (§11).
     During early local-only development you cannot fully test this (see
     §10) — a `localhost` value only helps with tooling that tunnels
     localhost over HTTPS, not with real LINE app testing.
   - **Size** — pick whatever the console offers (Full is a safe default
     for a form-heavy screen like this one); it does not affect this
     app's code.
   - **Scopes** — this app only calls `liff.getProfile()`, which needs the
     `profile` scope. Do not grant scopes this app does not use.
6. Save. The console gives you a **LIFF ID**, shaped like
   `1234567890-AbCdEfGh`.
7. Put that value into `NEXT_PUBLIC_LIFF_ID` (§8).

> Exact console labels ("LIFF tab", "Add"), and where each setting lives,
> may shift over time. Use the current LINE Developers console and look
> for the corresponding LIFF / LINE Login configuration described above —
> the concepts (Provider → Channel → LIFF app → LIFF ID → Endpoint URL)
> are what stays stable.

### 7.3 What never goes in this project

- The **Channel Secret** — never needed by this app (it never performs a
  server-side OAuth token exchange), and must never be placed in any
  frontend code or environment variable.
- Any other private credential the LINE Developers console shows you.

---

## 8. Environment variables

Both variables are documented in `apps/site-report/web/.env.example`:

```env
# --- Public (bundled into the browser) ---
NEXT_PUBLIC_LIFF_ID=

# --- Server-only (never sent to the browser) ---
GAS_WEBAPP_URL=
```

| Variable | Public/secret? | Set from | Read by |
|---|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | Public (not a secret — same status as a client-side OAuth client ID) but **must** be prefixed `NEXT_PUBLIC_` because `liff.init()` runs in the browser | The LIFF ID from §7.2 | `lib/liff.ts`'s `getLiffConfig()` |
| `GAS_WEBAPP_URL` | Server-only — **must NOT** be `NEXT_PUBLIC_`-prefixed, or it would be bundled into browser code | The `/exec` Web App URL from §6.6 | `lib/api/siteReportClient.ts`'s `callSiteReportAction`, called only from `components/site-report/submission.ts` (never directly from a Client Component) |

Rules:

- `.env.local` is where you put real values locally — it is gitignored,
  never commit it.
- `.env.example` stays committed with empty placeholders only.
- No other environment variable exists in this app — do not invent one
  (e.g. there is no `NEXT_PUBLIC_GAS_WEBAPP_URL`; that would leak a
  server-only value into the browser bundle).
- On Vercel (or any other host), set both variables in that platform's
  own environment-variable settings — `.env.local` never gets deployed.

---

## 9. Part D — local development

```bash
cd apps/site-report/web
npm install
cp .env.example .env.local
# edit .env.local: fill in NEXT_PUBLIC_LIFF_ID and GAS_WEBAPP_URL
npm run dev
```

Then open `http://localhost:3000`. See §10 for what this local run can
and cannot prove.

Other commands, all defined in `apps/site-report/web/package.json`:

| Command | What it verifies |
|---|---|
| `npm test` | Jest unit/component tests (178 tests as of this writing — pure logic, mocked `lib/liff.ts`/workflow calls, no real network/LIFF/Sheets) |
| `npm run typecheck` | `tsc --noEmit` — no type errors |
| `npm run build` | Production Next.js build — also what Vercel runs |
| `npm run lint` | ESLint — 0 errors expected; 1 known pre-existing warning (`@next/next/no-img-element` on the photo preview `<img>`, an intentional trade-off — see the architecture overview's Task 12 notes) |

Smoke check: `GET /api/health` → `{ "status": "ok", ... }`.

---

## 10. Local browser testing vs. real LIFF testing

These are genuinely different things — do not treat one as proof of the
other.

```text
Browser development                  Real LIFF
──────────────────                   ─────────
http://localhost:3000                LINE app → LIFF → HTTPS deployed URL
Any desktop/mobile browser           LINE's in-app browser only
liff.init() resolves to              liff.init() resolves against a real
"LIFF_UNAVAILABLE_SSR"/config-        LIFF ID, a real Endpoint URL,
missing/whatever your local           and (once logged in) a real LINE
NEXT_PUBLIC_LIFF_ID does              profile
No real LINE profile —                A real profile.userId/displayName
you cannot reach `ready`               feed into the actual submission
{ profile } this way at all           lineUserId
Good for: UI layout, form              Good for: the one thing localhost
validation, photo pipeline,            can never simulate — the actual
component behavior (all covered        LINE login handshake and the
by the Jest suite already)             in-app browser environment
```

You can develop and unit-test almost the entire UI locally. You **cannot**
reach the `ready { profile }` LIFF state from `localhost` in a normal
desktop browser — `liff.init()` needs a LIFF-recognized context. Treat a
clean local run as "the UI compiles and the non-LIFF logic works," not as
"LIFF integration is proven." Real LIFF/LINE verification only happens
through §12–§13.

---

## 11. Part E — Vercel deployment

Vercel is this project's assumed production host (no Vercel-specific code
exists — any HTTPS Next.js host works the same way).

1. Connect your Git repository to Vercel.
2. Because this is a monorepo, set the project's **Root Directory** to
   `apps/site-report/web` — not the repo root (verify this against
   Vercel's current project-settings UI; the concept is "point Vercel at
   the actual Next.js project folder").
3. In that Vercel project's **Environment Variables** settings, add:
   - `NEXT_PUBLIC_LIFF_ID`
   - `GAS_WEBAPP_URL`
4. Deploy.
5. Copy the resulting production URL (e.g.
   `https://your-project.vercel.app`).
6. Go back to the LIFF app's settings (§7.2) and set the **Endpoint URL**
   to this production URL.
7. If you changed the Endpoint URL after already testing, LINE may cache
   the old one for a short while inside the app — closing and reopening
   the LIFF entry point, or force-quitting LINE, usually clears this.

---

## 12. Part F — first real end-to-end test

Do this once GAS is deployed (§6), the LIFF app's Endpoint URL points at
your Vercel deployment (§11), and both environment variables are set on
Vercel.

| # | Step | What you should see | What it means | If it fails, look at |
|---|---|---|---|---|
| 1 | Open the LIFF app from LINE (a link/QR code pointing at your LIFF ID) | The Next.js app loads inside LINE's browser | LIFF endpoint + deployment are reachable | §14 "LIFF does not open" / "Blank page" |
| 2 | Complete LINE login if prompted | Redirected back into the app | LIFF login flow completed | §14 "Login does not work" |
| 3 | The Site Report screen appears | Not stuck on a loading spinner | `initializeSiteReportLiff()` resolved | §14 "Profile unavailable" |
| 4 | LINE profile initializes | No LIFF error message | `liff.getProfile()` succeeded and passed `normalizeLiffProfile` | §14 "Profile unavailable" |
| 5 | Site list loads | A list of sites appears, not an error/empty message | `GET_SITES` succeeded against your real `SITES` sheet | §14 "Sites do not load" / "Empty site list" |
| 6 | Select a site | Report entry screen appears with the site name shown | Site selection wired correctly | — |
| 7 | Worker name is pre-filled | Shows your LINE display name (still editable) | `createInitialReportDraft(profile)` default | — |
| 8 | Enter a work type | Free-text field accepts input | — | — |
| 9 | Confirm/adjust the report date | Defaults to today's local date | `getTodayLocalDateString()` | — |
| 10 | Enter an optional comment | Free-text, can be left blank | — | — |
| 11 | Add one photo | File picker (and camera, if your OS/browser offers it) opens | Native `<input type="file">` | §14 "Photo fails" |
| 12 | Confirm the preview | A thumbnail appears with a remove button | Compression + preview succeeded | §14 "Photo fails" |
| 13 | Submit | Button shows "送信中..." then either success or an error box | `submitReportDraft` → `submitReport` → GAS | §14 "Submit fails" |
| 14 | Confirm success UI | Shows a Japanese success message + `受付番号: <reportId>` | `SUBMIT_REPORT` returned `{ ok: true }` | §14 "Success but no expected data" |
| 15 | Record the `reportId` shown | e.g. `RPT-1234567890-abcdefghij` | You'll look this up in the next two steps | — |
| 16 | Check Google Sheets | A new row in `REPORTS` with this `reportId`, matching what you entered | `appendReportRow` succeeded | §14 "Success but no expected data" |
| 17 | Check Google Drive | Your uploaded photo appears as
`<reportId>_1_<sanitized original filename>` inside your configured folder | `uploadReportPhoto` succeeded | §14 "Success but no expected data" |
| 18 | Check the admin inbox | An email arrives at `CONFIG`'s `ADMIN_EMAIL`, subject `[Site Report] New report for <site name> (<site code>)` | `sendAdminNotification` succeeded (best-effort — a failure here does *not* fail the submission; the UI does not currently surface `notificationSent` to the user, only in the raw API response) | §14 "Success but no expected data" |

---

## 13. Part G — real device testing

Nothing in this section has been performed as part of writing this
handbook — no real LINE account, deployed GAS Web App, LIFF channel, or
physical device was reachable from the environment this was written in.
**Manual verification required** for everything below; treat these as
checklists to run yourself, not results already obtained.

### iPhone (LINE app → in-app browser, effectively Safari's engine)

```text
[ ] LIFF opens from a LINE chat/link
[ ] LINE login completes and redirects back into the app
[ ] LINE profile resolves — worker name pre-fills
[ ] Site list loads
[ ] Form entry works (keyboard, date picker, text fields)
[ ] The file input opens iOS's photo picker (and camera, if offered)
[ ] A large photo (several MB) compresses and previews without freezing
[ ] Submission succeeds and shows the success screen
[ ] No horizontal scrolling / clipped content at the device's width
```

### Android (LINE app → in-app browser, Chrome-based)

```text
[ ] LIFF opens from a LINE chat/link
[ ] LINE login completes and redirects back into the app
[ ] LINE profile resolves — worker name pre-fills
[ ] Site list loads
[ ] Form entry works (keyboard, date picker, text fields)
[ ] The file input opens Android's photo picker (and camera, if offered)
[ ] A selected photo compresses and previews correctly
[ ] Photo removal updates the preview list correctly
[ ] Submission succeeds and shows the success screen
[ ] No horizontal scrolling / clipped content at the device's width
```

Do not claim either platform "works" beyond what you have actually run
through this list. The architecture overview's Task 12 section keeps a
mirror of this same checklist as part of the MVP's documented readiness
state — update both if you add a new manual-verification item.

---

## 14. Troubleshooting

| Symptom | Likely cause | What to check |
|---|---|---|
| LIFF does not open | Wrong/stale LIFF ID, or Endpoint URL not pointing at your current deployment | `NEXT_PUBLIC_LIFF_ID` vs. the LIFF app's actual ID; the LIFF app's Endpoint URL vs. your real Vercel URL |
| Blank page | Frontend build/runtime error | Browser console; Vercel deployment logs; confirm `npm run build` passes locally |
| Login does not work | LINE Login channel or LIFF scope misconfigured | The channel's LINE Login settings; the LIFF app's configured scopes include `profile` |
| Profile unavailable (`LIFF_PROFILE_INVALID`/`LIFF_PROFILE_FAILED`) | LIFF initialized but profile fetch/shape failed | `normalizeLiffProfile` requires non-empty `userId`+`displayName` — an account missing these somehow, or a real LIFF-side error (check the browser console; `lib/liff.ts` logs the cause) |
| Sites do not load (`sites-error` state) | `GET_SITES` rejected or returned `{ ok: false }` | `GAS_WEBAPP_URL` correctness (§6.7); GAS deployment is live; **one bad row in `SITES` fails the whole call** — check every row's `status` is exactly `ACTIVE`/`INACTIVE` and every required field is non-empty |
| Empty site list (`sites-empty` state, not an error) | `SITES` sheet has zero data rows | Add at least one valid row to `SITES` |
| Submit fails | GAS unreachable, misconfigured, or the payload failed server-side validation | `GAS_WEBAPP_URL`; that the deployment is the current `/exec` version (§6.8); the exact required fields in §14's linked contract below |
| Photo fails | Unsupported format/oversized original (client-side policy only) | `photoValidation.ts`'s allowlist (`image/jpeg`/`image/png`/`image/webp`) and 15 MiB original-size cap — both are **client-side UX limits**, not GAS limits; GAS itself enforces no MIME/size/count restriction at all |
| Success but no expected data (no Sheets row / no Drive file / no email) | GAS-side write/upload/notify step failed silently from the client's perspective, or wrong Sheet/Drive/CONFIG target | The Apps Script execution log (`console.error` calls in `Api.ts`/`SubmitReportService.ts` are tagged `[SUBMIT_REPORT] ...`); confirm `SPREADSHEET_ID` and `DRIVE_ROOT_FOLDER_ID` point at the resources you're actually looking at; `notificationSent: false` in the raw response means the email step specifically failed even though the report was saved |
| Production works differently from local | Environment variable or LIFF endpoint drift between environments | Compare `NEXT_PUBLIC_LIFF_ID`/`GAS_WEBAPP_URL` on Vercel vs. `.env.local`; confirm the LIFF app's Endpoint URL matches the environment you're actually testing |

Actual API error codes you may see in a raw response (`error.code`):
`VALIDATION_ERROR`, `CONFIG_INVALID`, `SHEET_ERROR`, `DATA_INVALID`,
`SITE_NOT_FOUND`, `DRIVE_ERROR`, `INTERNAL_ERROR` (from `Api.ts`), plus
transport-level `NETWORK_ERROR`/`HTTP_ERROR`/`INVALID_RESPONSE` (from
`siteReportClient.ts`) if the request never reached GAS at all.

---

## 15. Debugging flow

```text
Problem
  │
  ▼
Is the Next.js page loading at all?
  │  no → check the deployment / build (§14 "Blank page")
  ▼ yes
Does the LIFF init sequence resolve past "loading"?
  │  no → browser console for [liff] logs; NEXT_PUBLIC_LIFF_ID (§8)
  ▼ yes
Is `profile` present (not login-required/error)?
  │  no → LINE login / LIFF scopes (§14 "Login does not work"/"Profile unavailable")
  ▼ yes
Does GET_SITES succeed with a non-empty list?
  │  no → GAS_WEBAPP_URL, GAS deployment version, SITES sheet data (§14)
  ▼ yes
Does the form pass validateReportDraft on submit?
  │  no → this is expected UX — fill required fields; not a bug
  ▼ yes
Does SUBMIT_REPORT leave the browser at all (network tab)?
  │  no → GAS_WEBAPP_URL missing/misconfigured, or a client-side throw
  ▼ yes
Does GAS execute without an uncaught error? (Apps Script execution log)
  │  no → read the actual thrown error in the execution log
  ▼ yes
Does GAS write to Sheets? (check REPORTS/REPORT_PHOTOS directly)
  │  no → SPREADSHEET_ID Script Property, sheet names/headers (§5.2)
  ▼ yes
Does GAS upload to Drive? (check the configured folder)
  │  no → DRIVE_ROOT_FOLDER_ID, folder permissions (§5.4)
  ▼ yes
Does the admin notification email arrive?
  no → check ADMIN_EMAIL's value and the account's Gmail send permissions
       — but remember: this step failing does NOT fail the submission
       itself (notificationSent: false is a soft signal, not an error)
```

Where to look at each stage: browser DevTools console + Network tab for
everything up through "leave the browser"; the Apps Script editor's
**Executions** view (or **View → Logs**) for everything from "GAS
execute" onward.

---

## 16. Security notes

Be accurate about what this MVP actually does and does not protect against
— do not overstate it in either direction.

- **Never** put the LINE Channel Secret in this project — it is not
  needed anywhere in this app's current code, and must never appear in
  frontend code or an environment variable.
- **Never** put Google service-account/OAuth credentials in frontend code
  — the GAS backend runs under Google's own Apps Script identity model
  (`executeAs: "USER_DEPLOYING"`), not a credential this app manages.
- **Never** commit `.env.local` (or any real `.clasp.json`) — both are
  gitignored; only `.env.example`/`.clasp.json.example` are tracked.
- **`lineUserId` is currently trusted as sent by the client, with no
  server-side verification.** `SubmitReportService.ts` takes whatever
  `lineUserId` string the frontend sends and writes it straight into the
  `REPORTS` row — there is no LIFF ID-token verification against LINE's
  servers. This means a technically capable actor with access to the
  deployed `/exec` URL could submit a report claiming to be any
  `lineUserId` they choose.
- **Server-side LIFF token verification is a known, deferred hardening
  item** — not implemented as of this handbook. If this app is deployed
  for a customer who needs a stronger identity guarantee, that
  verification (validating the ID token LIFF can provide against LINE's
  verification endpoint, server-side, before trusting `lineUserId`) is
  future work, not something silently assumed to already exist.
- **No server-side duplicate-submission prevention** exists either — a
  client-side guard prevents one double-click from submitting twice, but
  two browser tabs, or a retried request after an apparent timeout, can
  each still create a separate `REPORTS` row.
- Whichever Google account/Sheets/Drive/GAS project is used in a customer
  deployment should belong to **that customer**, not to the developer's
  personal account — see §17.

---

## 17. Customer / Coconala deployment

This app's ownership model, once handed to a customer, should look like:

```text
Customer owns:
├── LINE Developers (Provider / LINE Login Channel / LIFF app)
├── Google account (or Workspace)
├── Google Sheets (the CONFIG/SITES/... spreadsheet)
├── Google Drive (the photo folder)
└── The production Vercel (or equivalent) deployment

Developer provides:
├── The source code (apps/site-report/web + apps/site-report/gas)
├── This setup handbook + the architecture overview
├── Setup/configuration assistance during onboarding
└── Any requested customization
```

The goal is that the product does **not** permanently depend on the
developer's own Google account, LINE Developers account, or Apps Script
project — every credential and resource in §5–§7 above is something the
customer creates and owns themselves, following this handbook. This
section is a packaging/ownership note, not marketing copy — see the
architecture overview's "Coconala packaging readiness" section for the
fuller technical-sufficiency judgment this is based on.

---

## 18. Clean-install self-check

Before considering a fresh setup complete, you should be able to answer
"yes" to all of these:

```text
[ ] Do I know what accounts I need?                    → §3
[ ] Do I know what to create first?                     → §5
[ ] Do I know where the LIFF ID comes from?             → §7.2
[ ] Do I know where the GAS URL comes from?             → §6.6
[ ] Do I know which env variables to set, and where?    → §8
[ ] Do I know how to run locally?                       → §9
[ ] Do I know how to deploy (both GAS and the frontend)? → §6, §11
[ ] Do I know how to connect LIFF to the deployed app?  → §7.2, §11 step 6
[ ] Do I know how to perform the first real submission? → §12
[ ] Do I know where to inspect the result?              → §12 steps 16-18
[ ] Do I know what to check if something fails?         → §14, §15
```

If any answer is "no," that is a gap in this handbook — please fix it or
flag it rather than guessing past it.

---

## 19. Where to go next

- **How is this application designed, and what did each task decide and
  why?** →
  [`docs/site-report-architecture-overview.md`](../../docs/site-report-architecture-overview.md)
- **What does the annotated repository tree look like?** →
  [`docs/folder-structure.md`](../../docs/folder-structure.md)
- **What does the root README say about running both projects in this
  monorepo?** → [`README.md`](../../README.md)
