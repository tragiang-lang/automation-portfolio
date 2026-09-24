# LINE Automation Factory v1

v1 builds on the Phase 1 factory and adds a delivery layer for LINE production. The same pipeline now ends in a
package you can deploy: a real Rich Menu image, a LINE deployment definition, a verified
webhook path, LINE-specific QA, and Japanese setup, test and rollback documents. There is no
Next.js, React, LIFF, Vercel, Supabase or customer web app.

```text
Factory Core (brief → industry → workflows → design spec → menu config → schema → GAS)
  → Rich Menu Renderer        src/richMenu/            design-spec.json → preview.svg → rich-menu.png
  → LINE Adapter              src/line/lineApi.ts      thin Messaging API client (CLI only)
  → Deployment                src/line/deploy.ts       dry run / live deploy / status / rollback / smoke test
  → Webhook Security Boundary core-assets/line-webhook-proxy → project line/webhook/ (Cloudflare Worker)
  → GAS Workflow Runtime      core-assets/gas-modules  (Phase 1 webhook + event-level idempotency)
  → Spreadsheet               schema assets → setupSpreadsheet()
  → QA                        qa/QA_REPORT.md (factory) + qa/LINE_QA_REPORT.md (LINE, Levels 1–4)
  → Delivery                  delivery/*.md (Japanese) + line/deployment.json (traceability)
```

## LINE facts this implementation relies on

Checked against LINE's official docs on 2026-09-23 (reference source:
`github.com/line/line-developers-docs-source`, `docs/en/reference/messaging-api/index.html.md`,
and the official OpenAPI files in `github.com/line/line-openapi`):

| Topic | Official requirement | Where enforced |
|---|---|---|
| Rich menu image | JPEG or PNG; width 800–2500 px; height ≥ 250 px; width/height ≥ 1.45; ≤ 1 MB | `LINE_IMAGE_FORMAT` |
| Rich menu object | `chatBarText` ≤ 14; `name` ≤ 300; ≤ 20 areas | `RM_*`, `LINE_ACTIONS_VALID` |
| Action labels (rich menu) | optional, ≤ 20 characters | `LINE_ACTIONS_VALID` |
| Postback / datetimepicker `data` | ≤ 300 characters; datetimepicker `mode` date/time/datetime; postback `params.datetime` like `2017-12-25T01:00` | `LINE_ACTIONS_VALID`, GAS `createReservation` |
| Endpoints | create `POST api.line.me/v2/bot/richmenu`; upload `POST api-data.line.me/v2/bot/richmenu/{id}/content` (`image/png`/`image/jpeg`); default `POST /v2/bot/user/all/richmenu/{id}`; get/delete `/v2/bot/richmenu/{id}`; validate `/v2/bot/richmenu/validate` | `src/line/lineApi.ts` |
| Image replacement | an image set to a rich menu cannot be replaced; create a new rich menu | deploy always creates a new menu |
| Default menu | setting a default replaces the current default | previous default is recorded for rollback |
| Auth | `Authorization: Bearer {channel access token}` | `createLineApi` |
| Webhook signature | `x-line-signature` = Base64(HMAC-SHA256(channel secret, raw body)); verify before parsing; header name case-insensitive | proxy `signature.ts` |
| Webhook response | bot server must return HTTP 200; LINE may send `events: []` to confirm communication | proxy answers 200 |
| Redelivery | same `webhookEventId` and reply token; `deliveryContext.isRedelivery` true; use `webhookEventId` to detect duplicates | GAS webhook event marker + per-record idempotency |
| Clients | rich menus are not displayed on LINE for PC (macOS, Windows) | `E2E_TEST.md` is mobile-only |
| Apps Script | `doPost(e)` exposes query string, parameters and `postData`, but no request headers (developers.google.com/apps-script/guides/web) | proxy required (ADR 0008) |

## Rich Menu production (2A)

- `design-spec.json` is the only input to the renderer. Tile bounds come from the layout asset,
  the same bounds `menu-config.json` uses for tappable areas. `LINE_IMAGE_MATCHES_CONFIG` proves they agree.
- The Design Agent decides every color, including the new `subLabelColor`, `iconColor` and `borderColor`.
  The renderer only decides geometry inside a tile and the icon shapes (`src/richMenu/icons.ts`).
- Determinism: the SVG is a pure function of the spec. resvg rasterizes it with pinned Noto Sans JP
  font files, and system fonts are disabled. `image.json` records the sha256 and every version that
  can change the bytes. QA re-renders the image and compares the bytes (`LINE_DETERMINISTIC_IMAGE`).
  Canva stays an optional future adapter behind `RichMenuImageRenderer`. See [ADR 0009](decisions/0009-rich-menu-renderer.md).

## Deployment (2B)

`line-deploy` is a dry run unless `--live` is given. The token comes only from the
`LINE_CHANNEL_ACCESS_TOKEN` environment variable. The deploy runs in this order:

1. static LINE QA
2. `validate`
3. `create`
4. `upload`
5. `get` (verify)
6. read the current default
7. `set default`
8. append to `line/deployment-history.json`

Nothing is ever deleted by deploy. `line-rollback` sets the recorded previous default back.
`line-delete` removes one menu and refuses the current default. Generated
`line/deployment.json` is deterministic. Server-issued ids live only in the history file,
which generation never writes or deletes.

## Runtime (2C)

The Phase 1 GAS webhook already implemented the four released workflows:

- `business-info-v1`: postback, then `getBusinessInfo` reply.
- `service-menu-v1`: postback, then `getServiceList` reply.
- `inquiry-basic-v1`: postback prompt, then the next text message goes to `createInquiry` (a CacheService pending state with a 10 min TTL).
- `reservation-basic-v1`: datetimepicker, then `createReservation`, which saves a request with status `REQUESTED`.

v1 adds one runtime change (`runtime` module 1.1.0). A `line-event:<webhookEventId>` cache
marker, set after processing, stops a redelivered event from producing a second reply or
re-arming the prompt. Records were already idempotent per event id. No workflow, action or
schema was added or changed.

Traceability: `line/deployment.json → traceability[]` maps every button to its LINE action, then
the workflow entry, the pinned action, and the GAS handler file. `LINE_WORKFLOW_REFERENCES`
checks that chain against the generated `routes.ts` and `registry.ts`.

## Security boundary (2D)

```text
LINE Platform ──► line/webhook (Cloudflare Worker) ──► GAS doPost ?key=WEBHOOK_KEY
                   verify x-line-signature on raw body      internal proxy→GAS auth only
                   invalid/missing → 401, GAS not called
```

The Worker answers 200 as soon as the signature is valid, then forwards to GAS in `waitUntil`.
GAS replies to the user with the reply token. `?key=` is not a LINE signature check. See
[ADR 0008](decisions/0008-line-webhook-proxy.md) and [security.md](security.md).

## LINE QA (2E)

| Level | What | How |
|---|---|---|
| 1 | Static: image, config, actions, traceability, deployment definition, secrets, webhook/proxy | `runLineQa` (every `create-project` / `qa` / `line-deploy`) |
| 2 | Generated GAS runtime tests for every route: valid, invalid, duplicate, safe error, unknown input | `gas/tests/lineRuntime.test.ts`, with `--run-gas-checks` |
| 3 | Proxy tests in each project; the factory suite adds end-to-end proxy → GAS → sheet tests for all industries | `line/webhook/tests`, `tests/lineIntegration.test.ts` |
| 4 | Live smoke test on a real **test** account (refuses production) | `line-smoke-test --env test --live` → `line/smoke-test-result.json` |

Level 4 is reported as NOT RUN until someone actually runs it. It never fails QA by its absence.

## Where secrets live

| Secret | Used by | Stored in |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | GAS reply; CLI deploy | Script Properties; CLI environment variable only |
| `LINE_CHANNEL_SECRET` | proxy | Cloudflare Worker secret |
| `GAS_WEBAPP_URL`, `GAS_WEBHOOK_KEY` | proxy | Cloudflare Worker secrets |
| `WEBHOOK_KEY`, `SPREADSHEET_ID` | GAS | Script Properties |

None of these may appear in `core-assets/`, briefs, templates, projects or docs.
`SEC_NO_SECRETS` and `LINE_SECRET_SCAN` enforce this, and a factory test scans the repository folders.
