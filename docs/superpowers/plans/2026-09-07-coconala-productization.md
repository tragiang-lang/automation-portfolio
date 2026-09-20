# Coconala Content ¥2,500 Productization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note for this run:** all repo facts below were gathered by direct
> inspection in this same session (Explore agent + direct Reads), so inline
> execution (no further subagent dispatch) is the efficient path — a fresh
> subagent would have to re-derive the same facts. This plan is still written
> so any executor (subagent or inline) has everything needed without
> re-reading the whole repo.

**Goal:** Repackage the completed Phase 1–6 salon-portfolio product (Next.js
web app + GAS backend + Sheets schema) into a clean, secret-free, Japanese-
documented, self-service Coconala content package priced at ¥2,500, plus a
seller-facing listing draft and a validated ZIP.

**Architecture:** Copy (not move) sanitized source trees into
`product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/` and
`02_GAS/salon-reservation-gas/`, author net-new Japanese Markdown guides
under `03_GOOGLE_SHEETS/`, `04_SETUP_GUIDE/`, `05_CUSTOMIZATION/`,
`06_TROUBLESHOOTING/`, `07_LICENSE/`, plus root `README_JA.md`,
`MANIFEST.md`, `VERSION.txt`. Validate the copies build/typecheck/test
standalone, scan for secrets, zip, and write `.evidence/`. The production
source tree under `apps/salon-portfolio/` is never modified.

**Tech Stack:** Node.js 20+, Next.js 16 (React 19, TypeScript), Google Apps
Script (TypeScript + esbuild + clasp + Jest), Google Sheets/Calendar/Gmail.

**Spec:** The user's "Productization Phase — Coconala Content ¥2,500
Package" prompt (sections 1–47), reproduced in full in the conversation that
produced this plan. This plan is that spec mapped onto real repo facts.

## Global Constraints

- Never modify anything under `apps/salon-portfolio/**` (production source)
  — only read from it and copy into `product/`.
- Never include: `node_modules/`, `.next/`, `build/` (GAS output),
  `coverage/`, `.evidence/`, `.claude/`, `.superpowers/`, `*.tsbuildinfo`,
  `test-output.log`, `typecheck-output.log`, `next-env.d.ts`, `CLAUDE.md`,
  `AGENTS.md`, any real `.env*`/`.clasp.json` (only `.example` files travel).
- Never invent CONFIG keys, Sheet column names, GAS action names, env var
  names, or commands — every doc must use the exact values gathered below.
- Do not implement new product features. If a gap is found, record it under
  "Future Improvements" in the final report instead of coding it.
- Do not run `git commit`, `git push`, or open a PR at any point in this
  plan — packaging output only.
- Package version: `v1.0.0`. Package date: `2026-09-07`.
- All customer-facing docs are Japanese (`_JA.md` suffix per spec); this
  plan's own text and code comments stay English.

## Ground-truth facts (reference for every task below)

**Repo layout:** `apps/salon-portfolio/web` (Next.js) and
`apps/salon-portfolio/gas` (Apps Script) are the two source trees to copy.

**Web app** (`apps/salon-portfolio/web`):
- `package.json` scripts (exact): `dev: "next dev"`, `build: "next build"`,
  `start: "next start"`, `lint: "eslint"`, `test: "jest"`,
  `typecheck: "tsc --noEmit"`. Deps: `next@16.3.4`, `react@19.2.8`,
  `react-dom@19.2.8`. No `engines` field; Node requirement is documented
  prose only: "Node.js 20+ and npm" (root `README.md`).
- `.env.example` (only var): `GAS_WEBAPP_URL=` — server-only, never
  `NEXT_PUBLIC_`-prefixed; read only by `lib/api/gasClient.ts`; falls back
  to `config/demo-content.ts` when unset.
- `app/api/gas/route.ts` — `POST` proxy validating `{action, payload}`,
  calls `callGasAction()` from `lib/api/gasClient.ts`.
- Top-level entries to copy: `app/`, `components/`, `config/`, `lib/`,
  `types/`, `public/`, `eslint.config.mjs`, `jest.config.ts`,
  `jest.setup.ts`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`,
  `package.json`, `package-lock.json`, `.env.example`, `.gitignore`,
  `README.md` (repackaged, see Task 2).
- Exclude: `node_modules/`, `.next/`, `coverage/`, `*.tsbuildinfo`,
  `next-env.d.ts`, `CLAUDE.md`, `AGENTS.md`, any real `.env*`.

**GAS app** (`apps/salon-portfolio/gas`):
- `package.json` scripts (exact): `build: "node esbuild.config.js"`,
  `test: "jest"`, `typecheck: "tsc --noEmit"`,
  `push: "npm run build && clasp push"`.
- `.clasp.json.example`: `{"scriptId": "REPLACE_WITH_YOUR_APPS_SCRIPT_PROJECT_ID", "rootDir": "build"}`
  — copy this file; no real `.clasp.json` exists in the repo.
- `appsscript.json`: `timeZone: "Asia/Tokyo"`, `runtimeVersion: "V8"`,
  `webapp: { access: "ANYONE_ANONYMOUS", executeAs: "USER_DEPLOYING" }`.
- Router: `src/Api.ts`, `handleApiRequest(rawBody)`, dispatch switch on
  `parsed.request.action` — five actions: `getConfig`, `getServices`,
  `getStaff`, `getAvailability`, `createReservation`. Any other action name
  → `VALIDATION_ERROR`.
- Script Properties (exact keys, only two in the whole codebase):
  `SPREADSHEET_ID` (`src/Sheets.ts`) and `SITE_BASE_URL`
  (`src/RuntimeProperties.ts`, builds cancellation URLs).
- `src/SetupDemoSheets.ts` exports `setupDemoSheets(): string[]` — run
  manually from the Apps Script editor function dropdown; never overwrites
  an existing sheet (skips + reports "skipped" if the sheet already
  exists); creates all 9 sheets with headers + the demo rows in
  `src/DemoSeed.ts`'s `DEMO_SHEETS`.
- Top-level entries to copy: `src/`, `tests/`, `appsscript.json`,
  `esbuild.config.js`, `jest.config.js`, `tsconfig.json`, `package.json`,
  `package-lock.json`, `.clasp.json.example`, `.gitignore`.
- Exclude: `node_modules/`, `build/`, `test-output.log`,
  `typecheck-output.log`, any real `.clasp.json`/`.clasprc.json`.

**API envelope** (`docs/api-documentation.md`): success
`{ "ok": true, "data": {...} }`; failure
`{ "ok": false, "error": { "code": "...", "message": "..." } }`. Error
codes: `VALIDATION_ERROR`, `DUPLICATE_SUBMISSION` (never surfaced — replay
instead), `SLOT_UNAVAILABLE`, `FEATURE_DISABLED`,
`INVALID_CANCELLATION_TOKEN` (not yet triggered), `SYSTEM_BUSY`,
`CALENDAR_ERROR` (reserved), `SHEET_ERROR`, `MAIL_ERROR` (reserved),
`INTERNAL_ERROR`, `CONFIG_INVALID`.

**Sheet schema** (`src/SheetNames.ts` + `src/SheetSchemas.ts` — authoritative,
copy verbatim into docs, never invent):

| Sheet | Columns (exact order) |
|---|---|
| `CONFIG` | `Key`, `Value`, `Description` |
| `HOLIDAYS` | `Date`, `Label` |
| `SERVICES` | `ServiceID`, `Name`, `DurationMinutes`, `Price`, `Active`, `StaffRequired`, `DisplayOrder` |
| `STAFF` | `StaffID`, `Name`, `Active`, `CalendarID`, `DisplayOrder` |
| `RESERVATIONS` | `ReservationID`, `SubmissionID`, `CreatedAt`, `UpdatedAt`, `Name`, `Email`, `Phone`, `Date`, `Time`, `ServiceID`, `StaffID`, `Notes`, `Status`, `CalendarEventID`, `EmailStatus`, `CancellationToken` |
| `CANCELLATION_REQUESTS` | `CancellationRequestID`, `ReservationID`, `RequestedAt`, `RequesterName`, `RequesterEmail`, `Reason`, `Status`, `ProcessedAt`, `ProcessedBy`, `Notes` |
| `INQUIRIES` | `InquiryID`, `SubmissionID`, `CreatedAt`, `Name`, `Email`, `Phone`, `Subject`, `Message`, `Source`, `Status` |
| `EMAIL_LOG` | `EmailLogID`, `CreatedAt`, `RelatedType`, `RelatedID`, `RecipientType`, `RecipientEmail`, `Subject`, `Status`, `ErrorMessage` |
| `ERROR_LOG` | `ErrorID`, `CreatedAt`, `Action`, `Message`, `Stack`, `ContextJSON`, `Severity` |

**Demo data** (`src/DemoSeed.ts`'s `DEMO_SHEETS` — reuse verbatim as the CSV
template content; already documented in source as "safe, non-production
demo data"; transactional sheets get header-only rows):
- `CONFIG` 24 rows: `business.name`=`Demo Salon`, `business.phone`=
  `03-0000-0000`, `business.email`=`owner@example.com`,
  `business.address`=`東京都千代田区1-1-1`, `hours.monday`..`hours.friday`=
  `10:00-19:00`, `hours.saturday`=`10:00-18:00`, `hours.sunday`=`closed`,
  `reservation.timezone`=`Asia/Tokyo`, `reservation.slotMinutes`=`30`,
  `reservation.minLeadHours`=`1`, `reservation.maxBookingDays`=`60`,
  `features.contactForm`/`features.reservation`/`features.staffSelection`/
  `features.calendar`/`features.emailNotification`=`true`,
  `staff.anyAvailableOption`=`true`, `calendar.id`=`primary`,
  `email.ownerNotifyAddress`=`owner@example.com`, `email.fromName`=
  `Demo Salon`.
- `HOLIDAYS` 2 rows: `2026-01-01`/`元日`, `2026-01-02`/`年始休業`.
- `SERVICES` 3 rows: `SV001`/`ハンド | ジェルネイル`/60/6000/true/true/1;
  `SV002`/`フット | ジェルペディキュア`/90/8000/true/true/2;
  `SV003`/`その他 | パラフィンパック`/20/1500/true/false/3.
- `STAFF` 3 rows: `ST001`/`スタッフA`/true/``/1; `ST002`/`スタッフB`/true/
  ``/2; `ST003`/`スタッフC`/true/``/3.
- `RESERVATIONS`, `CANCELLATION_REQUESTS`, `INQUIRIES`, `EMAIL_LOG`,
  `ERROR_LOG`: header row only, zero data rows.

**CONFIG keys** (`docs/config-and-sheets-guide.md`, `src/ConfigParser.ts`,
`src/models/Config.ts`) — full table with 変更してよい／変更しない split:
`business.name/phone/email/address`, `hours.<weekday>` (7 keys),
`reservation.timezone` (must stay `Asia/Tokyo` — enforced by
`ConfigValidator`), `reservation.slotMinutes`, `reservation.minLeadHours`,
`reservation.maxBookingDays`, `features.contactForm/reservation/
staffSelection/calendar/emailNotification` (booleans), `staff.
anyAvailableOption` (should be `false` when `features.staffSelection` is
`false`), `calendar.id` (internal — never exposed via `getConfig`),
`email.ownerNotifyAddress` / `email.fromName` (internal — never exposed).
`PublicConfig` = `AppConfig` minus `calendarId`/`emailOwnerNotifyAddress`/
`emailFromName`. `HOLIDAYS` is a separate sheet, not a CONFIG key.

**Demo business content** (`config/demo-content.ts` — this is what ships in
the web template as-is; the CONTENT_CUSTOMIZATION guide must flag all of it
as sample data to replace): business name `凛` / `Rin Nail & Eyelash`,
tagline `静けさの中で、指先とまなざしを整える。`, phone `03-1234-5678`,
email `info@rin-salon.example.com`, address `東京都中央区銀座1-2-3
銀座ビルディング5F`. 7 demo `SERVICES` (SV001–SV007). 4 demo `STAFF`
(田中あい/鈴木さくら/佐藤みなみ/山本ゆい, illustrated SVG avatars — see
Image facts below). FAQ, access info, salon features, customer-flow steps
all present as demo copy.

**Design tokens** (`config/theme.ts` + `app/globals.css`'s `@theme inline`
block): colors live in `globals.css` CSS custom properties (Tailwind
utility classes `bg-accent`, `text-muted`, etc. — not duplicated in JS).
`theme.ts` holds only: `SPACING_PX` (4px-based scale: 4/8/12/16/24/32/48/
64/96/128), `BREAKPOINTS_PX` (`tablet: 640`, `desktop: 1024`,
`largeDesktop: 1440`), `MOTION_MS` (`heroEnter: 400`, `reveal: 300`,
`press: 150`, `accordion: 200`), `CONTENT_MAX_WIDTH_PX: 1120`.

**Image facts** (`public/images/SOURCES.md` — already verified, no action
needed beyond documenting it): all 11 raster `.jpg` photos under
`public/images/{hero,gallery,salon}/` are Unsplash-License photos ("free to
use, commercial use permitted, no attribution required" — Unsplash License
explicitly allows redistribution inside a downloadable product; this is not
an assumption, it is the documented license text). Safe to include as-is.
The 4 staff avatars (`public/images/staff/staff-avatar-0{1..4}.svg`) are
original illustrated icons, not photos of real people (explicit design
decision documented in `config/demo-content.ts`'s comment on `STAFF`, to
avoid attaching a real stranger's face to a fictional staff bio) — safe to
include. `public/icons/pin.svg` has no license doc but is a generic map-pin
glyph, not third-party stock content — safe to include. **Conclusion: no
image needs to be stripped or placeholder-replaced; all are redistributable
as documented.** Still write the customization guide so buyers know these
are demo photos to swap for their own salon's real photography before going
live.

**Node/tooling:** Node.js 20+ and npm (documented prose, no `.nvmrc`/
`engines` field exists — do not invent one). `clasp` via `npx clasp`
(`@google/clasp` devDependency). No `LICENSE` file exists at repo root
today (this plan creates the package's own license, not a repo-wide one).

---

### Task 1: Package skeleton, VERSION, and top-level scaffolding

**Files:**
- Create: `product/coconala-salon-template/VERSION.txt`
- Create directories (empty is fine, populated by later tasks):
  `product/coconala-salon-template/01_WEB_TEMPLATE/`,
  `02_GAS/`, `03_GOOGLE_SHEETS/`, `04_SETUP_GUIDE/`,
  `05_CUSTOMIZATION/`, `06_TROUBLESHOOTING/`, `07_LICENSE/`
- Create: `product/releases/` (empty, target dir for the final ZIP)

**Interfaces:**
- Produces: the directory tree every later task writes into. No code
  interfaces — this is a filesystem scaffold task.

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p "product/coconala-salon-template/01_WEB_TEMPLATE" \
         "product/coconala-salon-template/02_GAS" \
         "product/coconala-salon-template/03_GOOGLE_SHEETS/templates" \
         "product/coconala-salon-template/04_SETUP_GUIDE" \
         "product/coconala-salon-template/05_CUSTOMIZATION" \
         "product/coconala-salon-template/06_TROUBLESHOOTING" \
         "product/coconala-salon-template/07_LICENSE" \
         "product/releases"
```

- [ ] **Step 2: Write VERSION.txt**

```text
Product: 美容サロン向け ホームページ＋オンライン予約システム テンプレート
Package version: v1.0.0
Package date: 2026-09-07
Compatible project baseline: salon-portfolio, Phase 1–6 complete
  (Foundation / UI-UX / Visual polish / GAS Config-Data layer /
  Frontend Runtime Config / Reservation Domain / Reservation API &
  Transaction Workflow / Reservation UI & E2E Integration)
Included major features:
  - Next.js 16 + React 19 + TypeScript salon website (responsive)
  - Reservation wizard UI (/reservation)
  - Google Apps Script backend: getConfig, getServices, getStaff,
    getAvailability, createReservation
  - Google Sheets data layer (CONFIG/HOLIDAYS/SERVICES/STAFF/
    RESERVATIONS/CANCELLATION_REQUESTS/INQUIRIES/EMAIL_LOG/ERROR_LOG)
  - Google Calendar availability + event creation
  - Gmail reservation notification
  - Idempotent, locked reservation transaction with availability re-check
```

- [ ] **Step 3: Verify the tree**

Run: `find "product/coconala-salon-template" -maxdepth 2 | sort` (or
`Get-ChildItem -Recurse -Depth 1` on PowerShell) and confirm all 7 numbered
directories plus `VERSION.txt` exist.

---

### Task 2: Copy and sanitize the web template

**Files:**
- Create: `product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/`
  (full copy of `apps/salon-portfolio/web`, minus exclusions)
- Modify (inside the copy only, never the source):
  `01_WEB_TEMPLATE/salon-website/README.md` (replace with a package-scoped
  quick-start pointing to `04_SETUP_GUIDE/WEB_SETUP_JA.md`)

**Interfaces:**
- Consumes: ground-truth file lists from the plan header above.
- Produces: a standalone Next.js project directory that `npm install &&
  npm run typecheck && npm run build && npm test` succeeds in on its own
  (Task 12 verifies this).

- [ ] **Step 1: Copy with exclusions**

```bash
mkdir -p "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website"
rsync -a \
  --exclude 'node_modules' --exclude '.next' --exclude 'coverage' \
  --exclude '*.tsbuildinfo' --exclude 'next-env.d.ts' \
  --exclude 'CLAUDE.md' --exclude 'AGENTS.md' \
  --exclude '.env' --exclude '.env.local' --exclude '.env.production' \
  "apps/salon-portfolio/web/" \
  "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/"
```

If `rsync` is unavailable in the shell, use `robocopy` (Windows) with an
equivalent exclude list, or `Copy-Item -Recurse` followed by explicit
`Remove-Item` of the excluded paths — the end state (files present/absent)
is what matters, not the tool.

- [ ] **Step 2: Confirm exclusions actually took**

```bash
test ! -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/node_modules"
test ! -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/.next"
test ! -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/CLAUDE.md"
test ! -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/AGENTS.md"
find "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website" -iname ".env" -o -iname ".env.local" -o -iname ".env.production"
```
Expected: all `test !` pass (no output = success under `set -e`, or check
exit code 0), and the `find` prints nothing.

- [ ] **Step 3: Replace the copied README.md with a package-scoped version**

Write `01_WEB_TEMPLATE/salon-website/README.md`:

```markdown
# salon-website（ホームページ＋予約UI テンプレート）

このフォルダは Next.js 製のホームページ＋予約フォームのソースコードです。

セットアップ手順は `../../04_SETUP_GUIDE/WEB_SETUP_JA.md` を参照してください。

## クイックスタート（開発環境がある方向け）

\`\`\`bash
npm install
npm run dev
\`\`\`

http://localhost:3000 で表示を確認できます。
```

- [ ] **Step 4: Spot-check no secrets in the copy**

```bash
grep -rn "script.google.com/macros" "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website" --include='*.ts' --include='*.tsx' -l
```
Expected: no matches outside `*.test.ts`/`*.test.tsx` files (test fixtures
using synthetic URLs like `SECRET123` are fine and expected — verified
already in Task 12's full secret scan; this step is a quick sanity check).

---

### Task 3: Copy and sanitize the GAS backend

**Files:**
- Create: `product/coconala-salon-template/02_GAS/salon-reservation-gas/`
  (full copy of `apps/salon-portfolio/gas`, minus exclusions)

**Interfaces:**
- Consumes: ground-truth file lists from the plan header above.
- Produces: a standalone GAS project directory that `npm install && npm run
  typecheck && npm run build && npm test` succeeds in on its own (Task 12
  verifies this). `.clasp.json.example` present, no real `.clasp.json`.

- [ ] **Step 1: Copy with exclusions**

```bash
mkdir -p "product/coconala-salon-template/02_GAS/salon-reservation-gas"
rsync -a \
  --exclude 'node_modules' --exclude 'build' \
  --exclude 'test-output.log' --exclude 'typecheck-output.log' \
  --exclude '*.tsbuildinfo' \
  --exclude '.clasp.json' --exclude '.clasprc.json' \
  --exclude 'CLAUDE.md' --exclude 'AGENTS.md' \
  "apps/salon-portfolio/gas/" \
  "product/coconala-salon-template/02_GAS/salon-reservation-gas/"
```

- [ ] **Step 2: Confirm exclusions and required files**

```bash
test ! -e "product/coconala-salon-template/02_GAS/salon-reservation-gas/node_modules"
test ! -e "product/coconala-salon-template/02_GAS/salon-reservation-gas/build"
test ! -e "product/coconala-salon-template/02_GAS/salon-reservation-gas/.clasp.json"
test -e "product/coconala-salon-template/02_GAS/salon-reservation-gas/.clasp.json.example"
```
Expected: first three `test !` succeed (path absent), last `test -e`
succeeds (placeholder present).

- [ ] **Step 3: Verify no real script ID leaked into the copied example**

```bash
grep -n "scriptId" "product/coconala-salon-template/02_GAS/salon-reservation-gas/.clasp.json.example"
```
Expected output contains `REPLACE_WITH_YOUR_APPS_SCRIPT_PROJECT_ID` and
nothing that looks like a real 40+ character alphanumeric script ID.

---

### Task 4: Google Sheets template (CSV set + setup guide)

**Files:**
- Create: `03_GOOGLE_SHEETS/templates/CONFIG.csv`
- Create: `03_GOOGLE_SHEETS/templates/HOLIDAYS.csv`
- Create: `03_GOOGLE_SHEETS/templates/SERVICES.csv`
- Create: `03_GOOGLE_SHEETS/templates/STAFF.csv`
- Create: `03_GOOGLE_SHEETS/templates/RESERVATIONS.csv`
- Create: `03_GOOGLE_SHEETS/templates/CANCELLATION_REQUESTS.csv`
- Create: `03_GOOGLE_SHEETS/templates/INQUIRIES.csv`
- Create: `03_GOOGLE_SHEETS/templates/EMAIL_LOG.csv`
- Create: `03_GOOGLE_SHEETS/templates/ERROR_LOG.csv`
- Create: `03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`

**Interfaces:**
- Consumes: the exact sheet/column/demo-data facts in the plan header
  ("Sheet schema" and "Demo data" tables above) — copy verbatim, do not
  re-derive or invent.
- Produces: files referenced by `04_SETUP_GUIDE/SHEETS_SETUP_JA.md`
  (Task 6) and `06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md` (Task 8).

- [ ] **Step 1: Write the 9 CSV files using the exact headers/rows from the
  plan header's "Sheet schema" and "Demo data" tables**

Each CSV's first row is exactly the column list from the schema table
(comma-joined, no invented columns). `CONFIG`, `HOLIDAYS`, `SERVICES`,
`STAFF` get the demo data rows verbatim (booleans as bare `true`/`false`,
matching what `SetupDemoSheets.ts` writes). `RESERVATIONS`,
`CANCELLATION_REQUESTS`, `INQUIRIES`, `EMAIL_LOG`, `ERROR_LOG` are
header-only (zero data rows) — same as `DEMO_SHEETS` ships them.

Example (`CONFIG.csv` — full file):
```csv
Key,Value,Description
business.name,Demo Salon,店舗名
business.phone,03-0000-0000,電話番号
business.email,owner@example.com,店舗メール
business.address,東京都千代田区1-1-1,住所
hours.monday,10:00-19:00,月曜営業時間
hours.tuesday,10:00-19:00,火曜営業時間
hours.wednesday,10:00-19:00,水曜営業時間
hours.thursday,10:00-19:00,木曜営業時間
hours.friday,10:00-19:00,金曜営業時間
hours.saturday,10:00-18:00,土曜営業時間
hours.sunday,closed,日曜営業時間（定休日）
reservation.timezone,Asia/Tokyo,タイムゾーン
reservation.slotMinutes,30,予約枠の単位（分）
reservation.minLeadHours,1,予約締切（時間前）
reservation.maxBookingDays,60,予約可能期間（日）
features.contactForm,true,問い合わせ受付
features.reservation,true,予約受付
features.staffSelection,true,スタッフ指名
features.calendar,true,カレンダー連携
features.emailNotification,true,メール通知
staff.anyAvailableOption,true,指名なし（お任せ）を表示
calendar.id,primary,カレンダーID（開発用プレースホルダー・ご自身のカレンダーIDに置き換えてください）
email.ownerNotifyAddress,owner@example.com,店舗通知メール宛先
email.fromName,Demo Salon,送信者表示名
```

Write the remaining 8 CSVs the same way, taking headers/rows from the plan
header's tables (`HOLIDAYS`: 2 rows; `SERVICES`: 3 rows; `STAFF`: 3 rows;
the 5 transactional sheets: header row only).

- [ ] **Step 2: Write SHEET_SETUP_GUIDE_JA.md**

Required sections, in order:
1. この章の目的（2〜3文、日本語）
2. 方式A（推奨）: 空のGoogle Sheetsを作成 → GAS側で `SPREADSHEET_ID`
   スクリプトプロパティを設定 → Apps Scriptエディタで `setupDemoSheets`
   関数を選んで実行 → 9枚のシートがヘッダー＋安全なデモデータ付きで
   自動作成されることを説明。「既存の同名シートは上書きされず
   `スキップ` と表示される」という実装上の安全性も明記する
   （`SetupDemoSheets.ts`の実際の挙動）。
3. 方式B（手動/参考用）: `templates/*.csv` を使って
   Google Sheets の「ファイル > インポート > アップロード」で1シートずつ
   取り込む手順。9枚のシート名は `CONFIG` `HOLIDAYS` `SERVICES` `STAFF`
   `RESERVATIONS` `CANCELLATION_REQUESTS` `INQUIRIES` `EMAIL_LOG`
   `ERROR_LOG` と完全一致させる必要があると明記。
4. 全9シート名とヘッダーの一覧表（本文中に転記、plan header の表と
   同一の内容）。
5. デモデータの扱い方の注意: `CONFIG`/`HOLIDAYS`/`SERVICES`/`STAFF`
   にはサンプル値が入っている（本番前に置き換える）。取引系5シート
   （`RESERVATIONS`ほか）はヘッダーのみで空。
6. 自分専用のコピーを作る重要性（開発者の本番スプレッドシートは
   使えない旨を明記）。
7. 次のステップへのリンク: `../04_SETUP_GUIDE/SHEETS_SETUP_JA.md`
   （Script Property設定の詳細手順）。

- [ ] **Step 3: Verify every CSV filename referenced in the guide exists**

```bash
grep -o '[A-Z_]*\.csv' "product/coconala-salon-template/03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md" | sort -u
ls "product/coconala-salon-template/03_GOOGLE_SHEETS/templates/"
```
Expected: every filename the guide mentions appears in the `ls` output.

---

### Task 5: Image licensing verification and IMAGE_CUSTOMIZATION_JA.md

**Files:**
- Create: `05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md`

**Interfaces:**
- Consumes: the plan header's "Image facts" section (already-verified
  licensing conclusion — do not re-litigate, just document it correctly).
  Actual image paths inside the packaged copy:
  `01_WEB_TEMPLATE/salon-website/public/images/{hero,gallery,salon,staff}/`
  and `public/icons/pin.svg`.
- Produces: customer-facing guidance referenced by
  `05_CUSTOMIZATION/CONTENT_CUSTOMIZATION_JA.md` (Task 7).

- [ ] **Step 1: Confirm SOURCES.md survived the Task 2 copy verbatim**

```bash
diff "apps/salon-portfolio/web/public/images/SOURCES.md" \
     "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/public/images/SOURCES.md"
```
Expected: no diff output (files identical — Task 2's copy must not have
altered it).

- [ ] **Step 2: Write IMAGE_CUSTOMIZATION_JA.md**

Required sections, in order:
1. 同梱されている画像について: すべてUnsplashライセンス（商用利用可・
   クレジット表記不要）の写真、またはこのテンプレート用に作成された
   オリジナルのイラスト（スタッフアイコン）であり、そのままでも
   合法的に配布・利用できる旨を明記（`SOURCES.md`の内容を引用）。
   ただし実在のサロンの写真ではないため、本番公開前に自店舗の画像へ
   差し替えることを強く推奨、と明記する。
2. 画像ディレクトリ一覧（実パス）:
   `public/images/hero/`（1枚、トップのメインビジュアル）,
   `public/images/salon/`（2枚、店内写真）,
   `public/images/gallery/`（8枚、ギャラリーセクション）,
   `public/images/staff/`（4枚、SVGアイコン）,
   `public/icons/pin.svg`（アクセス地図のピンアイコン）。
3. 推奨サイズ・比率: hero画像は横長（例: 1600×900px以上、16:9目安）、
   gallery画像は`config/demo-content.ts`の`GALLERY_IMAGES`が実際の
   `width`/`height`をピクセル単位で保持している（例:
   `gallery-manicure-application.jpg`は1200×800）ため、差し替え時は
   同程度のアスペクト比を保つとレイアウト崩れ（layout shift）を防げる、
   と説明する。staff画像はSVGだが、写真に差し替える場合は正方形
   （例: 400×400px）を推奨。
4. ファイル名規則: 既存ファイル名をそのまま上書きするのが最も簡単
   （コード側の参照パスを変更せずに済む）と説明。別名を使う場合は
   `config/demo-content.ts`内の該当`src`パスも変更する必要がある旨。
5. 各差し替え手順（hero / gallery / staff）を番号付きで具体的に:
   ファイルを同名で置き換える → `config/demo-content.ts`の該当項目
   （`alt`テキストなど）を必要に応じて更新する、という2ステップ形式。
6. どの画像がデモ専用かの一覧（= 全11枚の写真＋4枚のSVGアイコン、
   すべて本番前に差し替え対象）。

- [ ] **Step 3: Verify referenced paths exist in the packaged copy**

```bash
for p in hero salon gallery staff; do
  test -d "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/public/images/$p" || echo "MISSING: $p"
done
test -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/public/icons/pin.svg" || echo "MISSING: pin.svg"
```
Expected: no `MISSING` lines.

---

### Task 6: Setup guides (04_SETUP_GUIDE/)

**Files:**
- Create: `04_SETUP_GUIDE/START_HERE_JA.md`
- Create: `04_SETUP_GUIDE/WEB_SETUP_JA.md`
- Create: `04_SETUP_GUIDE/GAS_SETUP_JA.md`
- Create: `04_SETUP_GUIDE/SHEETS_SETUP_JA.md`
- Create: `04_SETUP_GUIDE/CALENDAR_SETUP_JA.md`
- Create: `04_SETUP_GUIDE/CONFIG_SETUP_JA.md`
- Create: `04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md`

**Interfaces:**
- Consumes: exact commands/keys from the plan header's "Web app", "GAS
  app", "Script Properties", "CONFIG keys" facts. Every command in these
  docs must be one that actually exists in the packaged `package.json`
  scripts (Task 2/3) — no invented commands.
- Produces: the sequence `START_HERE_JA.md` links to; referenced by
  `README_JA.md` (Task 10) and `TROUBLESHOOTING_JA.md` (Task 8).

- [ ] **Step 1: Write START_HERE_JA.md**

Required content: a "対象読者" note up front (「本パッケージは、基本的な
Web開発・Googleサービスの操作ができる方（フリーランスエンジニア、
個人開発者、Next.js/GitHub/Vercelにある程度慣れた方、または技術サポート
を得られる店舗運営者）を対象としています」— per the spec's targeting
requirement, no 「専門知識不要」／「誰でも簡単」claims), then a 12-step
numbered flow, each step 2–4 lines and linking to the detailed guide:

```text
STEP 1  準備するもの（Node.js 20+、npm、GitHubアカウント、Googleアカウント、
        Vercelアカウント）
STEP 2  テンプレートを取得（このZIPを展開する）
STEP 3  Next.jsプロジェクトをセットアップ → WEB_SETUP_JA.md
STEP 4  Google Sheetsを作成 → ../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md
STEP 5  Google Apps Scriptをセットアップ → GAS_SETUP_JA.md
STEP 6  Google Calendarを設定 → CALENDAR_SETUP_JA.md
STEP 7  Gmailを確認（GASの実行ユーザーのGmailがそのまま送信元になる旨、
        CALENDAR_SETUP_JA.mdまたはGAS_SETUP_JA.md内の説明を参照）
STEP 8  CONFIGを設定 → CONFIG_SETUP_JA.md
STEP 9  ローカルで動作確認（npm run dev、http://localhost:3000）
STEP 10 Vercelへデプロイ → VERCEL_DEPLOY_JA.md
STEP 11 予約テスト（実際に1件テスト予約を送信し、Sheets/Calendar/メール
        に反映されるか確認）
STEP 12 本番利用開始（デモデータを実データに置き換えてから公開）
```
End with a link to `../05_CUSTOMIZATION/` for content/design changes and
`../06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md` for problems.

- [ ] **Step 2: Write WEB_SETUP_JA.md**

Must include, verbatim/derived from the plan header, not invented:
- 前提条件: Node.js 20以上、npm
- `cd 01_WEB_TEMPLATE/salon-website && npm install`
- 環境変数: `.env.example` をコピーして `.env.local` を作成し、
  `GAS_WEBAPP_URL` にGASデプロイ後のWebアプリURLを設定する（サーバー
  側専用の変数で、ブラウザには渡らないこと、未設定時は
  `config/demo-content.ts`のデモデータで動作することを明記）。
- `npm run dev` → http://localhost:3000
- `npm run build` / `npm start`（本番ビルド）
- `npm run typecheck` / `npm test` / `npm run lint`
- フロントエンドとGASの通信経路: ブラウザ → `/api/gas`（Next.jsの
  サーバー側プロキシ、`app/api/gas/route.ts`）→ GAS Web App。実際の
  シークレット（GAS URL）はブラウザに渡らない設計だと明記。

- [ ] **Step 3: Write GAS_SETUP_JA.md**

Must include:
- Apps Scriptプロジェクトの作成（`npx clasp login` → `npx clasp create
  --type webapp --title "任意のタイトル" --rootDir build`、または既存
  プロジェクトに接続する場合は `.clasp.json.example` を `.clasp.json` に
  コピーして実際のscriptIdを入力）— 開発者の実URLやIDは絶対に使わない
  ことを明記。
- ビルド: `cd 02_GAS/salon-reservation-gas && npm install && npm run
  build`（esbuildで`build/Code.js`+`build/appsscript.json`を生成）
- デプロイ: `npm run push`（build後に`clasp push`）、その後Apps
  Scriptエディタから「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」
  を選択。実行ユーザー: `USER_DEPLOYING`（=デプロイした本人のGoogle
  アカウント。これがGmail送信元にもなる）。アクセスできるユーザー:
  `ANYONE_ANONYMOUS`（=リンクを知っている全員。予約フォームから匿名で
  呼び出せる必要があるため）。
- スクリプトプロパティ（Apps Scriptエディタ → プロジェクトの設定 →
  スクリプト プロパティ）: `SPREADSHEET_ID`（必須、Google SheetsのURL
  中のID）、`SITE_BASE_URL`（予約キャンセルURL生成に使用、例:
  Vercelデプロイ後の本番URL）。
- デプロイ後に発行されるWebアプリのURLを`01_WEB_TEMPLATE/salon-website`
  側の`.env.local`の`GAS_WEBAPP_URL`に設定する、という往復の流れを図示
  （テキストの矢印図でよい）。
- `npm run typecheck` / `npm test`（GAS側の単体テスト）。

- [ ] **Step 4: Write SHEETS_SETUP_JA.md**

Short guide that: (a) states the Sheets template itself is documented in
`../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`, (b) focuses specifically on
wiring the created Spreadsheet ID into the `SPREADSHEET_ID` Script
Property from GAS_SETUP_JA.md Step, with a screenshot-free textual
walkthrough of finding the ID in the Sheets URL
(`https://docs.google.com/spreadsheets/d/<ここがID>/edit`), (c) a short
"動作確認" section: run `setupDemoSheets` once, then check each of the 9
tabs was created with the right header row.

- [ ] **Step 5: Write CALENDAR_SETUP_JA.md**

Must include:
- 自分専用のGoogleカレンダーを用意する（既存のプライベートカレンダーを
  流用せず、専用カレンダーの作成を推奨）。
- カレンダーIDの調べ方（カレンダーの設定 → 該当カレンダー →
  「カレンダーの統合」→「カレンダーID」）。
- `STAFF`シートの`CalendarID`列にスタッフごとのカレンダーIDを設定する
  ことで、スタッフ単位のカレンダー連携ができる旨（空欄の場合の挙動は
  `CONFIG`の`calendar.id`がフォールバックとして使われる —
  `docs/config-and-sheets-guide.md`/`ConfigParser.ts`の実装に基づく）。
- GASの実行アカウントがそのカレンダーへの編集権限を持っている必要が
  ある旨（同一Googleアカウントなら通常問題ない）。
- 重要な概念の説明（spec section 20の要求そのまま、平易な日本語で）:
  「ホームページに表示される空き時間はあくまで参考情報です。実際の
  予約確定時には、Apps Script側でもう一度カレンダーの空き状況を
  再チェックしてから確定します。そのため、ごくまれに『空いていた
  はずの時間が、直前に他のお客様の予約で埋まっていた』という場合が
  あり、その際は別の時間帯の選択をお願いするメッセージが表示されます」。
- テストイベント作成の確認手順（テスト予約を送信 → カレンダーに
  イベントが作成されるか確認）。

- [ ] **Step 6: Write CONFIG_SETUP_JA.md**

Derive the "変更してよい" / "変更しない" table directly from the plan
header's "CONFIG keys" section — reproduce every key. Structure:
1. CONFIGシートの開き方（Google Sheets → `CONFIG`タブ）。
2. 変更してよい項目（表: キー / 説明 / 例）— `business.*`,
   `hours.*`（7項目）, `features.*`（5項目）, `staff.anyAvailableOption`。
3. 慎重に変更する項目（表）— `reservation.slotMinutes`/
   `minLeadHours`/`maxBookingDays`（数値、予約ロジックに直接影響する
   ため変更後は必ずテスト予約で確認）。
4. 変更しない項目（表）— `reservation.timezone`（`Asia/Tokyo`固定、
   `ConfigValidator`が検証している）、`calendar.id`／
   `email.ownerNotifyAddress`／`email.fromName`（`getConfig`の公開APIに
   一切含まれない内部設定である旨も明記）。
5. `HOLIDAYS`シートは別シートであり、CONFIGのキーではない旨の注記。
6. 変更後の反映方法: 保存すれば次回のAPI呼び出しから即座に反映される
   （再デプロイ不要）と明記。

- [ ] **Step 7: Write VERCEL_DEPLOY_JA.md**

Must include:
- GitHubリポジトリの用意（このテンプレートを自分のGitHubリポジトリに
  push、または新規リポジトリとして作成）。
- Vercelへのインポート手順（Vercelダッシュボード → Add New → Project
  → GitHubリポジトリを選択 → Root Directoryを
  `01_WEB_TEMPLATE/salon-website`に設定— モノレポ構成である旨を明記）。
- 環境変数の設定（Vercelプロジェクト設定 → Environment Variables →
  `GAS_WEBAPP_URL` を追加）。
- デプロイ実行、発行される本番URLの確認。
- デプロイ後のテスト: `/api/health`にアクセスして`{"status":"ok",...}`
  が返るか確認、トップページと`/reservation`が表示されるか確認。
- 本番URLを`SITE_BASE_URL`スクリプトプロパティ（GAS側）にも反映する
  ことを忘れずに、という相互参照の注記。
- 開発者自身のVercelプロジェクトは一切含まれない・購入者自身の
  Vercelアカウントで完結する、という所有権の明記（spec section 21）。

- [ ] **Step 8: Cross-link check — every guide's relative links resolve**

```bash
cd "product/coconala-salon-template"
grep -rEo '\]\([^)]+\.md[^)]*\)' 04_SETUP_GUIDE/*.md 05_CUSTOMIZATION/*.md README_JA.md 2>/dev/null | \
  sed -E 's/^[^:]+:\]\(([^)]+)\)/\1/' | sort -u
```
For each relative path printed, manually confirm the target file exists
relative to the linking file's directory (Task 12 automates the full
version of this check across the whole package).

---

### Task 7: Customization guides (05_CUSTOMIZATION/, remaining 4)

**Files:**
- Create: `05_CUSTOMIZATION/CONTENT_CUSTOMIZATION_JA.md`
- Create: `05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`
- Create: `05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md`
- Create: `05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`

(`IMAGE_CUSTOMIZATION_JA.md` was written in Task 5.)

**Interfaces:**
- Consumes: `config/demo-content.ts` structure, `SERVICES`/`STAFF` sheet
  schemas (Task 4), `theme.ts` tokens — all from the plan header.
- Produces: docs cross-linked from `README_JA.md` (Task 10).

- [ ] **Step 1: Write CONTENT_CUSTOMIZATION_JA.md**

Structure: a table splitting **business data**（店舗名・キャッチコピー・
メニュー・スタッフ・FAQ・アクセス・連絡先 — すべてGoogle Sheets経由、
`CONFIG`/`SERVICES`/`STAFF`シート）from **presentation/design**（配色・
フォント・余白など — `01_WEB_TEMPLATE/salon-website/app/globals.css`と
`config/theme.ts`、詳細は`DESIGN_CUSTOMIZATION_JA.md`参照）. Explicitly
call out that `config/demo-content.ts` (フロントエンド内のデモデータ)
represents *demo-only fallback content shown before Sheets integration is
configured, or when features are read server-side before Phase 3+ wiring
existed* — once `GAS_WEBAPP_URL`/Sheets are configured, business content
should come from Sheets, not from editing this file directly. List each
demo value present today (店舗名「凛」、電話番号「03-1234-5678」、
メール「info@rin-salon.example.com」、住所「東京都中央区銀座1-2-3
銀座ビルディング5F」など) as things to replace via CONFIG_SETUP_JA.md,
MENU_CUSTOMIZATION_JA.md, STAFF_CUSTOMIZATION_JA.md. Link to those three
docs plus IMAGE_CUSTOMIZATION_JA.md and DESIGN_CUSTOMIZATION_JA.md.

- [ ] **Step 2: Write MENU_CUSTOMIZATION_JA.md**

Must include:
- メニュー（サービス）はGoogle Sheetsの`SERVICES`シートが正（authoritative
  source）である旨を明記 — spec要求どおり、Reactコンポーネントへの
  価格・時間のハードコードを指示しないこと。
- `SERVICES`シートの列一覧（`ServiceID`, `Name`, `DurationMinutes`,
  `Price`, `Active`, `StaffRequired`, `DisplayOrder`）と各列の意味。
- メニュー追加: 新しい行に一意の`ServiceID`（例: `SV008`）、名前、
  分数、価格、`Active`=`true`、`StaffRequired`、`DisplayOrder`を入力。
- メニュー削除: 行を削除する代わりに`Active`を`false`にすることを推奨
  （既存の予約履歴との整合性のため、と説明）。
- 名前・価格・時間の変更: 該当セルを直接編集するだけでよい。
- 表示順: `DisplayOrder`の昇順で予約UIに表示される。
- 反映のタイミング: 保存後、次回の`getServices`呼び出しから反映
  （再デプロイ不要）。
- 触ってはいけないもの: `ServiceID`は一度使ったら変更しない
  （既存予約の`RESERVATIONS.ServiceID`列が参照しているため）。

- [ ] **Step 3: Write STAFF_CUSTOMIZATION_JA.md**

Must include:
- `STAFF`シートの列一覧（`StaffID`, `Name`, `Active`, `CalendarID`,
  `DisplayOrder`）。
- スタッフ追加/削除/表示名変更/有効・無効切り替え（`Active`列）の手順。
- `CalendarID`列: スタッフごとに専用のGoogleカレンダーIDを割り当てる
  ことができ、空欄の場合は`CONFIG`シートの`calendar.id`がフォールバック
  として使われる、と明記（`CALENDAR_SETUP_JA.md`への相互参照）。
- 「指名なし（お任せ）」の挙動: `CONFIG`の`staff.anyAvailableOption`が
  `true`の場合に予約UIへ表示される選択肢で、`features.staffSelection`
  が`false`の場合は`staff.anyAvailableOption`も`false`にしておくべき、
  という整合性の注記（`docs/config-and-sheets-guide.md`の実装ノート
  どおり）。
- `StaffID`も`ServiceID`同様、一度使ったら変更しないこと（既存予約が
  参照しているため）。

- [ ] **Step 4: Write DESIGN_CUSTOMIZATION_JA.md**

Must include:
- 配色: `01_WEB_TEMPLATE/salon-website/app/globals.css`の`@theme
  inline`ブロック内のCSSカスタムプロパティで一括管理されている旨
  （Tailwindユーティリティクラス`bg-accent`等から参照される）。
- タイポグラフィ・余白・レスポンシブ: `config/theme.ts`の内容を転記
  — `SPACING_PX`（4pxベース: 4/8/12/16/24/32/48/64/96/128）、
  `BREAKPOINTS_PX`（tablet:640 / desktop:1024 / largeDesktop:1440）、
  `MOTION_MS`（heroEnter:400 / reveal:300 / press:150 / accordion:200）、
  `CONTENT_MAX_WIDTH_PX`:1120。
- 「ここは変更してよい」＝プレゼンテーション層（`app/globals.css`、
  `config/theme.ts`、`components/`内のスタイル指定）と「ここは
  Sheets側で変更する」＝店舗情報・メニュー・スタッフ、という対比表を
  spec section 16の例に沿って掲載:
  ```text
  アクセントカラーを変える     → app/globals.css の @theme inline
  店舗情報を変える            → Google Sheets CONFIG シート
  メニューを変える            → Google Sheets SERVICES シート
  スタッフを変える            → Google Sheets STAFF シート
  画像を変える                → public/images/
  ```
- 業務データ（店舗名・価格など）をプレゼンテーション用コンポーネント
  に直接書き込まないよう注意喚起。

- [ ] **Step 5: Verify every file path mentioned resolves inside the
  packaged copy**

```bash
test -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/app/globals.css"
test -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/config/theme.ts"
test -e "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website/config/demo-content.ts"
```
Expected: all three succeed.

---

### Task 8: Troubleshooting guide

**Files:**
- Create: `06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md`

**Interfaces:**
- Consumes: the plan header's "API envelope"/error-code list and the
  Script Properties facts — every failure mode documented must map to a
  real error code or a real, plausible misconfiguration already described
  elsewhere in this plan (no invented failure modes).

- [ ] **Step 1: Write TROUBLESHOOTING_JA.md with these exact problem
  sections, each as: 症状 → 考えられる原因 → 確認手順**

```text
1. 予約ページにメニューが表示されない
   原因候補: SERVICESシートが空/Activeがfalse、features.reservationが
   false、GAS_WEBAPP_URL未設定、GASデプロイのアクセス権限が
   ANYONE_ANONYMOUSになっていない
   確認: SERVICESシートのActive列、CONFIGシートのfeatures.reservation、
   ブラウザの開発者ツールでネットワークエラーを確認

2. スタッフが表示されない
   原因候補: STAFFシートが空/Activeがfalse、features.staffSelectionが
   false（この場合は仕様どおり — getStaffはエラーではなく空配列を返す）
   確認: CONFIGシートのfeatures.staffSelection、STAFFシートのActive列

3. 空き時間が表示されない
   原因候補: 営業時間（hours.*）がclosed、HOLIDAYSシートに該当日が
   登録されている、CalendarIDの設定ミス、reservation.minLeadHours/
   maxBookingDaysの範囲外
   確認: CONFIGのhours.*とHOLIDAYSシート、STAFF/CONFIGのカレンダーID

4. 予約送信できない
   原因候補: GASデプロイURLの設定ミス、GASデプロイの権限設定ミス
   （実行ユーザー/アクセスできるユーザー）、SPREADSHEET_ID未設定
   確認: .env.local の GAS_WEBAPP_URL、GASのデプロイ設定、スクリプト
   プロパティ

5. Calendarに予約が作成されない
   原因候補: CalendarID/calendar.idの設定ミス、GAS実行アカウントに
   そのカレンダーへの編集権限がない
   確認: STAFF.CalendarID / CONFIG.calendar.id、カレンダーの共有設定
   補足: この場合でも予約自体はRESERVATIONSシートに記録され、
   「要確認」状態になることがある（reservation-transaction-architecture
   の設計どおり、予約が失われるわけではない）

6. メールが届かない
   原因候補: features.emailNotificationがfalse、迷惑メールフォルダ、
   GAS実行アカウントのGmail送信制限
   確認: CONFIGのfeatures.emailNotification、EMAIL_LOGシートの
   Status/ErrorMessage列、Apps Scriptの実行ログ

7. Vercelで動かない
   原因候補: Root Directoryの設定ミス（01_WEB_TEMPLATE/salon-website
   になっていない）、環境変数GAS_WEBAPP_URL未設定、ビルドログのエラー
   確認: Vercelのビルドログ、Environment Variables設定
```
Each section stays in plain, non-alarming Japanese and does not expose
internal secrets or developer-only debug info (no stack traces, no
internal-only sheet columns beyond what's already public in this package).

- [ ] **Step 2: Cross-check every error code mentioned actually exists**

```bash
grep -o 'ERROR_CODES\.[A-Z_]*\|"[A-Z_]*_ERROR"\|"[A-Z_]*_INVALID"\|"[A-Z_]*_DISABLED"\|"[A-Z_]*_UNAVAILABLE"\|"[A-Z_]*_BUSY"' \
  "product/coconala-salon-template/02_GAS/salon-reservation-gas/src/Api.ts" | sort -u
```
Manually confirm any error code named in `TROUBLESHOOTING_JA.md` appears
in this list (it doesn't have to name error codes explicitly — plain
Japanese symptoms are preferred per spec — but if a code is quoted it must
be real).

---

### Task 9: License

**Files:**
- Create: `07_LICENSE/LICENSE_JA.txt`

**Interfaces:**
- Consumes: spec section 26's allowed/not-allowed lists verbatim.
- Produces: referenced by `README_JA.md` (Task 10) and
  `MANIFEST.md` (Task 10).

- [ ] **Step 1: Write LICENSE_JA.txt**

Required content, plain Japanese, practical-usage framing (explicitly not
presented as formal legal advice — state that up front):

```text
本ライセンスは、本テンプレート（以下「本製品」）の実用的な利用条件を
定めるものであり、法律専門家による法的助言ではありません。重要な
契約においては、必要に応じて専門家にご確認ください。

【許可されること】
- ご自身の事業（ご自身のサロン・店舗、または受託先1店舗）のウェブ
  サイトとして利用すること
- ソースコードを自由に改変すること
- デザイン・文言・画像・機能を自由にカスタマイズすること
- ご自身のGitHub/Vercel/Google環境にデプロイすること
- 1ライセンスにつき、1つの店舗・1つの公開サイトでの利用

【許可されないこと】
- 本製品（元のソースコード・パッケージ）自体を再配布すること
- 本製品をテンプレート/素材として再販売すること
- 本製品のソースコードを公開リポジトリ等で公開すること
- 同一または実質的に同じテンプレートを別の商品として販売すること
- 本製品のオリジナル制作者であると主張すること

複数店舗・複数サイトへの導入をご希望の場合は、販売者までご相談
ください。

ご不明点がある場合は、購入前後を問わずCoconalaのメッセージにて
お問い合わせください。
```

- [ ] **Step 2: Confirm no placeholder text remains**

```bash
grep -n "TBD\|TODO\|FIXME" "product/coconala-salon-template/07_LICENSE/LICENSE_JA.txt"
```
Expected: no matches.

---

### Task 10: README_JA.md, MANIFEST.md (top-level)

**Files:**
- Create: `product/coconala-salon-template/README_JA.md`
- Create: `product/coconala-salon-template/MANIFEST.md`

**Interfaces:**
- Consumes: everything produced in Tasks 1–9 (this is the index/summary
  layer — every path it references must already exist).

- [ ] **Step 1: Write README_JA.md answering, in order, spec section 23's
  10 questions**

1. この商品は何か — 美容サロン向けホームページ＋オンライン予約システム
   テンプレート（完成済みのソース一式）。
2. 誰向けか — 基本的なWeb開発・Googleサービスの操作ができる方
   （個人開発者・フリーランスエンジニア・技術サポートを得られる店舗
   運営者）。非技術者がゼロから一人で完結できる製品ではない旨を明記。
3. 何が含まれるか — `MANIFEST.md`への参照＋簡潔な箇条書き。
4. 何が含まれないか — 導入代行、Googleアカウント設定代行、デザイン
   制作、原稿作成、個別カスタマイズ、原因調査を伴う個別サポート
   （section 25の内容を要約）。
5. 必要な知識 — Node.js/npm操作、GitHub、Vercel、Google Apps Script
   の基本、Google Sheetsの編集。
6. セットアップの大まかな流れ — `04_SETUP_GUIDE/START_HERE_JA.md`への
   リンク＋12ステップの要約。
7. カスタマイズ方法 — `05_CUSTOMIZATION/`への案内。
8. ライセンス — `07_LICENSE/LICENSE_JA.txt`への参照＋要点2〜3行。
9. サポート範囲 — section 25の表を再掲（含まれるもの／含まれないもの）。
10. 困った場合 — `06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md`への案内、
    それでも解決しない場合の導入・カスタマイズサービスへの自然な
    アップセル文言（spec section 38の例文をベースに）。

Also include, near the top, a short "コンテンツ ¥2,500 とサービスの違い"
section using the spec section 24 two-flow comparison (self-service flow
vs. full-service flow), and explicitly state: 「これはセルフサービス型の
テンプレートです」.

- [ ] **Step 2: Write MANIFEST.md**

List every top-level deliverable with a one-line description, per spec
section 35's example, using the actual package tree:

```text
【納品物】

1. 01_WEB_TEMPLATE/salon-website/  — Next.jsホームページ＋予約UI
   テンプレート一式（ソースコード）
2. 02_GAS/salon-reservation-gas/   — Google Apps Script予約バックエンド
   一式（ソースコード）
3. 03_GOOGLE_SHEETS/               — Google Sheetsテンプレート（CSV）＋
   セットアップガイド
4. 04_SETUP_GUIDE/                 — セットアップガイド（7ファイル）
5. 05_CUSTOMIZATION/               — カスタマイズガイド（5ファイル）
6. 06_TROUBLESHOOTING/             — トラブルシューティングガイド
7. 07_LICENSE/                     — 利用ライセンス
8. README_JA.md                    — 本製品の概要
9. VERSION.txt                     — バージョン情報
```
Follow with a short note: 「本製品には、開発者ご自身のGoogleアカウント
情報・APIキー・デプロイURLなどの秘匿情報は一切含まれていません。すべて
購入者ご自身のGoogle/GitHub/Vercelアカウントで設定していただく設計
です。」

- [ ] **Step 3: Verify every path MANIFEST.md/README_JA.md reference
  exists**

```bash
cd "product/coconala-salon-template"
for p in 01_WEB_TEMPLATE/salon-website 02_GAS/salon-reservation-gas \
         03_GOOGLE_SHEETS 04_SETUP_GUIDE 05_CUSTOMIZATION \
         06_TROUBLESHOOTING 07_LICENSE VERSION.txt; do
  test -e "$p" || echo "MISSING: $p"
done
```
Expected: no `MISSING` lines.

---

### Task 11: Coconala listing draft (seller-facing, outside the customer package)

**Files:**
- Create: `product/coconala-listing-draft-ja.md`

**Interfaces:**
- Consumes: spec sections 36–38 verbatim structure. This file is NOT
  copied into `product/coconala-salon-template/` and NOT included in the
  ZIP (Task 13 must exclude it).

- [ ] **Step 1: Write coconala-listing-draft-ja.md**

Required sections, in order (spec section 36):
1. 商品タイトル案（2〜3案、customer-problem framed, not tech-stack
   framed — e.g. 「美容サロン向け｜ホームページ＋オンライン予約
   システム テンプレート」）
2. 短い説明文（100字程度）
3. 詳細説明文（section 37の階層に沿って: 見出し → 何ができるか →
   何が届くか → 誰向けか → 導入に必要な知識 → 含まれないサービス →
   導入が難しい場合のサポートサービス）
4. 納品物一覧（MANIFEST.mdの内容を転記）
5. 対象となるお客様
6. 必要な知識・スキル
7. 含まれないもの（サポート境界の再掲）
8. 導入の難易度目安（例: 「Web制作・Google Workspace操作の経験がある
   方であれば、半日〜1日程度でセットアップ可能な想定です」— 誇張しない
   現実的な見積もり）
9. サポート範囲
10. よくある質問案（FAQ、5〜8問。例:「非技術者でも使えますか？」への
    正直な回答を含める）
11. 導入・カスタマイズサービスへのアップセル文言（spec section 38の
    例文をベースに、機能を意図的に制限しているわけではないことが
    伝わる書き方で）

Explicitly avoid leading with `Next.js`/`TypeScript`/`GAS`/`CalendarApp`/
`LockService` in the headline or short description (spec section 37) —
technical stack may appear later in the detailed description only.

- [ ] **Step 2: Verify it stays outside the customer package**

```bash
find "product/coconala-salon-template" -iname "coconala-listing-draft-ja.md"
```
Expected: no output.

---

### Task 12: Validation (independent package build + secret scan + doc consistency)

**Files:**
- No new package files. Produces log files under
  `.evidence/<timestamp>-productization-coconala-2500/` (Task 14 finalizes
  the evidence folder; this task's commands write into it as they run).

**Interfaces:**
- Consumes: the full packaged tree from Tasks 1–11.
- Produces: pass/fail evidence consumed by the final report (spec section
  29/30/31).

- [ ] **Step 1: Set up the evidence directory for this run**

```bash
mkdir -p ".evidence/20260907-productization-coconala-2500"
```
(Use the actual current timestamp if this step runs at a different time
than drafted — keep the `YYYYMMDD-HHMM-productization-coconala-2500`
convention from spec section 41.)

- [ ] **Step 2: Install and validate the packaged web copy standalone**

```bash
cd "product/coconala-salon-template/01_WEB_TEMPLATE/salon-website"
npm install 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/web-install.log"
npm run typecheck 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/web-typecheck.log"
npm run build 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/web-build.log"
npm test 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/web-test.log"
```
Expected: typecheck/build/test all exit 0. Record actual pass/fail and
test counts — do not assume they match the production tree's last known
numbers; this is a different `node_modules` resolution (fresh install)
and must be verified independently.

- [ ] **Step 3: Install and validate the packaged GAS copy standalone**

```bash
cd "product/coconala-salon-template/02_GAS/salon-reservation-gas"
npm install 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/gas-install.log"
npm run typecheck 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/gas-typecheck.log"
npm run build 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/gas-build.log"
npm test 2>&1 | tee "../../../../.evidence/20260907-productization-coconala-2500/gas-test.log"
```
Expected: typecheck/build/test all exit 0.

- [ ] **Step 4: Secret scan across the entire package**

```bash
cd "product/coconala-salon-template"
grep -rnE "AIza[0-9A-Za-z_-]{35}|[0-9]{12}-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com" . \
  > "../../.evidence/20260907-productization-coconala-2500/secret-scan.log" 2>&1
grep -rn "script.google.com/macros/s/" . --include='*.ts' --include='*.tsx' --include='*.md' \
  >> "../../.evidence/20260907-productization-coconala-2500/secret-scan.log" 2>&1
find . -iname ".env" -o -iname ".env.local" -o -iname ".env.production" -o -iname ".clasp.json" -o -iname ".clasprc.json" \
  >> "../../.evidence/20260907-productization-coconala-2500/secret-scan.log" 2>&1
```
Expected: the API-key/OAuth-client patterns match nothing; any
`script.google.com/macros` hits are only inside `*.test.ts`/`*.test.tsx`
files using synthetic placeholder IDs (already verified in the Explore
pass — re-verify here on the packaged copy, not the source tree); the
`find` for real env/clasp files prints nothing.

- [ ] **Step 5: Development-artifact scan**

```bash
cd "product/coconala-salon-template"
find . -iname "node_modules" -o -iname ".next" -o -iname "coverage" \
  -o -iname ".git" -o -iname ".claude" -o -iname ".superpowers" \
  -o -iname ".evidence" -o -iname "CLAUDE.md" -o -iname "AGENTS.md" \
  -o -iname "*.tsbuildinfo" -o -iname "test-output.log" -o -iname "typecheck-output.log" \
  > "../../.evidence/20260907-productization-coconala-2500/artifact-scan.log" 2>&1
```
Expected: empty file.

- [ ] **Step 6: Documentation path/consistency check**

For every `.md` file under `04_SETUP_GUIDE/`, `05_CUSTOMIZATION/`,
`06_TROUBLESHOOTING/`, `03_GOOGLE_SHEETS/`, and the top-level
`README_JA.md`/`MANIFEST.md`: extract every relative-path-looking string
(markdown links, backtick-quoted paths) and confirm the target exists
relative to the package root or the linking file. Also confirm every
`npm run <x>` command quoted in any guide exists in the corresponding
copied `package.json`'s `scripts` block, and every CONFIG key / Sheet
column name quoted matches the plan header's tables exactly (spot-check
at least the full `CONFIG_SETUP_JA.md` table against
`SheetSchemas.ts`/`ConfigParser.ts` in the packaged GAS copy). Save
findings to
`.evidence/20260907-productization-coconala-2500/documentation-path-check.log`
— list every checked reference and its resolution (found/not found).
Fix any doc that references a nonexistent path or a wrong command/key
before proceeding.

- [ ] **Step 7: Package tree snapshot**

```bash
find "product/coconala-salon-template" -maxdepth 4 | sort \
  > ".evidence/20260907-productization-coconala-2500/package-tree.txt"
```

---

### Task 13: Build the ZIP

**Files:**
- Create: `product/releases/coconala-salon-template-v1.0.0.zip`

**Interfaces:**
- Consumes: only `product/coconala-salon-template/` (never
  `product/coconala-listing-draft-ja.md`, never `.evidence/`, never
  `.git`).

- [ ] **Step 1: Create the ZIP from a clean listing**

```bash
cd "product"
7z a -tzip "releases/coconala-salon-template-v1.0.0.zip" "coconala-salon-template" \
  -xr!node_modules -xr!.next -xr!build -xr!coverage
```
If `7z` is unavailable, use PowerShell's `Compress-Archive` instead —
either way, the source is only the `coconala-salon-template` folder
produced by Tasks 1–10 (which, per those tasks' exclusions, should already
contain no `node_modules`/`.next`/`build` — the `-xr!` flags here are a
belt-and-suspenders re-exclusion, not a substitute for Task 2/3's copy
exclusions).

- [ ] **Step 2: Inspect the ZIP contents before calling it done**

```bash
7z l "product/releases/coconala-salon-template-v1.0.0.zip" | tee ".evidence/20260907-productization-coconala-2500/final-package-files.txt"
```
Manually confirm in the listing: no `node_modules`, no `.env`/`.env.local`,
no `.clasp.json` (only `.clasp.json.example`), no `.git`, no
`coconala-listing-draft-ja.md`, no `.evidence/`; and that all 7 numbered
directories plus `README_JA.md`/`MANIFEST.md`/`VERSION.txt` are present at
the top of `coconala-salon-template/`.

- [ ] **Step 3: Record the ZIP's size and file count**

```bash
7z l "product/releases/coconala-salon-template-v1.0.0.zip" | tail -5
```
Note the reported file/dir count and total size for the final report.

---

### Task 14: Evidence finalization and final report

**Files:**
- Modify: `.evidence/20260907-productization-coconala-2500/status.txt`
  (new file — `git status -s` and `git diff --stat` output, proving
  `apps/salon-portfolio/**` was never touched)
- Modify: `.evidence/20260907-productization-coconala-2500/package-manifest.txt`
  (copy of the final `MANIFEST.md`)

**Interfaces:**
- Consumes: all logs from Task 12 + `final-package-files.txt` from Task
  13.
- Produces: the final report the user receives, in the exact section
  order from spec section 46 (A–R) plus the Tests/Build/Commit footer.

- [ ] **Step 1: Capture git status proving production source is untouched**

```bash
git status -s > ".evidence/20260907-productization-coconala-2500/status.txt"
git diff --stat -- apps/salon-portfolio >> ".evidence/20260907-productization-coconala-2500/status.txt"
```
Expected: the `apps/salon-portfolio` diff-stat is empty (no changes) —
`product/`, `docs/superpowers/plans/`, and `.evidence/` are the only
touched paths. If `apps/salon-portfolio` shows any diff, stop and
investigate before writing the final report — this plan's Global
Constraints forbid modifying production source.

- [ ] **Step 2: Copy the manifest into evidence**

```bash
cp "product/coconala-salon-template/MANIFEST.md" \
   ".evidence/20260907-productization-coconala-2500/package-manifest.txt"
```

- [ ] **Step 3: Write the final report using the spec section 46 template**

Sections A–R, using real values pulled from this run's logs (never
estimated): test counts from `web-test.log`/`gas-test.log` (Task 12 Step
2/3), build PASS/FAIL from the same logs, secret-scan result from
`secret-scan.log`, ZIP path from Task 13, and an explicit statement
distinguishing "code/package validation" (typecheck/build/test on the
packaged copy, done) from "real customer Google environment validation"
(creating a live Sheets/Calendar/GAS deployment and running an actual
reservation end-to-end — NOT done in this session, since it requires a
Google account this session doesn't have; state this plainly per spec
section 46's closing instruction). List any spec requirement that could
not be verified as a named gap under "Q. Remaining improvements", not
silently.

- [ ] **Step 4: Confirm no commit was made**

```bash
git status -s
git log --oneline -3
```
Confirm the log's most recent commit is still `dbed655` (or whatever the
tip was before this session started) and `git status -s` shows only
untracked `product/`, `docs/superpowers/plans/2026-09-07-coconala-
productization.md`, and `.evidence/20260907-productization-coconala-2500/`
— nothing staged, nothing committed. Report this in the final report's
"R. Git status" and "Commit" footer.

---

## Self-review notes (already applied above)

- Spec coverage: sections 5–41 each map to a task above; sections 1–4 and
  42–47 are covered by the Global Constraints, the review pass folded into
  Task 12 Steps 4–6, and the final-report template in Task 14 Step 3.
- No placeholders: every doc-writing step lists the exact required
  sections and the exact facts/tables to embed (sourced from the "Ground-
  truth facts" block), rather than "write appropriate content."
- Type/name consistency: Sheet names, column names, CONFIG keys, npm
  script names, and Script Property names are defined once in the Ground-
  truth facts block and every later task instructed to reuse them
  verbatim rather than re-deriving.
