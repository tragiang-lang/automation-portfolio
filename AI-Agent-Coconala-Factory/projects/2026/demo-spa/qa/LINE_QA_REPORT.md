# LINE Integration QA — 2026/demo-spa

**Result: PASS** · pass 13 · fail 0 · warn 0 · skipped 1

Separate from the factory QA (`QA_REPORT.md`). Rules: core-assets/qa-rules/line-qa-rules-v1.json.

| Level | Scope | Status | Note |
|---|---|---|---|
| 1 | Static LINE validation | **PASS** | image, config, actions, traceability, deployment definition, secrets, webhook/proxy |
| 2 | Generated GAS LINE runtime tests | **PASS** | gas/tests/lineRuntime.test.ts, in-memory Google services |
| 3 | Webhook proxy tests | **PASS** | line/webhook/tests: signature and forwarding; the factory suite adds end-to-end proxy → GAS tests |
| 4 | Live LINE smoke test | **NOT RUN** | requires a real test account; never automatic |

| Status | Rule | Details |
|---|---|---|
| ✅ pass | `LINE_IMAGE_EXISTS` | — |
| ✅ pass | `LINE_IMAGE_FORMAT` | — |
| ✅ pass | `LINE_IMAGE_MATCHES_CONFIG` | — |
| ✅ pass | `LINE_IMAGE_READABLE` | — |
| ✅ pass | `LINE_DETERMINISTIC_IMAGE` | — |
| ✅ pass | `LINE_ACTIONS_VALID` | — |
| ✅ pass | `LINE_WORKFLOW_REFERENCES` | — |
| ✅ pass | `LINE_DEPLOYMENT_CONFIG` | — |
| ✅ pass | `LINE_SECRET_SCAN` | — |
| ✅ pass | `LINE_WEBHOOK_CONFIG` | — |
| ✅ pass | `LINE_PROXY_CONFIG` | — |
| ✅ pass | `LINE_RUNTIME_TESTS` | — |
| ✅ pass | `LINE_PROXY_TESTS` | — |
| ⏭️ skipped | `LINE_LIVE_SMOKE` | NOT RUN (needs a real test LINE Official Account: line-smoke-test --live) |

Live verification is reported only when `line-smoke-test --live` actually ran against a test
account (`line/smoke-test-result.json`). Manual mobile checks: `delivery/E2E_TEST.md`. Server-issued ids: `line/deployment-history.json`.
