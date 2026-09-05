# Architecture Overview

Status as of Phase 1: tooling and directory scaffolding only. This file
tracks the *implemented* state; the full target design (all 7 GAS modules,
availability strategy, Sheets schema, API contracts, transaction flow,
etc.) is specified in [`phase0-specification.md`](phase0-specification.md)
and is not repeated here.

## High-level shape (target, per Phase 0)

```text
Browser → Next.js (apps/salon-portfolio/web)
            → HTTPS → GAS Web App (apps/salon-portfolio/gas)
                        → Google Sheets / Calendar / Gmail
```

## What exists after Phase 1

- **`apps/salon-portfolio/web`** — Next.js 16 (App Router, TypeScript,
  ESLint, Tailwind CSS v4). Routes are placeholder pages only
  (`/`, `/contact`, `/reservation`, `/reservation/cancel`, `/thanks`), plus
  a real `GET /api/health` liveness endpoint. No business logic, no API
  client to the GAS backend yet.
- **`apps/salon-portfolio/gas`** — TypeScript compiled via esbuild into a
  single bundle for `clasp push`. `Code.ts` exposes only `doGet`/`doPost`,
  both returning the same liveness payload (from the pure, unit-tested
  `Health.ts`). No action routing, no Sheets/Calendar/Gmail adapters, no
  `ConfigStore`, no validation, no models yet — those folders exist as
  empty scaffolding (`availability/`, `models/`, `ids/`) per the approved
  structure but contain no code.
- Jest is wired up in both projects; each currently has only smoke tests.

## Why no shared `packages/` yet

Per Phase 0 §B, `packages/` is intentionally deferred until the reusable
core is *extracted* from a working Project 1, not designed up front — see
[`roadmap.md`](roadmap.md).

## Module boundaries (target, not yet populated)

The seven GAS boundary modules (`Code`, `Api`, `Validation`, `Sheets`,
`Calendar`, `Mail`, `SlotEngine`) and the availability-strategy seam are
defined in [`phase0-specification.md`](phase0-specification.md) §D/§T/§U.
Phase 1 only creates `Code.ts` (entrypoint) and a small `Health.ts` helper;
the rest are added as later phases implement the behavior they own.
