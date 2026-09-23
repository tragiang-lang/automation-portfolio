# Architecture (Phase 1)

## One-paragraph summary

The factory turns a **client brief** (industry, requirement lines, brand, non-secret
business settings) into an isolated **client project**: an industry profile, a
versioned workflow selection, a Rich Menu design spec, a LINE Rich Menu config, a
spreadsheet schema, a tested GAS project, QA reports, and Japanese delivery documents.
Industry knowledge, workflows, actions, schemas, layouts, and presets are **data**
(`core-assets/`). The TypeScript code in `src/` only reads, validates, combines, and
emits that data. Adding an industry or a menu is normally a JSON change.

## Layers

```text
CORE ASSETS (data, versioned, locked)      core-assets/
  industries ─┐
  intents ────┤
  workflows ──┼── reference ──> actions ──> gas-modules (reusable TS source + tests)
  schemas ────┘                    │
  rich-menu layouts / menus        └── dependencies: sheets, CONFIG keys, services
  design presets, qa-rules

FACTORY (code)                              src/
  registry/     load + shape-check every asset (zod), asset lock
  validation/   cross-asset rules, shared by `validate` and the QA Agent
  agents/       Industry Specialist → Workflow Planner → Design Agent, Orchestrator
  generators/   spreadsheet schema, Rich Menu LINE config, GAS project, delivery docs, safe writer
  qa/           QA Agent (reads the project from disk)
  cli.ts        deterministic CLI

CLIENT PROJECTS (output, isolated)          projects/<year>/<slug>/
```

Dependency direction: **client projects → core assets**, never the reverse. Core
Assets contain no client names, no URLs, and no secrets. `apps/*` (the salon apps)
are read-only references and neither side imports the other.

## Pipeline

```text
brief.json
  │ parseBrief (zod)                          brief/brief.json, business-requirements.md
  ▼
Industry Specialist   requirement lines → intents (keyword catalog) → workflows
  │                                            analysis/industry-profile.json
  ▼
Workflow Planner      stable? actions available? menu buttons ⊆ selection?
  │                                            workflow/selected-workflows.json, workflow.json
  ▼
Design Agent          menu structure + layout + preset + brand overrides
  │                                            rich-menu/design-spec.json
  ▼
Spreadsheet Schema Generator   merge schema assets + CONFIG keys of actions
  │                                            spreadsheet/schema.json, config-seed.json
  ▼
Rich Menu Config Generator     workflow entries → LINE actions + GAS routes
  │                                            rich-menu/menu-config.json
  ▼
GAS Generator         copy modules verbatim + generate data files
  │                                            gas/
  ▼
Delivery docs                                  delivery/SETUP.md, DELIVERY.md
  ▼  (files written by the safe project writer)
QA Agent              reads disk; optional tsc / vitest / esbuild
                                               qa/qa-report.json, QA_REPORT.md
```

`runPipeline` (src/agents/orchestrator.ts) is pure: it returns a file map and
does no I/O. Writing and QA are separate steps (src/project.ts). This is why the
same code can serve `create-project`, `generate-gas`, and
`generate-rich-menu-spec`, and why tests can check the whole pipeline in memory.

## Separation of Rich Menu concerns

| Layer | Asset / artifact | Contains | Never contains |
|---|---|---|---|
| Business meaning | workflow `entries` | which action, direct vs. ask-for-text, prompt | geometry, colors |
| Menu structure | `rich-menu/menus/*.json` | which button → which workflow entry, label, role, icon name | pixels, colors, LINE payloads |
| Geometry | `rich-menu/layouts/*.json` | canvas size, slot bounds, hero emphasis | labels, actions |
| Visual design | `design-presets/*.json` → `design-spec.json` | colors, typography, spacing, icon style, contrast | LINE payloads |
| LINE configuration | `menu-config.json` | LINE rich-menu object (areas, postback/datetimepicker/uri) | colors, fonts |

Postback data is only `wf=<workflowId>&e=<entry>`. Parameters stay server-side in the
generated routes, so a customer cannot tamper with them. The routes and the menu
config come from the same workflow entries, so a button cannot send something the
backend does not route. The generated wiring test proves this for every project.

## Workflow system

A workflow (`core-assets/workflows/**`) declares:

- `actions`: pinned refs (`createInquiry@1`). Unpinned refs are invalid.
- `entries`: how LINE starts it (`postback` direct / `awaitText` with a prompt / `datetimepicker`).
- `spreadsheet.schemas` + `requiredSheets`: which reusable schema assets it needs.
- `configKeys`, `notifications`, `extensionPoints`.

The four Phase 1 workflows:

| Workflow | LINE interaction | Actions |
|---|---|---|
| `business-info-v1` | postback → text reply (entries: default / access / hours) | `getBusinessInfo@1` |
| `service-menu-v1` | postback → price list reply | `getServiceList@1` |
| `inquiry-basic-v1` | postback → prompt; the next text message is saved | `createInquiry@1` |
| `reservation-basic-v1` | LINE date-time picker → reservation *request* | `createReservation@1` (+ `getAvailability@1`, API-only) |

## Action Registry

`core-assets/actions/<id>/v<major>.json`: input/output field schemas, dependencies
(sheets, CONFIG keys, services, Script Properties), validation rules, error cases,
`exposure` (`api`, `line`), `reusable`, `industrySpecific`, `status`
(`available` | `planned`) and the GAS module that implements it. Planned actions
(`cancelReservation@1`, `sendLineMessage@1`) document extension points. A stable
workflow that references them fails validation.

## Spreadsheet schema system

`core-assets/spreadsheet-schemas/*.json`: typed columns (`string`, `text`,
`integer`, `boolean`, `email`, `phone`, `date`, `time`, `datetime`, `enum`,
`url`…), `required`, `default`, `enum`, `references` (`SHEET.column`), `pii`, a
`primaryKey`, and `indexes`. Each sheet name belongs to exactly one schema asset,
so merging never conflicts. CONFIG keys come from actions and are merged, and
conflicting declarations are errors. The generated GAS `setupSpreadsheet()` is
additive only: it creates missing sheets, appends missing headers, and seeds
missing CONFIG keys. It never deletes anything.

## GAS generation

```text
gas/
├── src/
│   ├── entry.ts, lib/, config/, validation/, services/ (+ services/gas/ thin adapters),
│   │   repositories/, router/, line/, setup/, actions/     ← copied verbatim from gas-modules
│   ├── generated/  schema.ts configSeed.ts registry.ts routes.ts richMenu.ts manifest.ts
│   └── index.ts    ← generated; exposes entry points on globalThis
├── tests/          module tests (copied) + generated.test.ts (wiring + smoke run)
├── esbuild.config.mjs  IIFE bundle + top-level footer wrappers (Editor function discovery)
├── appsscript.json, package.json, tsconfig.json, vitest.config.mjs, .clasp.json.example
```

Design rules carried over from the salon apps (see the audit): pure logic behind
interfaces, thin Google adapters that are not unit-tested, stable error codes with
fixed Japanese messages, and cache + sheet + lock idempotency. The generator never
writes secrets. `manifest.ts` records module versions and the hash of every
copied file.

## QA architecture

The QA Agent reads the project from disk, so it also catches hand edits and
partial copies. Its rules come from `core-assets/qa-rules/qa-rules-v1.json`
(workflow, spreadsheet, gas, rich-menu, design, security, delivery). It reuses the
same rule functions as `validate` (src/validation/rules.ts). With GAS checks on,
it runs `tsc`, `vitest`, and `esbuild` inside `gas/` and asserts that the four
top-level entry points exist in `build/Code.js`.

## Versioning

See [decisions/0003-asset-versioning.md](decisions/0003-asset-versioning.md). Every
asset has an id and a semver version. `asset-lock.json` makes released content
immutable. Each client project snapshots the workflow and action definitions it
used (`workflow/workflow.json`) and stamps `_meta` (project, industry, workflows,
asset versions) on every JSON artifact.

## Extension points (not in Phase 1)

| Need | Where it plugs in |
|---|---|
| Google Calendar busy times | extra `BookedInterval` source in `services/availability.ts`; event creation on CONFIRMED |
| Per-staff availability | capacity rule per staff (reference: hair-salon `StaffAvailabilityStrategy`) → `reservation-staff-v1` |
| Cancellation | implement `cancelReservation@1` + a workflow entry |
| LINE push (confirmations, reminders, owner alerts) | implement `sendLineMessage@1`; `notifications[].channel = "line"` |
| New industry | `core-assets/industries/<cat>/<industry>-v1.json` (+ a menu asset if the button set differs) |
| Web/LIFF booking UI (Phase 2) | the JSON API already exists (`API_ENABLED`); `getAvailability` + `createReservation` |
