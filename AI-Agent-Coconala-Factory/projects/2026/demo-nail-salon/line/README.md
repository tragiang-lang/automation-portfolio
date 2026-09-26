# LINE deployment — 2026/demo-nail-salon

Developer-facing. The owner-facing steps are in `../delivery/LINE_SETUP.md`.

- `deployment.json`: what gets deployed (rich menu `demo-nail-salon-nail-salon-basic-v1`, image hash, asset versions,
  button → workflow → action traceability). Generated; deterministic.
- `deployment-history.json`: server-issued rich menu ids per environment. Written only by
  `line-deploy --live` / `line-rollback --live`. Never generated, never deleted by the factory.
- `webhook/`: the signature-verifying proxy (Cloudflare Worker). See `webhook/README.md`.

## Commands (from the factory root)

```bash
npm run factory -- line-validate --project projects/2026/demo-nail-salon
npm run factory -- line-deploy   --project projects/2026/demo-nail-salon --env test             # dry run (default)
LINE_CHANNEL_ACCESS_TOKEN=... npm run factory -- line-deploy --project projects/2026/demo-nail-salon --env test --live
npm run factory -- line-status   --project projects/2026/demo-nail-salon [--remote]
npm run factory -- line-rollback --project projects/2026/demo-nail-salon --env test [--live]
npm run factory -- line-smoke-test --project projects/2026/demo-nail-salon --env test --live   # test account only
```

The access token is read from the `LINE_CHANNEL_ACCESS_TOKEN` environment variable and is never
written to disk or printed. Deploys never delete a rich menu; see `../delivery/ROLLBACK.md`.
