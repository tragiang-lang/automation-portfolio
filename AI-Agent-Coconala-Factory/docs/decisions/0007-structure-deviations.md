# 0007: Deviations from the suggested folder structure

- **`src/` added.** It holds all factory code (registry, validation, agents, generators, qa, cli). One TS
  root keeps a single tsconfig and test runner.
- **`agents/<name>/` holds contracts (README), not code.** The implementations live in
  `src/agents` and `src/generators` (the "implementation agent" is the generator set).
- **`scripts/` not created.** The CLI (`src/cli.ts`, `npm run factory`) covers every command.
- **`core-assets/gas-modules/` is a TS source tree** (`src/`, `tests/`, `modules.json`) mirroring
  the generated `gas/` layout, so copied files keep working relative imports.
- **`core-assets/rich-menu/` is split into `layouts/` and `menus/`** to keep geometry separate from
  meaning.
- **`tests/` at the factory root** holds factory tests. GAS module tests live next to the modules.
