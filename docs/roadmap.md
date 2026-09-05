# Roadmap — Project 1: `salon-portfolio`

Phase numbering follows this project's own planning conversation, not a
fixed template.

- [x] **Phase 0 — Architecture & specification.** Approved; see
      [`phase0-specification.md`](phase0-specification.md).
- [x] **Phase 1 — Project foundation & tooling.** Next.js app scaffolded
      (TypeScript, App Router, ESLint, Tailwind, Jest); GAS project
      scaffolded (TypeScript, esbuild, clasp, Jest); directory structure
      from Phase 0 §B created; health/smoke checks on both sides. No
      business logic. Committed at `9114b03`.
- [x] **Phase 2A — UI/UX specification (design only).** Approved; see
      [`phase2a-ui-ux-specification.md`](phase2a-ui-ux-specification.md).
      Design concept, color system, typography, spacing, breakpoints, page
      structure, per-section behavior, component architecture, data/
      presentation split, accessibility/performance/animation rules,
      reusability plan, anti-patterns, and a visual-review checklist. No
      UI code, no dependencies installed.
- [x] **Phase 2B — Real LP UI implementation.** All sections from Phase 2A
      §17 built into `apps/salon-portfolio/web` (`Header` → `Hero` →
      `Concept` → `Menu` → `Staff` → `Gallery` → `ReservationCtaBand` →
      `SalonFeatures` → `CustomerFlow` → `FAQ` → `Access` → `Contact` →
      `Footer`), wired to temporary demo content in
      `config/demo-content.ts` until Phase 3's `getConfig`/`getServices`/
      `getStaff` exist. Frontend UI only — no reservation backend, GAS
      API, Sheets, Calendar, Gmail, `getConfig`, auth, Supabase, or real
      form submission. Lint/typecheck/tests/production build all pass.
- [ ] **Phase 3 — CONFIG system.** `ConfigStore.ts`, the `CONFIG`/`HOLIDAYS`
      sheet reader, `getConfig` action, `AppConfig` type (Phase 0 §D);
      wires real business content into the Phase 2B UI.
- [ ] **Phase 4 — Sheets/Calendar/Gmail adapters.** `Sheets.ts`,
      `Calendar.ts`, `Mail.ts` as thin wrappers (Phase 0 §T), plus the
      SERVICES/STAFF catalog actions.
- [ ] **Phase 5 — Availability & reservations.** `SlotEngine.ts`, both
      availability strategies (Phase 0 §J/§K), `createReservation`
      transaction flow (§U), idempotency (§P).
- [ ] **Phase 6 — Contact & cancellation workflows.** `createInquiry`,
      `requestCancellation` (Phase 0 §L), email workflow (§M).
- [ ] **Phase 7 — Reusable core extraction.** Move the generic parts
      (Phase 0's "Explicit Classification", extended by Phase 2A §18/§23)
      into `packages/`, once a second vertical makes the boundary concrete
      instead of speculative. Japanese operations guide (Phase 0 §S) also
      ships around this point.

Phase 2B is the newest code in the repo; Phase 3 (`ConfigStore`/`getConfig`)
is the next phase and has not been started.
