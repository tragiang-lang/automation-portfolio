# CLAUDE.md: AI-Agent-Coconala-Factory

Phase 1 factory: LINE Rich Menu + Workflow + GAS + Spreadsheet + QA. Read `README.md` and
`docs/architecture.md` first.

## Hard rules

- **Phase 1 only.** Do not add Next.js, React UIs, LIFF, Vercel, Supabase, auth for customers,
  dashboards or multi-tenant infra (see `docs/phase-1-scope.md`).
- **`../apps/*` are read-only references.** Never modify them and never import from them.
- **Core Assets are client-free and versioned.** Never put client names, URLs or secrets in
  `core-assets/`. Never edit a released asset in place. Bump `version` (compatible) or create a
  `-v<N+1>` asset (breaking), then `npm run factory -- validate` and `npm run factory -- lock-assets`.
- **Do not hand-edit generated project files** (`projects/**/gas/src/generated/*`, copied module
  files, JSON artifacts). Change the brief or the Core Assets and regenerate with `generate-gas`.
- **Secrets only in Script Properties.** Never in source, briefs, templates, tests or the spreadsheet.
  Test data: `example.com`, `U0000…`, `03-0000-0000`.
- **Prefer data over code.** A new industry or menu should be a JSON asset. Only add code
  when a new *capability* (action/module) is needed, and add tests with it.

## Commands

```bash
npm run typecheck        # factory + core-assets/gas-modules
npm test                 # vitest: tests/ + core-assets/gas-modules/tests/
npm run factory -- validate
npm run factory -- create-project --brief templates/briefs/hair-salon.example.json
npm run factory -- generate-gas --brief <brief> --run-gas-checks
npm run factory -- qa --project projects/2026/<slug> --run-gas-checks   # factory QA + LINE QA
npm run factory -- line-deploy --project projects/2026/<slug> --env test  # dry run; --live needs LINE_CHANNEL_ACCESS_TOKEN env
```

Never run `line-deploy`/`line-rollback`/`line-delete`/`line-smoke-test` with `--live` unless the user asks;
never write a LINE token, channel secret or webhook key to any file.

## Where things live

- `src/schemas/`: zod shapes of assets and briefs. `src/validation/rules.ts`: rules shared by `validate` and QA.
- `src/agents/`: industry specialist, workflow planner, design agent, orchestrator (pure `runPipeline`).
- `src/generators/`: spreadsheet schema, rich menu config, GAS project, delivery docs, safe writer.
- `src/qa/qaAgent.ts`: QA Agent (reads projects from disk). `src/qa/lineQa.ts`: LINE QA (Levels 1–4).
- `src/richMenu/`: deterministic Rich Menu renderer (design spec → SVG → PNG).
- `src/line/`: deployment definition, LINE API adapter, deploy/rollback/smoke test. See `docs/line-automation-v1.md`.
- `core-assets/line-webhook-proxy/`: signature-verifying Cloudflare Worker, copied into `line/webhook/`.
- `core-assets/gas-modules/`: reusable GAS TypeScript. `modules.json` lists each module's files and
  tests. An action's code must be `src/actions/<actionId>.ts` exporting `<actionId>`.

## Adding things

- **Industry:** `core-assets/industries/<cat>/<industry>-v1.json` (+ intent keywords if needed, + a
  menu asset if its buttons differ). Add a test brief and run `create-project`.
- **Action:** asset `core-assets/actions/<id>/v1.json`, code + tests in `core-assets/gas-modules`,
  register the files in `modules.json`, then reference `<id>@1` from a workflow.
- **Workflow:** asset in `core-assets/workflows/<area>/`, using existing schemas where possible.
