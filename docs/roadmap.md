# Roadmap — Project 1: `salon-portfolio`

Phase numbering follows this project's own planning conversation, not a
fixed template.

- [x] **Phase 0 — Architecture & specification.** Approved; see
      [`phase0-specification.md`](phase0-specification.md).
- [x] **Phase 1 — Project foundation & tooling.** Next.js app scaffolded
      (TypeScript, App Router, ESLint, Tailwind, Jest); GAS project
      scaffolded (TypeScript, esbuild, clasp, Jest); directory structure
      from Phase 0 §B created; health/smoke checks on both sides. No
      business logic.
- [ ] **Phase 2 — CONFIG system.** `ConfigStore.ts`, the `CONFIG`/`HOLIDAYS`
      sheet reader, `getConfig` action, `AppConfig` type (§D).
- [ ] **Phase 3 — Sheets/Calendar/Gmail adapters.** `Sheets.ts`,
      `Calendar.ts`, `Mail.ts` as thin wrappers (§T), plus the SERVICES/STAFF
      catalog actions.
- [ ] **Phase 4 — Availability & reservations.** `SlotEngine.ts`, both
      availability strategies (§J/§K), `createReservation` transaction flow
      (§U), idempotency (§P).
- [ ] **Phase 5 — Contact & cancellation workflows.** `createInquiry`,
      `requestCancellation` (§L), email workflow (§M).
- [ ] **Phase 6 — Real LP UI.** Actual salon design, forms wired to the API
      client, Japanese operations guide (§S).
- [ ] **Phase 7 — Reusable core extraction.** Move the generic parts (§
      "Explicit Classification") into `packages/`, once a second vertical
      makes the boundary concrete instead of speculative.

Nothing beyond Phase 1 is implemented yet.
