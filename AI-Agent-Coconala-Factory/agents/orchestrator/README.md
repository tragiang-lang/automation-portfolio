# Orchestrator Agent

**Input:** `brief.json` (schema: `src/schemas/brief.ts`, examples in `templates/briefs/`).
**Output:** a complete, isolated `projects/<year>/<slug>/`.

Steps: parse the brief, then Industry Specialist, Workflow Planner, Design Agent, Implementation
Agent (spreadsheet schema, Rich Menu config, GAS, delivery docs). Then it writes the files safely
and runs the QA Agent.

Rules:
- Holds **no industry or workflow knowledge**. It only sequences agents and stops at the first error-level issue.
- The pipeline (`runPipeline`) is pure and returns a file map. Only `writeProject` touches disk, and only inside the project directory.
- Never overwrites a project without `--force`, never writes into a directory that is not a factory project, and never touches other projects.
