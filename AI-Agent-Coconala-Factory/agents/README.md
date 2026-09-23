# Agent team (Phase 1)

Each agent is a **contract** (this folder) plus a **deterministic implementation** (`src/`).
Knowledge lives in `core-assets/`, so agents combine data and never hard-code industry facts.
See [docs/decisions/0004](../docs/decisions/0004-deterministic-agents.md).

| Agent | Implementation | Output |
|---|---|---|
| [Orchestrator](orchestrator/README.md) | `src/agents/orchestrator.ts`, `src/project.ts` | the whole project |
| [Industry Specialist](industry-specialist/README.md) | `src/agents/industrySpecialist.ts` | `analysis/industry-profile.json` |
| [Workflow Planner](workflow-planner/README.md) | `src/agents/workflowPlanner.ts` | `workflow/selected-workflows.json`, `workflow.json` |
| [Design Agent](design-agent/README.md) | `src/agents/designAgent.ts` | `rich-menu/design-spec.json` |
| [Implementation Agent](implementation-agent/README.md) | `src/generators/*` | `spreadsheet/`, `rich-menu/menu-config.json`, `gas/`, `delivery/` |
| [QA Agent](qa-agent/README.md) | `src/qa/qaAgent.ts` | `qa/qa-report.json`, `qa/QA_REPORT.md` |
