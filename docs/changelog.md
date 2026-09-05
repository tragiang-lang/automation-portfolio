# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
