# CONFIG & Sheets Data Layer Guide

Covers the Phase 3A data foundation: the `CONFIG` sheet, the Google
Sheets schema, and how to set up a scratch spreadsheet for development.
This does **not** cover reservations, Calendar, or Gmail — those ship in
later phases (see `roadmap.md`).

## For the salon owner: editing CONFIG

`CONFIG` is a simple three-column sheet: **Key** (do not edit — code
reads this exact text), **Value** (edit this), **Description** (a short
Japanese note explaining what the row controls). Every key currently
supported:

| Key | 説明 | 値の例 |
|---|---|---|
| `business.name` | 店舗名 | `Demo Salon` |
| `business.phone` | 電話番号 | `03-0000-0000` |
| `business.email` | 店舗メール | `owner@example.com` |
| `business.address` | 住所 | `東京都千代田区1-1-1` |
| `hours.monday` 〜 `hours.sunday` | 曜日ごとの営業時間 | `10:00-19:00` または `closed`（定休日） |
| `reservation.timezone` | タイムゾーン（変更不可） | `Asia/Tokyo` |
| `reservation.slotMinutes` | 予約枠の単位（分） | `30` |
| `reservation.minLeadHours` | 予約締切（何時間前まで受付） | `1` |
| `reservation.maxBookingDays` | 予約可能期間（何日先まで） | `60` |
| `features.contactForm` | 問い合わせ受付 | `true` / `false` |
| `features.reservation` | 予約受付 | `true` / `false` |
| `features.staffSelection` | スタッフ指名の可否 | `true` / `false` |
| `features.calendar` | カレンダー連携 | `true` / `false` |
| `features.emailNotification` | メール通知 | `true` / `false` |
| `staff.anyAvailableOption` | 「指名なし（お任せ）」の表示 | `true` / `false`（`features.staffSelection` が `false` のときは `false` にすること） |
| `calendar.id` | 共有カレンダーID（開発者向け・非公開） | `primary` |
| `email.ownerNotifyAddress` | 通知メール宛先（非公開） | `owner@example.com` |
| `email.fromName` | 送信者表示名（非公開） | `Demo Salon` |

Only `true`/`false` (exact spelling) are accepted for yes/no values — a
checkbox cell typed as TRUE/FALSE in Sheets works automatically.

### 任意項目（V1.1 Task 4 — トップページの表示を豊かにする項目）

以下は**すべて任意**です。空欄のまま（またはキー自体を追加しない
まま）でも一切エラーになりません — 追加した分だけ、トップページの
表示（ヒーローの見出し・フッターのSNSリンクなど）が今までの
デモ内容の代わりにご自身の内容になります。

| Key | 説明 | 値の例 |
|---|---|---|
| `business.nameLatin` | 店舗名（ローマ字表記、任意） | `Rin Nail & Eyelash` |
| `business.tagline` | キャッチコピー（任意・ヒーロー見出し） | `静けさの中で、指先とまなざしを整える。` |
| `business.postalCode` | 郵便番号（任意） | `〒104-0061` |
| `social.instagram` | InstagramのURL（任意・空欄可） | `https://instagram.com/example` |
| `social.line` | LINEのURL（任意・空欄可） | `https://line.me/example` |
| `social.x` | X（旧Twitter）のURL（任意・空欄可） | `https://x.com/example` |
| `social.facebook` | FacebookのURL（任意・空欄可） | `https://facebook.com/example` |

未設定の場合、これまでどおりデモの内容（`config/demo-content.ts`）が
表示されます — 既存のスプレッドシートをお使いの場合、この項目を
追加しなくても動作は変わりません。

`SERVICES`/`STAFF`シートにも同様の任意項目（メニューの説明文・
カテゴリ、スタッフの役職・紹介文・写真パス）が追加されています。詳細は
`product/coconala-salon-template/05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`
/ `STAFF_CUSTOMIZATION_JA.md` を参照してください。

`HOLIDAYS` is a separate sheet: one row per closed date, `Date`
(`YYYY-MM-DD`) + `Label` (free text, e.g. `年末年始`).

## Which fields the website can see

`getConfig` returns `business`, `hours`, `holidays`, `features`,
`staffAnyAvailableOption`, and `reservation` — **never** `calendar.id`,
`email.ownerNotifyAddress`, or `email.fromName`. Those three stay
server-side only.

## For developers: sheet schema reference

All nine sheets, their canonical names, and required headers are defined
centrally in `apps/salon-portfolio/gas/src/SheetSchemas.ts` — never
duplicate a header list elsewhere. Summary:

| Sheet | Purpose |
|---|---|
| `CONFIG` | Business config, key/value/description (this guide, above). |
| `HOLIDAYS` | Closed dates. |
| `SERVICES` | Salon menu/service catalog. |
| `STAFF` | Stylist catalog + optional per-staff Calendar ID. |
| `RESERVATIONS` | Reservation records (schema only — no workflow yet). |
| `CANCELLATION_REQUESTS` | Cancellation requests (schema only). |
| `INQUIRIES` | Contact-form submissions (schema only). |
| `EMAIL_LOG` | Outgoing email audit trail (schema only). |
| `ERROR_LOG` | Server-side error audit trail (schema only). |

## Setting up a scratch spreadsheet for development

This is a **standalone** Apps Script project (not bound to one specific
Spreadsheet), so it needs to be told which Spreadsheet to use:

1. Create a new Google Sheet (developer-owned scratch/demo spreadsheet —
   never a customer's production sheet).
2. Copy its ID from the URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`).
3. In the Apps Script editor (Project Settings → Script Properties), add
   a property named `SPREADSHEET_ID` with that ID as the value.
4. In the Apps Script editor, select `setupDemoSheets` from the function
   dropdown and click Run. It creates all nine sheets with headers and
   safe demo data (transactional sheets get headers only) — it never
   touches a sheet that already exists.

## Manual verification (Sheets.ts / SetupDemoSheets.ts are not Jest-tested)

Per Phase 0 §Q, GAS-service-calling modules stay thin and are verified by
hand, not by Jest:

1. Run `setupDemoSheets` against a scratch spreadsheet (above) and
   confirm all nine tabs appear with the expected headers.
2. Run it a second time and confirm every sheet is reported "skipped
   (already exists)" — no data is duplicated or overwritten.
3. Deploy the Web App (or run `doPost` from the Apps Script editor with a
   test event object `{ postData: { contents: '{"action":"getConfig"}' } }`)
   and confirm the response matches the shape in `api-documentation.md`.
4. Edit one CONFIG value to something invalid (e.g. set
   `reservation.slotMinutes` to `abc`) and re-run `getConfig`; confirm the
   response is `{ ok: false, error: { code: "CONFIG_INVALID", ... } }`
   and that the execution transcript (View → Logs) shows the specific
   field issue — never shown to the client.

## Operations note (Phase 0 §S)

Production customer deployments use the customer's own Google
account/Workspace, Spreadsheet, and Apps Script project — the developer
is granted collaborator/editor access only. This guide's scratch-sheet
setup is for development and portfolio-demo use only.
