# AI-Agent-Coconala-Factory

A reusable production factory for Coconala LINE services in Japan:
**LINE Rich Menu + Workflow + GAS + Google Spreadsheet + QA**, generated from a short client
brief using versioned Core Assets.

## 1. What this project is

The input is a client brief: industry, what customers should be able to do, brand, and
non-secret business settings. The factory produces an isolated client project with an
industry analysis, a workflow selection, a Rich Menu design spec and LINE config, a
spreadsheet schema, a tested Google Apps Script backend, a QA report, and Japanese setup and
delivery documents. Salons are the first example, but nothing in the core is salon-specific.

## 2. What Phase 1 does

- Reads the existing salon apps as reference only ([docs/reusable-assets-audit.md](docs/reusable-assets-audit.md)).
- Keeps versioned, locked **Core Assets**: 2 industries, 4 workflows, 7 actions (5 implemented, 2 planned),
  5 spreadsheet schemas, 4 Rich Menu layouts, 2 menus, 5 design presets, QA rules, and 5 GAS modules.
- Runs a deterministic **agent pipeline**: Industry Specialist → Workflow Planner → Design Agent →
  generators → QA Agent.
- Generates a working GAS project: a LINE webhook (Rich Menu postbacks, "type your question" inquiries,
  LINE date-time-picker reservation requests), `setupSpreadsheet()`, `setupRichMenu()`, a JSON API
  (off by default), unit tests, and an esbuild bundle.
- Delivers an end-to-end demo: [`projects/2026/demo-hair-salon/`](projects/2026/demo-hair-salon/) (QA PASS),
  plus [`projects/2026/demo-restaurant/`](projects/2026/demo-restaurant/), which shows a second industry
  with no core changes, and [`projects/2026/demo-nail-salon/`](projects/2026/demo-nail-salon/), a nail salon
  built from data only (industry + menu asset) on the Hair Salon workflows.

## 3. What Phase 1 does NOT do

No Next.js, React, LIFF, Vercel, customer web UI, LINE mini-app, customer auth, Supabase,
SaaS/multi-tenant infrastructure, or dashboard. There is no Google Calendar sync, staff booking,
cancellation, or LINE push yet; these are documented extension points. See [docs/phase-1-scope.md](docs/phase-1-scope.md).

## 3a. LINE Automation Factory v1

On top of Phase 1, every project now also gets a deployable LINE layer ([docs/line-automation-v1.md](docs/line-automation-v1.md)):

- `rich-menu/rich-menu.png` + `preview.svg` + `image.json`: a real, deterministic Rich Menu image rendered
  from `design-spec.json` (SVG + resvg + pinned Noto Sans JP; [ADR 0009](docs/decisions/0009-rich-menu-renderer.md)).
- `line/deployment.json` (deployment definition and button → workflow → action → GAS traceability),
  `line/webhook/` (Cloudflare Worker that verifies `x-line-signature` before GAS; [ADR 0008](docs/decisions/0008-line-webhook-proxy.md)).
- `line-*` CLI commands: dry-run-by-default deploy, status, rollback, delete, and a gated smoke test.
- `qa/LINE_QA_REPORT.md`: LINE QA Levels 1–4, separate from the factory QA.
- Japanese `delivery/` set: SETUP, SPREADSHEET_SETUP, GAS_SETUP, LINE_SETUP, E2E_TEST, ROLLBACK, DELIVERY.

## 4. Architecture

```text
brief.json ─► Industry Specialist ─► Workflow Planner ─► Design Agent
           ─► Spreadsheet Schema Gen ─► Rich Menu Config Gen ─► GAS Gen ─► delivery docs
           ─► (safe write) ─► QA Agent ─► projects/<year>/<slug>/
```

`core-assets/` (data) ← `src/` (code that reads, validates and combines data) → `projects/` (output).
Client projects depend on Core Assets and never the reverse. Details are in
[docs/architecture.md](docs/architecture.md), and decisions in [docs/decisions/](docs/decisions/README.md).

## 5. Core Assets

| Registry | Folder | Example |
|---|---|---|
| Industries + intents | `core-assets/industries/` | `hair-salon-v1`, `restaurant-v1`, `customer-intents-v1` |
| Workflows | `core-assets/workflows/` | `inquiry-basic-v1`, `business-info-v1`, `service-menu-v1`, `reservation-basic-v1` |
| Actions | `core-assets/actions/` | `createInquiry@1`, `createReservation@1`, `getAvailability@1` |
| Spreadsheet schemas | `core-assets/spreadsheet-schemas/` | `core-config-v1`, `customers-basic-v1`, `reservations-basic-v1` |
| Rich Menu | `core-assets/rich-menu/{layouts,menus}/` | `grid-2x3-v1`, `hero-1-plus-3-v1`, `salon-basic-v1` |
| Design presets | `core-assets/design-presets/` | `quiet-luxury-v1`, `minimal-modern-v1`, `warm-natural-v1`, `clean-professional-v1`, `friendly-local-v1` |
| GAS modules | `core-assets/gas-modules/` | `runtime`, `inquiry`, `reservation-basic`, … |
| QA rules | `core-assets/qa-rules/` | `qa-rules-v1` (28 rules) |

Every asset has an id and a semver version. `core-assets/asset-lock.json` stops released assets
from being edited silently. See [ADR 0003](docs/decisions/0003-asset-versioning.md).

## 6. Agents

Contracts are in [`agents/`](agents/README.md), and the implementations are in `src/agents/`,
`src/generators/`, and `src/qa/`. In Phase 1 the agents are deterministic
([ADR 0004](docs/decisions/0004-deterministic-agents.md)). The Orchestrator carries no industry logic.

## 7. Workflow system

A workflow is data: pinned actions (`createInquiry@1`), LINE entries (`postback`, `awaitText`
with a prompt, or `datetimepicker`), required spreadsheet schemas and sheets, CONFIG keys,
notifications, and extension points. The Rich Menu buttons and the GAS webhook routes are both
generated from these entries, so they cannot drift apart.

## 8. GAS generation

Reusable modules are copied verbatim from `core-assets/gas-modules`. Only
`src/generated/*` (schema, config seed, action registry, LINE routes, rich menu, manifest),
`src/index.ts`, a wiring and smoke test, and tooling config are generated. It uses TypeScript,
Vitest, and an esbuild IIFE bundle with top-level wrapper functions so the Apps Script editor can
see `doGet`, `doPost`, `setupSpreadsheet`, and `setupRichMenu`. Secrets exist only as Script
Properties ([docs/security.md](docs/security.md)).

## 9. Rich Menu system

The layers are kept separate: business meaning (workflow entries), menu structure (menu
asset), geometry (layout asset), visual design (preset → `design-spec.json`), and LINE
configuration (`menu-config.json`). Both LINE limits and WCAG contrast are validated.

## 10. How to create a client project

```bash
npm install
cp templates/briefs/hair-salon.example.json my-client.json   # edit slug, client, requirements, brand, config
npm run factory -- validate
npm run factory -- create-project --brief my-client.json      # → projects/<year>/<slug>/ + QA
# after changing Core Assets or the brief:
npm run factory -- generate-gas --brief my-client.json --run-gas-checks
```

Then follow `projects/<year>/<slug>/delivery/SETUP.md` (Japanese, written for the client).

Other commands: `audit`, `list-industries`, `list-workflows`, `list-actions`, `lock-assets`,
`generate-rich-menu-spec --brief <file> [--out dir]`, `qa --project <dir> [--run-gas-checks]`,
`render-rich-menu --project <dir>`.

LINE (dry run unless `--live`; token only from the `LINE_CHANNEL_ACCESS_TOKEN` environment variable):

```bash
npm run factory -- line-validate   --project projects/2026/<slug>
npm run factory -- line-deploy     --project projects/2026/<slug> --env test [--live]
npm run factory -- line-status     --project projects/2026/<slug> [--remote --env test]
npm run factory -- line-rollback   --project projects/2026/<slug> --env test [--live]
npm run factory -- line-smoke-test --project projects/2026/<slug> --env test --live   # test account only
```

## 11. Testing

```bash
npm run typecheck   # factory + GAS modules
npm test            # factory tests + GAS module tests (includes one real tsc/vitest/esbuild run of a generated project)
npm run check       # typecheck + test + validate
```

Tests cover schema validation, the Action Registry, Rich Menu layouts and references, the project
generator (structure, no overwrite, isolation, regeneration), QA detection (workflow,
spreadsheet, Rich Menu, GAS files, secrets, contrast, traceability), the asset lock, determinism,
and the restaurant industry.

## 12. Future optional extensions

None of these are needed for v1: Next.js/LIFF customer screens (booking with
`getAvailability`/`createReservation` through the existing JSON API), Vercel deployment, Google
Calendar and staff availability, cancellation, LINE push notifications, a Canva adapter for the
Rich Menu image (behind `RichMenuImageRenderer`), and LLM-assisted brief intake in front of the
deterministic agents.
