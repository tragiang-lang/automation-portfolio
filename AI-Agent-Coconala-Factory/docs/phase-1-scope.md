# Phase 1 Scope

## In scope (delivered)

- Read-only audit of `apps/salon-portfolio` and `apps/hair-salon-portfolio` → [reusable-assets-audit.md](reusable-assets-audit.md)
- Core Asset registries: industries (2), intent catalog, workflows (4), actions (5 available + 2 planned),
  spreadsheet schemas (5), Rich Menu layouts (4) and menus (2), design presets (5), QA rules, GAS modules (5)
- Asset versioning + immutability lock (`core-assets/asset-lock.json`)
- Agents as deterministic code with written contracts (`agents/*/README.md`): Orchestrator,
  Industry Specialist, Workflow Planner, Design Agent, Implementation (generators), QA Agent
- Generators: spreadsheet schema, Rich Menu design spec + LINE config, GAS project, delivery docs, safe project writer
- Generated GAS: LINE webhook (postback / awaitText / datetimepicker), JSON API (off by default),
  `setupSpreadsheet()`, `setupRichMenu()`, tests, esbuild bundle
- QA Agent + `qa-report.json` / `QA_REPORT.md`
- CLI: `audit`, `list-industries`, `list-workflows`, `list-actions`, `validate`, `lock-assets`,
  `create-project`, `generate-gas`, `generate-rich-menu-spec`, `qa`
- End-to-end demo `projects/2026/demo-hair-salon/` plus a restaurant verification project `projects/2026/demo-restaurant/`

## Explicitly out of scope (Phase 2+)

Next.js, React customer UIs, LIFF, Vercel, booking/inquiry web screens, a LINE mini-app,
customer-facing authentication, Supabase, SaaS/multi-tenant infrastructure, and dashboards.

## Deliberately deferred inside the Phase 1 domain

| Item | Why deferred | Extension point |
|---|---|---|
| Final Rich Menu PNG generation | Spec says a design spec is enough; the image is made in Canva or similar | Delivered in LINE Automation v1 ([line-automation-v1.md](line-automation-v1.md)) |
| Google Calendar sync, staff availability, cancellation, LINE push | Keep `reservation-basic-v1` small and correct first | see [architecture.md](architecture.md#extension-points-not-in-phase-1) |
| LLM-driven agents | Deterministic rules are testable and sufficient for 2 industries | [decisions/0004](decisions/0004-deterministic-agents.md) |
| Localized (Japanese) text inside asset-sourced notes | Industry `risks` and workflow `extensionPoints` are English | bump the industry/workflow asset versions with Japanese text |
