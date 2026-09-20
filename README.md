# Coconala Web Services

Monorepo for client web projects. **Project 1: `salon-portfolio`** (nail /
eyelash salon LP + reservation system) and **Project 2: `site-report`**
(LIFF 現場報告アプリ — construction site report MVP) are the two projects
scaffolded so far. Each app under `apps/` is fully independent — its own
`package.json`, `node_modules`, tooling config — this repo has no
root-level workspace/monorepo tooling.

Full architecture and design decisions: [`docs/phase0-specification.md`](docs/phase0-specification.md)
(salon-portfolio) and [`docs/site-report-architecture-overview.md`](docs/site-report-architecture-overview.md)
(site-report). This README's `salon-portfolio` section covers Phase 1
(tooling/foundation) and Phase 3A (CONFIG + data layer) — reservation/
contact business logic and Calendar/Gmail integration are still not
implemented. The `site-report` section covers its full MVP loop as of
Task 12 — LIFF login, `GET_SITES`, site selection, the report form with
client-side validation, a client-side photo pipeline (validate/compress/
preview/remove), and real `SUBMIT_REPORT` submission with success/error/
retry UX — see `docs/site-report-architecture-overview.md` for what
remains deferred (server-side idempotency, draft persistence, offline
support, and others listed there).

## Structure

```text
apps/
  salon-portfolio/
    web/   # Next.js frontend (TypeScript, App Router, ESLint, Tailwind)
    gas/   # Google Apps Script backend (TypeScript, esbuild, clasp, Jest)
  site-report/
    web/   # Next.js frontend (TypeScript, App Router, ESLint) — LIFF host
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

See [`docs/config-and-sheets-guide.md`](docs/config-and-sheets-guide.md) for
the required `SPREADSHEET_ID` Script Property and demo-data setup — every
call fails without it.

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

## What this codebase deliberately does NOT include yet (salon-portfolio)

Reservation/contact/cancellation business logic, Calendar/Gmail
integration, authentication, the real LP UI, and Supabase are all out of
scope so far — see [`docs/roadmap.md`](docs/roadmap.md) and
[`docs/phase0-specification.md`](docs/phase0-specification.md) for what
each later phase adds. (The CONFIG system's `getConfig` action, backed by
Sheets, is implemented as of Phase 3A.)

**New to this project, or setting it up from scratch (Google Sheets/Drive,
GAS deployment, LINE Developers/LIFF, environment variables, Vercel, first
end-to-end test, troubleshooting)?** Start with
[`apps/site-report/START_HERE.md`](apps/site-report/START_HERE.md) —
the sections below are the quick command reference only.

## Web (`apps/site-report/web`)

```bash
cd apps/site-report/web
npm install
npm run build       # also generates the .next/types typecheck needs
npm run typecheck   # tsc --noEmit
npm test            # Jest
npm run lint        # ESLint
npm run dev         # local dev server
```

Smoke check once running: `GET /api/health` → `{ "status": "ok", ... }`.

## GAS backend (`apps/site-report/gas`)

```bash
cd apps/site-report/gas
npm install
npm run build       # esbuild bundle -> build/Code.js + build/appsscript.json
npm test            # Jest, runs against src/**/*.ts directly, never the bundle
npm run typecheck   # tsc --noEmit
```

Same `.clasp.json` setup as `salon-portfolio/gas` above (per-environment,
gitignored, never a placeholder scriptId).

## What this codebase deliberately does NOT include yet (site-report)

`GET_SITES`, `SUBMIT_REPORT`, LIFF login, the report form, client-side
photo validation/compression, and real submission with success/error/
retry UX are all implemented (Tasks 4–12). Deliberately still out of
scope: server-side idempotency/duplicate-submission prevention (a
double-submit is only guarded client-side), draft/localStorage
persistence, an offline/retry queue, admin dashboard, analytics, and
native camera integration — see
[`docs/site-report-architecture-overview.md`](docs/site-report-architecture-overview.md)
for the full list and the reasoning behind each.
