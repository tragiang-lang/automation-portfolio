# QA Agent

**Input:** a project directory on disk + the Core Asset registry.
**Output:** `qa/qa-report.json`, `qa/QA_REPORT.md` (and `qa/gas-checks.log` when GAS checks run).

Checks (rules in `core-assets/qa-rules/qa-rules-v1.json`):
- **Workflow:** exists and stable; actions exist and are available; LINE entries use LINE-enabled actions with suitable inputs; dependencies are satisfied; schemas exist.
- **Spreadsheet:** required sheets are present; column types, enums, and defaults are valid; no duplicate columns; keys, indexes, and references resolve; required CONFIG values are present (warning).
- **GAS:** module and generated files exist; relative imports resolve; the registry matches the selected actions; tests exist. With `--run-gas-checks`, typecheck, tests, and build must pass, and the four top-level entry points must be present.
- **Rich Menu:** LINE size, area and overlap limits; every button resolves to a selected workflow entry of the same type; URIs are https; labels are present; every selected workflow is reachable; postback data is 300 characters or fewer.
- **Design:** WCAG AA contrast for every label.
- **Security:** no secrets or secret files; no non-example email addresses in generated code.
- **Delivery:** SETUP.md and DELIVERY.md exist; every listed artifact exists; every JSON artifact carries `_meta` traceability.
