# Folder Structure

This reflects what actually exists on disk after Phase 1 (not the full
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
│   ├── architecture-overview.md
│   ├── folder-structure.md          # this file
│   ├── api-documentation.md
│   ├── roadmap.md
│   └── changelog.md
│
└── apps/
    └── salon-portfolio/
        ├── web/                              # Next.js frontend
        │   ├── app/
        │   │   ├── layout.tsx
        │   │   ├── page.tsx                  # placeholder LP
        │   │   ├── contact/page.tsx           # placeholder
        │   │   ├── reservation/page.tsx       # placeholder
        │   │   ├── reservation/cancel/page.tsx # placeholder
        │   │   ├── thanks/page.tsx            # placeholder
        │   │   └── api/health/route.ts        # liveness check (real)
        │   ├── components/
        │   │   ├── layout/                    # empty — scaffolded only
        │   │   ├── sections/                  # empty — scaffolded only
        │   │   ├── forms/                     # empty — scaffolded only
        │   │   ├── reservation/               # empty — scaffolded only
        │   │   └── ui/PagePlaceholder.tsx      # shared placeholder component
        │   ├── lib/
        │   │   ├── api/                       # empty — scaffolded only
        │   │   ├── validation/                # empty — scaffolded only
        │   │   ├── constants/                 # empty — scaffolded only
        │   │   └── utils/health.ts            # pure health-check payload
        │   ├── types/                         # empty — scaffolded only
        │   ├── config/                        # empty — scaffolded only
        │   ├── public/{images,icons}/         # empty — scaffolded only
        │   ├── jest.config.ts / jest.setup.ts
        │   ├── eslint.config.mjs
        │   ├── next.config.ts
        │   ├── tsconfig.json
        │   └── package.json
        │
        └── gas/                              # GAS backend, TypeScript
            ├── src/
            │   ├── Code.ts                    # doGet/doPost only (liveness)
            │   ├── Health.ts                  # pure health-check payload
            │   ├── availability/              # empty — scaffolded only
            │   ├── models/                    # empty — scaffolded only
            │   └── ids/                       # empty — scaffolded only
            ├── tests/
            │   ├── Health.test.ts
            │   └── availability/              # empty — scaffolded only
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
project-specific rules/skills to add.
