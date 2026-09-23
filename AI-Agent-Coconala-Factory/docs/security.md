# Security

## Where each kind of value lives

| Value | Lives in | Never in |
|---|---|---|
| LINE channel access token, webhook key, spreadsheet id, rich-menu image id | Apps Script **Script Properties** (set by hand at deploy time) | source, briefs, Core Assets, spreadsheet, git |
| Apps Script project id | `gas/.clasp.json` (gitignored, per environment) | git (only `.clasp.json.example` is committed) |
| Business facts (name, address, hours, owner notification email, public URLs) | brief `config` → `spreadsheet/config-seed.json` → CONFIG sheet | Core Assets |
| Customer personal data (LINE user id, name, email, phone, messages) | the client's own spreadsheet only | Core Assets, templates, tests, logs, notification emails |

## Enforced by the factory

- **Core Assets are client-free.** Briefs are the only client input, and schemas mark personal-data columns with `pii: true`.
- **QA `SEC_NO_SECRETS`** scans every project file for private keys, Google API keys, Slack tokens,
  long bearer/LINE tokens, and `secret = "..."`-style assignments. It also fails on any committed
  `.clasp.json`, `.clasprc.json` or `.env*` file.
- **QA `SEC_NO_REAL_PII`** warns about any email address outside `example.*` domains in generated code and tests.
- **Test data is fictional**: `example.com` addresses, `U0000…` LINE ids, `03-0000-0000` phone numbers.
- `.gitignore` (factory and every generated `gas/`) excludes `node_modules`, `build/`, `.clasp.json`, `.clasprc.json`, and `.env*`.
- Generated code reads secrets only through `getScriptProperty()` (`services/gas/gasContext.ts`).

## Runtime protections in generated GAS

- **LINE webhook authentication.** Apps Script web apps **cannot read HTTP request headers**, so
  the `X-Line-Signature` HMAC cannot be verified (a platform limitation). Instead, the webhook URL
  carries `?key=<WEBHOOK_KEY>`, compared in constant time (`router/dispatch.ts`). If `WEBHOOK_KEY` is
  unset or shorter than 16 characters, **every** LINE delivery is rejected (fail closed). Treat the
  webhook URL as a secret and rotate `WEBHOOK_KEY` if it leaks. See [decisions/0005](decisions/0005-line-webhook-auth.md).
- **JSON API off by default.** `doPost` action calls return `FEATURE_DISABLED` unless the Script
  Property `API_ENABLED` is `"true"`, and only actions whose definition has `api` exposure are callable.
- **No raw errors to customers.** Every failure maps to a fixed Japanese message per error code.
  Internal details go to the Apps Script execution log only.
- **Logs and emails carry ids, not content.** Owner notification emails contain the inquiry or
  reservation id and a pointer to the sheet, not the customer's message or contact details.
- **Idempotency.** LINE redeliveries reuse `webhookEventId`, so duplicates never create rows.
- **Additive setup.** `setupSpreadsheet()` never deletes or reorders data.

## Owner guidance (in every SETUP.md)

Share the spreadsheet only with the people who need it. It contains customer personal
data. If a token or the webhook key leaks, reissue the LINE token and change `WEBHOOK_KEY`.

## Known limitations

- No `X-Line-Signature` verification (see above). A proxy that can verify HMAC (for example a small
  Cloud Function or the Phase 2 web backend) would close this gap.
- The secret scan is pattern-based. It reduces risk but does not replace review.
