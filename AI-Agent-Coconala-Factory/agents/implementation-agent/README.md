# Implementation Agent (generators)

| Generator | File | Output |
|---|---|---|
| Spreadsheet Schema Generator | `src/generators/spreadsheetSchema.ts` | `spreadsheet/schema.json`, `config-seed.json` |
| Rich Menu Config Generator | `src/generators/richMenuConfig.ts` | `rich-menu/menu-config.json` + GAS LINE routes |
| GAS Project Generator | `src/generators/gasProject.ts` | `gas/` |
| Delivery docs | `src/generators/delivery.ts` | `delivery/SETUP.md`, `DELIVERY.md`, `brief/business-requirements.md` |
| Safe writer | `src/generators/projectWriter.ts` | writes / regenerates one project directory |

Rules:
- Reusable GAS code is **copied verbatim** from `core-assets/gas-modules`. Only `src/generated/*`,
  `src/index.ts`, the wiring test and tooling files are generated.
- No secrets are ever generated. Client values come only from the brief.
- Output is deterministic: the same inputs give byte-identical files.
