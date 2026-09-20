# Hair Salon Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/hair-salon-portfolio`, a business-data clone of `apps/salon-portfolio` (Nail Salon), proving the reservation/inquiry/GAS/Sheets/Calendar/email architecture is reusable across business types with zero engine changes.

**Architecture:** Copy the reference app's infrastructure (GAS engine, web `lib`/`types`/reservation UI/inquiry UI, design-preset system) file-for-file with only identifier renames (package names, health-check `service` string). Write entirely new business-data files (GAS `DemoSeed.ts`, web `config/demo-content.ts`, Hero content constants, staff SVGs, stock photos, docs, `.env.example`). Adapt existing tests' literal fixture strings to Hair Salon content without weakening any assertion.

**Tech Stack:** Next.js 16 / React 19 (web), Google Apps Script + TypeScript compiled via esbuild + clasp (gas), Jest (both), same as the reference app — no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-hair-salon-portfolio-design.md`

## Global Constraints

- Branch `feature/hair-salon-portfolio` (already created, based on `master` + 29 path-scoped `apps/salon-portfolio` commits from `feature/starter-mvp`; see spec §2). All work happens in the isolated worktree at `.claude/worktrees/feature+hair-salon-portfolio` — do not `cd` out of it.
- Never modify anything under `apps/salon-portfolio/`. Every change in this plan is additive, under `apps/hair-salon-portfolio/` (plus a possible top-level `docs/superpowers/` entry, which is already how this plan itself is filed).
- Reuse the existing `starter` design preset (`web/config/design-presets.ts`, key `"starter"`) as-is. Do not add a new preset. If a task's outcome seems to require one, stop and flag it — don't add it silently.
- No new npm dependencies in either `web/package.json` or `gas/package.json` beyond what the reference already has.
- No Google Forms, no new booking algorithm, no shared package, no auth/payment/LINE/CMS functionality.
- Do NOT "fix" the inherited hardcoded-`now`-date test debt (spec §3). Hair Salon's `Api.test.ts` clone uses the same fixed-`now`-injection technique with its own near-date fixtures — this is intentional parity, not negligence.
- **Commit discipline:** each task below ends with a `git add` + `git commit` step using the suggested Conventional Commit message, matching the task's own commit-structure suggestion. Per the user's standing evidence-reporting instruction, **do not actually run `git commit` unless the human operator gives an explicit, literal "commit this now" instruction at that point in the session.** Stage and prepare the commit (or show the diff) and pause for that explicit go-ahead instead of committing automatically, even though the step is written as a commit step below.
- Every numeric/count claim in verification steps must be checked against a real command's output at execution time, not assumed from this plan.
- Outbound internet access is required for Task 10 (Unsplash sourcing). It was verified working during planning (`curl` to `images.unsplash.com` → HTTP 200). If unavailable at execution time, stop and flag rather than fabricating a source or license claim.

---

## Task 1: Scaffold `apps/hair-salon-portfolio` directory and tooling

**Files:**
- Create: `apps/hair-salon-portfolio/web/{package.json,tsconfig.json,next.config.ts,eslint.config.mjs,postcss.config.mjs,jest.config.ts,jest.setup.ts,.gitignore,.env.example,AGENTS.md,CLAUDE.md}`
- Create: `apps/hair-salon-portfolio/gas/{package.json,tsconfig.json,esbuild.config.js,jest.config.js,appsscript.json,.clasp.json.example,.gitignore}`
- No app source files yet (that's Tasks 2–9).

**Interfaces:**
- Produces: a working `npm install` in both `apps/hair-salon-portfolio/web` and `apps/hair-salon-portfolio/gas`, ready for source files.

- [ ] **Step 1: Copy web tooling config files verbatim, then rename identifiers**

```bash
mkdir -p apps/hair-salon-portfolio/web apps/hair-salon-portfolio/gas
cp apps/salon-portfolio/web/package.json apps/hair-salon-portfolio/web/package.json
cp apps/salon-portfolio/web/tsconfig.json apps/hair-salon-portfolio/web/tsconfig.json
cp apps/salon-portfolio/web/next.config.ts apps/hair-salon-portfolio/web/next.config.ts
cp apps/salon-portfolio/web/eslint.config.mjs apps/hair-salon-portfolio/web/eslint.config.mjs
cp apps/salon-portfolio/web/postcss.config.mjs apps/hair-salon-portfolio/web/postcss.config.mjs
cp apps/salon-portfolio/web/jest.config.ts apps/hair-salon-portfolio/web/jest.config.ts
cp apps/salon-portfolio/web/jest.setup.ts apps/hair-salon-portfolio/web/jest.setup.ts
cp apps/salon-portfolio/web/.gitignore apps/hair-salon-portfolio/web/.gitignore
cp apps/salon-portfolio/web/AGENTS.md apps/hair-salon-portfolio/web/AGENTS.md
cp apps/salon-portfolio/web/CLAUDE.md apps/hair-salon-portfolio/web/CLAUDE.md
```

Edit `apps/hair-salon-portfolio/web/package.json`: change `"name": "salon-portfolio-web"` to `"name": "hair-salon-portfolio-web"`. Leave every dependency/devDependency version untouched.

Write `apps/hair-salon-portfolio/web/.env.example`:

```
# GAS Web App deployment URL for the getConfig action.
# Leave unset for local/demo mode -- the site automatically falls back to
# config/demo-content.ts (see docs/config-and-sheets-guide.md).
#
# Never prefix this with NEXT_PUBLIC_ -- it must stay server-only. It is
# read only by apps/hair-salon-portfolio/web/lib/api/gasClient.ts.
GAS_WEBAPP_URL=

# Design preset for this deployment. atelier ito ships as "starter" -- a
# bare-bones Hero+Menu+Reservation-CTA+Contact composition. Never prefix
# this with NEXT_PUBLIC_ -- it is read only by
# apps/hair-salon-portfolio/web/lib/config/designConfig.ts, server-side.
SALON_DESIGN_PRESET=starter
```

- [ ] **Step 2: Copy gas tooling config files verbatim, then rename identifiers**

```bash
cp apps/salon-portfolio/gas/tsconfig.json apps/hair-salon-portfolio/gas/tsconfig.json
cp apps/salon-portfolio/gas/esbuild.config.js apps/hair-salon-portfolio/gas/esbuild.config.js
cp apps/salon-portfolio/gas/jest.config.js apps/hair-salon-portfolio/gas/jest.config.js
cp apps/salon-portfolio/gas/appsscript.json apps/hair-salon-portfolio/gas/appsscript.json
cp apps/salon-portfolio/gas/.clasp.json.example apps/hair-salon-portfolio/gas/.clasp.json.example
cp apps/salon-portfolio/gas/.gitignore apps/hair-salon-portfolio/gas/.gitignore
```

Write `apps/hair-salon-portfolio/gas/package.json` (copy of the reference's shape, renamed):

```json
{
  "name": "hair-salon-portfolio-gas",
  "version": "0.1.0",
  "private": true,
  "description": "Google Apps Script backend for the hair-salon-portfolio project.",
  "scripts": {
    "build": "node esbuild.config.js",
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "push": "npm run build && clasp push"
  },
  "devDependencies": {
    "@google/clasp": "^2.4.2",
    "@types/google-apps-script": "^1.0.83",
    "@types/jest": "^29.5.12",
    "esbuild": "^0.23.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.5.4"
  }
}
```

(Copy the exact devDependency version numbers from `apps/salon-portfolio/gas/package.json` at execution time in case they've drifted from what's shown above — read that file first, don't assume.)

- [ ] **Step 3: Install dependencies in both apps**

```bash
cd apps/hair-salon-portfolio/gas && npm install
cd ../web && npm install
```

Expected: both complete with no errors. (No source files exist yet, so no build/test run here.)

- [ ] **Step 4: Commit**

```bash
git add apps/hair-salon-portfolio/web/package.json apps/hair-salon-portfolio/web/tsconfig.json apps/hair-salon-portfolio/web/next.config.ts apps/hair-salon-portfolio/web/eslint.config.mjs apps/hair-salon-portfolio/web/postcss.config.mjs apps/hair-salon-portfolio/web/jest.config.ts apps/hair-salon-portfolio/web/jest.setup.ts apps/hair-salon-portfolio/web/.gitignore apps/hair-salon-portfolio/web/.env.example apps/hair-salon-portfolio/web/AGENTS.md apps/hair-salon-portfolio/web/CLAUDE.md apps/hair-salon-portfolio/gas/package.json apps/hair-salon-portfolio/gas/tsconfig.json apps/hair-salon-portfolio/gas/esbuild.config.js apps/hair-salon-portfolio/gas/jest.config.js apps/hair-salon-portfolio/gas/appsscript.json apps/hair-salon-portfolio/gas/.clasp.json.example apps/hair-salon-portfolio/gas/.gitignore
git commit -m "feat(hair-salon): scaffold portfolio app tooling"
```

---

## Task 2: Copy GAS reusable engine source + tests verbatim

**Files:**
- Create: `apps/hair-salon-portfolio/gas/src/*.ts` (all files from the reference except none excluded — `DemoSeed.ts`/`SetupDemoSheets.ts` are copied too; `DemoSeed.ts`'s business data gets overwritten in Task 3, `SetupDemoSheets.ts` needs zero changes since it's pure infra)
- Create: `apps/hair-salon-portfolio/gas/src/availability/*.ts`, `apps/hair-salon-portfolio/gas/src/ids/*.ts`, `apps/hair-salon-portfolio/gas/src/models/*.ts`
- Create: `apps/hair-salon-portfolio/gas/tests/**/*.test.ts` (all of them, verbatim — fixture literals adapted in Task 3)

**Interfaces:**
- Produces: `SHEET_NAMES`, `SheetSchemas` types (`ServiceRow`, `StaffRow`, `ConfigRow`, etc.), `Api.ts` action handlers, `ConfigParser`, `DEMO_SHEETS` — identical exports to the reference, consumed unchanged by Task 3.

- [ ] **Step 1: Copy every file under `gas/src` and `gas/tests`**

```bash
cp -r apps/salon-portfolio/gas/src apps/hair-salon-portfolio/gas/src
cp -r apps/salon-portfolio/gas/tests apps/hair-salon-portfolio/gas/tests
```

- [ ] **Step 2: Rename the health-check service identifier**

Edit `apps/hair-salon-portfolio/gas/src/Health.ts` line containing `service: "salon-portfolio-gas",` → `service: "hair-salon-portfolio-gas",`.

Edit `apps/hair-salon-portfolio/gas/tests/Health.test.ts`: find the assertion expecting `"salon-portfolio-gas"` and change it to `"hair-salon-portfolio-gas"`.

- [ ] **Step 3: Verify typecheck and build (tests deliberately not run yet — DemoSeed.ts still has Nail Salon data, which will pass structurally but Task 3 replaces it)**

```bash
cd apps/hair-salon-portfolio/gas
npm run typecheck
npm run build
```

Expected: both clean (matches the verified reference baseline in the spec).

- [ ] **Step 4: Verify zero drift from the reference beyond the two intended identifier renames**

```bash
diff -rq apps/salon-portfolio/gas/src apps/hair-salon-portfolio/gas/src
diff -rq apps/salon-portfolio/gas/tests apps/hair-salon-portfolio/gas/tests
```

Expected: only `Health.ts` and `Health.test.ts` reported as differing (everything else byte-identical). This is the concrete evidence for the spec's "reusable infrastructure — copied file-for-file, zero behavior change" claim (§4).

- [ ] **Step 5: Commit**

```bash
git add apps/hair-salon-portfolio/gas/src apps/hair-salon-portfolio/gas/tests
git commit -m "feat(hair-salon): copy GAS reservation/inquiry engine from the reference architecture"
```

---

## Task 3: Hair Salon GAS business data (`DemoSeed.ts`) + adapt GAS test fixtures

**Files:**
- Modify: `apps/hair-salon-portfolio/gas/src/DemoSeed.ts` (full data replacement)
- Modify: `apps/hair-salon-portfolio/gas/tests/Api.test.ts`, `ReservationRules.test.ts`, `ReservationEmailTemplates.test.ts`, `ConfigParser.test.ts`, `PublicCatalog.test.ts`, `CatalogParser.test.ts`, `ReservationMapper.test.ts`, `ReservationRepository.test.ts` (fixture literal strings only — no assertion logic changes)

**Interfaces:**
- Consumes: `SHEET_NAMES`, `SheetSchemas` headers (from Task 2, unchanged).
- Produces: `DEMO_SHEETS: DemoSheetSeed[]` with Hair Salon CONFIG/HOLIDAYS/SERVICES/STAFF rows — same shape `SetupDemoSheets.ts` already consumes unmodified.

- [ ] **Step 1: Replace `DemoSeed.ts`'s data**

Edit `apps/hair-salon-portfolio/gas/src/DemoSeed.ts`, replacing the `DEMO_SHEETS` array's CONFIG/SERVICES/STAFF entries (HOLIDAYS, and every transactional sheet's empty-rows entry, are copied unchanged from Task 2):

```typescript
export const DEMO_SHEETS: DemoSheetSeed[] = [
  {
    name: SHEET_NAMES.CONFIG,
    headers: CONFIG_HEADERS,
    rows: [
      ["business.name", "アトリエ イト", "店舗名"],
      ["business.nameLatin", "atelier ito", "店舗名（ローマ字・任意）"],
      ["business.tagline", "髪と向き合う、静かな時間。", "キャッチコピー（任意）"],
      ["business.phone", "03-2345-6789", "電話番号"],
      ["business.email", "owner@example.com", "店舗メール"],
      ["business.address", "東京都渋谷区神宮前3-4-5", "住所"],
      ["business.postalCode", "〒150-0001", "郵便番号（任意）"],
      ["hours.monday", "closed", "月曜営業時間（定休日）"],
      ["hours.tuesday", "10:00-19:00", "火曜営業時間"],
      ["hours.wednesday", "10:00-19:00", "水曜営業時間"],
      ["hours.thursday", "10:00-19:00", "木曜営業時間"],
      ["hours.friday", "10:00-20:00", "金曜営業時間"],
      ["hours.saturday", "10:00-19:00", "土曜営業時間"],
      ["hours.sunday", "10:00-18:00", "日曜営業時間"],
      ["reservation.timezone", "Asia/Tokyo", "タイムゾーン"],
      ["reservation.slotMinutes", 30, "予約枠の単位（分）"],
      ["reservation.minLeadHours", 1, "予約締切（時間前）"],
      ["reservation.maxBookingDays", 60, "予約可能期間（日）"],
      ["features.contactForm", true, "問い合わせ受付"],
      ["features.reservation", true, "予約受付"],
      ["features.staffSelection", true, "スタッフ指名"],
      ["features.calendar", true, "カレンダー連携"],
      ["features.emailNotification", true, "メール通知"],
      ["staff.anyAvailableOption", true, "指名なし（お任せ）を表示"],
      ["social.instagram", "", "InstagramのURL（任意・空欄可）"],
      ["social.line", "", "LINEのURL（任意・空欄可）"],
      ["calendar.id", "primary", "カレンダーID（開発用プレースホルダー）"],
      ["email.ownerNotifyAddress", "owner@example.com", "店舗通知メール宛先"],
      ["email.fromName", "atelier ito", "送信者表示名"],
    ],
  },
  {
    name: SHEET_NAMES.HOLIDAYS,
    headers: HOLIDAYS_HEADERS,
    rows: [
      ["2026-01-01", "元日"],
      ["2026-01-02", "年始休業"],
    ],
  },
  {
    name: SHEET_NAMES.SERVICES,
    headers: [...SERVICES_HEADERS, ...SERVICES_OPTIONAL_HEADERS],
    rows: [
      ["SV001", "カット", 60, 5500, true, true, 1, "ベースとなる髪型を、丁寧なカウンセリングから整えます。", "カット"],
      ["SV002", "カット＋カラー", 120, 11000, true, true, 2, "なりたい髪色まで、カットとカラーを一度に。", "カラー"],
      ["SV003", "カット＋パーマ", 150, 12000, true, true, 3, "動きのある柔らかなスタイルを、丁寧なパーマで。", "パーマ"],
      ["SV004", "カラー", 90, 7700, true, true, 4, "白髪染めから明るいトーンまで、幅広く対応します。", "カラー"],
      ["SV005", "トリートメント", 30, 4400, true, false, 5, "髪と頭皮に、うるおいとまとまりを。", "トリートメント"],
    ],
  },
  {
    name: SHEET_NAMES.STAFF,
    headers: [...STAFF_HEADERS, ...STAFF_OPTIONAL_HEADERS],
    rows: [
      ["ST001", "伊藤 美咲", true, "", 1, "オーナー / スタイリスト", "一人ひとりの髪質に合わせたスタイル提案を得意としています。", ""],
      ["ST002", "高橋 直子", true, "", 2, "スタイリスト", "自然な質感を活かしたカットが得意です。", ""],
      ["ST003", "中村 玲奈", true, "", 3, "スタイリスト", "", ""],
      ["ST004", "小林 陽菜", true, "", 4, "", "", ""],
    ],
  },
  { name: SHEET_NAMES.RESERVATIONS, headers: RESERVATIONS_HEADERS, rows: [] },
  {
    name: SHEET_NAMES.CANCELLATION_REQUESTS,
    headers: CANCELLATION_REQUESTS_HEADERS,
    rows: [],
  },
  { name: SHEET_NAMES.INQUIRIES, headers: INQUIRIES_HEADERS, rows: [] },
  { name: SHEET_NAMES.EMAIL_LOG, headers: EMAIL_LOG_HEADERS, rows: [] },
  { name: SHEET_NAMES.ERROR_LOG, headers: ERROR_LOG_HEADERS, rows: [] },
];
```

Everything else in `DemoSeed.ts` (imports, the `DemoSheetSeed` interface, the doc comment) stays unchanged.

- [ ] **Step 2: Run `DemoSeed.test.ts` alone to confirm the structural test still passes unmodified**

```bash
npx jest tests/DemoSeed.test.ts
```

Expected: PASS, 6/6 tests — this file asserts shape/structure only (sheet coverage, header-length match, transactional sheets empty, CONFIG rows parse into a valid `AppConfig`), no literal business-name assertions, so it needs no edits.

- [ ] **Step 3: Replace nail-specific literal fixture strings in the remaining GAS test files**

Run a search first to get the exact current occurrences (fixture-only, not assertions on infra behavior):

```bash
grep -rn "ネイル\|まつげ" tests/Api.test.ts tests/ReservationRules.test.ts tests/ReservationEmailTemplates.test.ts tests/ConfigParser.test.ts tests/PublicCatalog.test.ts tests/CatalogParser.test.ts tests/ReservationMapper.test.ts tests/ReservationRepository.test.ts
```

For each hit, replace the fixture literal with an equivalent Hair Salon value from Task 3 Step 1's `DEMO_SHEETS`, preserving the surrounding test logic exactly (only the string literal changes, e.g. a fixture service name `"ジェルネイル"` → `"カット"`, `"まつげパーマ"` → `"カラー"`, a fixture business name `"凛"` → `"アトリエ イト"`). Do not change any assertion's expected *shape* — only literal business-content strings inside fixtures.

- [ ] **Step 4: Run the full GAS suite and confirm the baseline is preserved exactly**

```bash
npm test 2>&1 | tee "../../../.evidence/20260918-hair-salon-portfolio-baseline/gas-test-after-task3.log"
```

Expected: **33/34 suites, 295/310 tests** pass — identical counts to the reference baseline in the spec (§3), with the same 15 `Api.test.ts` failures (now using Hair Salon fixture data, but the same date-drift mechanism — `now` injected as a fixed near-date, production `Api.ts` uses real `new Date()`). If the pass/fail counts differ from 295/310+15, stop and investigate before proceeding — a difference means either a real regression or an accidental assertion change in Step 3.

- [ ] **Step 5: Commit**

```bash
git add apps/hair-salon-portfolio/gas/src/DemoSeed.ts apps/hair-salon-portfolio/gas/tests
git commit -m "feat(hair-salon): add hair salon services, staff, and GAS config data"
```

---

## Task 4: Copy web reusable engine (lib, types, reservation UI, inquiry form, API relay, presets) verbatim

**Files:**
- Create: `apps/hair-salon-portfolio/web/lib/**` (all of `api/`, `config/`, `constants/`, `utils/`, `validation/`)
- Create: `apps/hair-salon-portfolio/web/types/**`
- Create: `apps/hair-salon-portfolio/web/components/reservation/**`
- Create: `apps/hair-salon-portfolio/web/components/forms/ContactForm.tsx` + `.test.tsx`
- Create: `apps/hair-salon-portfolio/web/components/ui/**`
- Create: `apps/hair-salon-portfolio/web/app/api/gas/route.ts`, `app/api/health/route.ts`
- Create: `apps/hair-salon-portfolio/web/app/layout.tsx`
- Create: `apps/hair-salon-portfolio/web/app/{contact,privacy,terms,thanks,reservation}/**` (page components — reservation wizard composition, not its content)
- Create: `apps/hair-salon-portfolio/web/config/{design-presets,theme,theme-tokens,typography-tokens}.ts` + their `.test.ts`
- Create: `apps/hair-salon-portfolio/web/app/globals.css` + its two sync tests

**Interfaces:**
- Consumes: nothing from earlier web tasks (this task establishes the base).
- Produces: `getRuntimeConfig()`, `getRuntimeCatalog()`, `resolveSiteConfig()`, `getDesignConfig()`, `gasClient`, `inquiryClient`, `reservationClient`, reservation wizard components, `ContactForm` — all consumed unchanged by Tasks 6–8.

- [ ] **Step 1: Copy the engine directories verbatim**

```bash
mkdir -p apps/hair-salon-portfolio/web/app apps/hair-salon-portfolio/web/config apps/hair-salon-portfolio/web/public
cp -r apps/salon-portfolio/web/lib apps/hair-salon-portfolio/web/lib
cp -r apps/salon-portfolio/web/types apps/hair-salon-portfolio/web/types
cp -r apps/salon-portfolio/web/components/reservation apps/hair-salon-portfolio/web/components/reservation
mkdir -p apps/hair-salon-portfolio/web/components/forms apps/hair-salon-portfolio/web/components/ui
cp apps/salon-portfolio/web/components/forms/ContactForm.tsx apps/hair-salon-portfolio/web/components/forms/ContactForm.tsx
cp apps/salon-portfolio/web/components/forms/ContactForm.test.tsx apps/hair-salon-portfolio/web/components/forms/ContactForm.test.tsx
cp -r apps/salon-portfolio/web/components/ui/. apps/hair-salon-portfolio/web/components/ui/
mkdir -p apps/hair-salon-portfolio/web/app/api/gas apps/hair-salon-portfolio/web/app/api/health apps/hair-salon-portfolio/web/app/contact apps/hair-salon-portfolio/web/app/privacy apps/hair-salon-portfolio/web/app/terms apps/hair-salon-portfolio/web/app/thanks apps/hair-salon-portfolio/web/app/reservation
cp apps/salon-portfolio/web/app/api/gas/route.ts apps/hair-salon-portfolio/web/app/api/gas/route.ts
cp apps/salon-portfolio/web/app/api/health/route.ts apps/hair-salon-portfolio/web/app/api/health/route.ts
cp -r apps/salon-portfolio/web/app/contact/. apps/hair-salon-portfolio/web/app/contact/
cp -r apps/salon-portfolio/web/app/privacy/. apps/hair-salon-portfolio/web/app/privacy/
cp -r apps/salon-portfolio/web/app/terms/. apps/hair-salon-portfolio/web/app/terms/
cp -r apps/salon-portfolio/web/app/thanks/. apps/hair-salon-portfolio/web/app/thanks/
cp -r apps/salon-portfolio/web/app/reservation/. apps/hair-salon-portfolio/web/app/reservation/
cp apps/salon-portfolio/web/app/layout.tsx apps/hair-salon-portfolio/web/app/layout.tsx
cp apps/salon-portfolio/web/app/globals.css apps/hair-salon-portfolio/web/app/globals.css
cp apps/salon-portfolio/web/app/globals.css.theme-sync.test.ts apps/hair-salon-portfolio/web/app/globals.css.theme-sync.test.ts
cp apps/salon-portfolio/web/app/globals.css.typography-sync.test.ts apps/hair-salon-portfolio/web/app/globals.css.typography-sync.test.ts
cp apps/salon-portfolio/web/config/design-presets.ts apps/hair-salon-portfolio/web/config/design-presets.ts
cp apps/salon-portfolio/web/config/design-presets.test.ts apps/hair-salon-portfolio/web/config/design-presets.test.ts
cp apps/salon-portfolio/web/config/theme.ts apps/hair-salon-portfolio/web/config/theme.ts
cp apps/salon-portfolio/web/config/theme-tokens.ts apps/hair-salon-portfolio/web/config/theme-tokens.ts
cp apps/salon-portfolio/web/config/theme-tokens.test.ts apps/hair-salon-portfolio/web/config/theme-tokens.test.ts
cp apps/salon-portfolio/web/config/typography-tokens.ts apps/hair-salon-portfolio/web/config/typography-tokens.ts
cp apps/salon-portfolio/web/config/typography-tokens.test.ts apps/hair-salon-portfolio/web/config/typography-tokens.test.ts
touch apps/hair-salon-portfolio/web/config/.gitkeep apps/hair-salon-portfolio/web/types/.gitkeep
```

- [ ] **Step 2: Rename the health-check service identifier**

Find and edit the equivalent of `service: "salon-portfolio-web"` (in `lib/utils/health.ts`) → `"hair-salon-portfolio-web"`, and its test's matching expectation.

```bash
grep -rn "salon-portfolio-web" apps/hair-salon-portfolio/web/lib
```

- [ ] **Step 3: Verify zero unintended drift**

```bash
diff -rq apps/salon-portfolio/web/lib apps/hair-salon-portfolio/web/lib
diff -rq apps/salon-portfolio/web/types apps/hair-salon-portfolio/web/types
diff -rq apps/salon-portfolio/web/components/reservation apps/hair-salon-portfolio/web/components/reservation
```

Expected: only the `health.ts`/`health.test.ts` pair differs; everything else identical.

- [ ] **Step 4: Commit**

```bash
git add apps/hair-salon-portfolio/web/lib apps/hair-salon-portfolio/web/types apps/hair-salon-portfolio/web/components/reservation apps/hair-salon-portfolio/web/components/forms apps/hair-salon-portfolio/web/components/ui apps/hair-salon-portfolio/web/app apps/hair-salon-portfolio/web/config
git commit -m "feat(hair-salon): copy web reservation/inquiry engine and design-preset system from the reference architecture"
```

---

## Task 5: Copy web presentation components verbatim (except `HeroContent.tsx`)

**Files:**
- Create: `apps/hair-salon-portfolio/web/components/sections/**` (all files except `HeroContent.tsx`, written in Task 6)
- Create: `apps/hair-salon-portfolio/web/components/layout/**`
- Create: `apps/hair-salon-portfolio/web/app/page.tsx`, `app/page.test.tsx`, `app/favicon.ico`

**Interfaces:**
- Consumes: `HeroContentProps`, `HERO_CTA_SECONDARY` (interface shape only — the actual `HeroContent.tsx` values come from Task 6), everything from Task 4.
- Produces: `HeroFullscreen`/`HeroSplit`/`HeroEditorial`, `MenuSection`, `StaffSection`, `SiteHeader`, `SiteFooter`, etc. — same components the reference uses, unchanged.

- [ ] **Step 1: Copy `components/sections` except `HeroContent.tsx`, and `components/layout`**

```bash
mkdir -p apps/hair-salon-portfolio/web/components/sections apps/hair-salon-portfolio/web/components/layout
for f in apps/salon-portfolio/web/components/sections/*; do
  base=$(basename "$f")
  if [ "$base" != "HeroContent.tsx" ]; then
    cp "$f" "apps/hair-salon-portfolio/web/components/sections/$base"
  fi
done
cp -r apps/salon-portfolio/web/components/layout/. apps/hair-salon-portfolio/web/components/layout/
cp apps/salon-portfolio/web/app/page.tsx apps/hair-salon-portfolio/web/app/page.tsx
cp apps/salon-portfolio/web/app/page.test.tsx apps/hair-salon-portfolio/web/app/page.test.tsx
cp apps/salon-portfolio/web/app/favicon.ico apps/hair-salon-portfolio/web/app/favicon.ico
```

- [ ] **Step 2: Verify typecheck fails only on the missing `HeroContent` import (expected — Task 6 adds it)**

```bash
cd apps/hair-salon-portfolio/web
npx tsc --noEmit
```

Expected: errors only in files importing `./HeroContent` (e.g. `HeroFullscreen.tsx`, `HeroSplit.tsx`, `HeroEditorial.tsx`) — module-not-found, nothing else. If there are other errors, stop and investigate before Task 6.

- [ ] **Step 3: Commit**

```bash
git add apps/hair-salon-portfolio/web/components/sections apps/hair-salon-portfolio/web/components/layout apps/hair-salon-portfolio/web/app/page.tsx apps/hair-salon-portfolio/web/app/page.test.tsx apps/hair-salon-portfolio/web/app/favicon.ico
git commit -m "feat(hair-salon): copy web presentation components from the reference architecture"
```

---

## Task 6: Hair Salon web business content (`demo-content.ts` + `HeroContent.tsx`)

**Files:**
- Create: `apps/hair-salon-portfolio/web/config/demo-content.ts`
- Create: `apps/hair-salon-portfolio/web/components/sections/HeroContent.tsx`

**Interfaces:**
- Consumes: `SiteConfig`, `Service`, `StaffMember`, `GalleryImageItem`, `NavItem`, `SalonFeature`, `CustomerFlowStep`, `FaqItem`, `AccessInfo` types from `types/content.ts` (Task 4); `HeroContentProps` interface (documented in the reference, reproduced identically here).
- Produces: `SITE_CONFIG`, `NAV_ITEMS`, `SERVICES`, `STAFF`, `GALLERY_IMAGES`, `SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`, `FAQ_ITEMS`, `ACCESS_INFO`, `HERO_IMAGE`, `HERO_CTA_PRIMARY`, `HERO_CTA_SECONDARY`, `renderHeroHeadline()` — same export names/types the copied `app/page.tsx` (Task 5) already imports.

This is why Task 5's typecheck was expected to fail only on the `HeroContent` import — this task resolves it.

- [ ] **Step 1: Write `HeroContent.tsx`**

```typescript
/**
 * Shared, non-visual Hero content for atelier ito.
 *
 * `HeroFullscreen`/`HeroSplit`/`HeroEditorial` each compose their own JSX,
 * but all three must render the identical photo, CTA destinations/labels,
 * and CJK line-break fix. Centralizing here keeps that content/CTA/
 * accessibility logic reusable, matching the reference architecture's
 * ownership split (design vs. content).
 *
 * None of this is business/runtime content (that's `siteConfig.business`,
 * passed into `HeroSection` as props) -- it's presentation-layer constants
 * specific to the Hero photo and its two calls to action.
 */

export const HERO_IMAGE = {
  src: "/images/hero/hero-hair-cutting.jpg",
  alt: "髪を丁寧にカットするスタイリストの手元",
};

export const HERO_CTA_PRIMARY = { href: "/reservation", label: "予約する" };
export const HERO_CTA_SECONDARY = { href: "#menu", label: "メニューを見る" };

/**
 * Protects "向き合う" from an awkward mid-word CJK line break at narrow
 * widths, the same technique the reference architecture uses for its own
 * headline's line-break-sensitive phrase. A no-op if a future headline
 * doesn't contain the phrase.
 */
const HERO_NO_BREAK_PHRASE = "向き合う";

export function renderHeroHeadline(headline: string) {
  const index = headline.indexOf(HERO_NO_BREAK_PHRASE);
  if (index === -1) return headline;

  return (
    <>
      {headline.slice(0, index)}
      <span style={{ whiteSpace: "nowrap" }}>{HERO_NO_BREAK_PHRASE}</span>
      {headline.slice(index + HERO_NO_BREAK_PHRASE.length)}
    </>
  );
}

/** Props every Hero variant component receives -- the one Hero data model.
 *  Sourced in `app/page.tsx` entirely from the runtime `siteConfig.business`
 *  fields; no variant introduces its own content shape. */
export interface HeroContentProps {
  /** `siteConfig.business.tagline` -- the page's one `<h1>` in every variant. */
  headline: string;
  /** Supporting sentence under the headline. */
  subheadline: string;
  /** `siteConfig.business.name` -- rendered as a styled label, not a second heading. */
  name: string;
  /** `siteConfig.business.nameLatin`. */
  nameLatin: string;
  /** `siteConfig.labels.bookingCta` -- defaults to `HERO_CTA_PRIMARY.label`
   *  ("予約する") so every call site renders unchanged when omitted. */
  primaryCtaLabel?: string;
}
```

- [ ] **Step 2: Write `demo-content.ts`**

```typescript
/**
 * Business content for atelier ito (Hair Salon demo). Same role as the
 * reference architecture's own demo-content.ts: renders the site before
 * GAS/Sheets are configured, and is the offline fallback afterward.
 *
 * Import this file only from `app/*page.tsx` (the composition root).
 * Components under `components/` take this data as props.
 */
import type {
  AccessInfo,
  CustomerFlowStep,
  FaqItem,
  GalleryImageItem,
  NavItem,
  SalonFeature,
  Service,
  SiteConfig,
  StaffMember,
} from "@/types/content";

export const SITE_CONFIG: SiteConfig = {
  business: {
    name: "アトリエ イト",
    nameLatin: "atelier ito",
    tagline: "髪と向き合う、静かな時間。",
    phone: "03-2345-6789",
    email: "info@atelier-ito.example.com",
    address: "東京都渋谷区神宮前3-4-5",
    postalCode: "〒150-0001",
  },
  hours: {
    monday: "closed",
    tuesday: "10:00-19:00",
    wednesday: "10:00-19:00",
    thursday: "10:00-19:00",
    friday: "10:00-20:00",
    saturday: "10:00-19:00",
    sunday: "10:00-18:00",
  },
  features: {
    contactForm: true,
    reservation: true,
    staffSelection: true,
  },
  staffAnyAvailableOption: true,
  socialLinks: [
    { label: "Instagram", href: "https://instagram.com/example" },
  ],
  labels: {
    service: "メニュー",
    bookingCta: "予約する",
    inquiryMessage: "お問い合わせ内容",
  },
  content: {
    heroSubheadline: "一人ひとりの髪質とライフスタイルに寄り添い、自然体で心地よいスタイルをご提案します。",
    conceptEyebrow: "Concept",
    conceptTitle: "自然体の美しさを引き出す、静かなヘアサロン。",
    conceptParagraph1:
      "流行に合わせるだけでなく、その方本来の髪質やライフスタイルに寄り添うスタイルを大切にしています。",
    conceptParagraph2: "落ち着いた空間で過ごす時間そのものも、施術と同じくらい価値のあるものだと考えています。",
    serviceSubtitle: "施術時間は目安です。カウンセリングのお時間を含め、少し余裕を持ってご来店ください。",
    ctaHeading: "スタイルのイメージが決まったら",
    ctaMessage: "ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。",
    ctaClosingHeading: "最後まで読んでくださり、ありがとうございます",
    ctaClosingMessage: "少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。",
  },
};

export const NAV_ITEMS: NavItem[] = [
  { label: "コンセプト", href: "#concept" },
  { label: "メニュー", href: "#menu" },
  { label: "スタッフ", href: "#staff" },
  { label: "ギャラリー", href: "#gallery" },
  { label: "アクセス", href: "#access" },
  { label: "お問い合わせ", href: "#contact" },
];

export const SERVICES: Service[] = [
  {
    serviceId: "SV001",
    name: "カット",
    description: "ベースとなる髪型を、丁寧なカウンセリングから整えます。",
    category: "カット",
    durationMinutes: 60,
    price: 5500,
  },
  {
    serviceId: "SV002",
    name: "カット＋カラー",
    description: "なりたい髪色まで、カットとカラーを一度に。",
    category: "カラー",
    durationMinutes: 120,
    price: 11000,
  },
  {
    serviceId: "SV003",
    name: "カット＋パーマ",
    description: "動きのある柔らかなスタイルを、丁寧なパーマで。",
    category: "パーマ",
    durationMinutes: 150,
    price: 12000,
  },
  {
    serviceId: "SV004",
    name: "カラー",
    description: "白髪染めから明るいトーンまで、幅広く対応します。",
    category: "カラー",
    durationMinutes: 90,
    price: 7700,
  },
  {
    serviceId: "SV005",
    name: "トリートメント",
    description: "髪と頭皮に、うるおいとまとまりを。",
    category: "トリートメント",
    durationMinutes: 30,
    price: 4400,
  },
];

/**
 * Staff photos are intentionally illustrated stand-ins, not stock photos of
 * real people (same rationale as the reference architecture): attaching a
 * real stranger's face to a fictional staff name/bio would misrepresent a
 * real person. `photoAlt` says "イメージアイコン" (image icon), not "写真".
 */
export const STAFF: StaffMember[] = [
  {
    staffId: "ST001",
    name: "伊藤 美咲",
    role: "オーナー / スタイリスト",
    introduction: "一人ひとりの髪質に合わせたスタイル提案を得意としています。",
    photoSrc: "/images/staff/staff-avatar-01.svg",
    photoAlt: "スタッフ 伊藤美咲のイメージアイコン",
  },
  {
    staffId: "ST002",
    name: "高橋 直子",
    role: "スタイリスト",
    introduction: "自然な質感を活かしたカットが得意です。",
    photoSrc: "/images/staff/staff-avatar-02.svg",
    photoAlt: "スタッフ 高橋直子のイメージアイコン",
  },
  {
    staffId: "ST003",
    name: "中村 玲奈",
    role: "スタイリスト",
    introduction: "似合わせカラーのご提案を大切にしています。",
    photoSrc: "/images/staff/staff-avatar-03.svg",
    photoAlt: "スタッフ 中村玲奈のイメージアイコン",
  },
  {
    staffId: "ST004",
    name: "小林 陽菜",
    role: "アシスタント",
    introduction: "施術前後のケアも丁寧にサポートします。",
    photoSrc: "/images/staff/staff-avatar-04.svg",
    photoAlt: "スタッフ 小林陽菜のイメージアイコン",
  },
];

/**
 * Gallery photography: free-license real stock photos (Unsplash License),
 * downloaded once and hosted locally under `public/images/gallery/` -- see
 * Task 10 and `public/images/SOURCES.md` for verified sources.
 */
export const GALLERY_IMAGES: GalleryImageItem[] = [
  { id: "g1", src: "/images/gallery/gallery-hair-cutting-closeup.jpg", alt: "髪をカットする施術のクローズアップ", width: 1200, height: 800 },
  { id: "g2", src: "/images/gallery/gallery-hair-color-application.jpg", alt: "カラーリング剤を丁寧に塗布する施術の様子", width: 1200, height: 800 },
  { id: "g3", src: "/images/gallery/gallery-hair-texture-natural.jpg", alt: "自然な質感を活かしたヘアスタイルのディテール", width: 1200, height: 870 },
  { id: "g4", src: "/images/gallery/gallery-salon-interior-chair.jpg", alt: "落ち着いた雰囲気のスタイリングチェアとサロン内観", width: 1200, height: 800 },
  { id: "g5", src: "/images/gallery/gallery-salon-interior-lounge.jpg", alt: "窓から光が差し込む、静かな店内スペースの様子", width: 1200, height: 633 },
  { id: "g6", src: "/images/gallery/gallery-hair-styling-tools.jpg", alt: "はさみとコームを使ったスタイリングの一場面", width: 1200, height: 796 },
];

export const SALON_FEATURES: SalonFeature[] = [
  {
    id: "hygiene",
    title: "器具はすべてお客様ごとに滅菌",
    description:
      "施術に使用する器具は一件ごとに滅菌・消毒を行い、清潔な状態でご用意しています。",
  },
  {
    id: "private",
    title: "半個室でゆったりと",
    description:
      "隣のお客様の視線を気にせず、施術に集中していただける空間をご用意しています。",
  },
  {
    id: "parking",
    title: "近隣にコインパーキング完備",
    description: "お車でお越しの際は、近隣のコインパーキングをご利用いただけます。",
  },
  {
    id: "first-visit",
    title: "初めての方も安心のカウンセリング",
    description:
      "施術前に仕上がりのご要望をゆっくり伺い、認識をすり合わせてから施術を始めます。",
  },
];

export const CUSTOMER_FLOW_STEPS: CustomerFlowStep[] = [
  { step: 1, title: "ご予約", description: "お電話またはWEBから、ご希望の日時・メニューをご予約ください。" },
  { step: 2, title: "ご来店・カウンセリング", description: "当日は開始5分前にご来店ください。仕上がりのご希望を伺います。" },
  { step: 3, title: "施術", description: "ご要望に沿って、担当スタッフが丁寧に施術を行います。" },
  { step: 4, title: "お会計・次回のご案内", description: "施術後にお会計、必要に応じて次回のご来店目安もご案内します。" },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    question: "予約は当日でも可能ですか？",
    answer:
      "空き状況によりご案内可能です。お電話にてお問い合わせいただくか、WEB予約ページの空き枠をご確認ください。",
  },
  {
    id: "faq-2",
    question: "施術にはどのくらい時間がかかりますか？",
    answer:
      "メニューにより異なりますが、目安時間はメニュー一覧に記載しています。カウンセリングを含めると、記載時間より少し余裕を見てご来店ください。",
  },
  {
    id: "faq-3",
    question: "担当スタッフを指名できますか？",
    answer:
      "ご予約時に指名も可能ですし、「指名なし（お任せ）」を選んでいただくこともできます。お任せの場合は、その時間に対応可能なスタッフがご案内します。",
  },
  {
    id: "faq-4",
    question: "キャンセルはどうすればよいですか？",
    answer:
      "ご予約確認のメールに記載のリンクよりお手続きいただけます。恐れ入りますが、直前のキャンセルはお電話でもご連絡ください。",
  },
];

export const ACCESS_INFO: AccessInfo = {
  transitDirections: [
    { id: "t1", label: "明治神宮前駅（東京メトロ）より徒歩4分" },
    { id: "t2", label: "原宿駅（JR）より徒歩8分" },
    { id: "t3", label: "表参道駅（東京メトロ）より徒歩10分" },
  ],
};
```

- [ ] **Step 3: Full typecheck**

```bash
npx tsc --noEmit
```

Expected: clean (0 errors) — this resolves the `HeroContent` import errors from Task 5 Step 2.

- [ ] **Step 4: Build**

```bash
npx next build
```

Expected: clean build, same `GAS_WEBAPP_URL is not configured` fail-safe warnings as the reference baseline (expected — no `.env.local` is set here either).

- [ ] **Step 5: Commit**

```bash
git add apps/hair-salon-portfolio/web/config/demo-content.ts apps/hair-salon-portfolio/web/components/sections/HeroContent.tsx
git commit -m "feat(hair-salon): wire atelier ito business identity, services, staff, and hero content"
```

---

## Task 7: Adapt web test fixtures referencing Nail Salon literal content

**Files:**
- Modify (fixture literals only): `components/layout/SiteHeader.test.tsx`, `components/layout/SiteFooter.test.tsx`, `components/sections/ContactSection.test.tsx`, `components/sections/HeroSection.test.tsx`, `components/sections/MenuSection.test.tsx`, `components/sections/MenuContent.test.tsx`, `components/sections/StaffSection.test.tsx`, `components/sections/StaffContent.test.tsx`, `components/reservation/ReservationSummary.test.tsx`, `components/reservation/ReservationWizard.test.tsx`, `components/reservation/ServiceSelection.test.tsx`, `components/reservation/useReservationWizard.test.ts`, `lib/api/reservationClient.test.ts`, `lib/config/resolveCatalog.test.ts`, `lib/validation/catalogValidator.test.ts`, `lib/config/runtimeCatalog.test.ts`

**Interfaces:**
- Consumes: nothing new — this task only edits literal string fixtures inside already-copied test files (Task 4/5).

- [ ] **Step 1: List every remaining Nail Salon-specific literal in web tests**

```bash
grep -rln "ネイル\|まつげ\|Rin Nail\|凛" apps/hair-salon-portfolio/web --include="*.test.ts*"
```

- [ ] **Step 2: Replace each literal with its Hair Salon equivalent**

Apply this exact mapping wherever it appears in a test fixture or assertion string (business name/service name fixtures only — never touch assertion *logic*, prop names, or test structure):

| Old literal | New literal |
|---|---|
| `"凛"` | `"アトリエ イト"` |
| `"凛 銀座店"` | `"アトリエ イト 神宮前店"` |
| `"Rin Nail & Eyelash"` | `"atelier ito"` |
| `"まつげパーマ"` (service name fixture) | `"カット"` |
| `"ジェルネイル"` (service name/category fixture) | `"カラー"` |
| `"ジェルA{i}"` / `"まつげB{i}"` (templated fixtures in `MenuSection.test.tsx`) | `"カットA{i}"` / `"カラーB{i}"` |

For `components/sections/StaffContent.test.tsx` and `StaffSection.test.tsx`, `businessNameInitial="凛"` becomes `businessNameInitial="ア"` (the first character of `アトリエ イト`, matching how the reference derives its initial from its own business name's first character).

- [ ] **Step 3: Run the full web test suite**

```bash
cd apps/hair-salon-portfolio/web
npm test 2>&1 | tee "../../../.evidence/20260918-hair-salon-portfolio-baseline/web-test-after-task7.log"
```

Expected: **56/56 suites, 519/519 tests pass** — identical counts to the reference baseline (spec §3). Any different count means either a missed fixture (test still expects old Nail Salon content) or an accidentally-changed assertion — investigate before proceeding.

- [ ] **Step 4: Lint and typecheck**

```bash
npx eslint .
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add apps/hair-salon-portfolio/web
git commit -m "test(hair-salon): adapt web test fixtures to atelier ito content"
```

---

## Task 8: Staff avatar SVGs

**Files:**
- Create: `apps/hair-salon-portfolio/web/public/images/staff/staff-avatar-01.svg` through `-04.svg`

**Interfaces:**
- Consumes: `photoSrc` paths already referenced by `STAFF` in Task 6 (`/images/staff/staff-avatar-0N.svg`).

- [ ] **Step 1: Read the reference's avatar SVG template to confirm the exact technique**

```bash
cat apps/salon-portfolio/web/public/images/staff/staff-avatar-01.svg
```

(Already captured during planning — reproduced below for reference: 800×1000 `viewBox`, a radial-gradient "wash" background, a centered giant initial letter in `Cormorant Garamond` at 55% opacity, and a short horizontal accent line below it.)

- [ ] **Step 2: Write four SVGs, one per Hair Salon staff member, same technique, new initials**

`apps/hair-salon-portfolio/web/public/images/staff/staff-avatar-01.svg` (伊藤 美咲 → "M"):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <radialGradient id="wash" cx="50%" cy="40%" r="58%">
      <stop offset="0%" stop-color="#6B5F55" stop-opacity="0.30" />
      <stop offset="65%" stop-color="#6B5F55" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#6B5F55" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="800" height="1000" fill="#F1ECE3" />
  <rect width="800" height="1000" fill="url(#wash)" />
  <text
    x="400"
    y="600"
    text-anchor="middle"
    font-family="Cormorant Garamond, Georgia, 'Times New Roman', serif"
    font-size="280"
    font-weight="500"
    fill="#6B5F55"
    opacity="0.55"
  >M</text>
  <line x1="360" y1="700" x2="440" y2="700" stroke="#9C4B3F" stroke-width="2" />
</svg>
```

Repeat identically for `-02.svg` (高橋 直子 → "N"), `-03.svg` (中村 玲奈 → "R"), `-04.svg` (小林 陽菜 → "H"), changing only the `>X</text>` letter each time.

- [ ] **Step 3: Verify the app renders them (smoke check via existing test, not a new one)**

```bash
cd apps/hair-salon-portfolio/web
npx jest components/sections/StaffSection.test.tsx components/sections/StaffContent.test.tsx
```

Expected: PASS (these tests exercise `StaffCard`'s fallback/photo rendering logic, not the SVG files themselves, but confirms nothing broke).

- [ ] **Step 4: Commit**

```bash
git add apps/hair-salon-portfolio/web/public/images/staff
git commit -m "feat(hair-salon): add illustrated staff avatars"
```

---

## Task 9: Source and download Unsplash stock photos, write `SOURCES.md`

**Files:**
- Create: `apps/hair-salon-portfolio/web/public/images/hero/hero-hair-cutting.jpg`
- Create: `apps/hair-salon-portfolio/web/public/images/gallery/gallery-{hair-cutting-closeup,hair-color-application,hair-texture-natural,salon-interior-chair,salon-interior-lounge,hair-styling-tools}.jpg`
- Create: `apps/hair-salon-portfolio/web/public/images/salon/salon-{reception,treatment-room}.jpg` (or equivalent — final filenames match whatever subjects are actually found)
- Create: `apps/hair-salon-portfolio/web/public/images/SOURCES.md`

**Interfaces:**
- Consumes: the exact `src` paths already written into `HERO_IMAGE`/`GALLERY_IMAGES` in Task 6 — file names on disk must match those paths exactly, or update Task 6's paths to match whatever is actually found (paths are illustrative in Task 6, not fixed in stone; the constraint is "hair-salon-appropriate subject, real verified Unsplash source", not the exact filename).

- [ ] **Step 1: Find candidate Unsplash photos for each required subject**

Required subjects (from the spec, §6): hero cut/styling close-up, gallery images covering cutting/color/texture/tools/interior (6–8 total), 1–2 salon interior/reception shots. Use a web search tool to find real Unsplash photo pages matching each subject — do not invent a photo ID.

- [ ] **Step 2: Verify each candidate URL is real and reachable before using it**

For every candidate, before downloading:

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 "https://images.unsplash.com/photo-<ID>"
```

Expected: `200`. If not 200, discard that candidate and find another — never record a source that wasn't verified this way.

- [ ] **Step 3: Download each verified photo to its target path**

```bash
curl -s -o apps/hair-salon-portfolio/web/public/images/hero/hero-hair-cutting.jpg "https://images.unsplash.com/photo-<ID>?<size-params>"
```

(Repeat per file. Use reasonable size params, e.g. `?q=80&w=1600&auto=format&fit=crop`, matching how the reference kept file sizes small — check `apps/salon-portfolio/web/public/images/*/*.jpg` file sizes with `ls -lh` and keep new files in the same rough range, well under Vercel's deployment limits.)

- [ ] **Step 4: Write `SOURCES.md`, crediting every downloaded photo with its verified URL**

```markdown
# Demo photography sources

Every raster photo (`.jpg`) under `public/images/{hero,gallery,salon}/` is a
real stock photograph, not the salon's own photography — placeholder/demo
content until a real customer supplies their own images. Sourced from
Unsplash under the [Unsplash License](https://unsplash.com/license) (free
to use, commercial use permitted, no attribution required) and downloaded
once at build time into this repo — there is no runtime dependency on an
external image host. Credited below anyway, as a courtesy to the
photographers and so a future swap knows what each file's origin was.

Staff avatars (`public/images/staff/*.svg`) are illustrated, not
photographic — see `config/demo-content.ts`'s comment on `STAFF` for why.

| File | Unsplash photo | Photographer |
|---|---|---|
| `hero/hero-hair-cutting.jpg` | [<verified-id>](https://unsplash.com/photos/<verified-id>) | <photographer name, from the verified page> |
<one row per downloaded file, same format, all values taken from the pages actually verified in Step 2 — never fabricated>
```

- [ ] **Step 5: Reconcile any filename differences with Task 6's `demo-content.ts`/`HeroContent.tsx`**

```bash
ls apps/hair-salon-portfolio/web/public/images/hero apps/hair-salon-portfolio/web/public/images/gallery apps/hair-salon-portfolio/web/public/images/salon
grep -n "images/hero\|images/gallery\|images/salon" apps/hair-salon-portfolio/web/config/demo-content.ts apps/hair-salon-portfolio/web/components/sections/HeroContent.tsx
```

Update either the filenames or the `src` strings so they match exactly.

- [ ] **Step 6: Build and confirm no broken image references**

```bash
cd apps/hair-salon-portfolio/web
npx next build
npm test
```

Expected: clean build, all tests still passing (image paths aren't build-time validated by Next.js for plain `<img>`/CSS-background usage, but this confirms nothing else broke).

- [ ] **Step 7: Commit**

```bash
git add apps/hair-salon-portfolio/web/public/images
git commit -m "feat(hair-salon): add sourced stock photography with verified SOURCES.md"
```

---

## Task 10: Documentation

**Files:**
- Create: `apps/hair-salon-portfolio/docs/owner-guide.md`
- Create: `apps/hair-salon-portfolio/docs/deployment.md`
- Create: `apps/hair-salon-portfolio/docs/config-and-sheets-guide.md`

**Interfaces:**
- Consumes: the actual CONFIG key namespace (spec §3), sheet schemas, and env vars from Tasks 1–9 — write these from the real code, not from assumption.

- [ ] **Step 1: Write `config-and-sheets-guide.md`**

Document, from the actual code in this app (not the reference's docs, which don't exist in this repo — see spec §8):
- The 9 Sheets tabs and their exact headers (`gas/src/SheetSchemas.ts`).
- The CONFIG key namespace with every key, one row per key, its purpose, and whether it's required (`gas/src/ConfigParser.ts`).
- How to add/edit a service or staff row (SERVICES/STAFF sheets).
- That `business.email` is the owner-notification recipient and is never exposed to the browser.

- [ ] **Step 2: Write `owner-guide.md`**

Document, in plain non-technical language:
- What the reservation flow does end-to-end (customer picks service → picks date/time → confirms → gets emailed → owner gets emailed → appears on Calendar → appears in the RESERVATIONS sheet).
- What the inquiry flow does end-to-end.
- How to change business hours, add a holiday, change a service's price, add/remove a staff member — all via editing Sheets, no code changes.
- How to change the destination email for owner notifications (`email.ownerNotifyAddress` in CONFIG).
- That there is no Google Forms involved — this is a custom reservation/inquiry system.

- [ ] **Step 3: Write `deployment.md`**

Document, from the actual `.env.example` and `.clasp.json.example` files:
- The independent deployment boundary: this app's own GAS Web App deployment, own Spreadsheet, own Calendar, own Vercel (or equivalent) deployment for the Next.js app — nothing shared with `apps/salon-portfolio`.
- Steps: `clasp login`, configure `.clasp.json` from `.clasp.json.example`, `npm run push` (gas), set `GAS_WEBAPP_URL`/`SALON_DESIGN_PRESET` in the web deployment's environment (never as `NEXT_PUBLIC_*`), run `setupDemoSheets()` once from the Apps Script editor to seed the Sheets.
- Explicit warning: never commit a real `.clasp.json` (it's gitignored — confirm) or a real `.env.local`.

- [ ] **Step 4: Commit**

```bash
git add apps/hair-salon-portfolio/docs
git commit -m "docs(hair-salon): add owner guide, deployment, and config/sheets guide"
```

---

## Task 11: Full verification pass, reusability audit, hardcoding audit, security audit

**Files:** none created — this task only runs commands and records evidence; any fix it triggers goes back into the file it fixes.

- [ ] **Step 1: Full build/typecheck/lint/test for both apps, saved as evidence**

```bash
mkdir -p ../../.evidence/20260918-hair-salon-portfolio-final
cd apps/hair-salon-portfolio/gas
npm run typecheck 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/gas-typecheck.log
npm run build 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/gas-build.log
npm test 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/gas-test.log
cd ../web
npx tsc --noEmit 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/web-typecheck.log
npx eslint . 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/web-lint.log
npx next build 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/web-build.log
npm test 2>&1 | tee ../../../.evidence/20260918-hair-salon-portfolio-final/web-test.log
```

Expected final counts (must match — record actual numbers in the final report, cite these log paths):
- `gas`: 34/34 suites clean typecheck/build; tests 33/34 suites, 295/310 tests (15 pre-existing `Api.test.ts` date-debt failures, unchanged from baseline).
- `web`: clean typecheck/lint/build; 56/56 suites, 519/519 tests.

- [ ] **Step 2: Config-only reusability audit (spec §10)**

For each item, grep to prove no `gas/src/**` (except `DemoSeed.ts`, which is data) or `web/lib/**` file was touched to represent it — everything must trace back to `DemoSeed.ts`, `demo-content.ts`, `HeroContent.tsx`, or the Sheets:

```bash
cd apps/hair-salon-portfolio
diff -rq gas/src ../salon-portfolio/gas/src | grep -v "Health.ts\|DemoSeed.ts"
diff -rq web/lib ../salon-portfolio/web/lib | grep -v "health.ts"
```

Expected: no output (confirms zero infra drift beyond the two documented identifier renames and the one intentional data file). Record this as direct evidence for each checklist item (business name, business type, services, prices/durations, staff, Hero/content, CTA/labels, imagery) in the final report.

- [ ] **Step 3: Hardcoded-terminology audit (spec §27)**

```bash
grep -rniE "nail|ネイル|美容|salon|まつげ" apps/hair-salon-portfolio --include="*.ts" --include="*.tsx" -l
```

Classify every hit: legitimate business content (none expected — Hair Salon content shouldn't say "nail"), legitimate project/type name (e.g. "salon-portfolio" appearing only in a doc comment referencing the sibling reference app by name — acceptable), internal legacy identifier (flag, evaluate whether renaming is warranted per the plan's "don't rename unnecessarily" constraint), or accidental hardcoding (fix immediately). Record every classified hit in the final report.

- [ ] **Step 4: Security audit**

```bash
grep -rn "GAS_WEBAPP_URL\s*=\s*[\"']https\?://" apps/hair-salon-portfolio --include="*.ts" --include="*.tsx" --include="*.env*"
grep -rn "NEXT_PUBLIC_" apps/hair-salon-portfolio/web/.env.example apps/hair-salon-portfolio/web/lib
cat apps/hair-salon-portfolio/web/.gitignore apps/hair-salon-portfolio/gas/.gitignore
git status -s apps/hair-salon-portfolio
```

Expected: no committed real GAS URL, no `GAS_WEBAPP_URL`/owner-email under a `NEXT_PUBLIC_*` name anywhere, `.env.local` and `.clasp.json` both gitignored, `git status` shows no stray untracked secret-shaped file.

- [ ] **Step 5: Nail Salon regression check**

```bash
cd D:/ClaudeCodeProjects/GAS-Project/Coconala-Web-Services/apps/salon-portfolio/gas && npm test 2>&1 | tail -5
cd ../web && npm test 2>&1 | tail -5
```

Run from *outside* the worktree (the actual `apps/salon-portfolio` this plan must never touch) if accessible, or confirm via `git diff master -- apps/salon-portfolio` inside the worktree that it's empty. Expected: identical to this plan's Task-0 baseline (295/310 gas, 519/519 web) — proves nothing in this branch altered the reference app.

- [ ] **Step 6: Commit any fixes found in Steps 2–4**

If Step 3 found genuine accidental hardcoding, fix it, re-run the affected test suite, then:

```bash
git add -A apps/hair-salon-portfolio
git commit -m "fix(hair-salon): remove accidental hardcoded terminology found in reusability audit"
```

(Skip this step entirely if the audit found nothing to fix.)

---

## Task 12: Final verification report

**Files:** none — this task produces the structured report specified in the original task brief §29, using only numbers pulled from Task 11's saved logs (cite the exact log path for every count).

- [ ] **Step 1: Assemble the report** using the exact template from the original task brief, filling every PASS/PARTIAL/FAIL from Task 11's evidence, with Known Issues explicitly naming the inherited 15 `Api.test.ts` failures as pre-existing test debt (not a Hair Salon regression), any hardcoding-audit findings and their resolution, and the branch-provenance deviation documented in spec §2.

- [ ] **Step 2: Present the report to the user** before considering the project complete. Do not push the branch or open a PR unless explicitly asked.

---

## Self-review notes (from the writing-plans skill's required self-check)

- **Spec coverage:** §2 (branch/worktree) — already done before this plan, referenced in Global Constraints. §3 (baseline) — Task 11 Step 1/5. §4 (classification) — Tasks 2–9 split exactly along the spec's infra/data/visual boundaries; Task 11 Step 2 proves it. §5 (identity/services/staff) — Task 3 (GAS) + Task 6 (web). §6 (images) — Tasks 8–9. §7 (tests) — Tasks 3, 7, and the count checks in Task 11. §8 (docs) — Task 10. §9 (deployment boundaries) — Task 10 Step 3 + Task 11 Step 4. §10 (reusability audit) — Task 11 Step 2. §11 (non-goals) — enforced via Global Constraints, nothing in any task adds them. §12 (image-sourcing risk) — Task 9 Steps 1–2.
- **Placeholder scan:** every business-data task (3, 6, 8) has full exact content, not descriptions. The image-sourcing task (9) is the one place actual content can't be pre-written (no fabricated Unsplash IDs) — it instead has a strict verify-before-use process, which is the correct handling per the spec's own risk note, not a placeholder.
- **Type consistency:** `SiteConfig`, `Service`, `StaffMember`, `HeroContentProps` field names in Task 6 match `types/content.ts` as copied verbatim in Task 4 (not redefined) — Task 6 imports them rather than restating the shape, so there's no drift risk.
