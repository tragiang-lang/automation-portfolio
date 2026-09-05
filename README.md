# Coconala Web Services

Monorepo for client web projects. **Project 1: `salon-portfolio`** (nail /
eyelash salon LP + reservation system) is the only project scaffolded so
far.

Full architecture and design decisions: [`docs/phase0-specification.md`](docs/phase0-specification.md).
This README covers Phase 1 (tooling/foundation) only — no business logic,
Sheets/Calendar/Gmail integration, or CONFIG system exists yet.

## Structure

```text
apps/
  salon-portfolio/
    web/   # Next.js frontend (TypeScript, App Router, ESLint, Tailwind)
    gas/   # Google Apps Script backend (TypeScript, esbuild, clasp, Jest)
```

See [`docs/folder-structure.md`](docs/folder-structure.md) for the full,
annotated tree.

## Prerequisites

- Node.js 20+ and npm
- For GAS deployment: a Google account and the [clasp](https://github.com/google/clasp) CLI (installed as a dev dependency; run via `npx clasp`)

## Web (`apps/salon-portfolio/web`)

```bash
cd apps/salon-portfolio/web
npm install
npm run dev        # local dev server
npm run build      # production build
npm run lint       # ESLint
npm test           # Jest + React Testing Library
npx tsc --noEmit   # type check
```

Smoke check once running: `GET /api/health` → `{ "status": "ok", ... }`.

## GAS backend (`apps/salon-portfolio/gas`)

```bash
cd apps/salon-portfolio/gas
npm install
npm run build       # esbuild bundle -> build/Code.js + build/appsscript.json
npm test            # Jest, runs against src/**/*.ts directly, never the bundle
npm run typecheck   # tsc --noEmit
```

### First-time clasp setup (per environment)

`.clasp.json` is gitignored because it holds a real Apps Script project ID.
Each environment (portfolio/demo vs. a customer's production project) gets
its own:

```bash
cd apps/salon-portfolio/gas
npx clasp login                       # once per machine/account
npx clasp create --type webapp --title "Salon Portfolio" --rootDir build
# — or, to attach to an Apps Script project that already exists:
cp .clasp.json.example .clasp.json    # then fill in the real scriptId
npm run push                          # builds, then clasp push
```

No `.clasp.json` is committed anywhere in this repo, and no placeholder
script ID is treated as a real one — see `.clasp.json.example`.

## What Phase 1 deliberately does NOT include

Reservation/contact/cancellation business logic, Sheets/Calendar/Gmail
integration, the CONFIG system (`getConfig`), authentication, the real LP
UI, and Supabase are all out of scope for this phase — see
[`docs/roadmap.md`](docs/roadmap.md) and
[`docs/phase0-specification.md`](docs/phase0-specification.md) for what
each later phase adds.
