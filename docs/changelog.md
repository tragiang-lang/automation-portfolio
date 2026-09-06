# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — Phase 3B: frontend runtime config integration

- `lib/api/gasClient.ts`: server-only `callGasAction` helper that POSTs
  `{ action, payload }` to `GAS_WEBAPP_URL` with `cache: "no-store"` —
  never bundled into the browser (no `"use client"` in its import chain,
  no `NEXT_PUBLIC_*` variable introduced).
- `lib/validation/runtimeConfigValidator.ts`: structural validation of the
  `getConfig` response before any component ever sees it.
- `lib/config/runtimeConfig.ts`: `getRuntimeConfig()` (wrapped in React's
  `cache()`, one GAS call per request) resolving `demo-fallback` /
  `runtime` / `runtime-error`, always falling back to
  `config/demo-content.ts`-derived values so a real backend failure never
  renders a blank page.
- `lib/config/resolveSiteConfig.ts`: merges the runtime
  `business`/`hours`/`holidays`/`features`/`staffAnyAvailableOption`
  fields with the frontend-owned `nameLatin`/`tagline`/`postalCode`/
  `socialLinks` into the existing `SiteConfig` view-model, so no Phase 2
  section component needed to change.
- `app/layout.tsx` (`generateMetadata` + `RootLayout`) and `app/page.tsx`
  now call `getRuntimeConfig()` instead of importing
  `config/demo-content.ts` directly. `components/layout/
  RuntimeConfigNotice.tsx` renders a calm Japanese notice above the
  header on the `runtime-error` path only.
- `app/api/gas/route.ts`: new generic `POST /api/gas` proxy for a future
  browser-initiated action (reservation/contact submission) — unused so
  far in Phase 3B; `getConfig` is fetched directly from the server
  boundary above instead, since a Server Component calling its own Route
  Handler over HTTP is an anti-pattern Next.js recommends against. Never
  echoes a caught error's message to the client.
- Reservation CTA buttons in `SiteHeader`, `MobileNav`, and `SiteFooter`
  are now gated on `features.reservation`, matching the existing
  `StaffSection` pattern for `features.staffSelection`.
- `docs/runtime-config-guide.md`: new guide documenting the data flow,
  ownership boundary (what GAS/CONFIG owns vs. what stays
  frontend-only), fallback/error behavior, caching/revalidation, and
  security notes.
- Not included (deliberately out of scope): no GAS/`gas/src/**` changes —
  the Phase 3A `getConfig` contract was found fully sufficient; no
  reservation/contact submission, Calendar, Gmail, auth, Supabase, or
  deployment.

### Added — Phase 3A: GAS configuration + data layer

- `apps/salon-portfolio/gas/src/SheetNames.ts` + `SheetSchemas.ts`:
  canonical names and column/header definitions for all nine Phase 0 §C
  sheets (`CONFIG`, `HOLIDAYS`, `SERVICES`, `STAFF`, `RESERVATIONS`,
  `CANCELLATION_REQUESTS`, `INQUIRIES`, `EMAIL_LOG`, `ERROR_LOG`).
- `RowMapper.ts`: pure header-mapping and row↔object serialization,
  with explicit missing-header detection (`MissingHeadersError`).
- `Sheets.ts`: thin `SpreadsheetApp` adapter (`getSheet`, `getHeaderMap`,
  `readRawRows`, `appendRow`, `updateRow`), reading the target spreadsheet
  from the new `SPREADSHEET_ID` Script Property convention (documented in
  `docs/config-and-sheets-guide.md`) rather than a hard-coded ID.
- `models/Config.ts`, `ConfigParser.ts`, `ConfigValidator.ts`,
  `PublicConfig.ts`, `ConfigStore.ts`: the full CONFIG pipeline — strict
  boolean/number/string parsing (no "yes"/"no"/"1"/"0"), business-rule
  validation (timezone, ranges, business-hours format, holiday dates,
  the staff-selection/any-available-staff combination), and a
  public/private projection so `calendarId` and the owner-facing email
  settings never leave the server.
- `models/ErrorCodes.ts`, `models/Api.ts`, `Api.ts`: the shared
  `{ok,data}`/`{ok:false,error}` envelope, Phase 0 §H's 10 error codes
  plus a new `CONFIG_INVALID` code, and the `getConfig` action + `doPost`
  dispatcher (every other action name returns `VALIDATION_ERROR` — no
  other action exists yet).
- `Code.ts`: `doPost` now routes through `Api.ts`'s dispatcher; `doGet`
  is unchanged (still the Phase 1 liveness check).
- `Utils.ts` (Asia/Tokyo timestamp helpers, fixed UTC+9 offset — Japan has
  no DST) and `ids/ReservationId.ts` (`RES-YYYYMMDD-XXXXXX` generator,
  injectable date/random source) — generator only, no reservation
  workflow calls it yet.
- `DemoSeed.ts` + `SetupDemoSheets.ts`: safe, non-destructive demo data
  for all nine sheets and a manual-run `setupDemoSheets()` utility that
  never overwrites an existing sheet.
- `docs/config-and-sheets-guide.md`: new operator/developer guide for the
  CONFIG sheet and the sheet data layer.
- 60+ new Jest tests across the parser, validator, row mapper, schema
  definitions, ID generator, timestamp helper, API dispatch logic, and
  demo-seed/schema consistency. `Sheets.ts` and `SetupDemoSheets.ts` are
  GAS-service wrappers and are intentionally not unit tested (Phase 0 §Q)
  — see the new guide for manual verification steps.
- Not included (deliberately out of scope, per the Phase 3A task
  prompt): reservation/contact/cancellation workflows, Calendar, Gmail,
  authentication, Supabase, frontend `getConfig` integration,
  `getServices`/`getStaff`/`healthCheck` actions, `clasp push`.

### Added — Phase 2B: real LP UI implementation

- Full "Kinari to Sumi" design system implemented from
  `docs/phase2a-ui-ux-specification.md`: color/spacing/radius tokens and
  the `xl: 1440px` breakpoint in `app/globals.css`, Shippori Mincho /
  Cormorant Garamond / Noto Sans JP / Inter loaded via `next/font/google`
  (only the weights the type scale actually uses).
- All thirteen page sections built as reusable, props-driven components
  under `components/{layout,sections,forms,ui}`: `SiteHeader` (sticky,
  transparent-over-hero, mobile nav with focus management),
  `HeroSection`, `ConceptSection`, `MenuSection` (data-driven category
  grouping), `StaffSection` (fully absent from the DOM when
  `features.staffSelection` is off, incl. the "お任せ" any-available
  tile), `GallerySection` (CSS-masonry, single column on mobile),
  `ReservationCtaBand`, `SalonFeaturesSection`, `CustomerFlowSection`,
  `FaqSection` (accessible accordion, multiple-open, `grid-template-rows`
  height transition), `AccessSection` (static map placeholder, no real
  Google Maps embed yet), `ContactSection`/`ContactForm` (blur validation,
  honeypot + min-fill-time anti-spam UI, loading/success states, no real
  submission endpoint), `SiteFooter`.
- `config/demo-content.ts` + `types/content.ts`: temporary, clearly-marked
  demo business content matching the Phase 0 `AppConfig`/`SERVICES`/
  `STAFF`/`ContactRequest` shapes, imported only by `app/*page.tsx` so no
  section component depends on it directly — this is the one file Phase 3+
  replaces with real `getConfig`/`getServices`/`getStaff` responses.
- One-time hero fade/rise and one-time scroll-reveal (`components/ui/
  Reveal.tsx`, IntersectionObserver-based) — both respect
  `prefers-reduced-motion` and drop their mobile stagger delay.
- Local SVG placeholder photography (`public/images/*.svg`) — no external
  image URLs; every image reserves its aspect ratio and carries specific
  Japanese `alt` text.
- Frontend UI only, as scoped: no reservation backend, GAS API, Google
  Sheets, Google Calendar, Gmail, `getConfig`, authentication, Supabase, or
  real reservation/contact submission.
- New dev dependency: `@testing-library/user-event` (interaction-driven
  component tests — accordion toggling, mobile nav keyboard handling,
  form validation).
- 22 new Jest/RTL tests across `Button`, `FaqAccordionItem`, `MenuSection`
  (incl. the category-grouping threshold logic), `StaffSection`,
  `SiteHeader`/`MobileNav`, and `ContactForm`.

### Added — Phase 2A: UI/UX specification (design only, approved)

- `docs/phase2a-ui-ux-specification.md`: full design specification for the
  salon-portfolio LP — design concept, color system (with contrast
  verification), typography (Japanese + Latin pairing), spacing scale,
  responsive breakpoints, page structure and mandatory/configurable
  sections, per-section (Header/Hero/Menu/Staff/Gallery/Reservation CTA/
  FAQ/Access/Contact/Footer) behavior specs, proposed component
  architecture, data-vs-presentation classification, accessibility and
  performance requirements, animation rules, mobile-first UX rules,
  Coconala cross-vertical reusability plan, explicit anti-patterns, and a
  visual quality review checklist.
- No UI code written, no dependencies installed, no Phase 1 files modified
  — specification only.

### Added — Phase 1: project foundation & tooling

- `apps/salon-portfolio/web`: Next.js 16 app (TypeScript, App Router,
  ESLint, Tailwind CSS v4, Jest + React Testing Library). Placeholder pages
  for `/`, `/contact`, `/reservation`, `/reservation/cancel`, `/thanks`.
  Real `GET /api/health` liveness endpoint.
- `apps/salon-portfolio/gas`: TypeScript GAS project (esbuild bundling,
  clasp deploy config, Jest). `Code.ts` `doGet`/`doPost` entrypoints
  returning a liveness payload from the pure, unit-tested `Health.ts`.
- Root `docs/` set: architecture overview, folder structure, API docs
  (placeholder), roadmap, this changelog.
- Directory scaffolding for all Phase 0 §B modules not yet implemented
  (`availability/`, `models/`, `ids/` under `gas/src`; `components/*`,
  `lib/*`, `types/`, `config/`, `public/*` under `web`).

### Not included (deliberately out of scope for Phase 1)

Reservation/contact/cancellation business logic, Sheets/Calendar/Gmail
integration, `getConfig`/CONFIG system, authentication, the real LP UI,
Supabase.
