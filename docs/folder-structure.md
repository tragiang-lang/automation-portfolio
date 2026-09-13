# Folder Structure

This reflects what actually exists on disk: `salon-portfolio` after Phase
3A (not the full Phase 0 target — see
[`phase0-specification.md`](phase0-specification.md) §B for what later
phases still add) and `site-report` after Task 12 (MVP verification &
production hardening — the full LIFF login → site selection → report +
photos → `SUBMIT_REPORT` loop is implemented; see
[`site-report-architecture-overview.md`](site-report-architecture-overview.md)
for the task-by-task design history and
[`../apps/site-report/START_HERE.md`](../apps/site-report/START_HERE.md)
for the setup/operations handbook).
Generated/dependency directories (`node_modules/`, `.next/`, `build/`,
`.swc/`) are omitted.

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
`packages/` at the repo root — not needed until there is working Project
code to extract a reusable core from (see `site-report-architecture-overview.md`
for why `site-report`'s Task 1 doesn't create it either). `Calendar.ts`,
`Mail.ts`, `SlotEngine.ts`, `Validation.ts`, the `availability/`
strategies, and the `ReservationRequest`/`ContactRequest`/
`CancellationRequest` workflow DTOs are Phase 3B+.

```text
apps/
└── site-report/                             # Project 2 — Task 12: MVP loop complete
    ├── START_HERE.md                         # setup & operations handbook (read this first)
    ├── web/                                  # Next.js frontend (LIFF host)
    │   ├── app/
    │   │   ├── layout.tsx                    # root layout, <title>現場報告アプリ</title>
    │   │   ├── page.tsx                      # renders <SiteReportScreen /> (Server Component)
    │   │   ├── globals.css                   # incl. global box-sizing reset (Task 12 Fix 2)
    │   │   └── api/
    │   │       └── health/
    │   │           ├── route.ts              # GET liveness endpoint
    │   │           └── route.test.ts
    │   ├── components/
    │   │   └── site-report/
    │   │       ├── SiteReportScreen.tsx      # top-level screen state machine (Client Component)
    │   │       ├── SiteReportScreen.test.tsx
    │   │       ├── SitePicker.tsx            # renders GET_SITES results
    │   │       ├── SitePicker.test.tsx
    │   │       ├── ReportEntryShell.tsx      # site confirmation + form + photos + submit
    │   │       ├── ReportEntryShell.test.tsx
    │   │       ├── ReportForm.tsx            # the 4 editable report fields
    │   │       ├── ReportForm.test.tsx
    │   │       ├── PhotoUploader.tsx         # file input + per-selection errors
    │   │       ├── PhotoUploader.test.tsx
    │   │       ├── PhotoPreviewList.tsx      # thumbnails + remove button
    │   │       ├── PhotoPreviewList.test.tsx
    │   │       ├── reportDraft.ts            # ReportDraft type + pure mutation helpers
    │   │       ├── reportDraft.test.ts
    │   │       ├── reportValidation.ts       # client-side field validation (UX only)
    │   │       ├── reportValidation.test.ts
    │   │       ├── photoValidation.ts        # client-side MIME/size policy (UX only)
    │   │       ├── photoValidation.test.ts
    │   │       ├── photoCompression.ts       # canvas-based resize/re-encode
    │   │       ├── photoCompression.test.ts
    │   │       ├── photoPipeline.ts          # orchestrates validate+compress per selection
    │   │       ├── photoPipeline.test.ts
    │   │       ├── submitReportMapper.ts     # ReportDraft+site+profile -> SubmitReportInput
    │   │       ├── submitReportMapper.test.ts
    │   │       ├── submission.ts             # calls submitReport(), maps result -> UI state
    │   │       ├── submission.test.ts
    │   │       └── site-report.module.css
    │   ├── lib/
    │   │   ├── liff.ts                       # ONLY file allowed to call raw @line/liff SDK
    │   │   ├── liff.test.ts
    │   │   ├── liff.ssr.test.ts
    │   │   ├── utils/health.ts               # pure health payload
    │   │   └── api/
    │   │       ├── siteReportClient.ts       # generic POST {action,payload} -> GAS
    │   │       ├── siteReportClient.test.ts
    │   │       ├── siteReportWorkflows.ts    # typed getSites()/submitReport()
    │   │       └── siteReportWorkflows.test.ts
    │   ├── types/
    │   │   ├── api.ts                        # hand-mirrored GAS request/response contracts
    │   │   └── liff.ts                       # LiffState/SiteReportLiffUser/LiffError
    │   ├── .env.example                      # NEXT_PUBLIC_LIFF_ID, GAS_WEBAPP_URL
    │   ├── eslint.config.mjs
    │   ├── jest.config.ts
    │   ├── jest.setup.ts
    │   ├── next.config.ts
    │   ├── tsconfig.json
    │   └── package.json
    │
    └── gas/                                  # GAS backend, TypeScript
        ├── src/
        │   ├── index.ts                       # doGet/doPost entrypoints only, no logic
        │   ├── Health.ts                       # pure health-check payload
        │   ├── Api.ts                          # GET_SITES/SUBMIT_REPORT dispatch + error mapping
        │   ├── SubmitReportService.ts          # validate->resolve site->upload->persist->notify
        │   ├── SitesRepository.ts              # reads+maps+validates the SITES sheet
        │   ├── ReportsRepository.ts            # appends REPORTS/REPORT_PHOTOS rows
        │   ├── DriveStorage.ts                 # uploads/trashes a photo in Drive
        │   ├── AdminNotification.ts             # builds the admin email content
        │   ├── Mail.ts                          # thin GmailApp.sendEmail wrapper
        │   ├── Config.ts                        # SiteReportConfig type + CONFIG key constants
        │   ├── ConfigParser.ts                  # pure CONFIG type/shape parsing
        │   ├── ConfigStore.ts                   # CONFIG repository (Sheets + parser)
        │   ├── SheetStore.ts                    # thin SpreadsheetApp adapter (reads SPREADSHEET_ID)
        │   ├── SheetNames.ts                    # canonical sheet-name constants
        │   ├── SheetSchemas.ts                  # per-sheet headers + row types (5 tabs)
        │   ├── RowMapper.ts                     # copied verbatim from salon-portfolio/gas
        │   ├── Validation.ts                    # business-rule validation per sheet row
        │   ├── ids/
        │   │   └── ReportId.ts                  # reportId/photoId generation
        │   └── models/
        │       ├── Site.ts
        │       ├── Worker.ts
        │       ├── Report.ts                    # SiteReport type
        │       ├── ReportPhoto.ts
        │       └── SubmitReportInput.ts          # SUBMIT_REPORT request payload shape
        ├── tests/
        │   ├── Health.test.ts
        │   ├── models.test.ts
        │   ├── Config.test.ts
        │   ├── ConfigParser.test.ts
        │   ├── ConfigStore.test.ts
        │   ├── SheetSchemas.test.ts
        │   ├── SheetStore.test.ts
        │   ├── RowMapper.test.ts
        │   ├── Validation.test.ts
        │   ├── ReportId.test.ts
        │   ├── Api.test.ts
        │   ├── SubmitReportService.parse.test.ts
        │   ├── SubmitReportService.test.ts
        │   └── AdminNotification.test.ts
        ├── appsscript.json
        ├── .clasp.json.example
        ├── esbuild.config.js
        ├── jest.config.js
        ├── tsconfig.json
        └── package.json
```

Deliberately still not created in `site-report` (see
`site-report-architecture-overview.md`'s "Deferred / known limitations"):
any `WorkersRepository.ts` (the `WORKERS` sheet is schema-defined but not
read/written by any action), server-side LIFF token verification, draft/
offline persistence, an admin dashboard, and a shared `packages/` module
extracted from both projects.
