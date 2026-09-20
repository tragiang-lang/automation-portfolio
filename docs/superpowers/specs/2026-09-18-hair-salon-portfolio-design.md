# Hair Salon Portfolio — Design Spec

Date: 2026-09-18
Status: approved by user, pending implementation plan

## 1. Purpose

Prove that the automation architecture built for `apps/salon-portfolio` (Nail
Salon) is reusable for a second, unrelated small business — a Hair Salon —
by changing only business configuration, content, data, and imagery. No
architectural rewrite, no new booking/inquiry engine, no shared package.

This is a portfolio proof-of-reusability project, not a new product.

## 2. Branch / worktree provenance (important — deviates from a literal reading of the brief)

The task said "create branch `feature/hair-salon-portfolio`" and separately
"don't pull unrelated work from `feature/starter-mvp`". Investigation during
setup found these two instructions were in tension, and the resolution is
recorded here so it isn't mistaken for scope creep later:

- The repo's actual trunk branch is `master` (there is no local or reachable
  remote `main`; `origin` is unreachable from this sandbox — no SSH key).
- `master` does **not** contain the Starter design preset, the
  business-config wiring, or the ContactForm→GAS inquiry wiring this spec
  depends on. Those exist only on `feature/starter-mvp`, entangled with 67
  unrelated `site-report` commits (76 commits ahead of `master` total).
- Resolution (user-approved): branch `feature/hair-salon-portfolio` from
  `master`, then apply the **29 commits that touch `apps/salon-portfolio`**
  from `feature/starter-mvp`'s history, restricted file-by-file to the
  `apps/salon-portfolio/` path only (a handful of those 29 commits also
  touched root-level `docs/` and `product/` files — those hunks were
  excluded to avoid entangling unrelated root-doc history and a
  modify/delete conflict on `docs/presentation-config-architecture.md`).
  Zero non-`apps/salon-portfolio` files are present in the resulting diff
  against `master` (verified: `git diff --name-only master HEAD | grep -vc
  '^apps/salon-portfolio/'` → `0`).
- Work happens in an isolated git worktree at
  `.claude/worktrees/feature+hair-salon-portfolio` (native `EnterWorktree`
  tool), so the dirty, unrelated `site-report` changes sitting uncommitted
  on `feature/starter-mvp` are never touched.

## 3. Reference architecture baseline (verified, not assumed)

Captured before any Hair Salon code is written, from the branch described
above:

| Check | Result |
|---|---|
| `gas` tests | 33/34 suites, 295/310 tests pass. 15 failures, all in `tests/Api.test.ts` |
| `gas` typecheck | clean |
| `gas` build (`esbuild.config.js`) | clean |
| `web` tests | 56/56 suites, 519/519 tests pass |
| `web` typecheck | clean (after `next build` once, to generate `LayoutProps` ambient types) |
| `web` lint | clean |
| `web` build (`next build`) | clean (expected `GAS_WEBAPP_URL is not configured` warnings — correct fail-safe, not a bug) |

Logs: `.evidence/20260918-hair-salon-portfolio-baseline/*.log`.

**The 15 `Api.test.ts` failures are the exact issue flagged in the task's
§21**: those tests inject a fixed `now` such as `2026-09-10T01:00:00Z` into
reservation-window assertions, while production code (`Api.ts`) calls real
`new Date()`. Today is 2026-09-18, so the fixed fixture dates are now in the
past and validation rejects them with `VALIDATION_ERROR` before the test's
expected `SLOT_UNAVAILABLE` path is reached. This is pre-existing debt,
confirmed present on the reference architecture *before* any Hair Salon
work — Hair Salon will inherit the same pattern with its own near-`now`
fixture dates (not fixed relative to today, same technique as the
reference), and the final report will distinguish this from any Hair
Salon-caused regression.

### Reference architecture shape (file paths)

```
apps/salon-portfolio/
├── gas/
│   ├── src/
│   │   ├── Api.ts                 # action routing (getConfig, getCatalog,
│   │   │                          #   createReservation, cancelReservation,
│   │   │                          #   createInquiry, health)
│   │   ├── SheetNames.ts          # canonical tab name constants
│   │   ├── SheetSchemas.ts        # header + row-shape contracts per sheet
│   │   ├── ConfigParser.ts        # CONFIG sheet -> typed config (business.*,
│   │   │                          #   labels.*, content.*, calendar.id)
│   │   ├── ConfigStore.ts / ConfigValidator.ts
│   │   ├── Catalog.ts / CatalogParser.ts / PublicCatalog.ts
│   │   ├── ReservationRules.ts / ReservationRepository.ts /
│   │   │   ReservationMapper.ts / ReservationErrorMapping.ts
│   │   ├── SlotEngine.ts + availability/*  (slot/availability strategies)
│   │   ├── Calendar.ts            # Google Calendar event creation
│   │   ├── Idempotency.ts / InquiryIdempotency.ts
│   │   ├── InquiryRepository.ts / InquiryValidation.ts /
│   │   │   InquiryEmailTemplates.ts
│   │   ├── ReservationEmailTemplates.ts
│   │   ├── Mail.ts                # email sending
│   │   ├── DemoSeed.ts / SetupDemoSheets.ts  # ***business data lives here***
│   │   └── ids/, models/
│   └── tests/ (34 suites mirroring src/)
└── web/
    ├── app/{page,layout,reservation,contact,thanks,privacy,terms}
    ├── app/api/gas/route.ts       # Next.js server relay to GAS_WEBAPP_URL
    ├── components/{sections,reservation,forms,layout,ui}
    ├── config/demo-content.ts     # ***business data fallback lives here***
    │     (SITE_CONFIG, NAV_ITEMS, SERVICES, STAFF, GALLERY_IMAGES, ...)
    ├── config/design-presets.ts   # DESIGN_PRESETS incl. "starter"
    ├── lib/api/ (gasClient, inquiryClient)
    ├── lib/config/ (resolveSiteConfig, resolveDesignConfig, runtimeCatalog)
    ├── lib/validation/
    └── types/{content,design-config,inquiry,reservation,runtime-config}.ts
```

Google Sheets tabs (`SheetNames.ts` / `SheetSchemas.ts`, unchanged for Hair
Salon): `CONFIG`, `HOLIDAYS`, `SERVICES`, `STAFF`, `RESERVATIONS`,
`CANCELLATION_REQUESTS`, `INQUIRIES`, `EMAIL_LOG`, `ERROR_LOG`.

CONFIG key namespace (`ConfigParser.ts`, unchanged): `business.name`,
`business.nameLatin`, `business.phone`, `business.email`, `business.address`,
`business.postalCode`, `business.tagline`, `calendar.id`, `labels.service`,
`labels.bookingCta`, `labels.inquiryMessage`, `content.heroSubheadline`,
`content.conceptEyebrow`, `content.conceptTitle`, `content.conceptParagraph1`,
`content.conceptParagraph2`, `content.serviceSubtitle`, `content.ctaHeading`,
`content.ctaMessage`, `content.ctaClosingHeading`,
`content.ctaClosingMessage`. `business.email` is the owner-notification
recipient — read server-side only in GAS, never exposed to the browser.

Env vars (`web/.env.example`, unchanged pattern): `GAS_WEBAPP_URL` (server
only, never `NEXT_PUBLIC_*`; unset -> falls back to `config/demo-content.ts`)
and `SALON_DESIGN_PRESET` (one of the preset keys; unset -> defaults to
`kinari`).

## 4. Classification — what changes vs. what stays identical

Per the task's §3/§26/§27 reusability requirement, every piece of the system
is classified below. This table *is* the reusability audit criteria used in
the final report.

### Reusable infrastructure — copied file-for-file, zero behavior change

- All of `gas/src/*.ts` except `DemoSeed.ts` and `SetupDemoSheets.ts`'s
  seeded data values (structure/functions unchanged).
- All of `gas/tests/*.test.ts` (structure cloned, fixtures adapted to Hair
  Salon service/staff IDs — assertions not weakened).
- Sheet names, sheet schemas/headers, CONFIG key namespace.
- `web/lib/**`, `web/types/**`, `web/components/reservation/**`,
  `web/components/forms/ContactForm.tsx`, `web/app/api/gas/route.ts`.
- `web/config/design-presets.ts` mechanism itself (the `starter` preset
  entry is reused as-is — no new preset added; confirmed it already
  produces Hero + Menu + Reservation CTA + Contact + Footer only, matching
  the brief's §9 requirement).
- Idempotency, `LockService` usage in `Api.ts`, Calendar integration,
  email-sending infrastructure (`Mail.ts`, template *functions* — only the
  Japanese copy strings passed into them change).

### Business configuration/data — Hair Salon-specific values only

- `gas/src/DemoSeed.ts` / `SetupDemoSheets.ts` seed values: business
  identity, 5 services, 4 staff, CONFIG rows.
- `web/config/demo-content.ts`: `SITE_CONFIG.business`, `SERVICES`, `STAFF`,
  `GALLERY_IMAGES`, labels/content strings (same keys as reference, Hair
  Salon values).
- `web/.env.example`: same two keys, placeholder values, `SALON_DESIGN_PRESET`
  commented to `starter`.

### Visual/content — adapted, not redesigned

- New Unsplash-License stock photos (hair-salon-appropriate subjects),
  downloaded locally, each source verified and recorded in a new
  `SOURCES.md` under Hair Salon's `public/images/`.
- 4 new illustrated SVG staff avatars (same monogram-on-wash technique as
  reference, new initials/colors — not photos, not copied files).
- Hero/Concept/CTA Japanese copy — new text, same CONFIG keys.

### Must remain identical for architectural parity

- Reservation validation rules, slot/availability algorithm, Calendar event
  creation flow, idempotency keys, error code mapping, cancellation-token
  flow.
- Inquiry validation, idempotency, sheet persistence, email flow.
- The `/api/gas` relay boundary — Next.js never talks to Sheets/Calendar
  directly.
- The inherited hardcoded-`now` test debt pattern (not fixed — see §3).

## 5. Business identity, services, staff

- Business: **atelier ito** / アトリエ イト. Concept:
  「髪と向き合う、静かな時間。」 Fictional; no real business's name, phone,
  address, or email.
- Design preset: `starter` (existing preset, no new preset code).
- Services (`SERVICES` sheet + `demo-content.ts`, existing `Service` type,
  no new fields):

  | Name | Price | Duration |
  |---|---|---|
  | カット | ¥5,500 | 60分 |
  | カット＋カラー | ¥11,000 | 120分 |
  | カット＋パーマ | ¥12,000 | 150分 |
  | カラー | ¥7,700 | 90分 |
  | トリートメント | ¥4,400 | 30分 |

- Staff (`STAFF` sheet + `demo-content.ts`, existing `StaffMember` type, 4
  for structural parity with the reference's 4): 伊藤 美咲 (Owner/Stylist),
  高橋 直子 (Stylist), plus 2 more fictional stylists. Fictional names only.

## 6. Images

Real photos under the [Unsplash License](https://unsplash.com/license)
(commercial use permitted, no attribution required, but credited anyway —
same policy as the reference's own `SOURCES.md`). For every image: the exact
Unsplash photo URL is verified reachable (`curl` HTTP 200) before being
recorded as a source; no license claim is made for anything not verified
this way. No real business/customer/person data. Subjects: cut/styling
close-up, natural hair texture, neutral salon interior (chair, reception,
treatment area) — hair-appropriate, distinct from the Nail Salon's manicure
imagery. Staff avatars are illustrated SVGs, not photographs (same rationale
as the reference: no real people).

## 7. Tests

Same suite shape as the reference (`gas/tests/*.test.ts` mirroring `src/`,
`web` co-located `*.test.ts(x)`), fixtures swapped to Hair Salon service
IDs/staff/copy. No test deleted, no assertion weakened. New tests added only
where Hair Salon introduces genuinely new fixture data to validate (e.g.
config parsing of the new CONFIG rows) — no new *logic* to test, since none
is written.

Expected coverage (mirrors reference, adjusted for whatever new fixture
files are added):
- GAS: config parsing, reservation validation/idempotency/repository,
  inquiry validation/idempotency/repository, email templates, Calendar
  interaction, `Api.ts` action routing — same suites, Hair Salon fixtures.
- Web: config/runtime-config resolution, content resolution, design preset
  resolution, section visibility, inquiry client, reservation UI, API
  client.

## 8. Documentation

`apps/hair-salon-portfolio/docs/{owner-guide.md,deployment.md,config-and-sheets-guide.md}`,
written fresh from the actual Hair Salon code (the reference app currently
has no `apps/salon-portfolio/docs/` in the repo to copy from — its
equivalent docs live at the repo root `docs/`, which is out of scope here
per the task's explicit `apps/hair-salon-portfolio/docs/` instruction).

## 9. Deployment boundaries

Identical shape to the reference: Hair Salon Next.js app → its own
`/api/gas` route → its own GAS Web App deployment → its own Sheets/Calendar
→ Gmail. No shared deployment, no shared GAS project, no shared Sheet. No
secrets committed; `.env.example` placeholders only.

## 10. Config-only reusability audit (added per explicit user requirement)

Final report must state, for each of the following, whether it required
touching `gas/src/*.ts` reservation/inquiry engine code or `web/lib/**`
infrastructure — expected answer is "no" for all:

- [ ] business name / business type
- [ ] services (names, prices, durations)
- [ ] staff
- [ ] Hero / concept / CTA content
- [ ] labels
- [ ] imagery

Any item that turns out to require infra/engine changes must be explained
(likely candidate for legitimate exception: none currently anticipated,
since `demo-content.ts` + `DemoSeed.ts`/CONFIG sheet already parameterize
all of the above in the reference).

## 11. Explicit non-goals

No Google Forms. No new booking algorithm. No shared package. No
authentication, payment, LINE/LIFF, or CMS functionality. No fix to the
inherited hardcoded-date test debt (documented, not fixed). No modification
to `apps/salon-portfolio` or `feature/starter-mvp`.

## 12. Open risk carried into the implementation plan

- Outbound internet access (verified working via `curl` to
  `images.unsplash.com`) is required for the image-sourcing step; if it
  becomes unavailable mid-implementation, the plan must have a fallback
  (flag and pause rather than fabricate a source).
