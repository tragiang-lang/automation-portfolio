# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
