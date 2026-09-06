# Folder Structure

This reflects what actually exists on disk after Phase 3A (not the full
Phase 0 target — see [`phase0-specification.md`](phase0-specification.md)
§B for what later phases still add). Generated/dependency directories
(`node_modules/`, `.next/`, `build/`, `.swc/`) are omitted.

```text
Coconala-Web-Services/
├── README.md
├── MASTER_PROMPT_INSTRUCTION_LP_AUTOMATION_SAAS.md
├── .gitignore
├── docs/
│   ├── phase0-specification.md
│   ├── phase2a-ui-ux-specification.md
│   ├── architecture-overview.md
│   ├── folder-structure.md          # this file
│   ├── api-documentation.md
│   ├── config-and-sheets-guide.md   # new in Phase 3A
│   ├── roadmap.md
│   └── changelog.md
│
└── apps/
    └── salon-portfolio/
        ├── web/                              # Next.js frontend — unchanged since Phase 2C
        │   └── ... (see git history; not touched in Phase 3A)
        │
        └── gas/                              # GAS backend, TypeScript
            ├── src/
            │   ├── Code.ts                    # doGet (liveness) / doPost (→ Api.ts dispatch)
            │   ├── Health.ts                  # pure health-check payload
            │   ├── Api.ts                     # getConfig action handler + doPost dispatcher
            │   ├── ConfigStore.ts             # CONFIG+HOLIDAYS repository (Sheets + parser + validator)
            │   ├── ConfigParser.ts            # pure CONFIG type/shape parsing
            │   ├── ConfigValidator.ts         # pure CONFIG business-rule validation
            │   ├── PublicConfig.ts            # AppConfig -> PublicConfig projection
            │   ├── Sheets.ts                  # thin SpreadsheetApp adapter
            │   ├── SheetNames.ts              # canonical sheet-name constants
            │   ├── SheetSchemas.ts            # per-sheet headers + row types (all 9 tabs)
            │   ├── RowMapper.ts               # pure header-map / row<->object helpers
            │   ├── DemoSeed.ts                # pure demo data for all 9 sheets
            │   ├── SetupDemoSheets.ts         # setupDemoSheets() — manual-run, non-destructive
            │   ├── Utils.ts                   # Asia/Tokyo timestamp helpers
            │   ├── availability/              # empty — scaffolded only (Phase 3B+)
            │   ├── models/
            │   │   ├── Config.ts              # AppConfig / PublicConfig / FeatureFlags / ...
            │   │   ├── ErrorCodes.ts          # ERROR_CODES + CONFIG_INVALID
            │   │   └── Api.ts                 # ApiRequest / ApiResponse envelope
            │   └── ids/
            │       └── ReservationId.ts       # RES-YYYYMMDD-XXXXXX generator
            ├── tests/
            │   ├── Health.test.ts
            │   ├── SheetSchemas.test.ts
            │   ├── RowMapper.test.ts
            │   ├── Utils.test.ts
            │   ├── ReservationId.test.ts
            │   ├── ConfigParser.test.ts
            │   ├── ConfigValidator.test.ts
            │   ├── PublicConfig.test.ts
            │   ├── ConfigStore.test.ts
            │   ├── Api.test.ts
            │   ├── DemoSeed.test.ts
            │   └── availability/              # empty — scaffolded only (Phase 3B+)
            ├── appsscript.json
            ├── .clasp.json.example            # template; real .clasp.json is gitignored
            ├── esbuild.config.js
            ├── jest.config.js
            ├── tsconfig.json
            └── package.json
```

Not yet created (deferred to later phases, per Phase 0 §B notes):
`packages/` and `.claude/` at the repo root — neither is needed until
there is working Project 1 code to extract a reusable core from, or
project-specific rules/skills to add. `Calendar.ts`, `Mail.ts`,
`SlotEngine.ts`, `Validation.ts`, the `availability/` strategies, and the
`ReservationRequest`/`ContactRequest`/`CancellationRequest` workflow DTOs
are Phase 3B+.
